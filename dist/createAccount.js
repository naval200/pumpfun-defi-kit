"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssociatedTokenAccount = createAssociatedTokenAccount;
exports.getOrCreateAssociatedTokenAccount = getOrCreateAssociatedTokenAccount;
exports.checkAssociatedTokenAccountExists = checkAssociatedTokenAccountExists;
exports.getAssociatedTokenBalance = getAssociatedTokenBalance;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const spl_token_2 = require("@solana/spl-token");
const debug_1 = require("./utils/debug");
/**
 * Create an Associated Token Account (ATA) for a user and mint
 */
async function createAssociatedTokenAccount(connection, payer, owner, mint, allowOwnerOffCurve = false) {
    try {
        // Use getAssociatedTokenAddressSync for program-owned accounts
        const userTokenAccount = allowOwnerOffCurve
            ? (0, spl_token_1.getAssociatedTokenAddressSync)(mint, owner, allowOwnerOffCurve)
            : await (0, spl_token_1.getAssociatedTokenAddress)(mint, owner);
        (0, debug_1.debugLog)(`🏗️ Creating ATA: ${userTokenAccount.toString()}`);
        // Check if ATA already exists
        try {
            await (0, spl_token_1.getAccount)(connection, userTokenAccount);
            (0, debug_1.debugLog)('✅ Associated token account already exists');
            return {
                success: true,
                account: userTokenAccount,
            };
        }
        catch (error) {
            // ATA doesn't exist, create it
            (0, debug_1.debugLog)('🏗️ Creating new associated token account...');
        }
        const createAtaTx = new web3_js_1.Transaction();
        createAtaTx.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, // payer
        userTokenAccount, // associated token account
        owner, // owner
        mint, // mint
        spl_token_2.TOKEN_PROGRAM_ID, spl_token_2.ASSOCIATED_TOKEN_PROGRAM_ID));
        // Get recent blockhash and set fee payer
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        createAtaTx.recentBlockhash = blockhash;
        createAtaTx.feePayer = payer.publicKey;
        // Sign and send transaction
        createAtaTx.sign(payer);
        const signature = await connection.sendRawTransaction(createAtaTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3,
        });
        (0, debug_1.logSignature)(signature, 'ATA creation');
        // Wait for confirmation
        (0, debug_1.debugLog)('⏳ Waiting for ATA creation confirmation...');
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            return {
                success: false,
                error: `ATA creation failed: ${confirmation.value.err}`,
            };
        }
        (0, debug_1.logSuccess)('Associated token account created successfully!');
        return {
            success: true,
            signature,
            account: userTokenAccount,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `ATA creation error: ${errorMessage}`,
        };
    }
}
/**
 * Get or create an Associated Token Account (ATA) for a user and mint
 */
async function getOrCreateAssociatedTokenAccount(connection, payer, owner, mint, allowOwnerOffCurve = false) {
    try {
        // Use getAssociatedTokenAddressSync for program-owned accounts
        const userTokenAccount = allowOwnerOffCurve
            ? (0, spl_token_1.getAssociatedTokenAddressSync)(mint, owner, allowOwnerOffCurve)
            : await (0, spl_token_1.getAssociatedTokenAddress)(mint, owner);
        // Check if ATA exists
        try {
            await (0, spl_token_1.getAccount)(connection, userTokenAccount);
            // ATA already exists - return success
            return { success: true, account: userTokenAccount };
        }
        catch (error) {
            // ATA doesn't exist, create it
            const createResult = await createAssociatedTokenAccount(connection, payer, owner, mint, allowOwnerOffCurve);
            if (createResult.success && createResult.account) {
                return { success: true, account: createResult.account };
            }
            else {
                return {
                    success: false,
                    account: userTokenAccount,
                    error: createResult.error,
                };
            }
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            account: web3_js_1.PublicKey.default,
            error: `Error getting/creating ATA: ${errorMessage}`,
        };
    }
}
/**
 * Check if an Associated Token Account exists
 */
async function checkAssociatedTokenAccountExists(connection, owner, mint) {
    try {
        const userTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, owner);
        await (0, spl_token_1.getAccount)(connection, userTokenAccount);
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Get the balance of tokens in an Associated Token Account
 */
async function getAssociatedTokenBalance(connection, owner, mint) {
    try {
        const userTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, owner);
        const tokenAccount = await (0, spl_token_1.getAccount)(connection, userTokenAccount);
        return { success: true, balance: tokenAccount.amount };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Error getting token balance: ${errorMessage}`,
        };
    }
}
//# sourceMappingURL=createAccount.js.map