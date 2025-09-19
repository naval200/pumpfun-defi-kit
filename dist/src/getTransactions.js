"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = getTransactions;
exports.getSolanaTransactions = getSolanaTransactions;
exports.getSplTokenTransactions = getSplTokenTransactions;
exports.getTransactionBySignature = getTransactionBySignature;
const spl_token_1 = require("@solana/spl-token");
/**
 * Fetch all confirmed transactions for an address
 */
async function getTransactions(connection, address, limit = 50) {
    const signatures = await connection.getSignaturesForAddress(address, {
        limit,
    });
    const txs = await Promise.all(signatures.map(async (sig) => {
        try {
            return await connection.getParsedTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
            });
        }
        catch {
            return null;
        }
    }));
    return txs.filter((t) => !!t);
}
/**
 * Get SOL transactions
 */
async function getSolanaTransactions(connection, owner, limit = 50) {
    const txs = await getTransactions(connection, owner, limit);
    const results = [];
    for (const tx of txs) {
        const pre = tx.meta?.preBalances;
        const post = tx.meta?.postBalances;
        if (!pre || !post || !tx.transaction.message.accountKeys.length)
            continue;
        const index = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.equals(owner));
        if (index === -1)
            continue;
        const preBalance = pre[index];
        const postBalance = post[index];
        const change = postBalance - preBalance;
        if (preBalance > postBalance) {
            results.push({
                type: 'debit',
                tx,
                change: -change,
                preBalance,
                postBalance
            });
        }
        else if (postBalance > preBalance) {
            results.push({
                type: 'credit',
                tx,
                change,
                preBalance,
                postBalance
            });
        }
    }
    return results;
}
/**
 * Get SPL token transactions for a specific token mint
 */
async function getSplTokenTransactions(connection, owner, tokenMint, limit = 50) {
    const ata = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenMint, owner);
    const txs = await getTransactions(connection, ata, limit);
    const results = [];
    for (const tx of txs) {
        if (!tx.meta?.postTokenBalances || !tx.meta?.preTokenBalances)
            continue;
        const pre = tx.meta.preTokenBalances.find(b => b.accountIndex !== undefined && b.mint === tokenMint.toBase58() && b.owner === owner.toBase58());
        const post = tx.meta.postTokenBalances.find(b => b.accountIndex !== undefined && b.mint === tokenMint.toBase58() && b.owner === owner.toBase58());
        if (!pre || !post)
            continue;
        const preBalance = Number(pre.uiTokenAmount.amount);
        const postBalance = Number(post.uiTokenAmount.amount);
        const change = postBalance - preBalance;
        if (preBalance > postBalance) {
            results.push({
                type: 'debit',
                tx,
                change: -change,
                preBalance,
                postBalance,
                mint: tokenMint.toBase58(),
                owner: owner.toBase58()
            });
        }
        else if (postBalance > preBalance) {
            results.push({
                type: 'credit',
                tx,
                change,
                preBalance,
                postBalance,
                mint: tokenMint.toBase58(),
                owner: owner.toBase58()
            });
        }
    }
    return results;
}
/**
 * Get a single transaction by signature
 */
async function getTransactionBySignature(connection, signature) {
    try {
        return await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=getTransactions.js.map