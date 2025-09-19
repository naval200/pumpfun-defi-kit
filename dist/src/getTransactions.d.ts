import { TokenTransfer, SolTransfer, TransactionData, GetTransactionsOptions } from './@types';
export type { TokenTransfer, SolTransfer, TransactionData, GetTransactionsOptions };
/**
 * Extract token transfers from transaction data
 */
export declare function extractTokenTransfers(tx: any): TokenTransfer[];
/**
 * Extract SOL transfers from transaction data
 */
export declare function extractSolTransfers(tx: any): SolTransfer[];
/**
 * Determine if a transaction is a batch transaction
 */
export declare function isBatchTransaction(tx: any): boolean;
/**
 * Process a single transaction into our format
 */
export declare function processTransaction(tx: any, signature: string, network?: 'devnet' | 'mainnet', includeBatchAnalysis?: boolean): TransactionData;
/**
 * Main function to fetch transactions for a wallet
 */
export declare function getTransactions(address: string, options?: GetTransactionsOptions): Promise<TransactionData[]>;
/**
 * Get only SOL transactions (no token transfers)
 */
export declare function getSolTransactions(address: string, options?: Omit<GetTransactionsOptions, 'mintFilter'>): Promise<TransactionData[]>;
/**
 * Get only SPL token transactions
 */
export declare function getTokenTransactions(address: string, options?: GetTransactionsOptions): Promise<TransactionData[]>;
/**
 * Get only batch transactions
 */
export declare function getBatchTransactions(address: string, options?: Omit<GetTransactionsOptions, 'includeBatchAnalysis'>): Promise<TransactionData[]>;
/**
 * Get a single transaction by signature
 */
export declare function getTransactionBySignature(signature: string, options?: Omit<GetTransactionsOptions, 'limit' | 'mintFilter'>): Promise<TransactionData | null>;
/**
 * Get transaction summary statistics
 */
export declare function getTransactionSummary(transactions: TransactionData[]): {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number;
    totalFees: number;
    totalFeesInSol: number;
    totalSolTransfers: number;
    totalTokenTransfers: number;
    batchTransactions: number;
    uniqueTokens: number;
    uniqueTokenMints: unknown[];
};
//# sourceMappingURL=getTransactions.d.ts.map