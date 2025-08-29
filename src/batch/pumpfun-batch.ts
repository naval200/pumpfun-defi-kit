import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import BN from 'bn.js';

import {
  buyTokens as buyAmmTokens,
  sellTokens,
  createAmmBuyInstructionsAssuming,
  createAmmSellInstructionsAssuming,
} from '../amm';
import {
  buyPumpFunToken,
  createSignedSellTransaction,
  createBondingCurveBuyInstructionAssuming,
  createBondingCurveSellInstructionAssuming,
} from '../bonding-curve';
import { chunkArray } from './batch-helper';
import { sendLamports } from '../utils/transaction';
import { debugLog, logError } from '../utils/debug';
import type { BatchOperation, BatchResult, BatchExecutionOptions } from '../@types';
import { sendToken, sendTokenWithAccountCreation } from '../sendToken';
import { TransactionInstruction } from '@solana/web3.js';

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

interface BondingCurveSellParams {
  mint: string;
  amount: number;
  slippage?: number;
}

interface AmmSellParams {
  poolKey: string;
  amount: number;
  slippage?: number;
}

interface AmmBuyParams {
  poolKey: string;
  quoteAmount: number;
  slippage?: number;
  assumeAccountsExist?: boolean;
}

interface BondingCurveBuyParams {
  mint: string;
  solAmount: number;
  slippage?: number;
  assumeAccountsExist?: boolean;
}

/**
 * Execute PumpFun token batch transactions
 *
 * Note: Only consuming operations (transfers, sell-amm, sell-bonding-curve) can be batched together.
 * Buy operations (buy-amm, buy-bonding-curve) cannot be batched because:
 * - They create tokens and often require creating new Associated Token Accounts (ATAs)
 * - They have different account setup requirements than sell operations
 * - They may have interdependencies that make batching complex
 * - They change pool state which could affect subsequent operations
 * - They have different signing and authorization patterns
 */
