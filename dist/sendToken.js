"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = sendToken;
exports.sendTokenWithAccountCreation = sendTokenWithAccountCreation;
exports.sendTokenToExistingAccount = sendTokenToExistingAccount;
exports.canReceiveTokens = canReceiveTokens;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const debug_1 = require("./utils/debug");
const transaction_1 = require("./utils/transaction");
const createAccount_1 = require("./createAccount");
/**
 * Send tokens from one address to another
 * Works with both bonding curve and AMM tokens since they are standard SPL tokens
 *
 * @param connection - Solana connection instance
 * @param sender - Keypair for the sender wallet
 * @param recipient - PublicKey of the recipient
 * @param mint - PublicKey of the token mint
 * @param amount - Amount of tokens to send
 * @param allowOwnerOffCurve - Whether to allow owner off curve (default: false)
 * @param createRecipientAccount - Whether to create recipient account if needed (default: true)
 * @returns Promise resolving to transfer result object
 */
async function sendToken(connection, sender, recipient, mint, amount, allowOwnerOffCurve = false, createRecipientAccount = true) {
    try {
        (0, debug_1.debugLog)(`🚀 Starting token transfer: ${amount} tokens from ${sender.publicKey.toString()} to ${recipient.toString()}`);
        // Get sender's token account
        const senderTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, sender.publicKey);
        // Check if sender has sufficient balance
        try {
            const senderAccount = await (0, spl_token_1.getAccount)(connection, senderTokenAccount);
            if (senderAccount.amount < amount) {
                return {
                    success: false,
                    error: `Insufficient balance. Available: ${senderAccount.amount}, Required: ${amount}`,
                };
            }
            (0, debug_1.debugLog)(`✅ Sender has sufficient balance: ${senderAccount.amount}`);
        }
        catch (error) {
            return {
                success: false,
                error: `Sender token account not found or invalid: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
        let recipientTokenAccount = undefined;
        if (!createRecipientAccount) {
            try {
                recipientTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, recipient, allowOwnerOffCurve);
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to get recipient token account: ${error instanceof Error ? error.message : String(error)}`,
                };
            }
        }
        if (!recipientTokenAccount) {
            const result = await (0, createAccount_1.createAssociatedTokenAccount)(connection, sender, recipient, mint, allowOwnerOffCurve);
            if (result.success && result.account) {
                recipientTokenAccount = result.account;
            }
            else {
                return {
                    success: false,
                    error: `Failed to create recipient token account: ${result.error}`,
                };
            }
        }
        // Create the transfer transaction
        const transferTx = new web3_js_1.Transaction();
        // Add transfer instruction
        transferTx.add((0, spl_token_1.createTransferInstruction)(senderTokenAccount, // source
        recipientTokenAccount, // destination
        sender.publicKey, // owner
        amount, // amount
        [], // multisigners
        spl_token_1.TOKEN_PROGRAM_ID));
        // Send and confirm the transfer transaction
        (0, debug_1.debugLog)(`📡 Sending transfer transaction...`);
        const transferResult = await (0, transaction_1.sendAndConfirmTransaction)(connection, transferTx, [sender], {
            preflightCommitment: 'confirmed',
        });
        if (!transferResult.success) {
            return {
                success: false,
                error: `Transfer failed: ${transferResult.error}`,
            };
        }
        (0, debug_1.logSuccess)(`✅ Token transfer completed successfully!`);
        (0, debug_1.logSignature)(transferResult.signature, 'Token transfer');
        // Verify the transfer by checking balances
        try {
            const newSenderBalance = await (0, spl_token_1.getAccount)(connection, senderTokenAccount);
            const newRecipientBalance = await (0, spl_token_1.getAccount)(connection, recipientTokenAccount);
            (0, debug_1.debugLog)(`📊 Transfer verification:`);
            (0, debug_1.debugLog)(`   Sender new balance: ${newSenderBalance.amount}`);
            (0, debug_1.debugLog)(`   Recipient new balance: ${newRecipientBalance.amount}`);
        }
        catch (error) {
            (0, debug_1.debugLog)(`⚠️ Could not verify transfer balances: ${error instanceof Error ? error.message : String(error)}`);
        }
        return {
            success: true,
            signature: transferResult.signature,
            recipientAccount: recipientTokenAccount,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)('Token transfer failed:', error);
        return {
            success: false,
            error: `Token transfer error: ${errorMessage}`,
        };
    }
}
/**
 * Send tokens with automatic recipient account creation
 * This is a convenience function that always creates the recipient account if needed
 */
async function sendTokenWithAccountCreation(connection, sender, recipient, mint, amount, allowOwnerOffCurve = false) {
    return sendToken(connection, sender, recipient, mint, amount, allowOwnerOffCurve, true);
}
/**
 * Send tokens without creating recipient account
 * This function will fail if the recipient doesn't have a token account
 */
async function sendTokenToExistingAccount(connection, sender, recipient, mint, amount, allowOwnerOffCurve = false) {
    return sendToken(connection, sender, recipient, mint, amount, allowOwnerOffCurve, false);
}
/**
 * Check if a recipient can receive tokens (has token account or can create one)
 */
async function canReceiveTokens(connection, recipient, mint, allowOwnerOffCurve = false) {
    try {
        const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mint, recipient, allowOwnerOffCurve);
        try {
            await (0, spl_token_1.getAccount)(connection, tokenAccount);
            return {
                canReceive: true,
                hasAccount: true,
                accountAddress: tokenAccount,
            };
        }
        catch (error) {
            // Account doesn't exist, but can be created
            return {
                canReceive: true,
                hasAccount: false,
                accountAddress: tokenAccount,
            };
        }
    }
    catch (error) {
        return {
            canReceive: false,
            hasAccount: false,
        };
    }
}
//# sourceMappingURL=sendToken.js.map