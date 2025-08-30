import { Connection, Keypair, PublicKey } from '@solana/web3.js';
/**
 * Sell PumpFun tokens with simple approach
 */
export declare function sellPumpFunToken(connection: Connection, wallet: Keypair, mint: PublicKey, tokenAmount: number): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
}>;
//# sourceMappingURL=sell.d.ts.map