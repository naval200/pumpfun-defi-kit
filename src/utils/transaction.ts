import {
  Connection,
  Transaction,
  Keypair,
  PublicKey,
  Commitment,
  ComputeBudgetProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { log, logSuccess, logSignature, logError } from './debug';
import type {
  TransactionOptions,
  TransactionWithFeePayerOptions,
  TransactionResult,
} from '../@types';

/**
 * Transaction sending options with sensible defaults
 */
// TransactionOptions moved to src/@types.ts

/**
 * Transaction options with fee payer support
 */
// TransactionWithFeePayerOptions moved to src/@types.ts

/**
 * Result of a transaction operation
 */
// TransactionResult moved to src/@types.ts

/**
 * Default transaction options
 */
const DEFAULT_OPTIONS: Required<TransactionOptions> = {
  skipPreflight: false,
  preflightCommitment: 'confirmed',
  maxRetries: 3,
  retryDelay: 1000,
  computeUnitLimit: 100000,
  computeUnitPrice: 1000,
};

/**
 * Add compute budget instructions to a transaction
 * @param transaction - The transaction to add compute budget instructions to
 * @param options - Transaction options including compute unit settings
 */
export function addComputeBudgetInstructions(
  transaction: Transaction,
  options: TransactionOptions = {}
): void {
  const { computeUnitLimit, computeUnitPrice } = { ...DEFAULT_OPTIONS, ...options };

  // Add compute budget instruction for unit limit
  transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }));

  // Add compute budget instruction for unit price (priority fee)
  transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPrice }));
}

/**
 * Prepare a transaction for sending by setting recent blockhash and fee payer
 * @param connection - Solana connection
 * @param transaction - Transaction to prepare
 * @param feePayer - Public key of the fee payer
 * @param commitment - Commitment level for getting blockhash
 * @returns The prepared transaction
 */
export async function prepareTransaction(
  connection: Connection,
  transaction: Transaction,
  feePayer: PublicKey,
  commitment: Commitment = 'confirmed'
): Promise<Transaction> {
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash(commitment);

  // Set transaction properties
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = feePayer;

  return transaction;
}

/**
 * Send a transaction with retry logic and proper error handling
 * @param connection - Solana connection
 * @param transaction - Transaction to send
 * @param signers - Array of keypairs to sign the transaction
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult
 */
export async function sendTransactionWithRetry(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
  options: TransactionOptions = {}
): Promise<TransactionResult> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  const { maxRetries, retryDelay, preflightCommitment } = finalOptions;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`📡 Sending transaction (attempt ${attempt}/${maxRetries})...`);

      // Send the transaction
      const signature = await connection.sendTransaction(transaction, signers, {
        skipPreflight: finalOptions.skipPreflight,
        preflightCommitment,
        maxRetries: 1, // We handle retries ourselves
      });

      logSuccess('Transaction sent successfully!');
      logSignature(signature, 'Transaction');

      return {
        success: true,
        signature,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      log(`❌ Transaction attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        log(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Get a fresh blockhash for the retry
        try {
          const { blockhash } = await connection.getLatestBlockhash(preflightCommitment);
          transaction.recentBlockhash = blockhash;
        } catch (blockhashError) {
          logError('Failed to get fresh blockhash:', blockhashError);
        }
      }
    }
  }

  return {
    success: false,
    error: `Transaction failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
  };
}

/**
 * Send a raw transaction with retry logic
 * @param connection - Solana connection
 * @param rawTransaction - Serialized transaction bytes
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult
 */
export async function sendRawTransactionWithRetry(
  connection: Connection,
  rawTransaction: Buffer | Uint8Array,
  options: TransactionOptions = {}
): Promise<TransactionResult> {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  const { maxRetries, retryDelay, preflightCommitment } = finalOptions;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`📡 Sending raw transaction (attempt ${attempt}/${maxRetries})...`);

      // Send the raw transaction
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: finalOptions.skipPreflight,
        preflightCommitment,
        maxRetries: 1, // We handle retries ourselves
      });

      logSuccess('Raw transaction sent successfully!');
      logSignature(signature, 'Raw transaction');

      return {
        success: true,
        signature,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      log(`❌ Raw transaction attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        log(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  return {
    success: false,
    error: `Raw transaction failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
  };
}

/**
 * Confirm a transaction with specified commitment level
 * @param connection - Solana connection
 * @param signature - Transaction signature to confirm
 * @param commitment - Commitment level for confirmation
 * @returns Promise resolving to TransactionResult with confirmation details
 */
export async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed'
): Promise<TransactionResult> {
  try {
    log(`⏳ Confirming transaction: ${signature}`);

    const confirmation = await connection.confirmTransaction(signature, commitment);

    if (confirmation.value.err) {
      return {
        success: false,
        signature,
        error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
      };
    }

    logSuccess('Transaction confirmed successfully!');

    return {
      success: true,
      signature,
      slot: confirmation.context.slot,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      signature,
      error: `Confirmation failed: ${errorMessage}`,
    };
  }
}

/**
 * Send and confirm a transaction in one operation
 * @param connection - Solana connection
 * @param transaction - Transaction to send
 * @param signers - Array of keypairs to sign the transaction
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult with confirmation details
 */
