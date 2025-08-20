"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyPumpFunToken = buyPumpFunToken;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const createAccount_1 = require("../createAccount");
const helper_1 = require("./helper");
const constants_1 = require("./constants");
const debug_1 = require("../utils/debug");
const spl_token_1 = require("@solana/spl-token");
/**
 * Create complete buy instruction with robust PDA resolution
 */
async function createCompleteBuyInstruction(programId, buyer, mint, solAmount, maxSlippageBasisPoints = 1000) {
    // Calculate parameters
    const expectedTokenAmount = new bn_js_1.default(100000000); // Reasonable estimate
    const maxSolCost = solAmount.mul(new bn_js_1.default(10000 + maxSlippageBasisPoints)).div(new bn_js_1.default(10000));
    const trackVolume = true; // Enable volume tracking
    // Get all required PDAs
    const { globalPDA, bondingCurvePDA, creatorVaultPDA, eventAuthorityPDA, globalVolumeAccumulatorPDA, userVolumeAccumulatorPDA, } = (0, helper_1.getAllRequiredPDAsForBuy)(programId, mint, buyer);
    // Get associated token addresses
    const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, bondingCurvePDA, true // allowOwnerOffCurve for program accounts
    );
    const associatedUser = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, buyer, false);
    (0, debug_1.debugLog)('🔧 Creating complete buy instruction with all required accounts:');
    (0, debug_1.debugLog)(`   0. Global: ${globalPDA.toString()}`);
    (0, debug_1.debugLog)(`   1. FeeRecipient: ${constants_1.FEE_RECIPIENT.toString()}`);
    (0, debug_1.debugLog)(`   2. Mint: ${mint.toString()}`);
    (0, debug_1.debugLog)(`   3. BondingCurve: ${bondingCurvePDA.toString()}`);
    (0, debug_1.debugLog)(`   4. AssociatedBondingCurve: ${associatedBondingCurve.toString()}`);
    (0, debug_1.debugLog)(`   5. AssociatedUser: ${associatedUser.toString()}`);
    (0, debug_1.debugLog)(`   6. User: ${buyer.toString()}`);
    (0, debug_1.debugLog)(`   7. SystemProgram: ${constants_1.SYSTEM_PROGRAM_ID.toString()}`);
    (0, debug_1.debugLog)(`   8. TokenProgram: ${constants_1.TOKEN_PROGRAM_ID.toString()}`);
    (0, debug_1.debugLog)(`   9. CreatorVault: ${creatorVaultPDA.toString()}`);
    (0, debug_1.debugLog)(`  10. EventAuthority: ${eventAuthorityPDA.toString()}`);
    (0, debug_1.debugLog)(`  11. Program: ${programId.toString()}`);
    (0, debug_1.debugLog)(`  12. GlobalVolumeAccumulator: ${globalVolumeAccumulatorPDA.toString()}`);
    (0, debug_1.debugLog)(`  13. UserVolumeAccumulator: ${userVolumeAccumulatorPDA.toString()}`);
    // Verify addresses
    const expectedGlobal = constants_1.GLOBAL_VOLUME_ACCUMULATOR;
    if (globalVolumeAccumulatorPDA.toString() === expectedGlobal) {
        (0, debug_1.debugLog)('✅ Using correct GlobalVolumeAccumulator address');
    }
    else {
        (0, debug_1.logError)('GlobalVolumeAccumulator address mismatch');
    }
    const instructionData = Buffer.alloc(1000); // Allocate enough space
    let offset = 0;
    // Write discriminator
    instructionData.set(constants_1.BUY_INSTRUCTION_DISCRIMINATOR, offset);
    offset += 8;
    // Write arguments: amount (u64), max_sol_cost (u64), track_volume (bool)
    expectedTokenAmount.toArrayLike(Buffer, 'le', 8).copy(instructionData, offset);
    offset += 8;
    maxSolCost.toArrayLike(Buffer, 'le', 8).copy(instructionData, offset);
    offset += 8;
    // Write track_volume as boolean (1 byte)
    instructionData.writeUInt8(trackVolume ? 1 : 0, offset);
    offset += 1;
    const finalInstructionData = instructionData.slice(0, offset);
    // Create instruction with all required accounts in exact IDL order
    const buyInstruction = new web3_js_1.TransactionInstruction({
        keys: [
            // 0-6: Core accounts
            { pubkey: globalPDA, isSigner: false, isWritable: true },
            { pubkey: constants_1.FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: bondingCurvePDA, isSigner: false, isWritable: true },
            { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
            { pubkey: associatedUser, isSigner: false, isWritable: true },
            { pubkey: buyer, isSigner: true, isWritable: true },
            // 7-8: System programs
            { pubkey: constants_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: constants_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            // 9-13: Additional required accounts from IDL
            { pubkey: creatorVaultPDA, isSigner: false, isWritable: true },
            { pubkey: eventAuthorityPDA, isSigner: false, isWritable: false },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: globalVolumeAccumulatorPDA, isSigner: false, isWritable: true },
            { pubkey: userVolumeAccumulatorPDA, isSigner: false, isWritable: true },
        ],
        programId: programId,
        data: finalInstructionData,
    });
    return buyInstruction;
}
/**
 * Buy PumpFun tokens with robust PDA resolution
 */
