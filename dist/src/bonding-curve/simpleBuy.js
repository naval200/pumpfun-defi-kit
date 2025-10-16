"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSimpleBuyInstruction = createSimpleBuyInstruction;
const web3_js_1 = require("@solana/web3.js");
const instructions_1 = require("./idl/instructions");
const bc_helper_1 = require("./bc-helper");
const debug_1 = require("../utils/debug");
/**
 * Simplified wrapper for creating bonding curve buy instructions
 * Automatically calculates all required PDAs internally
 *
 * This function provides a clean interface for creating buy instructions
 * without manually calculating all the required Program Derived Addresses (PDAs).
 *
 * @param connection - Solana connection instance
 * @param buyerKeypair - Keypair of the buyer
 * @param mint - PublicKey of the token mint
 * @param amountLamports - Amount of SOL to spend (in lamports)
 * @param slippageBasisPoints - Slippage tolerance in basis points (default: 1000 = 10%)
 * @param creator - Optional creator PublicKey (defaults to buyer if not provided)
 * @returns Promise<TransactionInstruction> - The buy instruction ready to be added to a transaction
 *
 * @example
 * ```typescript
 * // Simple usage - no need to calculate PDAs manually!
 * const buyInstruction = await createSimpleBuyInstruction(
 *   connection,
 *   buyerKeypair,
 *   mint,
 *   0.1e9, // 0.1 SOL
 *   1000,  // 10% slippage
 *   creator // Optional creator
 * );
 *
 * // Add to transaction
 * const transaction = new Transaction().add(buyInstruction);
 * ```
 */
async function createSimpleBuyInstruction(connection, buyerKeypair, mint, amountLamports, slippageBasisPoints = 1000, creator // Optional creator, defaults to buyer if not provided
) {
    (0, debug_1.log)(`💰 Creating buy instruction for ${amountLamports / 1e9} SOL`);
    (0, debug_1.log)(`🎯 Mint: ${mint.toString()}`);
    (0, debug_1.log)(`👤 Buyer: ${buyerKeypair.publicKey.toString()}`);
    try {
        const PUMP_PROGRAM_ID = new web3_js_1.PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
        const EVENT_AUTHORITY_SEED = Buffer.from('__event_authority');
        // Use provided creator or default to buyer
        const creatorPubkey = creator || buyerKeypair.publicKey;
        // Calculate all required PDAs automatically
        (0, debug_1.log)('🔍 Calculating PDAs...');
        const globalPDA = (0, bc_helper_1.getGlobalPDA)(PUMP_PROGRAM_ID);
        const [bondingCurvePDA] = (0, bc_helper_1.deriveBondingCurveAddress)(mint);
        const [creatorVaultPDA] = (0, bc_helper_1.deriveCreatorVaultAddress)(creatorPubkey);
        const [eventAuthorityPDA] = web3_js_1.PublicKey.findProgramAddressSync([EVENT_AUTHORITY_SEED], PUMP_PROGRAM_ID);
        const [globalVolumeAccumulatorPDA] = (0, bc_helper_1.deriveGlobalVolumeAccumulatorAddress)();
        const userVolumeAccumulatorPDA = (0, bc_helper_1.getUserVolumeAccumulator)(PUMP_PROGRAM_ID, buyerKeypair.publicKey);
        // Create PDAs object with correct property names
        const pdas = {
            globalPDA: globalPDA,
            bondingCurvePDA: bondingCurvePDA,
            creatorVaultPDA: creatorVaultPDA,
            eventAuthorityPDA: eventAuthorityPDA,
            globalVolumeAccumulatorPDA: globalVolumeAccumulatorPDA,
            userVolumeAccumulatorPDA: userVolumeAccumulatorPDA,
        };
        (0, debug_1.log)('✅ All PDAs calculated successfully');
        // Create the buy instruction using the existing function
        const buyInstruction = (0, instructions_1.createBondingCurveBuyInstruction)(buyerKeypair.publicKey, mint, amountLamports, pdas, slippageBasisPoints);
        (0, debug_1.logSuccess)('✅ Buy instruction created successfully');
        return buyInstruction;
    }
    catch (error) {
        (0, debug_1.logError)('❌ Failed to create buy instruction:', error);
        throw error;
    }
}
//# sourceMappingURL=simpleBuy.js.map