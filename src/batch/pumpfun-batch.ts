import { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';

import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import BN from 'bn.js';

import {
  buyTokens as buyAmmTokens,
  sellTokens as sellAmmTokens,
  createAmmBuyInstructionsAssuming,
  createAmmSellInstructionsAssuming,
} from '../amm';
import {
  buyPumpFunToken,
  sellPumpFunToken,
  createBondingCurveBuyInstruction,
  createBondingCurveSellInstruction,
  getBondingCurvePDAs,
} from '../bonding-curve';
import { chunkArray } from './batch-helper';
import { createSendSolInstruction, sendSol } from '../sendSol';
import { debugLog, logError } from '../utils/debug';
import type { BatchOperation, BatchResult, BatchExecutionOptions } from '../@types';
import { sendToken, sendTokenWithAccountCreation, createTokenTransferInstruction } from '../sendToken';

// Re-export types for external use
export type { BatchOperation, BatchResult, BatchExecutionOptions };

interface OperationResult {
  success: boolean;
  signature?: string;
  error?: string;
  amount?: number;
  mint?: string;
}

interface TransferParams {
  recipient: string;
  mint: string;
  amount: string;
  createAccount?: boolean;
}

interface SolTransferParams {
  recipient: string;
  lamports: string;
  sender?: string;
}

/**
 * Execute PumpFun token batch transactions
 *
 * This function supports both combined transactions (combinePerBatch=true) and individual operations.
 * 
 * **Combined Transactions Mode (combinePerBatch=true):**
 * - Groups operations by sender into single transactions
 * - Better gas efficiency and atomicity
 * - Requires assumeAccountsExist=true for transfers
 * - Supports fee payer for transaction costs
 * 
 * **Individual Operations Mode (combinePerBatch=false):**
 * - Executes each operation separately
 * - Better error isolation and retry capabilities
 * - Supports parallel execution with maxParallel limit
 * 
 * **Supported Operation Types:**
 * - `transfer`: Token transfers between addresses
 * - `sol-transfer`: SOL transfers between addresses  
 * - `sell-bonding-curve`: Sell tokens via bonding curve
 * - `sell-amm`: Sell tokens via AMM pools
 * - `buy-amm`: Buy tokens via AMM pools
 * - `buy-bonding-curve`: Buy tokens via bonding curve
 * 
 * **Note:** Buy operations can be batched but may have interdependencies that affect success rates.
 */
export async function executeBatch(
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
    assumeAccountsExist = true,
  } = options;
  const results: BatchResult[] = [];

  debugLog(`🚀 Executing ${operations.length} PumpFun operations in batches of ${maxParallel}`);
  debugLog(`📊 Batch options: maxParallel=${maxParallel}, delayBetween=${delayBetween}ms, retryFailed=${retryFailed}, combinePerBatch=${combinePerBatch}`);
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
            switch (operation.type) {
              case 'transfer': {
                const { recipient, mint, amount } = operation.params;
                if (!assumeAccountsExist)
                  throw new Error('combinePerBatch requires assumeAccountsExist for transfers');
                
                // Use the utility function from sendToken.ts for consistency
                const transferInstruction = createTokenTransferInstruction(
                  sender.publicKey,
                  new PublicKey(recipient),
                  new PublicKey(mint),
                  BigInt(amount),
                  false // allowOwnerOffCurve
                );
                instructions.push(transferInstruction);
                break;
              }
              case 'sol-transfer': {
                const { recipient, lamports } = operation.params;
                // Use the utility function from sendSol.ts for consistency
                const solTransferInstruction = createSendSolInstruction(
                  sender,
                  new PublicKey(recipient),
                  Number(lamports) / 1e9, // Convert lamports to SOL
                  feePayer?.publicKey
                );
                instructions.push(solTransferInstruction);
                break;
              }
              case 'buy-bonding-curve': {
                const { mint, solAmount, slippage = 1000 } = operation.params;
                // Get PDAs for bonding curve buy
                const pdas = await getBondingCurvePDAs(connection, new PublicKey(mint), sender.publicKey);
                instructions.push(
                  createBondingCurveBuyInstruction(
                    sender.publicKey,
                    new PublicKey(mint),
                    new BN(Number(solAmount) * 1e9),
                    pdas,
                    slippage
                  )
                );
                break;
              }
              case 'sell-bonding-curve': {
                const { mint, amount, slippage = 1000 } = operation.params;
                // Get PDAs for bonding curve sell
                const pdas = await getBondingCurvePDAs(connection, new PublicKey(mint), sender.publicKey);
                // Convert amount to smallest units (6 decimals)
                const tokenAmountInSmallestUnits = amount * Math.pow(10, 6);
                // Calculate min SOL output (very low to avoid slippage issues)
                const minSolOutput = 0.000001 * 1e9; // 0.000001 SOL in lamports
                instructions.push(
                  createBondingCurveSellInstruction(
                    sender.publicKey,
                    new PublicKey(mint),
                    tokenAmountInSmallestUnits,
                    minSolOutput,
                    pdas
                  )
                );
                break;
              }
              case 'buy-amm': {
                const { poolKey, quoteAmount, slippage = 1, swapSolanaState } = operation.params;
                const state =
                  swapSolanaState ||
                  (await ammSdk.swapSolanaState(new PublicKey(poolKey), sender.publicKey));
                const ixs = await createAmmBuyInstructionsAssuming(
                  ammSdk,
                  state,
                  Number(quoteAmount),
                  Number(slippage)
                );
                ixs.forEach(ix => instructions.push(ix));
                break;
              }
              case 'sell-amm': {
                const { poolKey, amount, slippage = 1, swapSolanaState } = operation.params;
                const state =
                  swapSolanaState ||
                  (await ammSdk.swapSolanaState(new PublicKey(poolKey), sender.publicKey));
                const ixs = await createAmmSellInstructionsAssuming(
                  ammSdk,
                  state,
                  Number(amount),
                  Number(slippage)
                );
                ixs.forEach(ix => instructions.push(ix));
                break;
              }
              default:
                throw new Error(`Unknown operation type: ${operation.type}`);
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

        switch (operation.type) {
          case 'transfer': {
            const { recipient, mint, amount, createAccount = true } = operation.params;
            
            if (createAccount) {
              const transferResult = await sendTokenWithAccountCreation(
                connection,
                wallet,
                new PublicKey(recipient),
                new PublicKey(mint),
                BigInt(amount),
                false, // allowOwnerOffCurve
                feePayer
              );
              if (transferResult.success && transferResult.signature) {
                result = { success: true, signature: transferResult.signature, amount, mint };
              } else {
                result = { success: false, error: transferResult.error || 'Transfer failed' };
              }
            } else {
              const transferResult = await sendToken(
                connection,
                wallet,
                new PublicKey(recipient),
                new PublicKey(mint),
                BigInt(amount),
                false, // allowOwnerOffCurve
                false, // createRecipientAccount
                feePayer
              );
              if (transferResult.success && transferResult.signature) {
                result = { success: true, signature: transferResult.signature, amount, mint };
              } else {
                result = { success: false, error: transferResult.error || 'Transfer failed' };
              }
            }
            break;
          }
          case 'sol-transfer': {
            const { recipient, lamports, sender } = operation.params;
            // Convert lamports to SOL and use sendSol for consistency
            const amountSol = Number(lamports) / 1e9;
            const senderKeypair = sender && sender !== wallet.publicKey.toString()
              ? Keypair.fromSecretKey(Buffer.from(JSON.parse(sender)))
              : wallet;
            
            const sendResult = await sendSol(
              connection,
              senderKeypair,
              new PublicKey(recipient),
              amountSol,
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
            const { poolKey, quoteAmount, slippage = 1, assumeAccountsExist = true } = operation.params;
            const buyResult = await buyAmmTokens(
              connection,
              wallet,
              new PublicKey(poolKey),
              Number(quoteAmount),
              Number(slippage),
              feePayer || wallet,
              { assumeAccountsExist }
            );
            if (buyResult.success && buyResult.signature) {
              result = { success: true, signature: buyResult.signature, amount: quoteAmount, mint: poolKey };
            } else {
              result = { success: false, error: buyResult.error || 'Buy failed' };
            }
            break;
          }
          case 'buy-bonding-curve': {
            const { mint, solAmount, slippage = 1000 } = operation.params;
            const signature = await buyPumpFunToken(
              connection,
              wallet,
              new PublicKey(mint),
              Number(solAmount),
              Number(slippage)
            );
            result = { success: true, signature, amount: solAmount, mint };
            break;
          }
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
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

    switch (operation.type) {
      case 'transfer': {
        const { recipient, mint, amount, createAccount = true } = operation.params;
        
        if (createAccount) {
          const transferResult = await sendTokenWithAccountCreation(
            connection,
            wallet,
            new PublicKey(recipient),
            new PublicKey(mint),
            BigInt(amount),
            false, // allowOwnerOffCurve
            feePayer
          );
          if (transferResult.success && transferResult.signature) {
            result = { success: true, signature: transferResult.signature, amount, mint };
          } else {
            result = { success: false, error: transferResult.error || 'Transfer failed' };
          }
        } else {
          const transferResult = await sendToken(
            connection,
            wallet,
            new PublicKey(recipient),
            new PublicKey(mint),
            BigInt(amount),
            false, // allowOwnerOffCurve
            false, // createRecipientAccount
            feePayer
          );
          if (transferResult.success && transferResult.signature) {
            result = { success: true, signature: transferResult.signature, amount, mint };
          } else {
            result = { success: false, error: transferResult.error || 'Transfer failed' };
          }
        }
        break;
      }
      case 'sell-bonding-curve': {
        const { mint, amount, slippage = 1000 } = operation.params;
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
          result = { success: true, signature: sellResult.signature, amount, mint: poolKey };
        } else {
          result = { success: false, error: sellResult.error || 'Sell failed' };
        }
        break;
      }
      case 'buy-amm': {
        const { poolKey, quoteAmount, slippage = 1, assumeAccountsExist = true } = operation.params;
        const buyResult = await buyAmmTokens(
          connection,
          wallet,
          new PublicKey(poolKey),
          Number(quoteAmount),
          Number(slippage),
          feePayer || wallet,
          { assumeAccountsExist }
        );
        if (buyResult.success && buyResult.signature) {
          result = { success: true, signature: buyResult.signature, amount: quoteAmount, mint: poolKey };
        } else {
          result = { success: false, error: buyResult.error || 'Buy failed' };
        }
        break;
      }
      case 'buy-bonding-curve': {
        const { mint, solAmount, slippage = 1000 } = operation.params;
        const signature = await buyPumpFunToken(
          connection,
          wallet,
          new PublicKey(mint),
          Number(solAmount),
          Number(slippage)
        );
        result = { success: true, signature, amount: solAmount, mint };
        break;
      }
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
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
        if (!op.params.recipient || op.params.lamports === undefined) {
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
        if (!op.params.poolKey || op.params.quoteAmount === undefined) {
          errors.push(`Operation ${index}: Missing required buy AMM parameters`);
        }
        break;
      case 'buy-bonding-curve':
        if (!op.params.mint || op.params.solAmount === undefined) {
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
