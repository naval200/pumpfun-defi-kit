"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellPumpFunToken = sellPumpFunToken;
exports.sellAllPumpFunTokens = sellAllPumpFunTokens;
exports.sellPercentagePumpFunTokens = sellPercentagePumpFunTokens;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const createAccount_1 = require("../createAccount");
const helper_1 = require("./helper");
const constants_1 = require("./constants");
const debug_1 = require("../utils/debug");
const spl_token_1 = require("@solana/spl-token");
/**
 * Create complete sell instruction with robust PDA resolution
 */
async function createCompleteSellInstruction(programId, seller, mint, tokenAmount) {
    // Calculate parameters - sell only takes 2 parameters (not 3 like buy)
    const minSolReceived = new bn_js_1.default(1); // Minimum SOL to receive (with slippage protection)
    // Get all required PDAs - but sell doesn't use all of them!
    const { globalPDA, bondingCurvePDA, creatorVaultPDA, eventAuthorityPDA } = (0, helper_1.getAllRequiredPDAsForBuy)(programId, mint, seller);
    // Get associated token addresses
    const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, bondingCurvePDA, true // allowOwnerOffCurve for program accounts
    );
    const associatedUser = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, seller, false);
    (0, debug_1.debugLog)('🔧 Creating complete sell instruction with correct SELL account order:');
    (0, debug_1.debugLog)(`   0. Global: ${globalPDA.toString()}`);
    (0, debug_1.debugLog)(`   1. FeeRecipient: ${constants_1.FEE_RECIPIENT.toString()}`);
    (0, debug_1.debugLog)(`   2. Mint: ${mint.toString()}`);
    (0, debug_1.debugLog)(`   3. BondingCurve: ${bondingCurvePDA.toString()}`);
    (0, debug_1.debugLog)(`   4. AssociatedBondingCurve: ${associatedBondingCurve.toString()}`);
    (0, debug_1.debugLog)(`   5. AssociatedUser: ${associatedUser.toString()}`);
    (0, debug_1.debugLog)(`   6. User: ${seller.toString()}`);
    (0, debug_1.debugLog)(`   7. SystemProgram: ${constants_1.SYSTEM_PROGRAM_ID.toString()}`);
    (0, debug_1.debugLog)(`   8. CreatorVault: ${creatorVaultPDA.toString()}`);
    (0, debug_1.debugLog)(`   9. TokenProgram: ${constants_1.TOKEN_PROGRAM_ID.toString()}`);
    (0, debug_1.debugLog)(`  10. EventAuthority: ${eventAuthorityPDA.toString()}`);
    (0, debug_1.debugLog)(`  11. Program: ${programId.toString()}`);
    (0, debug_1.debugLog)(`💡 Note: Sell instruction has different account order than buy!`);
    // Note: Sell instruction doesn't use volume accumulators like buy does
    const instructionData = Buffer.alloc(100); // Smaller allocation for sell
    let offset = 0;
    // Write discriminator for sell instruction
    instructionData.set(constants_1.SELL_INSTRUCTION_DISCRIMINATOR, offset);
    offset += 8;
    // Write arguments: amount (u64), min_sol_output (u64) - NO track_volume for sell!
    tokenAmount.toArrayLike(Buffer, 'le', 8).copy(instructionData, offset);
    offset += 8;
    minSolReceived.toArrayLike(Buffer, 'le', 8).copy(instructionData, offset);
    offset += 8;
    const finalInstructionData = instructionData.slice(0, offset);
    // Create instruction with all required accounts in SELL IDL order (different from buy!)
    const sellInstruction = new web3_js_1.TransactionInstruction({
        keys: [
            // Sell instruction account order from IDL:
            { pubkey: globalPDA, isSigner: false, isWritable: false }, // 0: global
            { pubkey: constants_1.FEE_RECIPIENT, isSigner: false, isWritable: true }, // 1: fee_recipient
            { pubkey: mint, isSigner: false, isWritable: false }, // 2: mint
            { pubkey: bondingCurvePDA, isSigner: false, isWritable: true }, // 3: bonding_curve
            { pubkey: associatedBondingCurve, isSigner: false, isWritable: true }, // 4: associated_bonding_curve
            { pubkey: associatedUser, isSigner: false, isWritable: true }, // 5: associated_user
            { pubkey: seller, isSigner: true, isWritable: true }, // 6: user
            { pubkey: constants_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }, // 7: system_program
            { pubkey: creatorVaultPDA, isSigner: false, isWritable: true }, // 8: creator_vault
            { pubkey: constants_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // 9: token_program
            { pubkey: eventAuthorityPDA, isSigner: false, isWritable: false }, // 10: event_authority
            { pubkey: programId, isSigner: false, isWritable: false }, // 11: program
        ],
        programId: programId,
        data: finalInstructionData,
    });
    return sellInstruction;
}
/**
 * Get user's token balance for a specific mint
 */
async function getUserTokenBalance(connection, wallet, mint) {
    try {
        const userATA = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, wallet, false);
        const tokenAccount = await connection.getTokenAccountBalance(userATA);
        return parseInt(tokenAccount.value.amount);
    }
    catch (error) {
        (0, debug_1.logError)('Could not get token balance:', error);
        return 0;
    }
}
/**
 * Sell PumpFun tokens on the bonding curve
 * @param connection - Solana connection instance
 * @param wallet - Keypair for the seller wallet
 * @param mint - PublicKey of the token mint to sell
 * @param tokenAmount - Amount of tokens to sell (in token units)
 * @returns Promise resolving to transaction signature
 */
