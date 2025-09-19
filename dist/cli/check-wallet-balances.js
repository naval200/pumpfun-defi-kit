#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const cli_args_1 = require("./cli-args");
const debug_1 = require("../src/utils/debug");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const amounts_1 = require("../src/utils/amounts");
/**
 * Check wallet balances for all known tokens
 */
async function checkWalletBalances() {
    console.log('🚀 Starting checkWalletBalances function...');
    try {
        const args = (0, cli_args_1.parseArgs)();
        console.log('📋 Parsed args:', args);
        if (args.help) {
            console.log('Usage: npm run cli:check-wallet-balances -- --wallet <wallet-path> OR --address <public-key> [--mint <token-mint>] [--input-token <token-info-file>]');
            console.log('  --wallet <path>        Path to wallet JSON file (optional)');
            console.log('  --address <public-key> Public key to check balance for (optional)');
            console.log('  --mint <mint>          Specific token mint to check (optional)');
            console.log('  --input-token <file>   Path to token info JSON file (optional)');
            console.log('  --help                 Show this help message');
            console.log('');
            console.log('Note: Either --wallet or --address must be provided');
            return;
        }
        if (!args.wallet && !args.address) {
            (0, debug_1.logError)('❌ Error: Either --wallet or --address parameter is required');
            console.log('Usage: npm run cli:check-wallet-balances -- --wallet <wallet-path> OR --address <public-key>');
            return;
        }
        // Get public key from either wallet file or direct address
        let publicKey;
        let walletKeypair = null;
        if (args.wallet) {
            // Load wallet from file
            try {
                const walletData = fs_1.default.readFileSync(args.wallet, 'utf8');
                walletKeypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(JSON.parse(walletData)));
                publicKey = walletKeypair.publicKey;
            }
            catch (error) {
                (0, debug_1.logError)('❌ Failed to load wallet:', error);
                return;
            }
        }
        else {
            // Use provided public key
            try {
                publicKey = new web3_js_1.PublicKey(args.address);
            }
            catch (error) {
                (0, debug_1.logError)('❌ Invalid public key:', error);
                return;
            }
        }
        console.log('🔍 Checking Wallet Balances...\n');
        // Connect to devnet
        const connection = new web3_js_1.Connection('https://api.devnet.solana.com', 'confirmed');
        console.log(`👤 Address: ${publicKey.toString()}`);
        console.log(`🔗 Network: ${connection.rpcEndpoint}\n`);
        // Check SOL balance
        console.log('🔍 Getting SOL balance...');
        const balance = await connection.getBalance(publicKey);
        console.log(`💰 SOL Balance: ${(0, amounts_1.formatLamportsAsSol)(balance)} SOL\n`);
        // Check token from input file if provided
        if (args.inputToken) {
            console.log(`📄 Loading token info from: ${args.inputToken}`);
            try {
                const tokenInfoPath = path_1.default.resolve(args.inputToken);
                if (!fs_1.default.existsSync(tokenInfoPath)) {
                    console.log(`❌ Token info file not found: ${tokenInfoPath}`);
                    return;
                }
                const tokenInfo = JSON.parse(fs_1.default.readFileSync(tokenInfoPath, 'utf8'));
                console.log(`🪙 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
                console.log(`📍 Mint: ${tokenInfo.mint}`);
                const mintPublicKey = new web3_js_1.PublicKey(tokenInfo.mint);
                const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mintPublicKey, publicKey);
                try {
                    const accountInfo = await (0, spl_token_1.getAccount)(connection, tokenAccount);
                    const mintInfo = await (0, spl_token_1.getMint)(connection, mintPublicKey);
                    const actualBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
                    console.log(`💰 Token Balance: ${accountInfo.amount} (${actualBalance.toFixed(6)} tokens)`);
                    console.log(`🔢 Decimals: ${mintInfo.decimals}`);
                }
                catch (error) {
                    console.log(`❌ No token account found or error: ${error}`);
                }
                return; // Exit after checking input token
            }
            catch (error) {
                console.log(`❌ Error loading token info: ${error}`);
                return;
            }
        }
        // Check specific token balance if mint is provided
        if (args.mint) {
            console.log('🔍 Checking specific token balance...');
            try {
                const mintPublicKey = new web3_js_1.PublicKey(args.mint);
                const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mintPublicKey, publicKey);
                console.log(`🪙 Checking specific token: ${args.mint}`);
                console.log(`   Token Account: ${tokenAccount.toString()}`);
                try {
                    const accountInfo = await (0, spl_token_1.getAccount)(connection, tokenAccount);
                    const mintInfo = await (0, spl_token_1.getMint)(connection, mintPublicKey);
                    const actualBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
                    console.log(`✅ Token Account found`);
                    console.log(`💰 Balance: ${accountInfo.amount} (${actualBalance.toFixed(6)} tokens)`);
                    console.log(`🔢 Decimals: ${mintInfo.decimals}`);
                    if (accountInfo.amount > 0) {
                        console.log(`   🎯 Has tokens!`);
                    }
                    else {
                        console.log(`   ⚠️ Account exists but has 0 balance`);
                    }
                }
                catch (error) {
                    console.log(`   ❌ No token account found: ${error}`);
                }
            }
            catch (error) {
                console.log(`   ❌ Error checking token: ${error}`);
            }
        }
        else {
            // Check for SPL tokens with timeout and limit
            console.log('🔍 Checking for SPL tokens (limited to first 10)...');
            try {
                // Add timeout to prevent hanging
                const tokenCheckPromise = connection.getTokenAccountsByOwner(publicKey, {
                    programId: new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
                });
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000));
                const tokenAccounts = await Promise.race([tokenCheckPromise, timeoutPromise]);
                if (tokenAccounts.value && tokenAccounts.value.length > 0) {
                    console.log(`Found ${tokenAccounts.value.length} token account(s):`);
                    const accountsToCheck = tokenAccounts.value.slice(0, 10); // Limit to first 10
                    for (const account of accountsToCheck) {
                        try {
                            const accountInfo = await (0, spl_token_1.getAccount)(connection, account.pubkey);
                            const mintInfo = await (0, spl_token_1.getMint)(connection, accountInfo.mint);
                            console.log(`   🪙 ${accountInfo.mint.toString()} - Balance: ${accountInfo.amount} (${mintInfo.decimals} decimals)`);
                            if (accountInfo.amount > 0) {
                                const actualBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
                                console.log(`      💰 Actual Balance: ${actualBalance.toFixed(6)}`);
                            }
                        }
                        catch (error) {
                            console.log(`   ⚠️ Error reading account ${account.pubkey.toString()}: ${error}`);
                        }
                    }
                    if (tokenAccounts.value.length > 10) {
                        console.log(`   ... and ${tokenAccounts.value.length - 10} more accounts (not shown)`);
                    }
                }
                else {
                    console.log('No SPL token accounts found');
                }
            }
            catch (error) {
                console.log(`⚠️ Error checking SPL tokens: ${error}`);
                console.log('💡 Try using --mint <specific-mint> or --input-token <file> for specific tokens');
            }
        }
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error checking balances:', error);
    }
}
// Run if this file is executed directly
if (require.main === module) {
    checkWalletBalances().catch((error) => {
        console.error('❌ Error caught:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=check-wallet-balances.js.map