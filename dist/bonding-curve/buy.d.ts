import { Connection, PublicKey, Keypair } from '@solana/web3.js';
/**
 * Buy PumpFun tokens with robust PDA resolution
 */
export declare function buyPumpFunToken(connection: Connection, wallet: Keypair, mint: PublicKey, solAmount: number, slippageBasisPoints?: number): Promise<string>;
//# sourceMappingURL=buy.d.ts.map