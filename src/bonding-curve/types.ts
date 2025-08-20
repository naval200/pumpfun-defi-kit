import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Parameters for buying tokens from bonding curve
 */
export interface BuyParams {
  payer: PublicKey;
  mint: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  associatedUser: PublicKey;
  amount: BN;
  solAmount: BN;
  slippageBasisPoints: number;
  globalVolumeAccumulator?: PublicKey;
  userVolumeAccumulator?: PublicKey;
  connection?: Connection;
}

/**
 * Parameters for selling tokens to bonding curve
 */
export interface SellParams {
  seller: PublicKey;
  mint: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  associatedUser: PublicKey;
  sellTokenAmount: bigint;
  slippageBasisPoints: number;
}

/**
 * Bonding curve state information
 */
export interface BondingCurveState {
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
  progress: number;
}

/**
 * Bonding curve validation result
 */
export interface BondingCurveValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    virtualSolReserves: bigint;
    virtualTokenReserves: bigint;
    realSolReserves: bigint;
    realTokenReserves: bigint;
    complete: boolean;
  };
}

/**
 * Bonding curve account structure
 */
export interface BondingCurveAccount {
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
}

/**
 * Bonding curve progress calculation parameters
 */
export interface BondingCurveProgressParams {
  realTokenReserves: bigint;
  initialRealTokenReserves: bigint;
}

/**
 * Bonding curve price calculation parameters
 */
export interface BondingCurvePriceParams {
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
}

/**
 * Bonding curve trade parameters
 */
export interface BondingCurveTradeParams {
  inputAmount: bigint;
  direction: 'buy' | 'sell';
  slippageBasisPoints: number;
}

/**
 * Bonding curve trade result
 */
export interface BondingCurveTradeResult {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  fee: bigint;
  success: boolean;
  signature?: string;
  error?: string;
}

// Essential types moved from main types.ts

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
