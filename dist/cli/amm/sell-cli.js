#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellTokensAMM = sellTokensAMM;
const web3_js_1 = require("@solana/web3.js");
const sell_1 = require("../../src/amm/sell");
const amm_1 = require("../../src/amm/amm");
const cli_args_1 = require("../cli-args");
/**
 * Sell tokens via AMM with configurable parameters
 */
async function sellTokensAMM() {
    const args = (0, cli_args_1.parseArgs)();
    if (args.help) {
        (0, cli_args_1.printUsage)('cli:amm-sell', [
            '  --amount <number>           Amount of tokens to sell (required)',
            '  --slippage <number>         Slippage tolerance in basis points (default: 100)',
            '  --input-token <path>        Path to token info JSON file',
            '  --wallet <path>             Path to wallet JSON file',
            '  --pool-key <string>         Specific pool key to use (optional)',
            '  --fee-payer <path>          Path to fee payer wallet JSON file (optional)',
        ]);
        return;
    }
    // Validate required arguments
    if (!args.amount || args.amount <= 0) {
        console.error('❌ Error: --amount is required and must be greater than 0');
        (0, cli_args_1.printUsage)('cli:amm-sell');
        return;
    }
    console.log('💸 Selling Tokens via AMM');
    console.log('==========================');
    console.log(`Amount: ${args.amount} tokens`);
    console.log(`Slippage: ${args.slippage || 100} basis points (${(args.slippage || 100) / 100}%)`);
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
        let poolKey;
        // If pool key is provided, use it directly
        if (args.poolKey) {
            poolKey = new web3_js_1.PublicKey(args.poolKey);
            console.log(`🏊 Using specified pool: ${poolKey.toString()}`);
        }
        else {
            // Search for pools
            console.log('🔍 Searching for AMM pools for this token...');
            const tokenMint = new web3_js_1.PublicKey(tokenInfo.mint);
            const pools = await (0, amm_1.findPoolsForToken)(connection, tokenMint);
            if (pools.length === 0) {
                console.log('❌ No AMM pools found for this token');
                console.log('💡 The token may not have been migrated to AMM yet');
                return;
            }
            console.log(`✅ Found ${pools.length} AMM pool(s) for this token`);
            poolKey = pools[0];
            console.log(`🏊 Using pool: ${poolKey.toString()}`);
        }
        // Execute sell
        console.log(`\n🔄 Executing AMM sell of ${args.amount} tokens...`);
        const sellResult = await (0, sell_1.sellAmmTokens)(connection, wallet, poolKey, args.amount, args.slippage || 100, feePayer || undefined);
        if (sellResult.success) {
            console.log('✅ AMM sell successful!');
            console.log(`📊 Transaction signature: ${sellResult.signature}`);
            console.log(`💰 SOL received: ${sellResult.quoteAmount}`);
        }
        else {
            console.log(`❌ AMM sell failed: ${sellResult.error}`);
        }
    }
    catch (error) {
        console.error(`❌ Error: ${error}`);
        // Provide helpful debugging information
        if (error instanceof Error && error.message?.includes('AccountNotFound')) {
            console.log('💡 The pool account may not exist or be accessible');
        }
        else if (error instanceof Error && error.message?.includes('InvalidAccountData')) {
            console.log('💡 The pool account data may be corrupted or in wrong format');
        }
        else if (error instanceof Error && error.message?.includes('InsufficientFunds')) {
            console.log('💡 Check wallet balance and pool liquidity');
        }
    }
}
// Only run if this file is executed directly
if (require.main === module) {
    sellTokensAMM().catch(console.error);
}
//# sourceMappingURL=sell-cli.js.map