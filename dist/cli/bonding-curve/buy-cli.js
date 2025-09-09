#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyToken = buyToken;
const web3_js_1 = require("@solana/web3.js");
const buy_1 = require("../../src/bonding-curve/buy");
const cli_args_1 = require("../cli-args");
const amounts_1 = require("../../src/utils/amounts");
/**
 * Buy PumpFun tokens via bonding curve with configurable parameters
 */
async function buyToken() {
    const args = (0, cli_args_1.parseArgs)();
    if (args.help) {
        (0, cli_args_1.printUsage)('cli:bond-buy', [
            '  --amount <number>           Amount of SOL to spend (required)',
            '  --slippage <number>         Slippage tolerance in basis points (default: 1000)',
            '  --input-token <path>        Path to token info JSON file',
            '  --wallet <path>             Path to wallet JSON file',
            '  --fee-payer <path>          Path to fee payer wallet JSON file (optional)',
        ]);
        return;
    }
    // Validate required arguments
    if (!args.amount || args.amount <= 0) {
        console.error('❌ Error: --amount is required and must be greater than 0');
        (0, cli_args_1.printUsage)('cli:bond-buy');
        return;
    }
    // Convert SOL to lamports
    const amountSol = args.amount;
    const amountLamports = (0, amounts_1.solToLamports)(amountSol);
    console.log('🛒 Buying PumpFun Tokens via Bonding Curve');
    console.log('============================================');
    console.log(`Amount: ${(0, amounts_1.formatLamportsAsSol)(amountLamports)} SOL`);
    console.log(`Slippage: ${args.slippage || 1000} basis points (${(args.slippage || 1000) / 100}%)`);
    try {
        // Load token information
        const tokenInfo = (0, cli_args_1.loadTokenInfo)(args.inputToken);
        console.log(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
        console.log(`📍 Mint: ${tokenInfo.mint}`);
        // Setup connection and wallet
        const connection = new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed');
        const wallet = (0, cli_args_1.loadWallet)(args.wallet);
        const feePayer = (0, cli_args_1.loadFeePayerWallet)(args.feePayer);
        console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);
        if (feePayer) {
            console.log(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
        }
        // Check wallet balance
        const balance = await connection.getBalance(wallet.publicKey);
        if (balance < amountLamports) {
            console.log(`❌ Insufficient balance. Need at least ${(0, amounts_1.formatLamportsAsSol)(amountLamports)} SOL`);
            process.exit(1);
        }
        // Execute buy
        console.log(`\n🔄 Executing buy of ${(0, amounts_1.formatLamportsAsSol)(amountLamports)} SOL worth of tokens...`);
        const result = await (0, buy_1.buyPumpFunToken)(connection, wallet, new web3_js_1.PublicKey(tokenInfo.mint), amountLamports, args.slippage || 1000);
        if (result) {
            console.log(`✅ Buy successful! Signature: ${result}`);
        }
        else {
            console.log(`❌ Buy failed: ${result}`);
        }
    }
    catch (error) {
        console.error(`❌ Error: ${error}`);
        return;
    }
}
// Only run if this file is executed directly
if (require.main === module) {
    buyToken().catch(console.error);
}
//# sourceMappingURL=buy-cli.js.map