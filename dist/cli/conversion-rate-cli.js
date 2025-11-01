#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const cli_args_1 = require("./cli-args");
const conversion_rate_1 = require("../src/utils/conversion-rate");
const amounts_1 = require("../src/utils/amounts");
function showHelp() {
    console.log(`
Usage: npm run cli:conversion-rate -- [options]

Get conversion rates between PumpFun tokens and SOL using AMM pools or bonding curves.

Options:
  --help, -h                    Show this help message
  --input-token <path>          Path to token-info.json file (required)
  --mint <address>              Token mint address (alternative to --input-token)
  --pool-key <address>          Pool key address (optional, will search if not provided)
  --token-amount <number>       Token amount for token->SOL conversion (default: 1)
  --sol-amount <number>         SOL amount for SOL->token conversion (default: 1)
  --token-decimals <number>     Token decimals (default: 0, will try to read from token info)
  --slippage <number>           Slippage tolerance as decimal (default: 0.005 = 0.5%)
  --direction <direction>       Direction: 'token-to-sol' or 'sol-to-token' (default: 'token-to-sol')
  --both                        Show both token->SOL and SOL->token rates

Examples:
  # Get conversion rate for 1 token to SOL
  npm run cli:conversion-rate -- --input-token ./token-info.json

  # Get conversion rate for 100 tokens to SOL
  npm run cli:conversion-rate -- --input-token ./token-info.json --token-amount 100

  # Get conversion rate for 1 SOL to tokens
  npm run cli:conversion-rate -- --input-token ./token-info.json --direction sol-to-token

  # Get both conversion rates
  npm run cli:conversion-rate -- --input-token ./token-info.json --both

  # Use mint address directly
  npm run cli:conversion-rate -- --mint <MINT_ADDRESS> --token-amount 1 --token-decimals 6

  # Use specific pool key
  npm run cli:conversion-rate -- --input-token ./token-info.json --pool-key <POOL_ADDRESS>
`);
}
/**
 * CLI for getting token to SOL conversion rates
 */
async function main() {
    const args = (0, cli_args_1.parseArgs)();
    if (args.help) {
        showHelp();
        return;
    }
    // Get token mint address
    let tokenMint;
    let tokenDecimals = 0;
    if (args.mint) {
        tokenMint = new web3_js_1.PublicKey(args.mint);
    }
    else if (args.inputToken) {
        try {
            const tokenInfo = (0, cli_args_1.loadTokenInfo)(args.inputToken);
            if (!tokenInfo.mint) {
                console.error('❌ Error: Token info file does not contain a mint address');
                console.log('💡 Use --mint to provide the token mint address directly');
                return;
            }
            tokenMint = new web3_js_1.PublicKey(tokenInfo.mint);
            // Try to get decimals from token info if available
            if (tokenInfo.decimals !== undefined) {
                tokenDecimals = tokenInfo.decimals;
            }
        }
        catch (error) {
            console.error(`❌ Error loading token info: ${error}`);
            return;
        }
    }
    else {
        console.error('❌ Error: Either --input-token or --mint is required');
        showHelp();
        return;
    }
    // Get token decimals from args if provided
    if (args.tokenDecimals !== undefined) {
        tokenDecimals = args.tokenDecimals;
    }
    // Parse other arguments
    const tokenAmount = args.tokenAmount || 1;
    const solAmount = args.solAmount || 1;
    const slippage = args.slippage !== undefined ? args.slippage / 100 : 0.005; // Convert basis points to decimal
    const direction = args.direction || 'token-to-sol';
    const showBoth = args.both || false;
    const poolKey = args.poolKey ? new web3_js_1.PublicKey(args.poolKey) : undefined;
    try {
        console.log('💱 Token to SOL Conversion Rate CLI');
        console.log('=====================================\n');
        console.log(`📍 Token Mint: ${tokenMint.toString()}`);
        if (tokenDecimals > 0) {
            console.log(`🔢 Token Decimals: ${tokenDecimals}`);
        }
        if (poolKey) {
            console.log(`🏊 Pool Key: ${poolKey.toString()}`);
        }
        else {
            console.log(`🔍 Pool: Will search automatically`);
        }
        console.log(`📊 Slippage: ${(slippage * 100).toFixed(2)}%`);
        console.log('');
        // Setup connection
        const connection = new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed');
        console.log('✅ Connected to Solana devnet\n');
        // Determine what to show
        const showTokenToSol = showBoth || direction === 'token-to-sol';
        const showSolToToken = showBoth || direction === 'sol-to-token';
        // Get token to SOL conversion rate
        if (showTokenToSol) {
            console.log(`💱 Calculating conversion rate for ${tokenAmount} token(s) to SOL...`);
            const rate = await (0, conversion_rate_1.getTokenToSolConversionRate)(connection, tokenMint, tokenAmount, tokenDecimals, slippage, poolKey);
            if (rate !== null) {
                const solAmount = rate * tokenAmount;
                console.log('\n✅ Token to SOL Conversion Rate:');
                console.log(`   ${tokenAmount} token(s) = ${(0, amounts_1.formatLamportsAsSol)(solAmount * 1e9)} SOL`);
                console.log(`   Rate: ${rate.toFixed(9)} SOL per token`);
                console.log(`   Rate: ${(1 / rate).toFixed(2)} tokens per SOL`);
            }
            else {
                console.log('\n❌ Failed to get conversion rate');
                console.log('💡 Make sure the token exists and is either on a bonding curve or has been migrated to an AMM pool');
            }
            console.log('');
        }
        // Get SOL to token conversion rate
        if (showSolToToken) {
            console.log(`💱 Calculating conversion rate for ${solAmount} SOL to tokens...`);
            const tokensPerSol = await (0, conversion_rate_1.getSolToTokenConversionRate)(connection, tokenMint, solAmount, slippage, poolKey);
            if (tokensPerSol !== null) {
                const tokensReceived = tokensPerSol * solAmount;
                console.log('\n✅ SOL to Token Conversion Rate:');
                console.log(`   ${solAmount} SOL = ${tokensReceived.toLocaleString()} tokens`);
                if (tokenDecimals > 0) {
                    const tokensWithDecimals = tokensReceived / Math.pow(10, tokenDecimals);
                    console.log(`   ${solAmount} SOL = ${tokensWithDecimals.toLocaleString()} tokens (with decimals)`);
                }
                console.log(`   Rate: ${tokensPerSol.toLocaleString()} tokens per SOL`);
                const solPerToken = 1 / tokensPerSol;
                console.log(`   Rate: ${solPerToken.toFixed(9)} SOL per token`);
            }
            else {
                console.log('\n❌ Failed to get conversion rate');
                console.log('💡 Make sure the token exists and is either on a bonding curve or has been migrated to an AMM pool');
            }
            console.log('');
        }
    }
    catch (error) {
        console.error(`❌ Error: ${error}`);
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
        }
    }
}
// Only run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=conversion-rate-cli.js.map