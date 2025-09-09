import { Connection, PublicKey } from '@solana/web3.js';
/**
 * Check if a token has graduated from bonding curve to AMM
 * A token is considered "graduated" when it has active AMM pools with sufficient liquidity
 * and the bonding curve is no longer the primary trading mechanism
 */
export declare function checkGraduationStatus(connection: Connection, tokenMint: PublicKey): Promise<boolean>;
/**
 * Get detailed graduation analysis for a token
 */
export declare function getGraduationAnalysis(connection: Connection, tokenMint: PublicKey): Promise<{
    isGraduated: boolean;
    hasAMMPools: boolean;
    hasSufficientLiquidity: boolean;
    bondingCurveActive: boolean;
    graduationReason: string;
}>;
//# sourceMappingURL=graduation-utils.d.ts.map