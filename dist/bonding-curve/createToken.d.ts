import { Connection, Keypair } from '@solana/web3.js';
import { TokenConfig, CreateTokenResult } from '../types';
/**
 * Create a real PumpFun token with bonding curve (appears on pump.fun)
 * @param connection - Solana connection instance
 * @param wallet - Keypair for the creator wallet
 * @param tokenConfig - Configuration for the token to be created
 * @param isMainnet - Whether to use mainnet (default: false for devnet)
 * @returns Promise resolving to CreateTokenResult
 */
export declare function createPumpFunToken(connection: Connection, wallet: Keypair, tokenConfig: TokenConfig, isMainnet?: boolean): Promise<CreateTokenResult>;
//# sourceMappingURL=createToken.d.ts.map