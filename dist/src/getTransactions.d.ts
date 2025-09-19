import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { SolTransaction, SplTokenTransaction } from './@types';
/**
 * Fetch all confirmed transactions for an address
 */
export declare function getTransactions(connection: Connection, address: PublicKey, limit?: number): Promise<ParsedTransactionWithMeta[]>;
/**
 * Get SOL transactions
 */
export declare function getSolanaTransactions(connection: Connection, owner: PublicKey, limit?: number): Promise<SolTransaction[]>;
/**
 * Get SPL token transactions for a specific token mint
 */
export declare function getSplTokenTransactions(connection: Connection, owner: PublicKey, tokenMint: PublicKey, limit?: number): Promise<SplTokenTransaction[]>;
/**
 * Get a single transaction by signature
 */
export declare function getTransactionBySignature(connection: Connection, signature: string): Promise<ParsedTransactionWithMeta | null>;
//# sourceMappingURL=getTransactions.d.ts.map