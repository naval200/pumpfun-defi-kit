#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cli_args_1 = require("./cli-args");
const debug_1 = require("../src/utils/debug");
const getTransactions_1 = require("../src/getTransactions");
const connection_1 = require("../src/utils/connection");
const web3_js_1 = require("@solana/web3.js");
const fs = tslib_1.__importStar(require("fs"));
/**
 * Format SOL transaction for display
 */
function formatSolTransaction(tx, index = 0) {
    const formatDate = (blockTime) => {
        if (!blockTime)
            return 'Unknown';
        return new Date(blockTime * 1000).toLocaleString();
    };
    const formatAmount = (amount) => {
        return (amount / 1e9).toFixed(9);
    };
    console.log(`\n${index + 1}. ${tx.tx.transaction.signatures[0]}`);
    console.log(`   📅 Time: ${formatDate(tx.tx.blockTime ?? null)}`);
    console.log(`   💰 Fee: ${tx.tx.meta?.fee || 0} lamports`);
    console.log(`   ✅ Success: ${tx.tx.meta?.err ? 'NO' : 'YES'}`);
    console.log(`   🔄 Type: ${tx.type.toUpperCase()}`);
    console.log(`   💎 SOL Change: ${tx.change > 0 ? '+' : ''}${formatAmount(tx.change)} SOL`);
    console.log(`   📊 Balance: ${formatAmount(tx.preBalance)} → ${formatAmount(tx.postBalance)}`);
    if (tx.tx.meta?.err) {
        console.log(`   ❌ Error: ${JSON.stringify(tx.tx.meta.err)}`);
    }
}
/**
 * Format SPL token transaction for display
 */
function formatSplTokenTransaction(tx, index = 0) {
    const formatDate = (blockTime) => {
        if (!blockTime)
            return 'Unknown';
        return new Date(blockTime * 1000).toLocaleString();
    };
    const formatAmount = (amount) => {
        return amount.toFixed(6);
    };
    console.log(`\n${index + 1}. ${tx.tx.transaction.signatures[0]}`);
    console.log(`   📅 Time: ${formatDate(tx.tx.blockTime ?? null)}`);
    console.log(`   💰 Fee: ${tx.tx.meta?.fee || 0} lamports`);
    console.log(`   ✅ Success: ${tx.tx.meta?.err ? 'NO' : 'YES'}`);
    console.log(`   🔄 Type: ${tx.type.toUpperCase()}`);
    console.log(`   🪙 Token: ${tx.mint}`);
    console.log(`   👤 Owner: ${tx.owner}`);
    console.log(`   💰 Change: ${tx.change > 0 ? '+' : ''}${formatAmount(tx.change)} tokens`);
    console.log(`   📊 Balance: ${formatAmount(tx.preBalance)} → ${formatAmount(tx.postBalance)}`);
    if (tx.tx.meta?.err) {
        console.log(`   ❌ Error: ${JSON.stringify(tx.tx.meta.err)}`);
    }
}
/**
 * CLI for listing SPL token and SOL transactions for a public key
 */
async function listTokenTransactions() {
    try {
        const args = (0, cli_args_1.parseArgs)();
        if (args.help) {
            console.log('Usage: npm run cli:list-transactions -- --address <public-key> [options]');
            console.log('');
            console.log('Required:');
            console.log('  --address <public-key>   Public key to get transactions for');
            console.log('');
            console.log('Options:');
            console.log('  --limit <number>         Number of transactions to fetch (default: 50)');
            console.log('  --mint <mint-address>    Filter by specific token mint (optional)');
            console.log('  --output <file>          Save results to JSON file (optional)');
            console.log('  --network <network>      Network to use (devnet/mainnet, default: devnet)');
            console.log('  --format <format>        Output format (table/json, default: table)');
            console.log('  --type <type>            Transaction type (all/sol/token, default: all)');
            return;
        }
        if (!args.address) {
            (0, debug_1.logError)('❌ Error: --address parameter is required');
            console.log('Usage: npm run cli:list-transactions -- --address <public-key>');
            return;
        }
        const limit = args.limit || 50;
        const network = (args.network || 'devnet');
        const format = args.format || 'table';
        const type = args.type || 'all';
        (0, debug_1.log)(`🔍 Fetching transactions for: ${args.address}`);
        (0, debug_1.log)(`🌐 Network: ${network}`);
        (0, debug_1.log)(`📊 Limit: ${limit} transactions`);
        (0, debug_1.log)(`🎯 Type: ${type}\n`);
        // Get connection
        const connection = (0, connection_1.createConnection)({
            network,
            rpcUrl: network === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com',
            wsUrl: network === 'devnet' ? 'wss://api.devnet.solana.com' : 'wss://api.mainnet-beta.solana.com'
        });
        const publicKey = new web3_js_1.PublicKey(args.address);
        let solTransactions = [];
        let tokenTransactions = [];
        // Fetch transactions based on type
        if (type === 'all' || type === 'sol') {
            (0, debug_1.log)('🔍 Fetching SOL transactions...');
            solTransactions = await (0, getTransactions_1.getSolanaTransactions)(connection, publicKey, limit);
        }
        if (type === 'all' || type === 'token') {
            if (args.mint) {
                (0, debug_1.log)(`🔍 Fetching token transactions for mint: ${args.mint}`);
                const mintPublicKey = new web3_js_1.PublicKey(args.mint);
                tokenTransactions = await (0, getTransactions_1.getSplTokenTransactions)(connection, publicKey, mintPublicKey, limit);
            }
            else {
                (0, debug_1.log)('⚠️  No mint specified for token transactions. Use --mint <mint-address> to fetch token transactions.');
            }
        }
        // Display results
        if (format === 'json') {
            const outputData = {
                address: args.address,
                network,
                type,
                solTransactions: solTransactions.length,
                tokenTransactions: tokenTransactions.length,
                solTransactionsData: solTransactions,
                tokenTransactionsData: tokenTransactions,
                generatedAt: new Date().toISOString(),
            };
            console.log(JSON.stringify(outputData, null, 2));
        }
        else {
            console.log('\n📊 Transaction Summary:');
            console.log('========================\n');
            if (solTransactions.length === 0 && tokenTransactions.length === 0) {
                console.log('No transactions found matching criteria.');
                return;
            }
            console.log(`SOL Transactions: ${solTransactions.length}`);
            console.log(`Token Transactions: ${tokenTransactions.length}\n`);
            // Display SOL transactions
            if (solTransactions.length > 0) {
                console.log('💎 SOL Transactions:');
                console.log('====================');
                solTransactions.forEach((tx, index) => {
                    formatSolTransaction(tx, index);
                });
            }
            // Display token transactions
            if (tokenTransactions.length > 0) {
                console.log('\n🪙 Token Transactions:');
                console.log('======================');
                tokenTransactions.forEach((tx, index) => {
                    formatSplTokenTransaction(tx, index);
                });
            }
        }
        // Save to file if requested
        if (args.output) {
            const outputData = {
                address: args.address,
                network,
                type,
                solTransactions: solTransactions.length,
                tokenTransactions: tokenTransactions.length,
                solTransactionsData: solTransactions,
                tokenTransactionsData: tokenTransactions,
                generatedAt: new Date().toISOString(),
            };
            fs.writeFileSync(args.output, JSON.stringify(outputData, null, 2));
            (0, debug_1.log)(`💾 Results saved to: ${args.output}`);
        }
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error listing transactions:', error);
    }
}
// Run if this file is executed directly
if (require.main === module) {
    listTokenTransactions().catch((error) => {
        console.error('❌ Error caught:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=list-transactions-cli.js.map