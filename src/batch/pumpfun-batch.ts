import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';

import { sendToken } from '../sendToken';
import { sendSol } from '../sendSol';
import { buyPumpFunToken, sellPumpFunToken } from '../bonding-curve';
import { buyAmmTokens, sellAmmTokens } from '../amm';
import { debugLog, logError } from '../utils/debug';
import {
  chunkArray,
  determineOptimalBatchSize,
  buildInstructionsForOperation,
} from './batch-helper';
import type {
  BatchOperation,
  BatchResult,
  BatchExecutionOptions,
  OperationResult,
} from '../@types';

/**
 * Execute a batch of PumpFun operations with true multi-sender batching
 *
 * This function processes operations by combining them into single transactions
 * that require signatures from all senders involved in the operations.
 * - All operations are combined into one transaction per batch
 * - All unique senders must sign the combined transaction
 * - Fee payer signs last (if provided)
 * - Accounts are always assumed to exist (users must check beforehand)
 */
export async function batchTransactions(
  connection: Connection,
  operations: BatchOperation[],
  feePayer?: Keypair,
  options: Partial<BatchExecutionOptions & { dynamicBatching?: boolean }> = {}
): Promise<BatchResult[]> {
  const {
    maxParallel = 3,
    delayBetween = 1000,
    retryFailed = false,
    disableFallbackRetry = false,
    dynamicBatching = false,
  } = options;
  const results: BatchResult[] = [];

  debugLog(`🚀 Executing ${operations.length} PumpFun operations with true multi-sender batching`);
  debugLog(
    `📊 Batch options: maxParallel=${maxParallel}, delayBetween=${delayBetween}ms, retryFailed=${retryFailed}, disableFallbackRetry=${disableFallbackRetry}, dynamicBatching=${dynamicBatching}`
  );
  if (feePayer) {
    debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
  } else {
    debugLog('💸 No fee payer provided: each signer will pay their own fees');
  }

  // Determine optimal batch size if dynamic batching is enabled
  let actualMaxParallel = maxParallel;
  if (dynamicBatching && operations.length > 0) {
    const { maxOpsPerBatch, reasoning } = await determineOptimalBatchSize(
      connection,
      operations,
      feePayer
    );
    actualMaxParallel = Math.min(maxOpsPerBatch, maxParallel);
    debugLog(`🧠 Dynamic batching: ${reasoning}`);
    debugLog(`📏 Using batch size: ${actualMaxParallel} operations per batch`);
  }

  // Execute operations in batches
  const batches = chunkArray(operations, actualMaxParallel);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    debugLog(`🔄 Executing Batch ${batchIndex + 1}/${batches.length} (${batch.length} operations)`);

    try {
      const ammSdk = new PumpAmmSdk(connection);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      // Collect all unique senders and build all instructions
      const uniqueSenders = new Map<string, Keypair>();
      const allInstructions: TransactionInstruction[] = [];

      // Process all operations in the batch
      for (const op of batch) {
        let senderKeypair: Keypair;

        if (op.sender) {
          if (typeof op.sender === 'object' && 'publicKey' in op.sender) {
            senderKeypair = op.sender;
          } else {
            throw new Error('BatchOperation.sender must be a Keypair when provided');
          }
        } else {
          throw new Error(`Operation ${op.id} is missing sender Keypair`);
        }

        const senderPubkeyStr = senderKeypair.publicKey.toString();

        // Track unique senders
        if (!uniqueSenders.has(senderPubkeyStr)) {
          uniqueSenders.set(senderPubkeyStr, senderKeypair);
        }

        // Build instructions for this operation
        const instructions = await buildInstructionsForOperation(
          connection,
          ammSdk,
          op,
          senderKeypair,
          feePayer
        );
        allInstructions.push(...instructions);
      }

      // Create single transaction with all operations
      const tx = new Transaction();
      allInstructions.forEach(ix => tx.add(ix));
      tx.recentBlockhash = blockhash;

      // Set fee payer
      if (feePayer) {
        tx.feePayer = feePayer.publicKey;
      } else {
        // If no fee payer, use the first sender as fee payer
        const firstSender = uniqueSenders.values().next().value;
        if (!firstSender) {
          throw new Error('No senders found in batch operations');
        }
        tx.feePayer = firstSender.publicKey;
      }

      // ALL unique senders must sign the combined transaction
      debugLog(`🔐 All ${uniqueSenders.size} unique senders will sign the combined transaction`);
      debugLog(`📋 Instructions in transaction: ${allInstructions.length}`);
      allInstructions.forEach((ix, index) => {
        debugLog(`  📝 Instruction ${index + 1}: Program ${ix.programId.toString()}`);
        debugLog(`    Keys: ${ix.keys.length} accounts`);
        ix.keys.forEach((key, keyIndex) => {
          debugLog(
            `      ${keyIndex}: ${key.pubkey.toString()} (${key.isSigner ? 'SIGNER' : 'READONLY'})`
          );
        });
      });

      const signersInOrder: Keypair[] = [];
      uniqueSenders.forEach((sender, pubkey) => {
        debugLog(`  • Will sign with: ${pubkey}`);
        signersInOrder.push(sender);
      });
      if (feePayer) {
        debugLog(`💸 Will sign with fee payer: ${feePayer.publicKey.toString()}`);
        signersInOrder.push(feePayer);
      }
      // Sign ONCE with all signers to avoid overwriting previous signatures
      tx.sign(...signersInOrder);

      debugLog(`🔍 Transaction signatures after signing: ${tx.signatures.length}`);
      tx.signatures.forEach((sig, index) => {
        const present = sig.signature && sig.signature.length > 0;
        debugLog(
          `  Signature ${index + 1}: ${sig.publicKey.toString()} - ${present ? 'present' : 'MISSING'}`
        );
      });

      // Submit the combined transaction
      debugLog(
        `🚀 Submitting transaction with ${tx.signatures.length} signatures and ${allInstructions.length} instructions`
      );
      debugLog(`💰 Fee payer: ${tx.feePayer?.toString() || 'Not set'}`);
      debugLog(`📦 Transaction size: ${tx.serialize().length} bytes`);

      const signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Combined multi-sender transaction failed: ${confirmation.value.err}`);
      }

      // Push results for all operations sharing the same signature
      batch.forEach(op => {
        results.push({ operationId: op.id, type: op.type, success: true, signature });
      });

      debugLog(`✅ Multi-sender batch executed successfully with signature: ${signature}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLog(`❌ Multi-sender batch failed: ${errorMessage}`);

      batch.forEach(op => {
        results.push({
          operationId: op.id,
          type: op.type,
          success: false,
          error: errorMessage,
        });
      });
    }

    // Delay between batches if configured
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
      if (disableFallbackRetry) {
        debugLog(
          `⚠️  Fallback retry disabled - ${failedOperations.length} operations failed and will not be retried`
        );
        debugLog(`💡 To enable fallback retry, set disableFallbackRetry=false`);
      } else {
        debugLog(
          `🔄 Retrying ${failedOperations.length} failed operations using fallback method...`
        );
        debugLog(
          `⚠️  WARNING: Using fallback retry - operations will be executed individually (not batched)`
        );

        for (const operation of failedOperations) {
          debugLog(`🔄 Retrying operation: ${operation.id}`);
          const retryResult = await executeOperation(connection, feePayer, operation);

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
  }

  return results;
}

/**
 * Execute a single operation
 */
async function executeOperation(
  connection: Connection,
  feePayer: Keypair | undefined,
  operation: BatchOperation
): Promise<BatchResult> {
  try {
    debugLog(`🚀 Executing ${operation.type}: ${operation.description}`);

    let result: OperationResult;
    const { type } = operation;

    if (!operation.sender) {
      throw new Error(`Operation ${operation.id} is missing sender Keypair`);
    }
    const wallet = operation.sender as Keypair;

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
