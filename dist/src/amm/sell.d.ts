import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import type { AmmSwapState } from '../@types';
/**
 * Sell tokens for SOL using AMM
 */
export declare function sellAmmTokens(connection: Connection, wallet: Keypair, poolKey: PublicKey, baseAmount: number, slippage?: number, feePayer?: Keypair, options?: {
    swapSolanaState?: AmmSwapState;
}): Promise<{
    success: boolean;
    signature?: string;
    quoteAmount?: number;
    error?: string;
}>;
/**
 * Create signed AMM sell transaction without submitting it
 * Returns the signed transaction for batch processing
 */
export declare function createSignedAmmSellTransaction(connection: Connection, wallet: Keypair, poolKey: PublicKey, baseAmount: number, slippage?: number, feePayer?: Keypair, blockhash?: string, _options?: {
    swapSolanaState?: AmmSwapState;
}): Promise<{
    success: boolean;
    transaction?: Transaction;
    error?: string;
}>;
//# sourceMappingURL=sell.d.ts.map