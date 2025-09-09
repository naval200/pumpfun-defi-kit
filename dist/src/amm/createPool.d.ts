import { Connection, PublicKey, Keypair } from '@solana/web3.js';
/**
 * Create a new pool for a token with retry logic and better error handling
 */
export declare function createPool(connection: Connection, wallet: Keypair, baseMint: PublicKey, quoteMint: PublicKey, baseIn: number, quoteIn: number, index?: number): Promise<{
    success: boolean;
    poolKey?: PublicKey;
    signature?: string;
    error?: string;
}>;
//# sourceMappingURL=createPool.d.ts.map