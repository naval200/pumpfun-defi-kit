import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';

import { debugLog, logError } from '../utils/debug';
import { createBatchInstructions, BatchInstructionResult } from './instructions';
import { buildInstructionsForOperation } from './batch-helper';
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
  const { delayBetween = 1000, retryFailed = false, disableFallbackRetry = false } = options;

  debugLog(`🚀 Executing ${operations.length} PumpFun operations with true multi-sender batching`);
  debugLog(
    `📊 Batch options: delayBetween=${delayBetween}ms, retryFailed=${retryFailed}, disableFallbackRetry=${disableFallbackRetry}`
  );
  if (feePayer) {
    debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
  } else {
    debugLog('💸 No fee payer provided: each signer will pay their own fees');
  }

  // Create instructions for all batches
  const batchInstructions = await createBatchInstructions(
    connection,
    operations,
    feePayer,
    options
  );

  // Execute all batches
  const results = await executeBatchInstructions(connection, batchInstructions, operations, {
    delayBetween,
    retryFailed,
    disableFallbackRetry,
  });

  return results;
}

/**
 * Execute prepared batch instructions
 *
 * This function handles the execution part of batch transactions:
 * - Signs transactions with all required signers
 * - Submits transactions to the network
 * - Handles retries for failed operations
 * - Returns results for all operations
 */
export async function executeBatchInstructions(
  connection: Connection,
  batchInstructions: BatchInstructionResult[],
  operations: BatchOperation[],
  options: {
    delayBetween?: number;
    retryFailed?: boolean;
    disableFallbackRetry?: boolean;
  } = {}
): Promise<BatchResult[]> {
  const { delayBetween = 1000, retryFailed = false, disableFallbackRetry = false } = options;

  const results: BatchResult[] = [];

  for (let batchIndex = 0; batchIndex < batchInstructions.length; batchIndex++) {
    const batchInstruction = batchInstructions[batchIndex];
    debugLog(
      `🔄 Executing Batch ${batchIndex + 1}/${batchInstructions.length} (${batchInstruction.operationCount} operations)`
    );

    try {
      const { transaction, blockhash, lastValidBlockHeight, signers } = batchInstruction;

      // Sign ONCE with all signers to avoid overwriting previous signatures
      transaction.sign(...signers);

      debugLog(`🔍 Transaction signatures after signing: ${transaction.signatures.length}`);
      transaction.signatures.forEach((sig, index) => {
        const present = sig.signature && sig.signature.length > 0;
        debugLog(
          `  Signature ${index + 1}: ${sig.publicKey.toString()} - ${present ? 'present' : 'MISSING'}`
        );
      });

      // Submit the combined transaction
      debugLog(
        `🚀 Submitting transaction with ${transaction.signatures.length} signatures and ${batchInstruction.instructionCount} instructions`
      );
      debugLog(`💰 Fee payer: ${transaction.feePayer?.toString() || 'Not set'}`);
      debugLog(`📦 Transaction size: ${transaction.serialize().length} bytes`);

      const signature = await connection.sendRawTransaction(transaction.serialize(), {
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

      // Push results for all operations in this batch
      // We need to map the batch index back to the original operations
      const startIndex = batchIndex * batchInstruction.operationCount;
      const endIndex = startIndex + batchInstruction.operationCount;
      const batchOperations = operations.slice(startIndex, endIndex);

      batchOperations.forEach(op => {
        results.push({ operationId: op.id, type: op.type, success: true, signature });
      });

      debugLog(`✅ Multi-sender batch executed successfully with signature: ${signature}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLog(`❌ Multi-sender batch failed: ${errorMessage}`);

      // Push failure results for all operations in this batch
      const startIndex = batchIndex * batchInstruction.operationCount;
      const endIndex = startIndex + batchInstruction.operationCount;
      const batchOperations = operations.slice(startIndex, endIndex);

      batchOperations.forEach(op => {
        results.push({
          operationId: op.id,
          type: op.type,
          success: false,
          error: errorMessage,
        });
      });
    }

    // Delay between batches if configured
    if (batchIndex < batchInstructions.length - 1 && delayBetween > 0) {
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
          const retryResult = await executeOperation(connection, undefined, operation);

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

    if (!operation.sender) {
      throw new Error(`Operation ${operation.id} is missing sender Keypair`);
    }
    const wallet = operation.sender as Keypair;

    // Build instructions using the helper function
    const instructions = await buildInstructionsForOperation(
      connection,
      new PumpAmmSdk(connection),
      operation,
      wallet,
      feePayer
    );

    // Create and send transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = feePayer?.publicKey || wallet.publicKey;

    instructions.forEach(ix => transaction.add(ix));

    const signers = [wallet];
    if (feePayer) {
      signers.push(feePayer);
    }

    transaction.sign(...signers);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
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

    let result: OperationResult;
    if (confirmation.value.err) {
      result = { success: false, error: `Transaction failed: ${confirmation.value.err}` };
    } else {
      result = { success: true, signature };
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
