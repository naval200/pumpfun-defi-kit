import { Connection, Keypair } from '@solana/web3.js';
import { BatchInstructionResult } from './instructions';
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
 * Execute prepared batch instructions
 *
 * This function handles the execution part of batch transactions:
 * - Signs transactions with all required signers
 * - Submits transactions to the network
 * - Handles retries for failed operations
 * - Returns results for all operations
 */
export declare function executeBatchInstructions(connection: Connection, batchInstructions: BatchInstructionResult[], operations: BatchOperation[], options?: {
    delayBetween?: number;
    retryFailed?: boolean;
    disableFallbackRetry?: boolean;
}): Promise<BatchResult[]>;
/**
 * Validate PumpFun batch operations structure
 */
export declare function validatePumpFunBatchOperations(operations: BatchOperation[]): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=pumpfun-batch.d.ts.map