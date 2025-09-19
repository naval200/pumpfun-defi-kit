"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTokenTransfers = extractTokenTransfers;
exports.extractSolTransfers = extractSolTransfers;
exports.isBatchTransaction = isBatchTransaction;
exports.processTransaction = processTransaction;
exports.getTransactions = getTransactions;
exports.getSolTransactions = getSolTransactions;
exports.getTokenTransactions = getTokenTransactions;
exports.getBatchTransactions = getBatchTransactions;
exports.getTransactionBySignature = getTransactionBySignature;
exports.getTransactionSummary = getTransactionSummary;
const web3_js_1 = require("@solana/web3.js");
const debug_1 = require("./utils/debug");
const connection_1 = require("./utils/connection");
/**
 * Extract token transfers from transaction data
 */
function extractTokenTransfers(tx) {
    const tokenTransfers = [];
    if (!tx.meta?.postTokenBalances) {
        return tokenTransfers;
    }
    for (const balance of tx.meta.postTokenBalances) {
        const preBalance = tx.meta?.preTokenBalances?.find((pre) => pre.accountIndex === balance.accountIndex);
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
    return tokenTransfers;
}
/**
 * Extract SOL transfers from transaction data
 */
function extractSolTransfers(tx) {
    const solTransfers = [];
    if (!tx.meta?.postBalances || !tx.meta?.preBalances) {
        return solTransfers;
    }
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
    return solTransfers;
}
/**
 * Determine if a transaction is a batch transaction
 */
function isBatchTransaction(tx) {
    const instructionCount = tx.transaction?.message?.instructions?.length || 0;
    const accountCount = tx.transaction?.message?.accountKeys?.length || 0;
    // Heuristics for batch transactions
    return instructionCount > 5 || accountCount > 10;
}
/**
 * Process a single transaction into our format
 */
function processTransaction(tx, signature, network = 'devnet', includeBatchAnalysis = false) {
    const tokenTransfers = extractTokenTransfers(tx);
    const solTransfers = extractSolTransfers(tx);
    const instructionCount = tx.transaction?.message?.instructions?.length || 0;
    const accountCount = tx.transaction?.message?.accountKeys?.length || 0;
    const isBatch = includeBatchAnalysis ? isBatchTransaction(tx) : false;
    return {
        signature,
        slot: tx.slot,
        blockTime: tx.blockTime,
        fee: tx.meta?.fee || 0,
        success: !tx.meta?.err,
        error: tx.meta?.err,
        tokenTransfers,
        solTransfers,
        explorerUrl: `https://explorer.solana.com/tx/${signature}${network === 'devnet' ? '?cluster=devnet' : ''}`,
        isBatchTransaction: isBatch,
        instructionCount,
        accountCount,
    };
}
/**
 * Main function to fetch transactions for a wallet
 */
async function getTransactions(address, options = {}) {
    const { network = 'devnet', limit = 50, mintFilter, includeBatchAnalysis = false } = options;
    (0, debug_1.debugLog)(`🔍 Fetching transactions for: ${address}`);
    (0, debug_1.debugLog)(`🌐 Network: ${network}`);
    (0, debug_1.debugLog)(`📊 Limit: ${limit} transactions`);
    // Use existing createConnection function
    const connection = (0, connection_1.createConnection)({
        rpcUrl: network === 'mainnet'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com',
        wsUrl: network === 'mainnet'
            ? 'wss://api.mainnet-beta.solana.com'
            : 'wss://api.devnet.solana.com',
        network
    });
    try {
        const publicKey = new web3_js_1.PublicKey(address);
        const mintFilterPubkey = mintFilter ? new web3_js_1.PublicKey(mintFilter) : null;
        // Get transaction signatures
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
        (0, debug_1.debugLog)(`📝 Found ${signatures.length} transaction signatures`);
        const transactions = [];
        for (let i = 0; i < signatures.length; i++) {
            const sig = signatures[i];
            (0, debug_1.debugLog)(`📄 Processing transaction ${i + 1}/${signatures.length}: ${sig.signature}`);
            try {
                const tx = await connection.getTransaction(sig.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                });
                if (!tx) {
                    (0, debug_1.debugLog)(`⚠️  Transaction not found: ${sig.signature}`);
                    continue;
                }
                // Filter by mint if specified
                if (mintFilterPubkey) {
                    const hasMint = tx.meta?.postTokenBalances?.some((balance) => balance.mint === mintFilterPubkey.toString()) || tx.meta?.preTokenBalances?.some((balance) => balance.mint === mintFilterPubkey.toString());
                    if (!hasMint)
                        continue;
                }
                const processedTx = processTransaction(tx, sig.signature, network, includeBatchAnalysis);
                transactions.push(processedTx);
            }
            catch (error) {
                (0, debug_1.logError)(`❌ Error processing transaction ${sig.signature}:`, error);
            }
        }
        (0, debug_1.debugLog)(`✅ Successfully processed ${transactions.length} transactions`);
        return transactions;
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error fetching transactions:', error);
        throw error;
    }
}
/**
 * Get only SOL transactions (no token transfers)
 */
