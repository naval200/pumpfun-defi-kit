import { Connection, PublicKey } from '@solana/web3.js';
/**
 * Get the conversion rate from token to SOL using PumpFun SDK
 *
 * @param connection - Solana connection
 * @param tokenMint - Token mint address
 * @param tokenAmount - Amount of tokens (in token units, not accounting for decimals)
 * @param tokenDecimals - Token decimals (default: 0, assumes amount is already in base units)
 * @param slippage - Slippage tolerance as a decimal (default: 0.005 = 0.5%)
 * @param poolKey - Optional pool key. If not provided, will search for pools
 * @returns Promise resolving to conversion rate (SOL per token) or null if unable to fetch
 */
export declare function getTokenToSolConversionRate(connection: Connection, tokenMint: PublicKey, tokenAmount?: number, tokenDecimals?: number, slippage?: number, poolKey?: PublicKey): Promise<number | null>;
/**
 * Get the conversion rate from SOL to token using PumpFun SDK
 *
 * @param connection - Solana connection
 * @param tokenMint - Token mint address
 * @param solAmount - Amount of SOL (default: 1 SOL)
 * @param slippage - Slippage tolerance as a decimal (default: 0.005 = 0.5%)
 * @param poolKey - Optional pool key. If not provided, will search for pools
 * @returns Promise resolving to conversion rate (tokens per SOL) or null if unable to fetch
 */
export declare function getSolToTokenConversionRate(connection: Connection, tokenMint: PublicKey, solAmount?: number, slippage?: number, poolKey?: PublicKey): Promise<number | null>;
//# sourceMappingURL=conversion-rate.d.ts.map