import { Connection, Keypair } from '@solana/web3.js';
import type { BatchOperation, BatchResult, BatchExecutionOptions } from '../@types';
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
export declare function batchTransactions(connection: Connection, operations: BatchOperation[], feePayer?: Keypair, options?: Partial<BatchExecutionOptions & {
    dynamicBatching?: boolean;
}>): Promise<BatchResult[]>;
/**
 * Validate PumpFun batch operations structure
 */
export declare function validatePumpFunBatchOperations(operations: BatchOperation[]): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=pumpfun-batch.d.ts.map