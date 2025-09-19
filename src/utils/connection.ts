import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { log, logWarning } from './debug';
import type { ConnectionConfig } from '../@types';

// ConnectionConfig moved to src/@types.ts

/**
 * Default devnet configuration
 */
export const DEFAULT_CONFIG: ConnectionConfig = {
  rpcUrl: process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
  wsUrl: process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com',
  network: (process.env.NETWORK as 'mainnet' | 'devnet') || 'devnet',
};

/**
 * Create Solana Connection
 */
export function createConnection(config: ConnectionConfig = DEFAULT_CONFIG): Connection {
  return new Connection(config.rpcUrl, 'confirmed');
}

/**
 * Get wallet from environment or create new one
 */
export function getWallet(): Keypair {
  const privateKey = process.env.WALLET_PRIVATE_KEY;

  if (privateKey) {
    try {
      // Try to parse as base58 string first
      const secretKey = JSON.parse(privateKey);
      return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } catch (error) {
      try {
        // Try to parse as base64 string
        const decoded = Buffer.from(privateKey, 'base64');
        return Keypair.fromSecretKey(decoded);
      } catch (parseError) {
        logWarning('Invalid private key format, creating new wallet');
        return Keypair.generate();
      }
    }
  }

  logWarning('No private key found in environment, creating new wallet');
  return Keypair.generate();
}

/**
 * Get wallet public key
 */
export function getWalletPublicKey(): PublicKey {
  const wallet = getWallet();
  return wallet.publicKey;
}

/**
 * Log connection information
 */
export function logConnectionInfo(config: ConnectionConfig = DEFAULT_CONFIG): void {
  log('🔗 Solana Connection Configuration:');
  log(`   Network: ${config.network}`);
  log(`   RPC URL: ${config.rpcUrl}`);
  log(`   WebSocket URL: ${config.wsUrl}`);
  log('');
}
