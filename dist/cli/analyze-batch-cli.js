#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const cli_args_1 = require("./cli-args");
const debug_1 = require("../src/utils/debug");
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
        const network = args.network || 'devnet';
        const format = args.format || 'table';
        const rpcUrl = network === 'mainnet'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com';
        const connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        (0, debug_1.log)(`🔍 Analyzing batch transaction: ${args.signature}`);
        (0, debug_1.log)(`🌐 Network: ${network}\n`);
        // Get transaction details
        const tx = await connection.getTransaction(args.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
            (0, debug_1.logError)('❌ Transaction not found or failed to fetch');
            return;
        }
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
        // Analyze the transaction
        const analysis = analyzeTransaction(tx, batchOperations);
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
 * Analyze a transaction for batch characteristics
 */
function analyzeTransaction(tx, batchOperations) {
    const analysis = {
        signature: tx.transaction.signatures[0],
        slot: tx.slot,
        blockTime: tx.blockTime,
        fee: tx.meta?.fee,
        success: !tx.meta?.err,
        error: tx.meta?.err,
        isBatchTransaction: false,
        batchCharacteristics: {
            instructionCount: tx.transaction.message.instructions.length,
            accountCount: tx.transaction.message.accountKeys.length,
            hasFeePayer: false,
            feePayerAccount: null,
            participantWallets: [],
            tokenOperations: [],
            solOperations: [],
            estimatedBatchSize: 'unknown'
        },
        participants: [],
        tokenTransfers: [],
        solTransfers: [],
        explorerUrl: `https://explorer.solana.com/tx/${tx.transaction.signatures[0]}${tx.slot ? '?cluster=devnet' : ''}`,
        generatedAt: new Date().toISOString()
    };
    // Analyze accounts
    const accountKeys = tx.transaction.message.accountKeys;
    const accountBalances = tx.meta?.preBalances || [];
    const accountBalancesPost = tx.meta?.postBalances || [];
    // Find fee payer (usually the first account that lost SOL for fees)
    let feePayerIndex = -1;
    let minBalanceChange = 0;
    for (let i = 0; i < accountBalances.length; i++) {
        const change = (accountBalancesPost[i] || 0) - (accountBalances[i] || 0);
        if (change < minBalanceChange) {
            minBalanceChange = change;
            feePayerIndex = i;
        }
    }
    if (feePayerIndex >= 0) {
        analysis.batchCharacteristics.hasFeePayer = true;
        analysis.batchCharacteristics.feePayerAccount = {
            index: feePayerIndex,
            publicKey: accountKeys[feePayerIndex].toString(),
            balanceChange: minBalanceChange / 1e9, // Convert to SOL
            preBalance: accountBalances[feePayerIndex] / 1e9,
            postBalance: accountBalancesPost[feePayerIndex] / 1e9
        };
    }
    // Analyze SOL transfers
    for (let i = 0; i < accountBalances.length; i++) {
        const change = (accountBalancesPost[i] || 0) - (accountBalances[i] || 0);
        if (Math.abs(change) > 1000) { // More than 1000 lamports
            analysis.solTransfers.push({
                accountIndex: i,
                publicKey: accountKeys[i].toString(),
                change: change / 1e9,
                preBalance: accountBalances[i] / 1e9,
                postBalance: accountBalancesPost[i] / 1e9,
                isFeePayer: i === feePayerIndex
            });
        }
    }
    // Analyze token transfers
    if (tx.meta?.postTokenBalances) {
        for (const balance of tx.meta.postTokenBalances) {
            const preBalance = tx.meta?.preTokenBalances?.find((pre) => pre.accountIndex === balance.accountIndex);
            const change = (balance.uiTokenAmount.uiAmount || 0) -
                (preBalance?.uiTokenAmount.uiAmount || 0);
            if (Math.abs(change) > 0.000001) { // Significant token change
                analysis.tokenTransfers.push({
                    mint: balance.mint,
                    owner: balance.owner,
                    accountIndex: balance.accountIndex,
                    change: change,
                    decimals: balance.uiTokenAmount.decimals,
                    amount: balance.uiTokenAmount.amount,
                    uiAmount: balance.uiTokenAmount.uiAmount
                });
            }
        }
    }
    // Determine if this is a batch transaction
    analysis.isBatchTransaction = determineIfBatchTransaction(analysis, batchOperations);
    // Extract participants
    analysis.participants = extractParticipants(analysis, accountKeys);
    // Categorize operations
    analysis.batchCharacteristics.tokenOperations = categorizeTokenOperations(analysis.tokenTransfers);
    analysis.batchCharacteristics.solOperations = categorizeSolOperations(analysis.solTransfers);
    // Estimate batch size
    analysis.batchCharacteristics.estimatedBatchSize = estimateBatchSize(analysis);
    return analysis;
}
/**
 * Determine if this is a batch transaction
 */
function determineIfBatchTransaction(analysis, batchOperations) {
    // Heuristics for batch transactions
    const indicators = {
        highInstructionCount: analysis.batchCharacteristics.instructionCount > 5,
        multipleParticipants: analysis.participants.length > 2,
        hasFeePayer: analysis.batchCharacteristics.hasFeePayer,
        multipleTokenOperations: analysis.tokenTransfers.length > 2,
        multipleSolOperations: analysis.solTransfers.length > 2
    };
    const score = Object.values(indicators).filter(Boolean).length;
    // If we have batch operations context, use that
    if (batchOperations && batchOperations.length > 0) {
        return true;
    }
    // Otherwise use heuristics
    return score >= 3;
}
/**
 * Extract participant wallets
 */
