import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';

import { sendToken, createTokenTransferInstruction } from '../sendToken';
import { sendSol, createSendSolInstruction } from '../sendSol';
import { buyPumpFunToken } from '../bonding-curve/buy';
import { sellPumpFunToken } from '../bonding-curve/sell';
import {
  createAmmBuyInstructionsAssuming,
  createAmmSellInstructionsAssuming,
} from '../amm/instructions';
import { getBondingCurvePDAs } from '../bonding-curve/bc-helper';
import { debugLog, logError } from '../utils/debug';
import { chunkArray } from './batch-helper';
import type {
  BatchOperation,
  BatchResult,
  BatchExecutionOptions,
  OperationResult,
} from '../@types';
import { buyAmmTokens, sellAmmTokens } from '../amm';
import {
  createBondingCurveBuyInstruction,
  createBondingCurveSellInstruction,
} from '../bonding-curve';
import { minSolLamports } from '../utils/amounts';

/**
 * Execute a batch of PumpFun operations
 *
 * This function processes operations in parallel batches with configurable delays.
 * Supports both individual operation execution and combined transaction execution.
 * - combinePerBatch: Combines compatible operations into single transactions per sender
 * - Accounts are always assumed to exist (users must check beforehand)
 */
export async function batchTransactions(
  connection: Connection,
  wallet: Keypair,
  operations: BatchOperation[],
  feePayer?: Keypair,
  options: Partial<BatchExecutionOptions> = {}
): Promise<BatchResult[]> {
  const {
    maxParallel = 3,
    delayBetween = 1000,
    retryFailed = false,
    combinePerBatch = false,
  } = options;
  const results: BatchResult[] = [];

  debugLog(`🚀 Executing ${operations.length} PumpFun operations in batches of ${maxParallel}`);
  debugLog(
    `📊 Batch options: maxParallel=${maxParallel}, delayBetween=${delayBetween}ms, retryFailed=${retryFailed}, combinePerBatch=${combinePerBatch}`
  );
  if (feePayer) {
    debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
  } else {
    debugLog('💸 No fee payer provided: each signer will pay their own fees');
  }

  // Execute operations in batches
  const batches = chunkArray(operations, maxParallel);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    debugLog(`🔄 Executing Batch ${batchIndex + 1}/${batches.length} (${batch.length} operations)`);

    if (combinePerBatch) {
      // Combine all compatible operations in this batch into a single transaction per sender
      const groupedBySender = new Map<string, { sender: Keypair; ops: BatchOperation[] }>();

      for (const op of batch) {
        const senderPubkey = (op.sender || wallet.publicKey.toString()).toString();
        const sender = op.sender
          ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(op.sender)))
          : wallet;
        const entry = groupedBySender.get(senderPubkey) || { sender, ops: [] };
        entry.ops.push(op);
        groupedBySender.set(senderPubkey, entry);
      }

      for (const [, group] of groupedBySender) {
        try {
          const instructions: TransactionInstruction[] = [];
          const sender = group.sender;
          const ammSdk = new PumpAmmSdk(connection);

          for (const operation of group.ops) {
            const { type } = operation;
            switch (type) {
              case 'transfer': {
                const { recipient, mint, amount } = operation.params;

                // Use the utility function from sendToken.ts for consistency
                const transferInstruction = createTokenTransferInstruction(
                  sender.publicKey,
                  new PublicKey(recipient),
                  new PublicKey(mint),
                  amount,
                  false // allowOwnerOffCurve
                );
                instructions.push(transferInstruction);
                break;
              }
              case 'sol-transfer': {
                const { recipient, amount } = operation.params;
                // Use the utility function from sendSol.ts for consistency
                const solTransferInstruction = createSendSolInstruction(
                  sender,
                  new PublicKey(recipient),
                  amount,
                  feePayer?.publicKey
                );
                instructions.push(solTransferInstruction);
                break;
              }
              case 'buy-bonding-curve': {
                const { mint, amount } = operation.params;
                // Get PDAs for bonding curve buy
                const pdas = await getBondingCurvePDAs(
                  connection,
                  new PublicKey(mint),
                  sender.publicKey
                );
                // amountLamports is already in lamports
                instructions.push(
                  createBondingCurveBuyInstruction(
                    sender.publicKey,
                    new PublicKey(mint),
                    amount,
                    pdas,
                    1000 // maxSlippageBasisPoints
                  )
                );
                break;
              }
              case 'sell-bonding-curve': {
                const { mint, amount } = operation.params;
                // Get PDAs for bonding curve sell
                const pdas = await getBondingCurvePDAs(
                  connection,
                  new PublicKey(mint),
                  sender.publicKey
                );
                // Calculate min SOL output (very low to avoid slippage issues)
                const minSolOutput = minSolLamports();
                instructions.push(
                  createBondingCurveSellInstruction(
                    sender.publicKey,
                    new PublicKey(mint),
                    amount,
                    minSolOutput,
                    pdas
                  )
                );
                break;
              }
              case 'buy-amm': {
                const { poolKey, amount, slippage = 1 } = operation.params;
                const state = await ammSdk.swapSolanaState(
                  new PublicKey(poolKey),
                  sender.publicKey
                );
                const ixs = await createAmmBuyInstructionsAssuming(ammSdk, state, amount, slippage);
                ixs.forEach(ix => instructions.push(ix));
                break;
              }
              case 'sell-amm': {
                const { poolKey, amount, slippage = 1 } = operation.params;
                const state = await ammSdk.swapSolanaState(
                  new PublicKey(poolKey),
                  sender.publicKey
                );
                const ixs = await createAmmSellInstructionsAssuming(
                  ammSdk,
                  state,
                  amount,
                  slippage
                );
                ixs.forEach(ix => instructions.push(ix));
                break;
              }
              default: {
                throw new Error(`Unknown operation type: ${type}`);
              }
            }
          }

          // Assemble and send single transaction for this sender group
          const tx = new Transaction();
          instructions.forEach(ix => tx.add(ix));
          const { blockhash } = await connection.getLatestBlockhash('confirmed');
          tx.recentBlockhash = blockhash;
          tx.feePayer = feePayer?.publicKey || sender.publicKey; // Use fee payer if provided
          tx.sign(sender);
          if (feePayer && !feePayer.publicKey.equals(sender.publicKey)) {
            tx.sign(feePayer);
          }
          const signature = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          if (confirmation.value.err) {
            throw new Error(`Combined transaction failed: ${confirmation.value.err}`);
          }

          // Push a result per operation sharing the same signature
          group.ops.forEach(op => {
            results.push({ operationId: op.id, type: op.type, success: true, signature });
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          group.ops.forEach(op => {
            results.push({
              operationId: op.id,
              type: op.type,
              success: false,
              error: errorMessage,
            });
          });
        }
      }

      // Delay between batches if configured
      if (batchIndex < batches.length - 1 && delayBetween > 0) {
        debugLog(`⏳ Waiting ${delayBetween}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }

      continue;
    }

    // Execute batch in parallel (legacy per-op mode)
    const batchPromises = batch.map(async operation => {
      try {
        debugLog(`🚀 Executing ${operation.type}: ${operation.description}`);

        let result: OperationResult;
        const { sender, type } = operation;

        switch (operation.type) {
          case 'transfer': {
            const { recipient, mint, amount } = operation.params;
            const transferResult = await sendToken(
              connection,
              wallet,
              new PublicKey(recipient),
              new PublicKey(mint),
              amount,
              false, // allowOwnerOffCurve
              false, // createRecipientAccount
              feePayer
            );
            if (transferResult.success && transferResult.signature) {
              result = { success: true, signature: transferResult.signature, amount, mint };
            } else {
              result = { success: false, error: transferResult.error || 'Transfer failed' };
            }
            break;
          }
          case 'sol-transfer': {
            const { recipient, amount } = operation.params;
            const senderKeypair =
              sender && sender !== wallet.publicKey.toString()
                ? Keypair.fromSecretKey(Buffer.from(JSON.parse(sender)))
                : wallet;

            const sendResult = await sendSol(
              connection,
              senderKeypair,
              new PublicKey(recipient),
              amount,
              feePayer
            );

            if (sendResult.success && sendResult.signature) {
              result = { success: true, signature: sendResult.signature };
            } else {
              result = { success: false, error: sendResult.error || 'SOL transfer failed' };
            }
            break;
          }
          case 'sell-bonding-curve': {
            const { mint, amount } = operation.params;
            const sellResult = await sellPumpFunToken(
              connection,
              wallet,
              new PublicKey(mint),
              amount
            );
            if (sellResult.success && sellResult.signature) {
              result = { success: true, signature: sellResult.signature, amount, mint };
            } else {
              result = { success: false, error: sellResult.error || 'Sell failed' };
            }
            break;
          }
          case 'sell-amm': {
            const { poolKey, amount, slippage = 1 } = operation.params;
            const sellResult = await sellAmmTokens(
              connection,
              wallet,
              new PublicKey(poolKey),
              amount,
              slippage,
              feePayer
            );
            if (sellResult.success && sellResult.signature) {
              // For AMM operations, poolKey is not a mint, so we use it as identifier
              result = { success: true, signature: sellResult.signature, amount, mint: poolKey };
            } else {
              result = { success: false, error: sellResult.error || 'Sell failed' };
            }
            break;
          }
          case 'buy-amm': {
            const { poolKey, amount, slippage = 1 } = operation.params;
            const buyResult = await buyAmmTokens(
              connection,
              wallet,
              new PublicKey(poolKey),
              amount,
              slippage,
              feePayer || wallet
            );
            if (buyResult.success && buyResult.signature) {
              result = {
                success: true,
                signature: buyResult.signature,
                amount,
                mint: poolKey,
              };
            } else {
              result = { success: false, error: buyResult.error || 'Buy failed' };
            }
            break;
          }
          case 'buy-bonding-curve': {
            const { mint, amount } = operation.params;
            const signature = await buyPumpFunToken(
              connection,
              wallet,
              new PublicKey(mint),
              amount,
              1000
            );
            result = { success: true, signature, amount, mint };
            break;
          }
          default:
            throw new Error(`Unknown operation type: ${type}`);
        }

        return {
          operationId: operation.id,
          type: operation.type,
          success: result.success,
          signature: result.signature,
          error: result.error,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError(`Error executing operation ${operation.id}: ${errorMessage}`);

        return {
          operationId: operation.id,
          type: operation.type,
          success: false,
          error: errorMessage,
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    // Process batch results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          operationId: batch[index].id,
          type: batch[index].type,
          success: false,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Add delay between batches (except for the last batch)
    if (batchIndex < batches.length - 1 && delayBetween > 0) {
      debugLog(`⏳ Waiting ${delayBetween}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetween));
    }
  }

  // Retry failed operations if requested
  if (retryFailed) {
    const failedOperations = operations.filter(
      op => !results.find(r => r.operationId === op.id && r.success)
    );

    if (failedOperations.length > 0) {
      debugLog(`🔄 Retrying ${failedOperations.length} failed operations...`);

      for (const operation of failedOperations) {
        debugLog(`🔄 Retrying operation: ${operation.id}`);
        const retryResult = await executeOperation(connection, wallet, feePayer, operation);

        // Update the existing result
        const existingIndex = results.findIndex(r => r.operationId === operation.id);
        if (existingIndex >= 0) {
          results[existingIndex] = retryResult;
        } else {
          results.push(retryResult);
        }
      }
    }
  }

  return results;
}

