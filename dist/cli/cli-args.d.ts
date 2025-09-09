#!/usr/bin/env tsx
import { Keypair } from '@solana/web3.js';
export interface CliArgs {
    wallet?: string;
    inputToken?: string;
    outputToken?: string;
    amount?: number;
    slippage?: number;
    tokenName?: string;
    tokenSymbol?: string;
    tokenDescription?: string;
    imagePath?: string;
    initialBuyAmount?: number;
    poolKey?: string;
    lpTokenAmount?: number;
    feePayer?: string;
    recipient?: string;
    mint?: string;
    createAccount?: boolean;
    operations?: string;
    maxParallel?: number;
    retryFailed?: boolean;
    disableFallbackRetry?: boolean;
    delayBetween?: number;
    dynamicBatching?: boolean;
    dryRun?: boolean;
    help?: boolean;
    action?: string;
}
export declare function parseArgs(): CliArgs;
export declare function loadWallet(walletPath?: string): Keypair;
export declare function loadFeePayerWallet(feePayerPath?: string): Keypair | null;
export declare function loadTokenInfo(tokenPath?: string): any;
export declare function saveTokenInfo(tokenInfo: any, outputPath?: string): void;
export declare function printUsage(scriptName: string, options?: string[]): void;
//# sourceMappingURL=cli-args.d.ts.map