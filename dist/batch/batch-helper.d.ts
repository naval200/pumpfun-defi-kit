import { Connection, Keypair, Commitment, TransactionInstruction } from '@solana/web3.js';
import type { GenericBatchOptions, GenericBatchResult, GenericBatchOperation } from '../@types';
interface ExecutorResult {
    success: boolean;
    signature?: string;
    error?: string;
}
/**
 * Execute generic batch operations with custom execution logic
 *
 * This helper function allows you to batch any type of homogeneous operations
 * by providing a custom executor function for each operation type.
 */
export declare function executeGenericBatch<T extends GenericBatchOperation>(connection: Connection, operations: T[], executor: (operation: T, connection: Connection, feePayer: Keypair) => Promise<ExecutorResult>, options: GenericBatchOptions): Promise<GenericBatchResult[]>;
/**
 * Execute operations in a single combined transaction
 *
 * This is useful for operations that can be safely combined into one transaction,
 * such as multiple SPL token transfers or other homogeneous operations.
 */
export declare function executeCombinedTransaction(connection: Connection, operations: GenericBatchOperation[], instructionBuilder: (operation: GenericBatchOperation) => TransactionInstruction[], signers: Keypair[], feePayer: Keypair, options?: {
    skipPreflight?: boolean;
    preflightCommitment?: Commitment;
}): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
}>;
/**
 * Utility function to chunk array into smaller arrays
 */
export declare function chunkArray<T>(array: T[], chunkSize: number): T[][];
/**
 * Validate generic batch operations structure
 */
export declare function validateGenericBatchOperations(operations: GenericBatchOperation[], validTypes: string[]): {
    valid: boolean;
    errors: string[];
};
/**
 * Calculate optimal batch size based on transaction size limits
 *
 * Solana has a transaction size limit of ~1232 bytes for instructions.
 * This helper estimates how many operations can fit in a single transaction.
 */
export declare function calculateOptimalBatchSize(estimatedInstructionSize: number, maxTransactionSize?: number): number;
/**
 * Create a batch execution plan
 *
 * This helps optimize batch execution by grouping operations that can be combined
 * and determining the optimal execution strategy.
 */
export declare function createBatchExecutionPlan<T extends GenericBatchOperation>(operations: T[], canCombine: (op1: T, op2: T) => boolean, maxBatchSize?: number): {
    combinedBatches: T[][];
    individualOperations: T[];
};
export {};
//# sourceMappingURL=batch-helper.d.ts.map