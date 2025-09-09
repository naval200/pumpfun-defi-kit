#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const sendToken_1 = require("../src/sendToken");
const cli_args_1 = require("./cli-args");
const debug_1 = require("../src/utils/debug");
/**
 * CLI for sending tokens between addresses
 * Supports both bonding curve and AMM tokens
 */
async function sendTokenCli() {
    const args = (0, cli_args_1.parseArgs)();
    if (args.help) {
        (0, cli_args_1.printUsage)('cli:send-token', [
            '  --recipient <address>       Recipient wallet address (required)',
            '  --mint <address>            Token mint address (required)',
            '  --amount <number>           Amount of tokens to send (required)',
            '  --wallet <path>             Path to wallet JSON file',
            '  --fee-payer <path>          Path to fee payer wallet JSON file (optional)',
            "  --create-account            Create recipient account if it doesn't exist (default: true)",
        ]);
        return;
    }
    // Validate required arguments
    if (!args.recipient || !args.mint || !args.amount) {
        (0, debug_1.logError)('❌ Error: --recipient, --mint, and --amount are required');
        (0, cli_args_1.printUsage)('cli:send-token');
        return;
    }
    try {
        (0, debug_1.debugLog)('🚀 Sending Tokens');
        (0, debug_1.debugLog)('==================');
        (0, debug_1.debugLog)(`Recipient: ${args.recipient}`);
        (0, debug_1.debugLog)(`Mint: ${args.mint}`);
        (0, debug_1.debugLog)(`Amount: ${args.amount} tokens`);
        (0, debug_1.debugLog)(`Create Account: ${args.createAccount !== false}`);
        // Validate public key format
        let recipientAddress;
        try {
            recipientAddress = new web3_js_1.PublicKey(args.recipient);
        }
        catch (error) {
            (0, debug_1.logError)('❌ Error: Invalid public key format');
            return;
        }
        let mintAddress;
        try {
            mintAddress = new web3_js_1.PublicKey(args.mint);
        }
        catch (error) {
            (0, debug_1.logError)('❌ Error: Invalid mint address format');
            return;
        }
        // Load wallet and fee payer
        const wallet = (0, cli_args_1.loadWallet)(args.wallet);
        const feePayer = (0, cli_args_1.loadFeePayerWallet)(args.feePayer);
        (0, debug_1.debugLog)(`👛 Using wallet: ${wallet.publicKey.toString()}`);
        if (feePayer) {
            (0, debug_1.debugLog)(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
        }
        // Check if recipient can receive tokens
        (0, debug_1.debugLog)(`🔍 Checking if recipient can receive tokens...`);
        const canReceive = await (0, sendToken_1.sendTokenWithAccountCreation)(new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed'), wallet, recipientAddress, mintAddress, args.amount, feePayer || wallet);
        if (canReceive.success && canReceive.recipientAccount) {
            (0, debug_1.debugLog)(`✅ Recipient already has a token account: ${canReceive.recipientAccount.toString()}`);
        }
        else if (args.createAccount !== false) {
            (0, debug_1.debugLog)(`ℹ️ Recipient doesn't have a token account, will create one if createAccount is true`);
        }
        else {
            (0, debug_1.logError)('❌ Error: Recipient cannot receive tokens (invalid address or mint)');
            return;
        }
        // Execute token transfer
        (0, debug_1.debugLog)(`\n🔄 Executing token transfer...`);
        const result = await (0, sendToken_1.sendToken)(new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed'), wallet, recipientAddress, mintAddress, args.amount, args.createAccount, // createRecipientAccount
        feePayer || wallet);
        if (result.success) {
            (0, debug_1.debugLog)(`✅ Token transfer completed successfully!`);
            (0, debug_1.debugLog)(`📝 Transaction signature: ${result.signature}`);
            (0, debug_1.debugLog)(`👥 Recipient account: ${result.recipientAccount?.toString()}`);
            // Show explorer link
            const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
            (0, debug_1.debugLog)(`🔍 View transaction: ${explorerUrl}`);
        }
        else {
            (0, debug_1.logError)(`❌ Token transfer failed: ${result.error}`);
        }
    }
    catch (error) {
        (0, debug_1.logError)(`❌ Error: ${error}`);
    }
}
// Run if this file is executed directly
if (require.main === module) {
    sendTokenCli().catch(debug_1.logError);
}
//# sourceMappingURL=send-token-cli.js.map