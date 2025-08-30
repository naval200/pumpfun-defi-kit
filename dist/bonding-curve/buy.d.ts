import { Connection, Keypair, PublicKey } from '@solana/web3.js';
/**
 * Buy PumpFun tokens with robust PDA resolution
 */
export declare function buyPumpFunToken(connection: Connection, wallet: Keypair, mint: PublicKey, solAmount: number, maxSlippageBasisPoints?: number): Promise<string>;
//# sourceMappingURL=buy.d.ts.map