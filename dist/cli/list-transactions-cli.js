#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cli_args_1 = require("./cli-args");
const debug_1 = require("../src/utils/debug");
const getTransactions_1 = require("../src/getTransactions");
const fs = tslib_1.__importStar(require("fs"));
/**
 * Format transaction data for display
 */
function formatTransactionForDisplay(tx, index = 0) {
    const formatDate = (blockTime) => {
        if (!blockTime)
            return 'Unknown';
        return new Date(blockTime * 1000).toLocaleString();
    };
    const formatAmount = (amount, decimals = 9) => {
        return amount.toFixed(decimals);
    };
    console.log(`\n${index + 1}. ${tx.signature}`);
    console.log(`   📅 Time: ${formatDate(tx.blockTime)}`);
    console.log(`   💰 Fee: ${tx.fee} lamports`);
    console.log(`   ✅ Success: ${tx.success}`);
    if (tx.isBatchTransaction) {
        console.log(`   🔄 Batch: YES (${tx.instructionCount} instructions, ${tx.accountCount} accounts)`);
    }
    if (tx.error) {
        console.log(`   ❌ Error: ${JSON.stringify(tx.error)}`);
    }
    if (tx.solTransfers.length > 0) {
        console.log(`   💎 SOL Transfers:`);
        tx.solTransfers.forEach(transfer => {
            console.log(`      Account ${transfer.accountIndex}: ${transfer.change > 0 ? '+' : ''}${formatAmount(transfer.change)} SOL`);
        });
    }
    if (tx.tokenTransfers.length > 0) {
        console.log(`   🪙 Token Transfers:`);
        tx.tokenTransfers.forEach(transfer => {
            console.log(`      ${transfer.mint}: ${transfer.change > 0 ? '+' : ''}${formatAmount(transfer.change, transfer.decimals)} (${transfer.amount})`);
        });
    }
    console.log(`   🔗 Explorer: ${tx.explorerUrl}`);
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
            console.log('  --type <type>            Transaction type (all/sol/token/batch, default: all)');
            console.log('  --batch-analysis         Include batch transaction analysis');
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
        const includeBatchAnalysis = args.batchAnalysis || false;
        (0, debug_1.log)(`🔍 Fetching transactions for: ${args.address}`);
        (0, debug_1.log)(`🌐 Network: ${network}`);
        (0, debug_1.log)(`📊 Limit: ${limit} transactions`);
        (0, debug_1.log)(`🎯 Type: ${type}`);
        (0, debug_1.log)(`🔄 Batch Analysis: ${includeBatchAnalysis ? 'YES' : 'NO'}\n`);
        const options = {
            network,
            limit,
            mintFilter: args.mint,
            includeBatchAnalysis
        };
        let transactions;
        // Fetch transactions based on type
        switch (type) {
            case 'sol':
                transactions = await (0, getTransactions_1.getSolTransactions)(args.address, options);
                break;
            case 'token':
                transactions = await (0, getTransactions_1.getTokenTransactions)(args.address, options);
                break;
            case 'batch':
                transactions = await (0, getTransactions_1.getBatchTransactions)(args.address, options);
                break;
            case 'all':
            default:
                transactions = await (0, getTransactions_1.getTransactions)(args.address, options);
                break;
        }
        // Display results
        if (format === 'json') {
            const outputData = {
                address: args.address,
                network,
                type,
                totalTransactions: transactions.length,
                transactions,
                summary: (0, getTransactions_1.getTransactionSummary)(transactions),
                generatedAt: new Date().toISOString(),
            };
            console.log(JSON.stringify(outputData, null, 2));
        }
        else {
            console.log('\n📊 Transaction Summary:');
            console.log('========================\n');
            if (transactions.length === 0) {
                console.log('No transactions found matching criteria.');
                return;
            }
            // Display summary
            const summary = (0, getTransactions_1.getTransactionSummary)(transactions);
            console.log(`Total Transactions: ${summary.totalTransactions}`);
            console.log(`Success Rate: ${summary.successRate.toFixed(2)}%`);
            console.log(`Total Fees: ${summary.totalFeesInSol.toFixed(9)} SOL`);
            console.log(`SOL Transfers: ${summary.totalSolTransfers}`);
            console.log(`Token Transfers: ${summary.totalTokenTransfers}`);
            if (includeBatchAnalysis) {
                console.log(`Batch Transactions: ${summary.batchTransactions}`);
            }
            console.log(`Unique Tokens: ${summary.uniqueTokens}\n`);
            // Display individual transactions
            transactions.forEach((tx, index) => {
                formatTransactionForDisplay(tx, index);
            });
        }
        // Save to file if requested
        if (args.output) {
            const outputData = {
                address: args.address,
                network,
                type,
                totalTransactions: transactions.length,
                transactions,
                summary: (0, getTransactions_1.getTransactionSummary)(transactions),
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