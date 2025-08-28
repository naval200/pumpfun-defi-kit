import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { debugLog, logError, logSuccess } from './utils/debug';
import type { BatchOperation, BatchResult, BatchExecutionOptions } from './@types';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { createSignedAmmSellTransaction } from './amm/sell';
import { createSignedSellTransaction } from './bonding-curve/sell';

/**
 * Execute batch transactions
 * 
 * Note: Only consuming operations (transfers, sell-amm, sell-bonding-curve) can be batched together.
 * Buy operations (buy-amm, buy-bonding-curve) cannot be batched because:
 * - They create tokens and often require creating new Associated Token Accounts (ATAs)
 * - They have different account setup requirements than sell operations
 * - They may have interdependencies that make batching complex
 * - They change pool state which could affect subsequent operations
 * - They have different signing and authorization patterns
 */
export async function executeBatchTransactions(
  connection: Connection,
  wallet: Keypair,
  operations: BatchOperation[],
  options: BatchExecutionOptions
): Promise<BatchResult[]> {
  const { maxParallel = 3, delayBetween = 1000, retryFailed = false, feePayer } = options;
  const results: BatchResult[] = [];
  
  // Validate fee payer is provided
  if (!feePayer) {
    throw new Error('Fee payer is required for batch transactions');
  }
  
  console.log(`🚀 Executing ${operations.length} operations in batches of ${maxParallel}`);
  console.log(`💸 Using fee payer: ${feePayer.publicKey.toString()} for all transactions`);
  console.log(`📝 Note: All transactions in this batch will use the same fee payer`);
  
  // Get a single recent blockhash for the entire batch execution
  // This ensures all transactions can be processed together efficiently
  console.log('🔗 Getting shared blockhash for batch operations...');
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  console.log(`📝 Using blockhash: ${blockhash}`);
  
  // Check if all operations are "consuming" operations (transfers, sells)
  // These can be batched together since they all reduce PumpFun token balances
  const consumingOps = ['transfer', 'sell-amm', 'sell-bonding-curve'];
  const allConsuming = operations.every(op => consumingOps.includes(op.type));
  
  if (allConsuming) {
    try {
      const maxPerTx = options.maxTransferInstructionsPerTx ?? 20;
      const combinedTxs = await buildAutoChunkedPumpFunConsumingTransactions(
        connection,
        operations,
        feePayer,
        blockhash,
        wallet,
        maxPerTx
      );

      for (const [idx, tx] of combinedTxs.entries()) {
        const submit = await submitTransaction(connection, tx, `combined-pumpfun-consuming-${idx + 1}`);
        // mark all ops as the same result; if we chunked, each chunk reports result for its subset
        const start = idx * maxPerTx;
        const slice = operations.slice(start, Math.min(start + maxPerTx, operations.length));
        slice.forEach(op => {
          results.push({
            operationId: op.id,
            type: op.type,
            success: submit.success,
            signature: submit.signature,
            error: submit.error,
          });
        });
      }
      return results;
    } catch (e) {
      logError('Failed to build/submit combined PumpFun consuming transaction:', e);
      // Fallback to per-op execution below
    }
  }

  // For non-consuming or mixed batches, return errors
  operations.forEach(op => {
    results.push({
      operationId: op.id,
      type: op.type,
      success: false,
      error: 'Only consuming operations (transfers, sell-amm, sell-bonding-curve) are supported in combined transaction mode',
    });
  });

  return results;
}

/**
 * Submit a signed transaction to the network
 */
