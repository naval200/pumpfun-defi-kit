import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
/**
 * Get pool creation data with BigNumber parameters
 */
export declare function getPoolCreationData(pumpAmmSdk: PumpAmmSdk, index: number, creator: PublicKey, baseMint: PublicKey, quoteMint: PublicKey, baseIn: number, quoteIn: number): Promise<{
    createPoolSolanaState: unknown;
    createPoolInstructions: TransactionInstruction[];
    initialPoolPrice: number;
}>;
/**
 * Find AMM pools for a given token mint using SDK methods
 */
export declare function findPoolsForToken(connection: Connection, tokenMint: PublicKey): Promise<PublicKey[]>;
/**
 * Check if AMM pool has liquidity
 */
export declare function checkAMMPoolLiquidity(connection: Connection, tokenMint: PublicKey): Promise<boolean>;
/**
 * Get AMM pool info
 */
export declare function getAMMPoolInfo(connection: Connection, tokenMint: PublicKey): Promise<unknown>;
//# sourceMappingURL=amm.d.ts.map