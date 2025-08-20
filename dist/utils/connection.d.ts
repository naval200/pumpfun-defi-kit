import { Connection, Keypair, PublicKey } from '@solana/web3.js';
/**
 * Solana connection configuration
 */
export interface ConnectionConfig {
    rpcUrl: string;
    wsUrl: string;
    network: 'mainnet' | 'devnet';
}
/**
 * Default devnet configuration
 */
export declare const DEFAULT_CONFIG: ConnectionConfig;
/**
 * Create Solana Connection
 */
export declare function createConnection(config?: ConnectionConfig): Connection;
/**
 * Get wallet from environment or create new one
 */
export declare function getWallet(): Keypair;
/**
 * Get wallet public key
 */
export declare function getWalletPublicKey(): PublicKey;
/**
 * Log connection information
 */
export declare function logConnectionInfo(config?: ConnectionConfig): void;
//# sourceMappingURL=connection.d.ts.map