async function submitTransaction(
  connection: Connection,
  transaction: Transaction,
  operationId: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    debugLog(`📤 Submitting transaction for operation: ${operationId}`);
    
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }
    
    logSuccess(`Transaction confirmed for operation ${operationId}: ${signature}`);
    
    return {
      success: true,
      signature
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Failed to submit transaction for operation ${operationId}: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Build a single transaction containing multiple PumpFun token consuming operations
 * All operations will share the same fee payer and blockhash
 */
async function buildCombinedPumpFunConsumingTransaction(
  connection: Connection,
  operations: BatchOperation[],
  feePayer: Keypair,
  blockhash: string,
  defaultSender: Keypair
): Promise<Transaction> {
  const tx = new Transaction();
  tx.feePayer = feePayer.publicKey;
  tx.recentBlockhash = blockhash;

  // Collect unique signers (senders) required
  const signers: Keypair[] = [];
  const ensureSigner = (kp: Keypair) => {
    if (!signers.find(s => s.publicKey.equals(kp.publicKey))) signers.push(kp);
  };

  for (const op of operations) {
    const sender: Keypair = op.params?.sender || defaultSender;
    ensureSigner(sender);

    switch (op.type) {
      case 'transfer':
        const { recipient, mint, amount } = op.params;
        const fromAta = await getAssociatedTokenAddress(new PublicKey(mint), sender.publicKey);
        const toAta = await getAssociatedTokenAddress(new PublicKey(mint), new PublicKey(recipient));
        const transferIx = createTransferInstruction(fromAta, toAta, sender.publicKey, BigInt(amount));
        tx.add(transferIx);
        break;

      case 'sell-amm':
        // Create signed AMM sell transaction and extract instructions
        const ammSellTx = await createSignedAmmSellTransaction(
          connection,
          sender,
          new PublicKey(op.params.poolKey),
          op.params.amount,
          op.params.slippage || 1,
          feePayer,
          blockhash
        );
        if (ammSellTx.success && ammSellTx.transaction) {
          // Add all instructions from the AMM sell transaction
          ammSellTx.transaction.instructions.forEach((ix: any) => tx.add(ix));
        }
        break;

      case 'sell-bonding-curve':
        // Create signed bonding curve sell transaction and extract instructions
        const bondingSellTx = await createSignedSellTransaction(
          connection,
          sender,
          new PublicKey(op.params.mint),
          op.params.amount,
          op.params.slippage || 1000,
          feePayer,
          blockhash
        );
        if (bondingSellTx.success && bondingSellTx.transaction) {
          // Add all instructions from the bonding curve sell transaction
          bondingSellTx.transaction.instructions.forEach((ix: any) => tx.add(ix));
        }
        break;

      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  }

  // Partial sign by all senders
  signers.forEach(s => tx.partialSign(s));
  // Fee payer signs last
  tx.sign(feePayer);

  return tx;
}

/**
 * Auto-chunk combined PumpFun token consuming operations to avoid transaction size/compute limits
 */
async function buildAutoChunkedPumpFunConsumingTransactions(
  connection: Connection,
  operations: BatchOperation[],
  feePayer: Keypair,
  blockhash: string,
  defaultSender: Keypair,
  maxPerTx: number
): Promise<Transaction[]> {
  const txs: Transaction[] = [];
  for (let i = 0; i < operations.length; i += maxPerTx) {
    const chunk = operations.slice(i, i + maxPerTx);
    const tx = await buildCombinedPumpFunConsumingTransaction(connection, chunk, feePayer, blockhash, defaultSender);
    txs.push(tx);
  }
  return txs;
}

/**
 * Execute batch transactions with simplified API
 */
export async function batchTransactions(
  connection: Connection,
  wallet: Keypair,
  operations: BatchOperation[],
  feePayer: Keypair,
  options: Partial<BatchExecutionOptions> = {}
): Promise<BatchResult[]> {
  const defaultOptions: BatchExecutionOptions = {
    maxParallel: 3,
    delayBetween: 1000,
    retryFailed: false,
    feePayer
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  return executeBatchTransactions(connection, wallet, operations, finalOptions);
}

/**
 * Utility function to chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Validate batch operations structure
 */
export function validateBatchOperations(operations: BatchOperation[]): { valid: boolean; errors: string[] } {
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
        if (!op.params.poolKey || op.params.amount === undefined || op.params.slippage === undefined) {
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
    errors
  };
}
