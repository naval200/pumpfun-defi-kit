import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import type { BatchOperation } from '../@types';
/**
 * Build instructions for a single batch operation
 */
export declare function buildInstructionsForOperation(connection: Connection, ammSdk: PumpAmmSdk, operation: BatchOperation, senderKeypair: Keypair, feePayer?: Keypair): Promise<TransactionInstruction[]>;
export declare function chunkArray<T>(items: T[], chunkSize: number): T[][];
/**
 * Estimate transaction size and validate against Solana limits
 */
export declare function estimateTransactionLimits(instructions: TransactionInstruction[], signers: Keypair[]): {
    canFit: boolean;
    estimatedSize: number;
    accountCount: number;
    reasons: string[];
};
/**
 * Dynamically determine optimal batch size for operations
 */
export declare function determineOptimalBatchSize(connection: Connection, operations: BatchOperation[], feePayer?: Keypair): Promise<{
    maxOpsPerBatch: number;
    reasoning: string;
}>;
//# sourceMappingURL=batch-helper.d.ts.map