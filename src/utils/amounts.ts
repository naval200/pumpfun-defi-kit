/** Number of lamports in one SOL as number */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/** Number of lamports in one microSOL (0.000001 SOL) */
export const LAMPORTS_PER_MICROSOL = 1_000;

/**
 * Returns a very small minimum SOL output for slippage floors.
 * 0.000001 SOL = 1,000 lamports.
 */
export function minSolLamports(): number {
  return LAMPORTS_PER_MICROSOL;
}

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
export function lamportsToSol(lamports: number, precision = 9): number {
  if (lamports < 0) {
    throw new Error('Lamports value must be non-negative');
  }

  if (!Number.isInteger(lamports)) {
    throw new Error('Lamports value must be an integer');
  }

  const sol = lamports / LAMPORTS_PER_SOL;
  return Number(sol.toFixed(Math.min(precision, 9)));
}

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
export function solToLamports(sol: number): number {
  if (sol < 0) {
    throw new Error('SOL value must be non-negative');
  }

  if (!Number.isFinite(sol)) {
    throw new Error('SOL value must be a finite number');
  }

  return Math.floor(sol * LAMPORTS_PER_SOL);
}

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
export function formatLamportsAsSol(lamports: number, precision = 4): string {
  const sol = lamportsToSol(lamports, precision);
  return `${sol.toFixed(precision)} SOL`;
}

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
export function formatSolAsLamports(sol: number): string {
  const lamports = solToLamports(sol);
  return `${lamports.toLocaleString()} lamports`;
}
