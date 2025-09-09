#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToken = createToken;
const web3_js_1 = require("@solana/web3.js");
const createToken_1 = require("../../src/bonding-curve/createToken");
const bc_helper_1 = require("../../src/bonding-curve/bc-helper");
const cli_args_1 = require("../cli-args");
const amounts_1 = require("../../src/utils/amounts");
/**
 * Create a new PumpFun token with configurable parameters
 */
async function createToken() {
    const args = (0, cli_args_1.parseArgs)();
    if (args.help) {
        (0, cli_args_1.printUsage)('cli:bond-create-token', [
            '  --token-name <name>        Token name (required)',
            '  --token-symbol <symbol>    Token symbol (required)',
            '  --token-description <desc> Token description',
            '  --image-path <path>        Path to token image',
            '  --initial-buy <amount>     Initial buy amount in SOL (default: 0.001)',
            '  --wallet <path>            Path to wallet JSON file',
            '  --output-token <path>      Path to save token info',
        ]);
        return;
    }
    // Validate required arguments
    if (!args.tokenName || !args.tokenSymbol) {
        console.error('❌ Error: --token-name and --token-symbol are required');
        (0, cli_args_1.printUsage)('cli:bond-create-token');
        return;
    }
    // Set default initial buy amount if not provided
    const initialBuySol = args.initialBuyAmount || 0.001; // Default 0.001 SOL
    const initialBuyLamports = (0, amounts_1.solToLamports)(initialBuySol);
    console.log('🚀 Creating PumpFun Token');
    console.log('==========================');
    console.log(`Token Name: ${args.tokenName}`);
    console.log(`Token Symbol: ${args.tokenSymbol}`);
    console.log(`Description: ${args.tokenDescription || 'No description'}`);
    console.log(`Image Path: ${args.imagePath || 'No image'}`);
    console.log(`💰 Initial Buy: ${(0, amounts_1.formatLamportsAsSol)(initialBuyLamports)} SOL`);
    try {
        // Setup connection and wallet
        const connection = new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed');
        const wallet = (0, cli_args_1.loadWallet)(args.wallet);
        console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);
        // Check wallet balance
        const balance = await connection.getBalance(wallet.publicKey);
        if (balance < 1000000) {
            // 0.001 SOL in lamports (smaller for testing)
            console.log(`⚠️ Wallet balance is low. Need at least ${(0, amounts_1.formatLamportsAsSol)(1000000)} SOL for testing.`);
            process.exit(1);
        }
        // Create token configuration
        const tokenConfig = {
            name: args.tokenName,
            symbol: args.tokenSymbol,
            description: args.tokenDescription || `Test token ${args.tokenName}`,
            imagePath: args.imagePath || 'random.png',
            initialBuyAmount: initialBuyLamports,
        };
        console.log('\n🎯 Creating token...');
        const createResult = await (0, createToken_1.createPumpFunToken)(connection, wallet, tokenConfig, false);
        if (createResult.success && createResult.mintKeypair) {
            const mint = createResult.mintKeypair;
            const tokenAddress = createResult.mint || mint.publicKey.toString();
            // Derive bonding curve address from mint (this is how it works in PumpFun)
            const [bondingCurveAddress] = (0, bc_helper_1.deriveBondingCurveAddress)(mint.publicKey);
            console.log(`✅ Token created successfully!`);
            console.log(`   Mint: ${tokenAddress}`);
            console.log(`   Name: ${tokenConfig.name}`);
            console.log(`   Symbol: ${tokenConfig.symbol}`);
            console.log(`   Bonding Curve: ${bondingCurveAddress.toString()}`);
            // Save token info
            const tokenInfo = {
                mint: tokenAddress,
                name: tokenConfig.name,
                symbol: tokenConfig.symbol,
                description: tokenConfig.description,
                bondingCurve: bondingCurveAddress.toString(),
                createdAt: new Date().toISOString(),
            };
            (0, cli_args_1.saveTokenInfo)(tokenInfo, args.outputToken);
            console.log('\n📋 Token Details:');
            console.log(JSON.stringify(tokenInfo, null, 2));
        }
        else {
            console.log(`❌ Token creation failed: ${createResult.error}`);
            return;
        }
    }
    catch (error) {
        console.error(`❌ Error: ${error}`);
        return;
    }
}
// Only run if this file is executed directly
if (require.main === module) {
    createToken().catch(console.error);
}
//# sourceMappingURL=create-token-cli.js.map