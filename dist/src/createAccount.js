"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssociatedTokenAccountAddress = getAssociatedTokenAccountAddress;
exports.createAssociatedTokenAccountInstruction = createAssociatedTokenAccountInstruction;
exports.createAssociatedWSOLAccountInstruction = createAssociatedWSOLAccountInstruction;
exports.createAssociatedTokenAccount = createAssociatedTokenAccount;
exports.getOrCreateAssociatedTokenAccount = getOrCreateAssociatedTokenAccount;
exports.checkAssociatedTokenAccountExists = checkAssociatedTokenAccountExists;
exports.getAssociatedTokenBalance = getAssociatedTokenBalance;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const spl_token_2 = require("@solana/spl-token");
const debug_1 = require("./utils/debug");
/**
 * Get the Associated Token Account address for a user and mint
 */
function getAssociatedTokenAccountAddress(owner, mint) {
    return (0, spl_token_1.getAssociatedTokenAddressSync)(mint, owner);
}
/**
 * Create the instruction for creating an Associated Token Account (ATA)
 * This function only creates the instruction without executing it
 */
function createAssociatedTokenAccountInstruction(payer, owner, mint) {
    const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint);
    const instruction = (0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, // payer
    userTokenAccount, // associated token account
    owner, // owner
    mint, // mint
    spl_token_2.TOKEN_PROGRAM_ID, spl_token_2.ASSOCIATED_TOKEN_PROGRAM_ID);
    return {
        instruction,
        account: userTokenAccount,
    };
}
/**
 * Create the instruction for creating an Associated Token Account (ATA) for WSOL
 * This is a convenience function that calls createAssociatedTokenAccountInstruction
 * with the WSOL mint address (So111...12)
 */
function createAssociatedWSOLAccountInstruction(payer, owner) {
    const WSOL_MINT = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112');
    return createAssociatedTokenAccountInstruction(payer, owner, WSOL_MINT);
}
/**
 * Create an Associated Token Account (ATA) for a user and mint
 */
async function createAssociatedTokenAccount(connection, payer, owner, mint) {
    try {
        const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint);
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
        const { instruction } = createAssociatedTokenAccountInstruction(payer.publicKey, owner, mint);
        const createAtaTx = new web3_js_1.Transaction();
        createAtaTx.add(instruction);
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
async function getOrCreateAssociatedTokenAccount(connection, payer, owner, mint) {
    try {
        const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint);
        // Check if ATA exists
        try {
            await (0, spl_token_1.getAccount)(connection, userTokenAccount);
            // ATA already exists - return success
            return { success: true, account: userTokenAccount };
        }
        catch (error) {
            // ATA doesn't exist, create it
            const createResult = await createAssociatedTokenAccount(connection, payer, owner, mint);
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
        const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint);
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
        const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint);
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