import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
/**
 * Derive fee config PDA dynamically from IDL seeds
 * This matches the exact derivation logic from the IDL
 */
export declare function deriveFeeConfigPDA(): PublicKey;
/**
 * Create Pump program BUY instruction with pre-resolved PDAs
 */
export declare function createBondingCurveBuyInstruction(buyer: PublicKey, mint: PublicKey, solAmountLamports: number | BN, pdas: {
    globalPDA: PublicKey;
    bondingCurvePDA: PublicKey;
    creatorVaultPDA: PublicKey;
    eventAuthorityPDA: PublicKey;
    globalVolumeAccumulatorPDA: PublicKey;
    userVolumeAccumulatorPDA: PublicKey;
}, maxSlippageBasisPoints?: number): TransactionInstruction;
/**
 * Create Pump program SELL instruction with pre-resolved PDAs
 */
export declare function createBondingCurveSellInstruction(seller: PublicKey, mint: PublicKey, tokenAmount: number | BN, minSolOutputLamports: number | BN, pdas: {
    globalPDA: PublicKey;
    bondingCurvePDA: PublicKey;
    creatorVaultPDA: PublicKey;
    eventAuthorityPDA: PublicKey;
    globalVolumeAccumulatorPDA: PublicKey;
    userVolumeAccumulatorPDA: PublicKey;
}): TransactionInstruction;
//# sourceMappingURL=instructions.d.ts.map