export async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
  options: TransactionWithFeePayerOptions = {}
): Promise<TransactionResult> {
  // Send the transaction
  const sendResult = await sendTransactionWithRetry(connection, transaction, signers, options);

  if (!sendResult.success || !sendResult.signature) {
    return sendResult;
  }

  // Confirm the transaction
  const confirmResult = await confirmTransaction(
    connection,
    sendResult.signature,
    options.preflightCommitment
  );

  // Merge the results
  return {
    success: true,
    signature: sendResult.signature,
    error: confirmResult.error,
    slot: confirmResult.slot,
  };
}

/**
 * Send and confirm a transaction with separate fee payer and signers
 * @param connection - Solana connection
 * @param transaction - Transaction to send
 * @param signers - Array of keypairs to sign the transaction
 * @param feePayer - Keypair for the fee payer (if different from signers)
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult with confirmation details
 */
export async function sendAndConfirmTransactionWithFeePayer(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
  feePayer?: Keypair,
  options: TransactionWithFeePayerOptions = {}
): Promise<TransactionResult> {
  // Set fee payer if provided
  if (feePayer) {
    transaction.feePayer = feePayer.publicKey;
  }

  // Prepare transaction with recent blockhash
  const preparedTransaction = await prepareTransaction(
    connection,
    transaction,
    transaction.feePayer || signers[0].publicKey,
    options.preflightCommitment
  );

  // Combine all signers (fee payer + transaction signers)
  const allSigners = feePayer ? [feePayer, ...signers] : signers;

  // Send the transaction
  const sendResult = await sendTransactionWithRetry(
    connection,
    preparedTransaction,
    allSigners,
    options
  );

  if (!sendResult.success || !sendResult.signature) {
    return sendResult;
  }

  // Confirm the transaction
  const confirmResult = await confirmTransaction(
    connection,
    sendResult.signature,
    options.preflightCommitment
  );

  // Merge the results
  return {
    success: true,
    signature: sendResult.signature,
    error: confirmResult.error,
    slot: confirmResult.slot,
  };
}

/**
 * Send and confirm a raw transaction in one operation
 * @param connection - Solana connection
 * @param rawTransaction - Serialized transaction bytes
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult with confirmation details
 */
export async function sendAndConfirmRawTransaction(
  connection: Connection,
  rawTransaction: Buffer | Uint8Array,
  options: TransactionOptions = {}
): Promise<TransactionResult> {
  // Send the raw transaction
  const sendResult = await sendRawTransactionWithRetry(connection, rawTransaction, options);

  if (!sendResult.success || !sendResult.signature) {
    return sendResult;
  }

  // Confirm the transaction
  const confirmResult = await confirmTransaction(
    connection,
    sendResult.signature,
    options.preflightCommitment
  );

  // Merge the results
  return {
    success: true,
    signature: sendResult.signature,
    error: confirmResult.error,
    slot: confirmResult.slot,
  };
}

/**
 * Utility function to create a transaction with compute budget instructions
 * @param options - Transaction options
 * @returns A new transaction with compute budget instructions
 */
export function createTransactionWithComputeBudget(options: TransactionOptions = {}): Transaction {
  const transaction = new Transaction();
  addComputeBudgetInstructions(transaction, options);
  return transaction;
}

/**
 * Create and send a transaction with the given instructions
 * @param connection - Solana connection
 * @param wallet - Keypair to sign the transaction
 * @param instructions - Array of transaction instructions
 * @returns Promise resolving to transaction signature
 */
export async function sendTransaction(
  connection: Connection,
  wallet: Keypair,
  instructions: TransactionInstruction[]
): Promise<string> {
  const transaction = new Transaction();

  // Add all instructions
  instructions.forEach(instruction => {
    transaction.add(instruction);
  });

  // Send and confirm transaction using transaction utility
  const result = await sendAndConfirmTransaction(connection, transaction, [wallet], {
    preflightCommitment: 'confirmed',
  });

  if (!result.success) {
    throw new Error(`Transaction failed: ${result.error}`);
  }

  return result.signature!;
}

/**
 * Create and send a transaction with the given instructions and separate fee payer
 * @param connection - Solana connection
 * @param wallet - Keypair to sign the transaction
 * @param instructions - Array of transaction instructions
 * @param feePayer - Keypair for the fee payer (if different from wallet)
 * @returns Promise resolving to transaction signature
 */
export async function sendTransactionWithFeePayer(
  connection: Connection,
  wallet: Keypair,
  instructions: TransactionInstruction[],
  feePayer?: Keypair
): Promise<string> {
  const transaction = new Transaction();

  // Add all instructions
  instructions.forEach(instruction => {
    transaction.add(instruction);
  });

  // Send and confirm transaction using fee payer utility
  const result = await sendAndConfirmTransactionWithFeePayer(
    connection,
    transaction,
    [wallet],
    feePayer,
    { preflightCommitment: 'confirmed' }
  );

  if (!result.success) {
    throw new Error(`Transaction failed: ${result.error}`);
  }

  return result.signature!;
}

/**
 * Get transaction explorer URL
 * @param signature - Transaction signature
 * @param network - Network ('mainnet' or 'devnet')
 * @returns Explorer URL string
 */
export function getExplorerUrl(
  signature: string,
  network: 'mainnet' | 'devnet' = 'devnet'
): string {
  const baseUrl = 'https://explorer.solana.com/tx/';
  const clusterParam = network === 'mainnet' ? '' : '?cluster=devnet';
  return `${baseUrl}${signature}${clusterParam}`;
}
