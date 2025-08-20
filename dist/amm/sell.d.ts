import { Connection, PublicKey, Keypair } from '@solana/web3.js';
/**
 * Sell tokens for SOL with retry logic and better error handling
 */
export declare function sellTokens(connection: Connection, wallet: Keypair, poolKey: PublicKey, baseAmount: number, slippage?: number): Promise<{
    success: boolean;
    signature?: string;
    quoteAmount?: number;
    error?: string;
}>;
//# sourceMappingURL=sell.d.ts.map