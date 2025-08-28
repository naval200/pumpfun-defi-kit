import { Connection, Transaction, Keypair, PublicKey, Commitment, TransactionInstruction } from '@solana/web3.js';
/**
 * Transaction sending options with sensible defaults
 */
export interface TransactionOptions {
    skipPreflight?: boolean;
    preflightCommitment?: Commitment;
    maxRetries?: number;
    retryDelay?: number;
    computeUnitLimit?: number;
    computeUnitPrice?: number;
}
/**
 * Result of a transaction operation
 */
export interface TransactionResult {
    success: boolean;
    signature?: string;
    error?: string;
    slot?: number;
}
/**
 * Add compute budget instructions to a transaction
 * @param transaction - The transaction to add compute budget instructions to
 * @param options - Transaction options including compute unit settings
 */
export declare function addComputeBudgetInstructions(transaction: Transaction, options?: TransactionOptions): void;
/**
 * Prepare a transaction for sending by setting recent blockhash and fee payer
 * @param connection - Solana connection
 * @param transaction - Transaction to prepare
 * @param feePayer - Public key of the fee payer
 * @param commitment - Commitment level for getting blockhash
 * @returns The prepared transaction
 */
export declare function prepareTransaction(connection: Connection, transaction: Transaction, feePayer: PublicKey, commitment?: Commitment): Promise<Transaction>;
/**
 * Send a transaction with retry logic and proper error handling
 * @param connection - Solana connection
 * @param transaction - Transaction to send
 * @param signers - Array of keypairs to sign the transaction
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult
 */
export declare function sendTransactionWithRetry(connection: Connection, transaction: Transaction, signers: Keypair[], options?: TransactionOptions): Promise<TransactionResult>;
/**
 * Send a raw transaction with retry logic
 * @param connection - Solana connection
 * @param rawTransaction - Serialized transaction bytes
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult
 */
export declare function sendRawTransactionWithRetry(connection: Connection, rawTransaction: Buffer | Uint8Array, options?: TransactionOptions): Promise<TransactionResult>;
/**
 * Confirm a transaction with specified commitment level
 * @param connection - Solana connection
 * @param signature - Transaction signature to confirm
 * @param commitment - Commitment level for confirmation
 * @returns Promise resolving to TransactionResult with confirmation details
 */
export declare function confirmTransaction(connection: Connection, signature: string, commitment?: Commitment): Promise<TransactionResult>;
/**
 * Send and confirm a transaction in one operation
 * @param connection - Solana connection
 * @param transaction - Transaction to send
 * @param signers - Array of keypairs to sign the transaction
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult with confirmation details
 */
export declare function sendAndConfirmTransaction(connection: Connection, transaction: Transaction, signers: Keypair[], options?: TransactionOptions): Promise<TransactionResult>;
/**
 * Send and confirm a raw transaction in one operation
 * @param connection - Solana connection
 * @param rawTransaction - Serialized transaction bytes
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult with confirmation details
 */
export declare function sendAndConfirmRawTransaction(connection: Connection, rawTransaction: Buffer | Uint8Array, options?: TransactionOptions): Promise<TransactionResult>;
/**
 * Utility function to create a transaction with compute budget instructions
 * @param options - Transaction options
 * @returns A new transaction with compute budget instructions
 */
export declare function createTransactionWithComputeBudget(options?: TransactionOptions): Transaction;
/**
 * Create and send a transaction with the given instructions
 * @param connection - Solana connection
 * @param wallet - Keypair to sign the transaction
 * @param instructions - Array of transaction instructions
 * @returns Promise resolving to transaction signature
 */
export declare function sendTransaction(connection: Connection, wallet: Keypair, instructions: TransactionInstruction[]): Promise<string>;
/**
 * Get transaction explorer URL
 * @param signature - Transaction signature
 * @param network - Network ('mainnet' or 'devnet')
 * @returns Explorer URL string
 */
export declare function getExplorerUrl(signature: string, network?: 'mainnet' | 'devnet'): string;
//# sourceMappingURL=transaction.d.ts.map