import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import {
  SolTransaction,
  SplTokenTransaction,
} from './@types'

/**
 * Fetch all confirmed transactions for an address
 */
export async function getTransactions(
  connection: Connection,
  address: PublicKey,
  limit: number = 50,
): Promise<ParsedTransactionWithMeta[]> {
  const signatures = await connection.getSignaturesForAddress(address, {
    limit,
  })
  const txs = await Promise.all(
    signatures.map(async sig => {
      try {
        return await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        })
      } catch {
        return null
      }
    }),
  )
  return txs.filter((t): t is ParsedTransactionWithMeta => !!t)
}

/**
 * Get SOL transactions
 */
export async function getSolanaTransactions(
  connection: Connection,
  owner: PublicKey,
  limit: number = 50,
): Promise<SolTransaction[]> {
  const txs = await getTransactions(connection, owner, limit)
  const results: SolTransaction[] = []

  for (const tx of txs) {
    const pre = tx.meta?.preBalances
    const post = tx.meta?.postBalances
    if (!pre || !post || !tx.transaction.message.accountKeys.length) continue

    const index = tx.transaction.message.accountKeys.findIndex(k =>
      k.pubkey.equals(owner),
    )
    if (index === -1) continue

    const preBalance = pre[index]
    const postBalance = post[index]
    const change = postBalance - preBalance

    if (preBalance > postBalance) {
      results.push({ 
        type: 'send', 
        tx,
        change: -change,
        preBalance,
        postBalance
      })
    } else if (postBalance > preBalance) {
      results.push({ 
        type: 'receive', 
        tx,
        change,
        preBalance,
        postBalance
      })
    }
  }
  return results
}

/**
 * Get SPL token transactions for a specific token mint
 */
export async function getSplTokenTransactions(
  connection: Connection,
  owner: PublicKey,
  tokenMint: PublicKey,
  limit: number = 50,
): Promise<SplTokenTransaction[]> {
  const ata = getAssociatedTokenAddressSync(tokenMint, owner)
  const txs = await getTransactions(connection, ata, limit)
  const results: SplTokenTransaction[] = []

  for (const tx of txs) {
    if (!tx.meta?.postTokenBalances || !tx.meta?.preTokenBalances) continue

    const pre = tx.meta.preTokenBalances.find(b => b.accountIndex !== undefined && b.mint === tokenMint.toBase58() && b.owner === owner.toBase58())
    const post = tx.meta.postTokenBalances.find(b => b.accountIndex !== undefined && b.mint === tokenMint.toBase58() && b.owner === owner.toBase58())

    if (!pre || !post) continue

    const preBalance = Number(pre.uiTokenAmount.amount)
    const postBalance = Number(post.uiTokenAmount.amount)
    const change = postBalance - preBalance

    if (preBalance > postBalance) {
      results.push({ 
        type: 'send', 
        tx,
        change: -change,
        preBalance,
        postBalance,
        mint: tokenMint.toBase58(),
        owner: owner.toBase58()
      })
    } else if (postBalance > preBalance) {
      results.push({ 
        type: 'receive', 
        tx,
        change,
        preBalance,
        postBalance,
        mint: tokenMint.toBase58(),
        owner: owner.toBase58()
      })
    }
  }

  return results
}

/**
 * Get a single transaction by signature
 */
export async function getTransactionBySignature(
  connection: Connection,
  signature: string,
): Promise<ParsedTransactionWithMeta | null> {
  try {
    return await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
  } catch {
    return null;
  }
}
