import { PublicKey, Connection, TransactionInstruction, Keypair } from '@solana/web3.js';
/**
 * Derive bonding curve address from mint
 */
export declare function deriveBondingCurveAddress(mint: PublicKey): [PublicKey, number];
/**
 * Derive associated bonding curve address
 */
export declare function deriveAssociatedBondingCurveAddress(mint: PublicKey, bondingCurve: PublicKey): [PublicKey, number];
/**
 * Derive creator vault address from creator
 */
export declare function deriveCreatorVaultAddress(creator: PublicKey): [PublicKey, number];
/**
 * Derive global volume accumulator address
 */
export declare function deriveGlobalVolumeAccumulatorAddress(): [PublicKey, number];
/**
 * Derive user volume accumulator address
 */
export declare function deriveUserVolumeAccumulatorAddress(user: PublicKey): [PublicKey, number];
/**
 * Derive event authority address
 */
export declare function deriveEventAuthorityAddress(): [PublicKey, number];
/**
 * Derive global account address
 */
export declare function deriveGlobalAddress(): [PublicKey, number];
/**
 * Create compute budget instruction for setting compute unit limit
 */
export declare function createComputeUnitLimitInstruction(units: number): TransactionInstruction;
/**
 * Create compute budget instruction for setting compute unit price
 */
export declare function createComputeUnitPriceInstruction(microLamports: number): TransactionInstruction;
/**
 * Validate bonding curve account before operations
 */
export declare function validateBondingCurve(connection: Connection, mint: PublicKey): Promise<boolean>;
/**
 * Get bonding curve account info (placeholder implementation)
 */
export declare function getBondingCurveAccount(connection: Connection, mint: PublicKey, commitment?: string): Promise<{
    getBuyPrice: (solAmount: bigint) => bigint;
    getSellPrice: (tokenAmount: bigint, _feeBasisPoints: bigint) => bigint;
} | null>;
/**
 * Calculate buy amount with slippage
 */
export declare function calculateWithSlippageBuy(solAmount: bigint, slippageBasisPoints: bigint): bigint;
/**
 * Calculate sell amount with slippage
 */
export declare function calculateWithSlippageSell(solAmount: bigint, slippageBasisPoints: bigint): bigint;
/**
 * Get bonding curve PDA (alias for deriveBondingCurveAddress)
 */
export declare function getBondingCurvePDA(mint: PublicKey): PublicKey;
/**
 * Get global account PDA (alias for deriveGlobalAddress)
 */
export declare function getGlobalAccountPDA(): PublicKey;
/**
 * Get creator vault PDA (alias for deriveCreatorVaultAddress)
 */
export declare function getCreatorVaultPDA(creator: PublicKey): PublicKey;
/**
 * Get global volume accumulator PDA (alias for deriveGlobalVolumeAccumulatorAddress)
 */
export declare function getGlobalVolumeAccumulatorPDA(): PublicKey;
/**
 * Get global incentive token account PDA
 */
export declare function getGlobalIncentiveTokenAccountPDA(mint: PublicKey): PublicKey;
/**
 * Get user volume accumulator PDA (alias for deriveUserVolumeAccumulatorAddress)
 */
export declare function getUserVolumeAccumulatorPDA(user: PublicKey): PublicKey;
/**
 * Get user volume accumulator using reverse engineered pattern
 * Based on analysis of working transactions: ["user_volume_accumulator", wallet_address]
 */
export declare function getUserVolumeAccumulator(programId: PublicKey, user: PublicKey): PublicKey;
/**
 * Get creator vault PDA using reverse engineered pattern
 * Based on analysis of working transactions: ["creator-vault", wallet_address]
 */
export declare function getCreatorVaultPDAFromWallet(programId: PublicKey, wallet: PublicKey): PublicKey;
/**
 * Fetch bonding curve account data and extract creator
 */
export declare function getBondingCurveCreator(connection: Connection, mint: PublicKey): Promise<PublicKey>;
/**
 * Get all required PDAs for buy operations with robust resolution
 * Consolidates all PDA derivation in one place for reuse
 * Now includes async creator resolution from bonding curve
 */
export declare function getAllRequiredPDAsForBuyAsync(connection: Connection, programId: PublicKey, mint: PublicKey, user: PublicKey): Promise<{
    globalPDA: PublicKey;
    bondingCurvePDA: PublicKey;
    creatorVaultPDA: PublicKey;
    eventAuthorityPDA: PublicKey;
    globalVolumeAccumulatorPDA: PublicKey;
    userVolumeAccumulatorPDA: PublicKey;
}>;
/**
 * Get all required PDAs for buy operations with robust resolution
 * Consolidates all PDA derivation in one place for reuse
 */
export declare function getAllRequiredPDAsForBuy(programId: PublicKey, mint: PublicKey, user: PublicKey): {
    globalPDA: PublicKey;
    bondingCurvePDA: PublicKey;
    creatorVaultPDA: PublicKey;
    eventAuthorityPDA: PublicKey;
    globalVolumeAccumulatorPDA: PublicKey;
    userVolumeAccumulatorPDA: PublicKey;
};
/**
 * Get event authority PDA (alias for deriveEventAuthorityAddress)
 */
export declare function getEventAuthorityPDA(): PublicKey;
/**
 * Get bonding curve PDAs for batch operations
 * This function provides a clean interface for batch operations to get required PDAs
 * @param connection - Solana connection
 * @param mint - Token mint public key
 * @param user - User public key
 * @returns Object containing all required PDAs for bonding curve operations
 */
export declare function getBondingCurvePDAs(connection: Connection, mint: PublicKey, user: PublicKey): Promise<{
    globalPDA: PublicKey;
    bondingCurvePDA: PublicKey;
    creatorVaultPDA: PublicKey;
    eventAuthorityPDA: PublicKey;
    globalVolumeAccumulatorPDA: PublicKey;
    userVolumeAccumulatorPDA: PublicKey;
}>;
/**
 * Get the global PDA for the PumpFun program
 */
export declare function getGlobalPDA(programId: PublicKey): PublicKey;
/**
 * Check if the global account is initialized
 */
export declare function isGlobalAccountInitialized(connection: Connection, programId: PublicKey): Promise<boolean>;
/**
 * Initialize the global account (one-time setup)
 * This must be called before creating any tokens
 */
export declare function initializeGlobalAccount(connection: Connection, wallet: Keypair, programId: PublicKey): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
}>;
//# sourceMappingURL=bc-helper.d.ts.map