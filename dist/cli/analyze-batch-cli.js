#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cli_args_1 = require("./cli-args");
const debug_1 = require("../src/utils/debug");
const getTransactions_1 = require("../src/getTransactions");
const fs = tslib_1.__importStar(require("fs"));
/**
 * CLI for analyzing batch transactions with detailed breakdown
 */
async function analyzeBatchTransaction() {
    try {
        const args = (0, cli_args_1.parseArgs)();
        if (args.help) {
            console.log('Usage: npm run cli:analyze-batch -- --signature <tx-signature> [options]');
            console.log('');
            console.log('Required:');
            console.log('  --signature <tx-signature>   Transaction signature to analyze');
            console.log('');
            console.log('Options:');
            console.log('  --network <network>          Network to use (devnet/mainnet, default: devnet)');
            console.log('  --output <file>              Save analysis to JSON file (optional)');
            console.log('  --operations <file>          Path to batch operations JSON file for context');
            console.log('  --format <format>            Output format (table/json, default: table)');
            return;
        }
        if (!args.signature) {
            (0, debug_1.logError)('❌ Error: --signature parameter is required');
            console.log('Usage: npm run cli:analyze-batch -- --signature <tx-signature>');
            return;
        }
        const network = (args.network || 'devnet');
        const format = args.format || 'table';
        (0, debug_1.log)(`🔍 Analyzing batch transaction: ${args.signature}`);
        (0, debug_1.log)(`🌐 Network: ${network}\n`);
        // Load batch operations if provided
        let batchOperations = null;
        if (args.operations) {
            try {
                const operationsData = fs.readFileSync(args.operations, 'utf8');
                batchOperations = JSON.parse(operationsData);
                (0, debug_1.log)(`📋 Loaded ${batchOperations?.length} batch operations for context\n`);
            }
            catch (error) {
                (0, debug_1.log)(`⚠️ Could not load batch operations: ${error}\n`);
            }
        }
        // Get the specific transaction
        const tx = await (0, getTransactions_1.getTransactionBySignature)(args.signature, {
            network,
            includeBatchAnalysis: true
        });
        if (!tx) {
            (0, debug_1.logError)('❌ Transaction not found or failed to fetch');
            return;
        }
        // Enhanced analysis for batch transactions
        const analysis = {
            ...tx,
            batchCharacteristics: {
                instructionCount: tx.instructionCount,
                accountCount: tx.accountCount,
                hasFeePayer: tx.solTransfers.some(transfer => transfer.change < 0),
                feePayerAccount: tx.solTransfers.find(transfer => transfer.change < 0),
                participantWallets: [...new Set(tx.tokenTransfers.map(t => t.owner))],
                tokenOperations: tx.tokenTransfers.length,
                solOperations: tx.solTransfers.length,
                estimatedBatchSize: tx.instructionCount > 20 ? 'large' :
                    tx.instructionCount > 10 ? 'medium' :
                        tx.instructionCount > 5 ? 'small' : 'single'
            },
            participants: [
                ...tx.solTransfers.map(transfer => ({
                    type: 'sol-participant',
                    accountIndex: transfer.accountIndex,
                    change: transfer.change,
                    isFeePayer: transfer.change < 0
                })),
                ...tx.tokenTransfers.map(transfer => ({
                    type: 'token-participant',
                    mint: transfer.mint,
                    owner: transfer.owner,
                    change: transfer.change
                }))
            ],
            batchOperations,
            generatedAt: new Date().toISOString()
        };
        // Display results
        if (format === 'json') {
            console.log(JSON.stringify(analysis, null, 2));
        }
        else {
            displayBatchAnalysis(analysis);
        }
        // Save to file if requested
        if (args.output) {
            fs.writeFileSync(args.output, JSON.stringify(analysis, null, 2));
            (0, debug_1.log)(`💾 Analysis saved to: ${args.output}`);
        }
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error analyzing batch transaction:', error);
    }
}
/**
 * Display batch analysis in table format
 */
function displayBatchAnalysis(analysis) {
    console.log('\n🔍 BATCH TRANSACTION ANALYSIS');
    console.log('================================\n');
    console.log(`📝 Signature: ${analysis.signature}`);
    console.log(`📅 Time: ${analysis.blockTime ? new Date(analysis.blockTime * 1000).toISOString() : 'Unknown'}`);
    console.log(`💰 Fee: ${analysis.fee} lamports`);
    console.log(`✅ Success: ${analysis.success}`);
    console.log(`🔄 Batch Transaction: ${analysis.isBatchTransaction ? 'YES' : 'NO'}`);
    console.log(`📊 Estimated Size: ${analysis.batchCharacteristics.estimatedBatchSize.toUpperCase()}\n`);
    if (analysis.batchCharacteristics.hasFeePayer) {
        console.log('💳 FEE PAYER:');
        const feePayer = analysis.batchCharacteristics.feePayerAccount;
        console.log(`   Account Index: ${feePayer.accountIndex}`);
        console.log(`   Balance Change: ${feePayer.change.toFixed(9)} SOL`);
        console.log(`   Paid Fees: ${analysis.fee} lamports\n`);
    }
    console.log('👥 PARTICIPANTS:');
    analysis.participants.forEach((participant, i) => {
        console.log(`   ${i + 1}. ${participant.type.toUpperCase()}`);
        if (participant.accountIndex !== undefined) {
            console.log(`      Account Index: ${participant.accountIndex}`);
        }
        if (participant.mint) {
            console.log(`      Token: ${participant.mint}`);
        }
        if (participant.owner) {
            console.log(`      Owner: ${participant.owner}`);
        }
        console.log(`      Change: ${participant.change > 0 ? '+' : ''}${participant.change}`);
        console.log(`      Fee Payer: ${participant.isFeePayer ? 'YES' : 'NO'}\n`);
    });
    console.log('🪙 TOKEN OPERATIONS:');
    analysis.tokenTransfers.forEach((transfer, i) => {
        console.log(`   ${i + 1}. Token: ${transfer.mint}`);
        console.log(`      Owner: ${transfer.owner}`);
        console.log(`      Change: ${transfer.change > 0 ? '+' : ''}${transfer.change}`);
        console.log(`      Decimals: ${transfer.decimals}\n`);
    });
    console.log('💎 SOL OPERATIONS:');
    analysis.solTransfers.forEach((transfer, i) => {
        console.log(`   ${i + 1}. Account ${transfer.accountIndex}`);
        console.log(`      Change: ${transfer.change > 0 ? '+' : ''}${transfer.change.toFixed(9)} SOL`);
        console.log(`      Type: ${transfer.change < 0 ? 'FEE PAYER' : 'RECEIVED'}\n`);
    });
    console.log('📊 BATCH CHARACTERISTICS:');
    console.log(`   Instructions: ${analysis.batchCharacteristics.instructionCount}`);
    console.log(`   Accounts: ${analysis.batchCharacteristics.accountCount}`);
    console.log(`   Token Operations: ${analysis.batchCharacteristics.tokenOperations}`);
    console.log(`   SOL Operations: ${analysis.batchCharacteristics.solOperations}\n`);
    console.log(`🔗 Explorer: ${analysis.explorerUrl}\n`);
}
// Run if this file is executed directly
if (require.main === module) {
    analyzeBatchTransaction().catch((error) => {
        console.error('❌ Error caught:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=analyze-batch-cli.js.map