/**
 * Execute a single operation
 */
async function executeOperation(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair | undefined,
  operation: BatchOperation
): Promise<BatchResult> {
  try {
    debugLog(`🚀 Executing ${operation.type}: ${operation.description}`);

    let result: OperationResult;
    const { type } = operation;

    switch (type) {
      case 'transfer': {
        const { recipient, mint, amount } = operation.params;
        const transferResult = await sendToken(
          connection,
          wallet,
          new PublicKey(recipient),
          new PublicKey(mint),
          amount,
          false, // allowOwnerOffCurve
          false, // createRecipientAccount
          feePayer
        );
        if (transferResult.success && transferResult.signature) {
          result = { success: true, signature: transferResult.signature, amount, mint };
        } else {
          result = { success: false, error: transferResult.error || 'Transfer failed' };
        }
        break;
      }
      case 'sell-bonding-curve': {
        const { mint, amount } = operation.params;
        const sellResult = await sellPumpFunToken(connection, wallet, new PublicKey(mint), amount);
        if (sellResult.success && sellResult.signature) {
          result = { success: true, signature: sellResult.signature, amount, mint };
        } else {
          result = { success: false, error: sellResult.error || 'Sell failed' };
        }
        break;
      }
      case 'sell-amm': {
        const { poolKey, amount, slippage = 1 } = operation.params;
        const sellResult = await sellAmmTokens(
          connection,
          wallet,
          new PublicKey(poolKey),
          amount,
          slippage,
          feePayer
        );
        if (sellResult.success && sellResult.signature) {
          result = { success: true, signature: sellResult.signature, amount, mint: poolKey };
        } else {
          result = { success: false, error: sellResult.error || 'Sell failed' };
        }
        break;
      }
      case 'buy-amm': {
        const { poolKey, amount, slippage = 1 } = operation.params;
        const buyResult = await buyAmmTokens(
          connection,
          wallet,
          new PublicKey(poolKey),
          amount,
          slippage,
          feePayer || wallet
        );
        if (buyResult.success && buyResult.signature) {
          result = {
            success: true,
            signature: buyResult.signature,
            amount,
            mint: poolKey,
          };
        } else {
          result = { success: false, error: buyResult.error || 'Buy failed' };
        }
        break;
      }
      case 'buy-bonding-curve': {
        const { mint, amount } = operation.params;
        const signature = await buyPumpFunToken(
          connection,
          wallet,
          new PublicKey(mint),
          amount,
          1000
        );
        result = { success: true, signature, amount, mint };
        break;
      }
      case 'sol-transfer': {
        const { recipient, amount } = operation.params;
        const sendResult = await sendSol(
          connection,
          wallet,
          new PublicKey(recipient),
          amount,
          feePayer
        );
        if (sendResult.success && sendResult.signature) {
          result = { success: true, signature: sendResult.signature, amount };
        } else {
          result = { success: false, error: sendResult.error || 'SOL transfer failed' };
        }
        break;
      }
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    return {
      operationId: operation.id,
      type: operation.type,
      success: result.success,
      signature: result.signature,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Error executing operation ${operation.id}: ${errorMessage}`);

    return {
      operationId: operation.id,
      type: operation.type,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate PumpFun batch operations structure
 */
export function validatePumpFunBatchOperations(operations: BatchOperation[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const validTypes = [
    'transfer',
    'sell-bonding-curve',
    'sell-amm',
    'buy-amm',
    'buy-bonding-curve',
    'sol-transfer',
  ];

  if (!Array.isArray(operations) || operations.length === 0) {
    errors.push('Operations must be a non-empty array');
    return { valid: false, errors };
  }

  operations.forEach((op, index) => {
    // Check required fields
    if (!op.type || !op.id || !op.description || !op.params) {
      errors.push(`Operation ${index}: Missing required fields`);
      return;
    }

    // Check operation type
    if (!validTypes.includes(op.type)) {
      errors.push(`Operation ${index}: Invalid type '${op.type}'`);
      return;
    }

    // Check ID uniqueness
    const duplicateIds = operations.filter(o => o.id === op.id);
    if (duplicateIds.length > 1) {
      errors.push(`Operation ${index}: Duplicate ID '${op.id}'`);
      return;
    }

    // Validate parameters based on type
    switch (op.type) {
      case 'transfer':
        if (!op.params.recipient || !op.params.mint || !op.params.amount) {
          errors.push(`Operation ${index}: Missing required transfer parameters`);
        }
        break;
      case 'sol-transfer':
        if (!op.params.recipient || op.params.amount === undefined) {
          errors.push(`Operation ${index}: Missing required SOL transfer parameters`);
        }
        break;
      case 'sell-amm':
        if (
          !op.params.poolKey ||
          op.params.amount === undefined ||
          op.params.slippage === undefined
        ) {
          errors.push(`Operation ${index}: Missing required AMM parameters`);
        }
        break;
      case 'sell-bonding-curve':
        if (!op.params.mint || op.params.amount === undefined || op.params.slippage === undefined) {
          errors.push(`Operation ${index}: Missing required bonding curve parameters`);
        }
        break;
      case 'buy-amm':
        if (!op.params.poolKey || op.params.amount === undefined) {
          errors.push(`Operation ${index}: Missing required buy AMM parameters`);
        }
        break;
      case 'buy-bonding-curve':
        if (!op.params.mint || op.params.amount === undefined) {
          errors.push(`Operation ${index}: Missing required buy bonding curve parameters`);
        }
        break;
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
