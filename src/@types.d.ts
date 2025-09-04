import type { PublicKey, Keypair, Commitment } from '@solana/web3.js';
/**
 * PumpFun token configuration - only the essential fields
 */
export interface TokenConfig {
    name: string;
    symbol: string;
    description: string;
    imagePath?: string;
    websiteUrl?: string;
    twitterUrl?: string;
    telegramUrl?: string;
    initialBuyAmount?: number;
}
/**
 * PumpFun token creation result
 */
export interface CreateTokenResult {
    success: boolean;
    mint?: string;
    mintKeypair?: Keypair;
    signature?: string;
    bondingCurveAddress?: string;
    creatorVaultAddress?: string;
    error?: string;
}
/**
 * Solana connection configuration
 */
export interface ConnectionConfig {
    rpcUrl: string;
    wsUrl: string;
    network: 'mainnet' | 'devnet';
}
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
 * Transaction options with fee payer support
 */
export interface TransactionWithFeePayerOptions extends TransactionOptions {
    feePayer?: PublicKey;
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
 * Result of a batch operation with additional metadata
 */
export interface OperationResult extends TransactionResult {
    amount?: number;
    mint?: string;
}
/**
 * Batch Transactions types
 */
export type BatchOperationBase<T, P> = {
    type: T;
    id: string;
    description?: string;
    params: P;
    sender?: Keypair;
};
export type BatchOperationTransfer = BatchOperationBase<'transfer', {
    recipient: string;
    mint: string;
    amount: number;
    createAccount?: boolean;
}>;
export type BatchOperationSolTransfer = BatchOperationBase<'sol-transfer', {
    recipient: string;
    amount: number;
}>;
export type BatchOperationBuyAmm = BatchOperationBase<'buy-amm', {
    poolKey: string;
    amount: number;
    slippage: number;
    createAccount?: boolean;
    tokenMint?: string;
}>;
export type BatchOperationSellAmm = BatchOperationBase<'sell-amm', {
    poolKey: string;
    amount: number;
    slippage: number;
}>;
export type BatchOperationBuyBondingCurve = BatchOperationBase<'buy-bonding-curve', {
    mint: string;
    amount: number;
    slippage: number;
    createAccount?: boolean;
}>;
export type BatchOperationSellBondingCurve = BatchOperationBase<'sell-bonding-curve', {
    mint: string;
    amount: number;
    slippage: number;
}>;
export type BatchOperation = BatchOperationTransfer | BatchOperationSolTransfer | BatchOperationBuyAmm | BatchOperationSellAmm | BatchOperationBuyBondingCurve | BatchOperationSellBondingCurve;
export interface BatchResult {
    operationId: string;
    type: string;
    success: boolean;
    signature?: string;
    error?: string;
}
export interface BatchExecutionOptions {
    maxParallel?: number;
    delayBetween?: number;
    retryFailed?: boolean;
    disableFallbackRetry?: boolean;
    maxTransferInstructionsPerTx?: number;
    combinePerBatch?: boolean;
}
/**
 * Multi-sender batch for true batching across different senders
 * All operations are combined into a single transaction signed by all senders
 */
export interface MultiSenderBatch {
    id: string;
    operations: BatchOperation[];
    signers: Keypair[];
    feePayer?: Keypair;
}
/**
 * Generic batch execution options
 */
export interface GenericBatchOptions {
    maxParallel?: number;
    delayBetween?: number;
    retryFailed?: boolean;
    feePayer: Keypair;
}
/**
 * Generic batch result
 */
export interface GenericBatchResult {
    operationId: string;
    type: string;
    success: boolean;
    signature?: string;
    error?: string;
}
/**
 * Generic batch operation interface
 */
export interface GenericBatchOperation {
    id: string;
    type: string;
    description: string;
    params: Record<string, any>;
}
/**
 * SOL transfer options
 */
export interface SendSolOptions {
    maxRetries?: number;
    retryDelay?: number;
}
/**
 * SOL transfer result
 */
export interface SendSolResult {
    success: boolean;
    signature?: string;
    error?: string;
}
export type AmmSwapState = any;
//# sourceMappingURL=@types.d.ts.map