/** Number of lamports in one SOL as number */
export declare const LAMPORTS_PER_SOL = 1000000000;
/** Number of lamports in one microSOL (0.000001 SOL) */
export declare const LAMPORTS_PER_MICROSOL = 1000;
/**
 * Returns a very small minimum SOL output for slippage floors.
 * 0.000001 SOL = 1,000 lamports.
 */
export declare function minSolLamports(): number;
/**
 * Convert lamports to SOL with optional precision
 * @param lamports Amount in lamports as number
 * @param precision Number of decimal places to show (default: 9)
 * @returns Amount in SOL as number
 *
 * @example
 * ```typescript
 * const sol = lamportsToSol(1_000_000_000); // 1.0
 * const sol = lamportsToSol(500_000_000, 2); // 0.50
 * ```
 */
export declare function lamportsToSol(lamports: number, precision?: number): number;
/**
 * Convert SOL to lamports
 * @param sol Amount in SOL as number
 * @returns Amount in lamports as number
 *
 * @example
 * ```typescript
 * const lamports = solToLamports(0.5); // 500_000_000
 * const lamports = solToLamports(1.0); // 1_000_000_000
 * ```
 */
export declare function solToLamports(sol: number): number;
/**
 * Format lamports as SOL with proper decimal places
 * @param lamports Amount in lamports as number
 * @param precision Number of decimal places to show (default: 4)
 * @returns Formatted SOL string
 *
 * @example
 * ```typescript
 * formatLamportsAsSol(1_000_000_000); // "1.0000 SOL"
 * formatLamportsAsSol(500_000_000, 2); // "0.50 SOL"
 * ```
 */
export declare function formatLamportsAsSol(lamports: number, precision?: number): string;
/**
 * Format SOL as lamports with proper formatting
 * @param sol Amount in SOL as number
 * @returns Formatted lamports string
 *
 * @example
 * ```typescript
 * formatSolAsLamports(0.5); // "500,000,000 lamports"
 * formatSolAsLamports(1.0); // "1,000,000,000 lamports"
 * ```
 */
export declare function formatSolAsLamports(sol: number): string;
//# sourceMappingURL=amounts.d.ts.map