async function getSolTransactions(address, options = {}) {
    const allTransactions = await getTransactions(address, options);
    return allTransactions.filter(tx => tx.solTransfers.length > 0 && tx.tokenTransfers.length === 0);
}
/**
 * Get only SPL token transactions
 */
async function getTokenTransactions(address, options = {}) {
    const allTransactions = await getTransactions(address, options);
    return allTransactions.filter(tx => tx.tokenTransfers.length > 0);
}
/**
 * Get only batch transactions
 */
async function getBatchTransactions(address, options = {}) {
    const allTransactions = await getTransactions(address, {
        ...options,
        includeBatchAnalysis: true
    });
    return allTransactions.filter(tx => tx.isBatchTransaction);
}
/**
 * Get a single transaction by signature
 */
async function getTransactionBySignature(signature, options = {}) {
    const { network = 'devnet', includeBatchAnalysis = false } = options;
    (0, debug_1.debugLog)(`🔍 Fetching transaction by signature: ${signature}`);
    (0, debug_1.debugLog)(`🌐 Network: ${network}`);
    // Use existing createConnection function
    const connection = (0, connection_1.createConnection)({
        rpcUrl: network === 'mainnet'
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com',
        wsUrl: network === 'mainnet'
            ? 'wss://api.mainnet-beta.solana.com'
            : 'wss://api.devnet.solana.com',
        network
    });
    try {
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });
        if (!tx) {
            (0, debug_1.debugLog)(`⚠️  Transaction not found: ${signature}`);
            return null;
        }
        const processedTx = processTransaction(tx, signature, network, includeBatchAnalysis);
        (0, debug_1.debugLog)(`✅ Successfully processed transaction ${signature}`);
        return processedTx;
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error fetching transaction by signature:', error);
        throw error;
    }
}
/**
 * Get transaction summary statistics
 */
function getTransactionSummary(transactions) {
    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter(tx => tx.success).length;
    const failedTransactions = totalTransactions - successfulTransactions;
    const totalFees = transactions.reduce((sum, tx) => sum + tx.fee, 0);
    const totalSolTransfers = transactions.reduce((sum, tx) => sum + tx.solTransfers.length, 0);
    const totalTokenTransfers = transactions.reduce((sum, tx) => sum + tx.tokenTransfers.length, 0);
    const batchTransactions = transactions.filter(tx => tx.isBatchTransaction).length;
    const uniqueTokens = new Set();
    transactions.forEach(tx => {
        tx.tokenTransfers.forEach(transfer => {
            uniqueTokens.add(transfer.mint);
        });
    });
    return {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
        totalFees,
        totalFeesInSol: totalFees / 1e9,
        totalSolTransfers,
        totalTokenTransfers,
        batchTransactions,
        uniqueTokens: uniqueTokens.size,
        uniqueTokenMints: Array.from(uniqueTokens),
    };
}
//# sourceMappingURL=getTransactions.js.map