async function buyPumpFunToken(connection, wallet, mint, solAmount, slippageBasisPoints = 1000) {
    (0, debug_1.log)('🏗️ Setting up associated token accounts for buy...');
    // Setup user ATA
    (0, debug_1.debugLog)('👤 Setting up user associated token account...');
    const userAtaResult = await (0, createAccount_1.getOrCreateAssociatedTokenAccount)(connection, wallet, wallet.publicKey, mint);
    if (!userAtaResult.success) {
        throw new Error(`Failed to create user ATA: ${userAtaResult.error}`);
    }
    (0, debug_1.debugLog)(`✅ User ATA ready: ${userAtaResult.account.toString()}`);
    // Setup bonding curve ATA
    const [bondingCurve] = (0, helper_1.deriveBondingCurveAddress)(mint);
    (0, debug_1.debugLog)(`📈 Derived bonding curve: ${bondingCurve.toString()}`);
    (0, debug_1.debugLog)('🔗 Setting up bonding curve associated token account...');
    const bondingCurveAtaResult = await (0, createAccount_1.getOrCreateAssociatedTokenAccount)(connection, wallet, bondingCurve, mint, true // allowOwnerOffCurve
    );
    if (!bondingCurveAtaResult.success) {
        throw new Error(`Failed to create bonding curve ATA: ${bondingCurveAtaResult.error}`);
    }
    (0, debug_1.debugLog)(`✅ Bonding curve ATA ready: ${bondingCurveAtaResult.account.toString()}`);
    // Create complete buy transaction
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        attempts++;
        (0, debug_1.debugLog)(`📡 Creating complete buy transaction (attempt ${attempts}/${maxAttempts})...`);
        try {
            const buyInstruction = await createCompleteBuyInstruction(constants_1.PUMP_PROGRAM_ID, wallet.publicKey, mint, new bn_js_1.default(solAmount * 1e9), // Convert SOL to lamports
            slippageBasisPoints);
            const transaction = new web3_js_1.Transaction().add(buyInstruction);
            // Set recent blockhash and fee payer
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            // Sign the transaction
            transaction.sign(wallet);
            // Send transaction
            (0, debug_1.debugLog)(`📡 Sending transaction (attempt ${attempts}/${maxAttempts})...`);
            const signature = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });
            // Wait for confirmation
            await connection.confirmTransaction({
                signature,
                ...(await connection.getLatestBlockhash('confirmed')),
            }, 'confirmed');
            (0, debug_1.logSuccess)('Buy transaction confirmed successfully!');
            (0, debug_1.log)(`💰 Purchased tokens for ${solAmount} SOL`);
            (0, debug_1.logSignature)(signature, 'Buy');
            return signature;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            (0, debug_1.logError)(`Transaction attempt ${attempts} failed: ${errorMessage}`);
            // If this is a seed constraint error, extract the expected address
            if (errorMessage.includes('ConstraintSeeds') || errorMessage.includes('seeds constraint')) {
                (0, debug_1.debugLog)('🔧 Detected seed constraint error. Check the logs for the expected address.');
                (0, debug_1.debugLog)('💡 Add the expected address to KNOWN_PDA_MAPPINGS for this wallet.');
            }
            if (attempts >= maxAttempts) {
                throw new Error(`Transaction failed after ${maxAttempts} attempts. Last error: ${errorMessage}`);
            }
            // Wait before retry
            (0, debug_1.debugLog)(`⏳ Waiting 2000ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    throw new Error('Transaction failed after maximum attempts');
}
//# sourceMappingURL=buy.js.map