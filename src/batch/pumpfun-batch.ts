import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { debugLog, logError } from '../utils/debug';
import type { BatchOperation, BatchResult, BatchExecutionOptions } from '../@types';
import { sendToken, sendTokenWithAccountCreation } from '../sendToken';
import { sellTokens } from '../amm';
import { createSignedSellTransaction } from '../bonding-curve/sell';
import { chunkArray } from './batch-helper';

// Re-export types for external use
export type { BatchOperation, BatchResult, BatchExecutionOptions };

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
  feePayer: Keypair,
  options: Partial<BatchExecutionOptions> = {}
): Promise<BatchResult[]> {
  const { maxParallel = 3, delayBetween = 1000, retryFailed = false } = options;
  const results: BatchResult[] = [];

  // Validate fee payer is provided
  if (!feePayer) {
    throw new Error('Fee payer is required for batch transactions');
  }

  debugLog(`🚀 Executing ${operations.length} PumpFun operations in batches of ${maxParallel}`);
  debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);

  // Execute operations individually in batches
  const batches = chunkArray(operations, maxParallel);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    debugLog(`🔄 Executing Batch ${batchIndex + 1}/${batches.length} (${batch.length} operations)`);

    // Execute batch in parallel
    const batchPromises = batch.map(async operation => {
      try {
        debugLog(`🚀 Executing ${operation.type}: ${operation.description}`);

        let result: any;

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
  feePayer: Keypair,
  operation: BatchOperation
): Promise<BatchResult> {
  try {
    debugLog(`🚀 Executing ${operation.type}: ${operation.description}`);

    let result: any;

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
  feePayer: Keypair,
  params: any
): Promise<any> {
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
 * Execute bonding curve sell operation
 */
async function executeBondingCurveSell(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair,
  params: any
): Promise<any> {
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
  feePayer: Keypair,
  params: any
): Promise<any> {
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
 * Validate PumpFun batch operations structure
 */
export function validatePumpFunBatchOperations(operations: BatchOperation[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const validTypes = ['transfer', 'sell-bonding-curve', 'sell-amm'];

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
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
