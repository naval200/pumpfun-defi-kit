import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import type { AmmSwapState } from '../@types';
/**
 * Buy tokens using SOL with retry logic and better error handling
 */
export declare function buyAmmTokens(connection: Connection, wallet: Keypair, poolKey: PublicKey, amountLamports: number, slippage?: number, feePayer?: Keypair, options?: {
    swapSolanaState?: AmmSwapState;
}): Promise<{
    success: boolean;
    signature?: string;
    baseAmount?: number;
    error?: string;
}>;
/**
 * Create signed AMM buy transaction without submitting it
 * Returns the signed transaction for batch processing
 */
export declare function createSignedAmmBuyTransaction(connection: Connection, wallet: Keypair, poolKey: PublicKey, quoteAmountLamports: number, slippage?: number, feePayer?: Keypair, blockhash?: string, options?: {
    swapSolanaState?: AmmSwapState;
}): Promise<{
    success: boolean;
    transaction?: Transaction;
    error?: string;
}>;
//# sourceMappingURL=buy.d.ts.map