import { Connection, PublicKey } from '@solana/web3.js';
/**
 * Determine the best trading mode for a token
 */
export declare function determineTradingMode(connection: Connection, tokenMint: PublicKey): Promise<'amm' | 'bonding-curve' | 'none'>;
//# sourceMappingURL=trading-mode.d.ts.map