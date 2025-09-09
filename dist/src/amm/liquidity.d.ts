import { Connection, PublicKey, Keypair } from '@solana/web3.js';
/**
 * Add liquidity to pool with retry logic and better error handling
 */
export declare function addLiquidity(connection: Connection, wallet: Keypair, poolKey: PublicKey, baseAmount: number, slippage?: number): Promise<{
    success: boolean;
    signature?: string;
    lpTokenAmount?: number;
    error?: string;
}>;
/**
 * Remove liquidity from pool with retry logic and better error handling
 */
export declare function removeLiquidity(connection: Connection, wallet: Keypair, poolKey: PublicKey, lpTokenAmount: number, slippage?: number): Promise<{
    success: boolean;
    signature?: string;
    baseAmount?: number;
    quoteAmount?: number;
    error?: string;
}>;
//# sourceMappingURL=liquidity.d.ts.map