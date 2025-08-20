import { Connection, PublicKey, Keypair } from '@solana/web3.js';
/**
 * Buy tokens using SOL with retry logic and better error handling
 */
export declare function buyTokens(connection: Connection, wallet: Keypair, poolKey: PublicKey, quoteAmount: number, slippage?: number): Promise<{
    success: boolean;
    signature?: string;
    baseAmount?: number;
    error?: string;
}>;
//# sourceMappingURL=buy.d.ts.map