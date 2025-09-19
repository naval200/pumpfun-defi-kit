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
export type BatchOperationCreateAccount = BatchOperationBase<'create-account', {
    mint: string;
    owner: string;
}>;
export type BatchOperationTransfer = BatchOperationBase<'transfer', {
    recipient: string;
    mint: string;
    amount: number;
}>;
export type BatchOperationSolTransfer = BatchOperationBase<'sol-transfer', {
    recipient: string;
    amount: number;
}>;
export type BatchOperationBuyAmm = BatchOperationBase<'buy-amm', {
    poolKey: string;
    amount: number;
    slippage: number;
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
}>;
export type BatchOperationSellBondingCurve = BatchOperationBase<'sell-bonding-curve', {
    mint: string;
    amount: number;
    slippage: number;
}>;
export type BatchOperation = BatchOperationCreateAccount | BatchOperationTransfer | BatchOperationSolTransfer | BatchOperationBuyAmm | BatchOperationSellAmm | BatchOperationBuyBondingCurve | BatchOperationSellBondingCurve;
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
    dynamicBatching?: boolean;
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
/**
 * Transaction fetching types
 */
/**
 * Token transfer data
 */
export interface TokenTransfer {
    mint: string;
    owner: string;
    change: number;
    decimals: number;
    amount: string;
    uiAmount: number;
}
/**
 * SOL transfer data
 */
export interface SolTransfer {
    accountIndex: number;
    change: number;
    postBalance: number;
    preBalance: number;
}
/**
 * Transaction data
 */
export interface TransactionData {
    signature: string;
    slot: number;
    blockTime: number | null;
    fee: number;
    success: boolean;
    error: any;
    tokenTransfers: TokenTransfer[];
    solTransfers: SolTransfer[];
    explorerUrl: string;
    isBatchTransaction: boolean;
    instructionCount: number;
    accountCount: number;
}
/**
 * Options for fetching transactions
 */
export interface GetTransactionsOptions {
    network?: 'devnet' | 'mainnet';
    limit?: number;
    mintFilter?: string;
    includeBatchAnalysis?: boolean;
}
//# sourceMappingURL=@types.d.ts.map