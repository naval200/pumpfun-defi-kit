import { Connection, PublicKey, Keypair } from '@solana/web3.js';
/**
 * Sell PumpFun tokens on the bonding curve
 * @param connection - Solana connection instance
 * @param wallet - Keypair for the seller wallet
 * @param mint - PublicKey of the token mint to sell
 * @param tokenAmount - Amount of tokens to sell (in token units)
 * @returns Promise resolving to transaction signature
 */
export declare function sellPumpFunToken(connection: Connection, wallet: Keypair, mint: PublicKey, tokenAmount: number): Promise<string>;
/**
 * Sell all tokens for a specific mint
 */
export declare function sellAllPumpFunTokens(connection: Connection, wallet: Keypair, mint: PublicKey): Promise<string>;
/**
 * Sell a percentage of user's tokens
 */
export declare function sellPercentagePumpFunTokens(connection: Connection, wallet: Keypair, mint: PublicKey, percentage: number): Promise<string>;
//# sourceMappingURL=sell.d.ts.map