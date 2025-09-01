import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { logError } from '../utils/debug';

/**
 * Get pool information for AMM trading
 */
export async function getPoolInfo(
  connection: Connection,
  poolKey: PublicKey,
  wallet: Keypair
): Promise<unknown> {
  try {
    const pumpAmmSdk = new PumpAmmSdk(connection);
    const swapSolanaState = await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);
    return swapSolanaState;
  } catch (error) {
    logError('Error getting pool info:', error);
    return null;
  }
}