async function sellPumpFunToken(connection, wallet, mint, tokenAmount) {
    (0, debug_1.log)('💸 Setting up sell transaction...');
    // Check user's token balance first
    const userBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);
    (0, debug_1.log)(`💰 User token balance: ${userBalance} tokens`);
    if (userBalance === 0) {
        throw new Error('Cannot sell: User has no tokens to sell');
    }
    if (tokenAmount > userBalance) {
        throw new Error(`Cannot sell ${tokenAmount} tokens: User only has ${userBalance} tokens`);
    }
    // Setup user ATA (should already exist if user has tokens)
    (0, debug_1.debugLog)('👤 Setting up user associated token account...');
    const userAtaResult = await (0, createAccount_1.getOrCreateAssociatedTokenAccount)(connection, wallet, wallet.publicKey, mint);
    if (!userAtaResult.success) {
        throw new Error(`Failed to get user ATA: ${userAtaResult.error}`);
    }
    (0, debug_1.debugLog)(`✅ User ATA ready: ${userAtaResult.account.toString()}`);
    // Setup bonding curve ATA
    const [bondingCurve] = (0, helper_1.deriveBondingCurveAddress)(mint);
    (0, debug_1.debugLog)(`📈 Derived bonding curve: ${bondingCurve.toString()}`);
    (0, debug_1.debugLog)('🔗 Setting up bonding curve associated token account...');
    const bondingCurveAtaResult = await (0, createAccount_1.getOrCreateAssociatedTokenAccount)(connection, wallet, bondingCurve, mint, true // allowOwnerOffCurve
    );
    if (!bondingCurveAtaResult.success) {
        throw new Error(`Failed to get bonding curve ATA: ${bondingCurveAtaResult.error}`);
    }
    (0, debug_1.debugLog)(`✅ Bonding curve ATA ready: ${bondingCurveAtaResult.account.toString()}`);
    // Create complete sell transaction
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        attempts++;
        (0, debug_1.debugLog)(`📡 Creating complete sell transaction (attempt ${attempts}/${maxAttempts})...`);
        try {
            const sellInstruction = await createCompleteSellInstruction(constants_1.PUMP_PROGRAM_ID, wallet.publicKey, mint, new bn_js_1.default(tokenAmount) // Token amount to sell
            );
            const transaction = new web3_js_1.Transaction().add(sellInstruction);
            // Set recent blockhash and fee payer
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            // Sign the transaction
            transaction.sign(wallet);
            // Send transaction
            (0, debug_1.debugLog)(`📡 Sending sell transaction (attempt ${attempts}/${maxAttempts})...`);
            const signature = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });
            // Wait for confirmation
            await connection.confirmTransaction({
                signature,
                ...(await connection.getLatestBlockhash('confirmed')),
            }, 'confirmed');
            (0, debug_1.logSuccess)('Sell transaction confirmed successfully!');
            (0, debug_1.log)(`💸 Sold ${tokenAmount} tokens`);
            (0, debug_1.logSignature)(signature, 'Sell');
            // Show updated balance
            const newBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);
            (0, debug_1.debugLog)(`💰 New token balance: ${newBalance} tokens`);
            return signature;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            (0, debug_1.logError)(`Transaction attempt ${attempts} failed: ${errorMessage}`);
            // If this is a seed constraint error, extract the expected address
            if (errorMessage.includes('ConstraintSeeds') || errorMessage.includes('seeds constraint')) {
                (0, debug_1.debugLog)('🔧 Detected seed constraint error. Check the logs for the expected address.');
                (0, debug_1.debugLog)('💡 This may require updating PDA mappings similar to the buy function.');
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
/**
 * Sell all tokens for a specific mint
 */
async function sellAllPumpFunTokens(connection, wallet, mint) {
    // Get user's current token balance
    const userBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);
    if (userBalance === 0) {
        throw new Error('Cannot sell: User has no tokens to sell');
    }
    (0, debug_1.log)(`💸 Selling all ${userBalance} tokens...`);
    return sellPumpFunToken(connection, wallet, mint, userBalance);
}
/**
 * Sell a percentage of user's tokens
 */
async function sellPercentagePumpFunTokens(connection, wallet, mint, percentage // 0-100
) {
    if (percentage < 0 || percentage > 100) {
        throw new Error('Percentage must be between 0 and 100');
    }
    // Get user's current token balance
    const userBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);
    if (userBalance === 0) {
        throw new Error('Cannot sell: User has no tokens to sell');
    }
    const tokensToSell = Math.floor((userBalance * percentage) / 100);
    if (tokensToSell === 0) {
        throw new Error(`Calculated token amount to sell is 0. Balance: ${userBalance}, Percentage: ${percentage}%`);
    }
    (0, debug_1.log)(`💸 Selling ${percentage}% of tokens (${tokensToSell} out of ${userBalance})...`);
    return sellPumpFunToken(connection, wallet, mint, tokensToSell);
}
//# sourceMappingURL=sell.js.map