export async function executePumpFunBatch(
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
                const sourceAta = getAssociatedTokenAddressSync(
                  new PublicKey(mint),
                  sender.publicKey,
                  false
                );
                const destAta = getAssociatedTokenAddressSync(
                  new PublicKey(mint),
                  new PublicKey(recipient),
                  false
                );
                instructions.push(
                  createTransferInstruction(
                    sourceAta,
                    destAta,
                    sender.publicKey,
                    BigInt(amount),
                    [],
                    TOKEN_PROGRAM_ID
                  )
                );
                break;
              }
              case 'sol-transfer': {
                const { recipient, lamports } = operation.params;
                // Build a SystemProgram transfer inside a combined tx
                instructions.push(
                  SystemProgram.transfer({
                    fromPubkey: sender.publicKey,
                    toPubkey: new PublicKey(recipient),
                    lamports: Number(lamports),
                  })
                );
                break;
              }
              case 'buy-bonding-curve': {
                const { mint, solAmount, slippage = 1000 } = operation.params;
                instructions.push(
                  createBondingCurveBuyInstructionAssuming(
                    sender.publicKey,
                    new PublicKey(mint),
                    new BN(Number(solAmount) * 1e9),
                    Number(slippage)
                  )
                );
                break;
              }
              case 'sell-bonding-curve': {
                const { mint, amount, minSolOutputLamports = 1 } = operation.params;
                instructions.push(
                  createBondingCurveSellInstructionAssuming(
                    sender.publicKey,
                    new PublicKey(mint),
                    new BN(Number(amount)),
                    new BN(Number(minSolOutputLamports))
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
          tx.feePayer = sender.publicKey; // sender pays fees
          tx.sign(sender);
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
          case 'transfer':
            result = await executeTransfer(connection, wallet, feePayer, operation.params);
            break;
          case 'sol-transfer':
            result = await executeSolTransfer(connection, wallet, operation.params);
            break;
          case 'sell-bonding-curve':
            result = await executeBondingCurveSell(connection, wallet, feePayer, operation.params);
            break;
          case 'sell-amm':
            result = await executeAmmSell(connection, wallet, feePayer, operation.params);
            break;
          case 'buy-amm':
            result = await executeAmmBuy(connection, wallet, operation.params);
            break;
          case 'buy-bonding-curve':
            result = await executeBondingCurveBuy(connection, wallet, operation.params);
            break;
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
      case 'transfer':
        result = await executeTransfer(connection, wallet, feePayer, operation.params);
        break;
      case 'sell-bonding-curve':
        result = await executeBondingCurveSell(connection, wallet, feePayer, operation.params);
        break;
      case 'sell-amm':
        result = await executeAmmSell(connection, wallet, feePayer, operation.params);
        break;
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
 * Execute token transfer operation
 */
async function executeTransfer(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair | undefined,
  params: TransferParams
): Promise<OperationResult> {
  const { recipient, mint, amount, createAccount = true } = params;

  try {
    if (createAccount) {
      return await sendTokenWithAccountCreation(
        connection,
        wallet,
        new PublicKey(recipient),
        new PublicKey(mint),
        BigInt(amount),
        false, // allowOwnerOffCurve
        feePayer
      );
    } else {
      return await sendToken(
        connection,
        wallet,
        new PublicKey(recipient),
        new PublicKey(mint),
        BigInt(amount),
        false, // allowOwnerOffCurve
        false, // createRecipientAccount
        feePayer
      );
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute SOL transfer (lamports -> lamports) with sender paying its own fee
 */
async function executeSolTransfer(
  connection: Connection,
  wallet: Keypair,
  params: SolTransferParams
): Promise<OperationResult> {
  const { recipient, lamports, sender } = params;

  try {
    const senderKeypair =
      sender && sender !== wallet.publicKey.toString()
        ? Keypair.fromSecretKey(Buffer.from(JSON.parse(sender)))
        : wallet;
    const signature = await sendLamports(
      connection,
      senderKeypair,
      new PublicKey(recipient),
      Number(lamports),
      senderKeypair // sender pays fee
    );

    return { success: true, signature };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute bonding curve sell operation
 */
async function executeBondingCurveSell(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair | undefined,
  params: BondingCurveSellParams
): Promise<OperationResult> {
  const { mint, amount, slippage = 1000 } = params;

  try {
    debugLog(`🔧 Executing bonding curve sell for ${amount} tokens`);
    debugLog(`🎯 Mint: ${mint}`);
    debugLog(`📊 Slippage: ${slippage} basis points`);

    const result = await createSignedSellTransaction(
      connection,
      wallet,
      new PublicKey(mint),
      amount,
      slippage,
      feePayer
    );

    if (result.success && result.transaction) {
      // Submit the signed transaction
      const signature = await connection.sendRawTransaction(result.transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      return {
        success: true,
        signature,
        amount,
        mint,
      };
    } else {
      throw new Error(result.error || 'Failed to create signed sell transaction');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Bonding curve sell failed: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Execute AMM sell operation
 */
async function executeAmmSell(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair | undefined,
  params: AmmSellParams
): Promise<OperationResult> {
  const { poolKey, amount, slippage = 1 } = params;

  try {
    debugLog(`💸 Selling tokens to pool: ${poolKey}`);
    debugLog(`Token amount: ${amount}`);

    return await sellTokens(connection, wallet, new PublicKey(poolKey), amount, slippage, feePayer);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute AMM buy with wallet paying its own fee and optional ATA skip
 */
async function executeAmmBuy(
  connection: Connection,
  wallet: Keypair,
  params: AmmBuyParams
): Promise<OperationResult> {
  const { poolKey, quoteAmount, slippage = 1, assumeAccountsExist = true } = params;

  try {
    return await buyAmmTokens(
      connection,
      wallet,
      new PublicKey(poolKey),
      Number(quoteAmount),
      Number(slippage),
      wallet, // fee payer is the signer wallet
      { assumeAccountsExist }
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute bonding curve buy with wallet paying its own fee and optional ATA skip
 */
async function executeBondingCurveBuy(
  connection: Connection,
  wallet: Keypair,
  params: BondingCurveBuyParams
): Promise<OperationResult> {
  const { mint, solAmount, slippage = 1000, assumeAccountsExist = true } = params;

  try {
    const signature = await buyPumpFunToken(
      connection,
      wallet,
      new PublicKey(mint),
      Number(solAmount),
      Number(slippage),
      wallet, // signer pays fee
      { assumeAccountsExist }
    );

    return { success: true, signature };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
