import { Connection, PublicKey } from '@solana/web3.js';
import { checkAMMPoolLiquidity } from '../amm/amm';
import { log } from './debug';

/**
 * Determine the best trading mode for a token
 */
export async function determineTradingMode(
  connection: Connection,
  tokenMint: PublicKey
): Promise<'amm' | 'bonding-curve' | 'none'> {
  try {
    // Check AMM liquidity first
    log(`Checking AMM liquidity for token: ${tokenMint.toString()}`);
    const hasAMMLiquidity = await checkAMMPoolLiquidity(connection, tokenMint);

    if (hasAMMLiquidity) {
      return 'amm';
    }

    // For now, assume bonding curve if no AMM liquidity
    // In a full implementation, you would check for bonding curve parameters
    log(`Checking bonding curve for token: ${tokenMint.toString()}`);

    // Simple check: if no AMM, assume bonding curve
    return 'bonding-curve';
  } catch (error) {
    // If we can't determine, default to none
    return 'none';
  }
}
