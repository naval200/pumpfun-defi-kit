"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const amm_1 = require("../../src/amm");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const amounts_1 = require("../../src/utils/amounts");
function showHelp() {
    console.log(`
Usage: npm run cli:amm:create-pool -- [options]

Options:
  --help                    Show this help message
  --wallet <path>          Path to wallet JSON file (default: wallets/creator-wallet.json)
  --base-mint <address>    Base token mint address (default: from token-info.json)
  --quote-mint <address>   Quote token mint address (default: So11111111111111111111111111111111111111112)
  --base-amount <number>   Base token amount (default: 1000000)
  --quote-amount <number>  Quote token amount in SOL (default: 0.1)
  --pool-index <number>    Pool index (default: 0)

Examples:
  npm run cli:amm:create-pool -- --help
  npm run cli:amm:create-pool -- --base-amount 500000 --quote-amount 0.05
  npm run cli:amm:create-pool -- --wallet ./my-wallet.json --pool-index 1
`);
}
function parseArgs() {
    const args = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--help':
            case '-h':
                args.help = true;
                break;
            case '--wallet':
                args.wallet = argv[++i];
                break;
            case '--base-mint':
                args.baseMint = argv[++i];
                break;
            case '--quote-mint':
                args.quoteMint = argv[++i];
                break;
            case '--base-amount':
                args.baseAmount = parseInt(argv[++i]);
                break;
            case '--quote-amount':
                args.quoteAmount = parseFloat(argv[++i]);
                break;
            case '--pool-index':
                args.poolIndex = parseInt(argv[++i]);
                break;
        }
    }
    return args;
}
/**
 * CLI for creating a liquidity pool for a token
 */
async function main() {
    const args = parseArgs();
    if (args.help) {
        showHelp();
        return;
    }
    try {
        console.log('🚀 Starting AMM Pool Creation...\n');
        // Setup connection and wallet
        const connection = new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed');
        console.log('✅ Connected to Solana devnet');
        // Load wallet from file
        const walletPath = args.wallet || path_1.default.join(process.cwd(), 'wallets', 'creator-wallet.json');
        let wallet;
        try {
            const walletData = JSON.parse(fs_1.default.readFileSync(walletPath, 'utf8'));
            wallet = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(walletData));
            console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);
        }
        catch (error) {
            console.error('❌ Failed to load wallet:', error);
            return;
        }
        // Check wallet balance
        const balance = await connection.getBalance(wallet.publicKey);
        const requiredAmount = Math.floor(0.1 * 1_000_000_000);
        console.log(`💰 Wallet balance: ${(balance / 1_000_000_000).toFixed(4)} SOL`);
        if (balance < requiredAmount) {
            console.log('⚠️ Wallet balance is low. Need at least 0.001 SOL for testing.');
            return;
        }
        // Load token info or use provided mint
        let baseMint;
        let tokenInfo = {};
        const tokenInfoPath = path_1.default.join(process.cwd(), 'token-info.json');
        if (args.baseMint) {
            baseMint = new web3_js_1.PublicKey(args.baseMint);
            console.log(`✅ Using provided base mint: ${baseMint.toString()}`);
        }
        else {
            if (!fs_1.default.existsSync(tokenInfoPath)) {
                throw new Error('token-info.json not found. Please provide --base-mint or create a token first.');
            }
            tokenInfo = JSON.parse(fs_1.default.readFileSync(tokenInfoPath, 'utf8'));
            if (!tokenInfo.mint) {
                throw new Error('token-info.json does not contain a mint address');
            }
            baseMint = new web3_js_1.PublicKey(tokenInfo.mint);
            console.log('✅ Token info loaded:', {
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                mint: tokenInfo.mint,
            });
        }
        // Define pool parameters
        const quoteMint = new web3_js_1.PublicKey(args.quoteMint || 'So11111111111111111111111111111111111111112'); // SOL SPL mint (no manual wrapping required)
        // Pool amounts (use provided values or defaults)
        const baseIn = args.baseAmount ?? 1_000_000; // tokens (assuming 6 decimals)
        const quoteIn = Math.floor((args.quoteAmount ?? 0.1) * 1_000_000_000); // lamports
        const poolIndex = args.poolIndex || 0;
        console.log('\n📊 Pool Creation Parameters:');
        console.log(`Base Token: ${baseIn.toString()} tokens`);
        console.log(`Quote Token: ${(0, amounts_1.formatLamportsAsSol)(quoteIn)} SOL`);
        console.log(`Pool Index: ${poolIndex}`);
        // Create the pool
        console.log('\n🏊 Creating AMM liquidity pool...');
        const result = await (0, amm_1.createPool)(connection, wallet, baseMint, quoteMint, baseIn, quoteIn, poolIndex);
        if (result.success) {
            console.log('\n🎉 Pool created successfully!');
            console.log(`Pool Key: ${result.poolKey?.toString()}`);
            console.log(`Transaction: ${result.signature}`);
            // Update token-info.json with pool information if it exists
            if (Object.keys(tokenInfo).length > 0) {
                const updatedTokenInfo = {
                    ...tokenInfo,
                    poolKey: result.poolKey?.toString(),
                    poolCreatedAt: new Date().toISOString(),
                    poolTransaction: result.signature,
                    poolConfig: {
                        baseAmount: baseIn,
                        quoteAmountLamports: quoteIn.toString(),
                        poolIndex: poolIndex,
                    },
                };
                fs_1.default.writeFileSync(tokenInfoPath, JSON.stringify(updatedTokenInfo, null, 2));
                console.log('✅ Updated token-info.json with pool details');
            }
        }
        else {
            console.log('\n❌ Pool creation failed:', result.error);
        }
    }
    catch (error) {
        console.error('❌ Error creating pool:', error);
    }
}
// Only run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=create-pool-cli.js.map