function extractParticipants(analysis, accountKeys) {
    const participants = [];
    // Add fee payer
    if (analysis.batchCharacteristics.hasFeePayer) {
        participants.push({
            type: 'fee-payer',
            publicKey: analysis.batchCharacteristics.feePayerAccount.publicKey,
            accountIndex: analysis.batchCharacteristics.feePayerAccount.index,
            role: 'Pays transaction fees'
        });
    }
    // Add token transfer participants
    const tokenParticipants = new Set();
    analysis.tokenTransfers.forEach((transfer) => {
        if (transfer.owner) {
            tokenParticipants.add(transfer.owner);
        }
    });
    tokenParticipants.forEach((publicKey) => {
        const accountIndex = accountKeys.findIndex(key => key.toString() === publicKey);
        participants.push({
            type: 'token-participant',
            publicKey,
            accountIndex: accountIndex >= 0 ? accountIndex : 'unknown',
            role: 'Participates in token transfers'
        });
    });
    return participants;
}
/**
 * Categorize token operations
 */
function categorizeTokenOperations(tokenTransfers) {
    const operations = [];
    const groupedByMint = {};
    // Group by mint
    tokenTransfers.forEach(transfer => {
        if (!groupedByMint[transfer.mint]) {
            groupedByMint[transfer.mint] = [];
        }
        groupedByMint[transfer.mint].push(transfer);
    });
    // Categorize each mint
    Object.entries(groupedByMint).forEach((([mint, transfers]) => {
        const totalChange = transfers.reduce((sum, t) => sum + t.change, 0);
        const participants = Array.from(new Set(transfers.map(t => t.owner)));
        operations.push({
            mint,
            operationType: totalChange > 0 ? 'net-receive' : totalChange < 0 ? 'net-send' : 'swap',
            totalChange,
            participantCount: participants.length,
            participants,
            transfers
        });
    }));
    return operations;
}
/**
 * Categorize SOL operations
 */
function categorizeSolOperations(solTransfers) {
    const operations = [];
    solTransfers.forEach(transfer => {
        operations.push({
            accountIndex: transfer.accountIndex,
            publicKey: transfer.publicKey,
            operationType: transfer.change > 0 ? 'receive' : 'send',
            amount: Math.abs(transfer.change),
            isFeePayer: transfer.isFeePayer
        });
    });
    return operations;
}
/**
 * Estimate batch size
 */
function estimateBatchSize(analysis) {
    const instructionCount = analysis.batchCharacteristics.instructionCount;
    const participantCount = analysis.participants.length;
    const tokenOperationCount = analysis.batchCharacteristics.tokenOperations.length;
    if (instructionCount > 20 || participantCount > 10) {
        return 'large';
    }
    else if (instructionCount > 10 || participantCount > 5) {
        return 'medium';
    }
    else if (instructionCount > 5 || participantCount > 2) {
        return 'small';
    }
    else {
        return 'single';
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
    console.log(`🎯 Batch Transaction: ${analysis.isBatchTransaction ? 'YES' : 'NO'}`);
    console.log(`📊 Estimated Size: ${analysis.batchCharacteristics.estimatedBatchSize.toUpperCase()}\n`);
    if (analysis.batchCharacteristics.hasFeePayer) {
        console.log('💳 FEE PAYER:');
        console.log(`   Account: ${analysis.batchCharacteristics.feePayerAccount.publicKey}`);
        console.log(`   Balance Change: ${analysis.batchCharacteristics.feePayerAccount.balanceChange.toFixed(9)} SOL`);
        console.log(`   Paid Fees: ${analysis.fee} lamports\n`);
    }
    console.log('👥 PARTICIPANTS:');
    analysis.participants.forEach((participant, i) => {
        console.log(`   ${i + 1}. ${participant.publicKey} (${participant.type})`);
        console.log(`      Role: ${participant.role}\n`);
    });
    console.log('🪙 TOKEN OPERATIONS:');
    analysis.batchCharacteristics.tokenOperations.forEach((op, i) => {
        console.log(`   ${i + 1}. Token: ${op.mint}`);
        console.log(`      Type: ${op.operationType.toUpperCase()}`);
        console.log(`      Net Change: ${op.totalChange > 0 ? '+' : ''}${op.totalChange}`);
        console.log(`      Participants: ${op.participantCount}\n`);
    });
    console.log('💎 SOL OPERATIONS:');
    analysis.solTransfers.forEach((transfer, i) => {
        console.log(`   ${i + 1}. ${transfer.publicKey}`);
        console.log(`      Change: ${transfer.change > 0 ? '+' : ''}${transfer.change.toFixed(9)} SOL`);
        console.log(`      Type: ${transfer.isFeePayer ? 'FEE PAYER' : transfer.change > 0 ? 'RECEIVED' : 'SENT'}\n`);
    });
    console.log('📊 BATCH CHARACTERISTICS:');
    console.log(`   Instructions: ${analysis.batchCharacteristics.instructionCount}`);
    console.log(`   Accounts: ${analysis.batchCharacteristics.accountCount}`);
    console.log(`   Token Operations: ${analysis.batchCharacteristics.tokenOperations.length}`);
    console.log(`   SOL Operations: ${analysis.batchCharacteristics.solOperations.length}\n`);
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