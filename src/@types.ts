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
  initialBuyAmount?: number; // SOL amount to buy immediately after creation
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
 * Batch Transactions types
 */
export interface BatchOperation {
  type: 'transfer' | 'sell-bonding-curve' | 'sell-amm';
  id: string;
  description: string;
  params: any;
  sender?: string; // optional per-op sender for transfers
}

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
  maxTransferInstructionsPerTx?: number;
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