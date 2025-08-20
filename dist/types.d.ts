import { Keypair } from '@solana/web3.js';
/**
 * PumpFun token configuration - only the essential fields
 */
export interface TokenConfig {
    name: string;
    symbol: string;
    description: string;
    imagePath?: string;
    websiteUrl?: string;
    twitterUrl?: string;
    telegramUrl?: string;
    initialBuyAmount?: number;
}
/**
 * PumpFun token creation result
 */
export interface CreateTokenResult {
    success: boolean;
    mint?: string;
    mintKeypair?: Keypair;
    signature?: string;
    bondingCurveAddress?: string;
    creatorVaultAddress?: string;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map