#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const cli_args_1 = require("./cli-args");
const debug_1 = require("../src/utils/debug");
const fs_1 = tslib_1.__importDefault(require("fs"));
/**
 * CLI for listing SPL token transactions for a public key
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
            return;
        }
        if (!args.address) {
            (0, debug_1.logError)('❌ Error: --address parameter is required');
            console.log('Usage: npm run cli:list-transactions -- --address <public-key>');
            return;
        }
        let address;
        try {
            address = new web3_js_1.PublicKey(args.address);
        }
        catch (error) {
            (0, debug_1.logError)('❌ Error: Invalid public key format');
            return;
        }
        const limit = args.limit || 50;
        const network = args.network || 'devnet';
        const format = args.format || 'table';
        const rpcUrl = network === 'mainnet'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com';
        const connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        (0, debug_1.log)(`🔍 Fetching transactions for: ${address.toString()}`);
        (0, debug_1.log)(`🌐 Network: ${network}`);
        (0, debug_1.log)(`📊 Limit: ${limit} transactions\n`);
        // Get transaction signatures
        const signatures = await connection.getSignaturesForAddress(address, {
            limit,
        });
        (0, debug_1.log)(`📝 Found ${signatures.length} transaction signatures\n`);
        const transactions = [];
        const mintFilter = args.mint ? new web3_js_1.PublicKey(args.mint) : null;
        for (let i = 0; i < signatures.length; i++) {
            const sig = signatures[i];
            (0, debug_1.log)(`📄 Processing transaction ${i + 1}/${signatures.length}: ${sig.signature}`);
            try {
                const tx = await connection.getTransaction(sig.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                });
                if (!tx) {
                    (0, debug_1.log)(`⚠️  Transaction not found: ${sig.signature}`);
                    continue;
                }
                // Filter by mint if specified
                if (mintFilter) {
                    const hasMint = tx.meta?.postTokenBalances?.some(balance => balance.mint === mintFilter.toString()) || tx.meta?.preTokenBalances?.some(balance => balance.mint === mintFilter.toString());
                    if (!hasMint)
                        continue;
                }
                // Extract token transfers
                const tokenTransfers = [];
                if (tx.meta?.postTokenBalances) {
                    for (const balance of tx.meta.postTokenBalances) {
                        const preBalance = tx.meta?.preTokenBalances?.find(pre => pre.accountIndex === balance.accountIndex);
                        const change = (balance.uiTokenAmount.uiAmount || 0) -
                            (preBalance?.uiTokenAmount.uiAmount || 0);
                        if (change !== 0) {
                            tokenTransfers.push({
                                mint: balance.mint,
                                owner: balance.owner,
                                change: change,
                                decimals: balance.uiTokenAmount.decimals,
                                amount: balance.uiTokenAmount.amount,
                                uiAmount: balance.uiTokenAmount.uiAmount,
                            });
                        }
                    }
                }
                // Extract SOL transfers
                const solTransfers = [];
                if (tx.meta?.postBalances && tx.meta?.preBalances) {
                    for (let i = 0; i < tx.meta.postBalances.length; i++) {
                        const postBalance = tx.meta.postBalances[i];
                        const preBalance = tx.meta.preBalances[i];
                        const change = postBalance - preBalance;
                        if (change !== 0) {
                            solTransfers.push({
                                accountIndex: i,
                                change: change / 1e9, // Convert lamports to SOL
                                postBalance: postBalance / 1e9,
                                preBalance: preBalance / 1e9,
                            });
                        }
                    }
                }
                transactions.push({
                    signature: sig.signature,
                    slot: sig.slot,
                    blockTime: sig.blockTime,
                    fee: tx.meta?.fee,
                    success: !tx.meta?.err,
                    error: tx.meta?.err,
                    tokenTransfers,
                    solTransfers,
                    explorerUrl: `https://explorer.solana.com/tx/${sig.signature}${network === 'devnet' ? '?cluster=devnet' : ''}`,
                });
            }
            catch (error) {
                (0, debug_1.logError)(`❌ Error fetching transaction ${sig.signature}:`, error);
            }
        }
        // Display results based on format
        if (format === 'json') {
            const outputData = {
                address: address.toString(),
                network,
                totalTransactions: transactions.length,
                transactions,
                generatedAt: new Date().toISOString(),
            };
            console.log(JSON.stringify(outputData, null, 2));
        }
        else {
            // Table format
            console.log('\n📊 Transaction Summary:');
            console.log('========================\n');
            if (transactions.length === 0) {
                console.log('No transactions found matching criteria.');
                return;
            }
            transactions.forEach((tx, index) => {
                console.log(`${index + 1}. ${tx.signature}`);
                console.log(`   📅 Time: ${tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'Unknown'}`);
                console.log(`   💰 Fee: ${tx.fee} lamports`);
                console.log(`   ✅ Success: ${tx.success}`);
                if (tx.error) {
                    console.log(`   ❌ Error: ${JSON.stringify(tx.error)}`);
                }
                if (tx.solTransfers.length > 0) {
                    console.log(`   💎 SOL Transfers:`);
                    tx.solTransfers.forEach((transfer) => {
                        console.log(`      Account ${transfer.accountIndex}: ${transfer.change > 0 ? '+' : ''}${transfer.change.toFixed(9)} SOL`);
                    });
                }
                if (tx.tokenTransfers.length > 0) {
                    console.log(`   🪙 Token Transfers:`);
                    tx.tokenTransfers.forEach((transfer) => {
                        console.log(`      ${transfer.mint}: ${transfer.change > 0 ? '+' : ''}${transfer.change} (${transfer.amount})`);
                    });
                }
                console.log(`   🔗 Explorer: ${tx.explorerUrl}\n`);
            });
        }
        // Save to file if requested
        if (args.output) {
            const outputData = {
                address: address.toString(),
                network,
                totalTransactions: transactions.length,
                transactions,
                generatedAt: new Date().toISOString(),
            };
            fs_1.default.writeFileSync(args.output, JSON.stringify(outputData, null, 2));
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