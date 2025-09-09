import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import type { BatchOperation, BatchExecutionOptions } from '../@types';
/**
 * Result of instruction creation for a batch
 */
export interface BatchInstructionResult {
    transaction: Transaction;
    blockhash: string;
    lastValidBlockHeight: number;
    signers: Keypair[];
    feePayer: PublicKey;
    operationCount: number;
    instructionCount: number;
    uniqueSendersCount: number;
}
/**
 * Create instructions and prepare transaction for a batch of operations
 *
 * This function handles the instruction creation part of batch transactions:
 * - Collects all unique senders
 * - Builds instructions for all operations
 * - Creates a single transaction with all instructions
 * - Returns transaction details needed for signing and execution
 */
export declare function createBatchInstructions(connection: Connection, operations: BatchOperation[], feePayer?: Keypair, options?: BatchExecutionOptions): Promise<BatchInstructionResult[]>;
//# sourceMappingURL=instructions.d.ts.map