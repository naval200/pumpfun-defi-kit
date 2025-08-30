import { Connection, Keypair } from '@solana/web3.js';
import type { BatchOperation, BatchResult, BatchExecutionOptions } from '../@types';
/**
 * Execute a batch of PumpFun operations
 *
 * This function processes operations in parallel batches with configurable delays.
 * Supports both individual operation execution and combined transaction execution.
 * - combinePerBatch: Combines compatible operations into single transactions per sender
 * - Accounts are always assumed to exist (users must check beforehand)
 */
export declare function batchTransactions(connection: Connection, wallet: Keypair, operations: BatchOperation[], feePayer?: Keypair, options?: Partial<BatchExecutionOptions>): Promise<BatchResult[]>;
/**
 * Validate PumpFun batch operations structure
 */
export declare function validatePumpFunBatchOperations(operations: BatchOperation[]): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=pumpfun-batch.d.ts.map