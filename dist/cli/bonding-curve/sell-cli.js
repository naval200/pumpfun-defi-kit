#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellToken = sellToken;
const web3_js_1 = require("@solana/web3.js");
const sell_1 = require("../../src/bonding-curve/sell");
const cli_args_1 = require("../cli-args");
const debug_1 = require("../../src/utils/debug");
/**
 * Sell PumpFun tokens via bonding curve with configurable parameters
 */
async function sellToken() {
    const args = (0, cli_args_1.parseArgs)();
    if (args.help) {
        (0, cli_args_1.printUsage)('cli:bond-sell', [
            '  --amount <number>           Amount of tokens to sell (required)',
            '  --slippage <number>         Slippage tolerance in basis points (default: 1000)',
            '  --input-token <path>        Path to token info JSON file',
            '  --wallet <path>             Path to wallet JSON file',
            '  --fee-payer <path>          Path to fee payer wallet JSON file (optional)',
        ]);
        return;
    }
    // Validate required arguments
    if (!args.amount || args.amount <= 0) {
        (0, debug_1.logError)('❌ Error: --amount is required and must be greater than 0');
        (0, cli_args_1.printUsage)('cli:bond-sell');
        return;
    }
    (0, debug_1.debugLog)('💸 Selling PumpFun Tokens via Bonding Curve');
    (0, debug_1.debugLog)('============================================');
    (0, debug_1.debugLog)(`Amount: ${args.amount} tokens (will be converted to smallest unit: ${args.amount * Math.pow(10, 0)})`);
    (0, debug_1.debugLog)(`Slippage: ${args.slippage || 1000} basis points (${(args.slippage || 1000) / 100}%)`);
    try {
        // Load token information
        const tokenInfo = (0, cli_args_1.loadTokenInfo)(args.inputToken);
        (0, debug_1.debugLog)(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
        (0, debug_1.debugLog)(`📍 Mint: ${tokenInfo.mint}`);
        // Setup connection and wallet
        const connection = new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed');
        const wallet = (0, cli_args_1.loadWallet)(args.wallet);
        const feePayer = (0, cli_args_1.loadFeePayerWallet)(args.feePayer);
        (0, debug_1.debugLog)(`👛 Using wallet: ${wallet.publicKey.toString()}`);
        if (feePayer) {
            (0, debug_1.debugLog)(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
        }
        // Execute sell
        (0, debug_1.debugLog)(`\n🔄 Executing sell of ${args.amount} tokens...`);
        const result = await (0, sell_1.sellPumpFunToken)(connection, wallet, new web3_js_1.PublicKey(tokenInfo.mint), args.amount, feePayer || undefined);
        if (result) {
            (0, debug_1.debugLog)(`✅ Sell successful! Signature: ${result}`);
        }
        else {
            (0, debug_1.debugLog)(`❌ Sell failed: ${result}`);
        }
    }
    catch (error) {
        (0, debug_1.logError)(`❌ Error: ${error}`);
        return;
    }
}
// Only run if this file is executed directly
if (require.main === module) {
    sellToken().catch(debug_1.logError);
}
//# sourceMappingURL=sell-cli.js.map