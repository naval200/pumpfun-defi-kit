import {
  PumpAmmSdk,
  PUMP_AMM_PROGRAM_ID,
  poolPda,
  canonicalPumpPoolPda,
} from '@pump-fun/pump-swap-sdk';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';

import { debugLog, log, logError, logWarning } from '../utils/debug';
import { formatLamportsAsSol } from '../utils/amounts';

/**
 * Get pool creation data with BigNumber parameters
 */
export async function getPoolCreationData(
  pumpAmmSdk: PumpAmmSdk,
  index: number,
  creator: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  baseIn: number,
  quoteIn: number
): Promise<{
  createPoolSolanaState: unknown; // Using unknown for SDK compatibility
  createPoolInstructions: TransactionInstruction[];
  initialPoolPrice: number;
}> {
  debugLog(`🔧 Converting pool creation parameters to bigint:`);
  debugLog(`   Base amount: ${baseIn.toString()}`);
  debugLog(`   Quote amount: ${formatLamportsAsSol(quoteIn)} SOL`);

  // Get pool creation state
  const createPoolSolanaState = await pumpAmmSdk.createPoolSolanaState(
    index,
    creator,
    baseMint,
    quoteMint
  );

  const baseInBN = new BN(baseIn);
  const quoteInBN = new BN(quoteIn);

  // Get pool creation instructions with BigNumber parameters
  const createPoolInstructions = await pumpAmmSdk.createPoolInstructions(
    createPoolSolanaState,
    baseInBN,
    quoteInBN
  );

  // Get initial pool price for UI
  const initialPoolPriceBN = await pumpAmmSdk.createAutocompleteInitialPoolPrice(
    baseInBN,
    quoteInBN
  );
  const initialPoolPrice = Number(initialPoolPriceBN.toString());

  return {
    createPoolSolanaState,
    createPoolInstructions,
    initialPoolPrice,
  };
}

/**
 * Find AMM pools for a given token mint using SDK methods
 */
export async function findPoolsForToken(
  connection: Connection,
  tokenMint: PublicKey
): Promise<PublicKey[]> {
  try {
    debugLog(`🔍 Searching for AMM pools for token: ${tokenMint.toString()}`);

    debugLog(`🔍 Using SDK program ID: ${PUMP_AMM_PROGRAM_ID}`);

    const foundPools: PublicKey[] = [];

    // Strategy 1: Try to find the canonical pool (index 0)
    try {
      debugLog(`   🔍 Trying canonical pool (index 0)...`);
      const [canonicalPoolKey] = canonicalPumpPoolPda(tokenMint);
      debugLog(`   📍 Canonical pool address: ${canonicalPoolKey.toString()}`);

      // Check if this pool exists by trying to fetch it
      const pumpAmmSdk = new PumpAmmSdk(connection);
      try {
        const pool = await pumpAmmSdk.fetchPool(canonicalPoolKey);
        if (pool) {
          debugLog(`   ✅ Canonical pool found and accessible!`);
          foundPools.push(canonicalPoolKey);
        }
      } catch (error: unknown) {
        debugLog(`   ❌ Canonical pool not accessible: ${(error as Error).message}`);
      }
    } catch (error: unknown) {
      debugLog(`   ⚠️ Error with canonical pool: ${(error as Error).message}`);
    }

    // Strategy 2: Try common pool indices (0, 1, 2, etc.)
    const commonIndices = [0, 1, 2, 3, 4, 5];
    for (const index of commonIndices) {
      try {
        debugLog(`   🔍 Trying pool index ${index}...`);
        // For now, we'll use a simple approach since we need the owner and quote mint
        // We'll use the global config as owner and SOL as quote mint
        const pumpAmmSdk = new PumpAmmSdk(connection);
        const owner = pumpAmmSdk.globalConfigKey();
        const quoteMint = new PublicKey('So11111111111111111111111111111111111111112'); // SOL

        const [poolKey] = poolPda(index, owner, tokenMint, quoteMint);
        debugLog(`   📍 Pool ${index} address: ${poolKey.toString()}`);

        // Check if this pool exists
        try {
          const pool = await pumpAmmSdk.fetchPool(poolKey);
          if (pool) {
            debugLog(`   ✅ Pool ${index} found and accessible!`);
            if (!foundPools.some(p => p.equals(poolKey))) {
              foundPools.push(poolKey);
            }
          }
        } catch (error: unknown) {
          debugLog(`   ❌ Pool ${index} not accessible: ${(error as Error).message}`);
        }
      } catch (error: unknown) {
        debugLog(`   ⚠️ Error with pool index ${index}: ${(error as Error).message}`);
      }
    }

    // Strategy 3: If no pools found, try a broader search using program accounts
    if (foundPools.length === 0) {
      debugLog(`🔍 No pools found with SDK methods, trying program account search...`);

      try {
        // Get all accounts from the program and filter by data content
        const allAccounts = await connection.getProgramAccounts(
          new PublicKey(PUMP_AMM_PROGRAM_ID),
          {
            commitment: 'confirmed',
          }
        );

        debugLog(`   📊 Found ${allAccounts.length} total accounts in program`);

        // Filter accounts that might be pools by checking if they contain our token mint
        const potentialPools = allAccounts.filter(account => {
          try {
            const accountData = account.account.data;
            const mintString = tokenMint.toBase58();

            // Check if account data contains our token mint
            const dataString = accountData.toString('utf8');
            if (dataString.includes(mintString)) {
              return true;
            }

            // Also check raw bytes for the mint
            const mintBytes = tokenMint.toBytes();
            for (let i = 0; i <= accountData.length - mintBytes.length; i++) {
              let match = true;
              for (let j = 0; j < mintBytes.length; j++) {
                if (accountData[i + j] !== mintBytes[j]) {
                  match = false;
                  break;
                }
              }
              if (match) return true;
            }

            return false;
          } catch (error) {
            return false;
          }
        });

        debugLog(
          `   🔍 Found ${potentialPools.length} potential pool(s) in program account search`
        );

        potentialPools.forEach(account => {
          if (!foundPools.some(pool => pool.equals(account.pubkey))) {
            foundPools.push(account.pubkey);
          }
        });
      } catch (error: unknown) {
        debugLog(`   ⚠️ Program account search failed: ${(error as Error).message}`);
      }
    }

    const finalPools = foundPools.filter(
      (pool, index, self) => index === self.findIndex(p => p.equals(pool))
    );

    debugLog(`🔍 Final total unique pools found: ${finalPools.length}`);

    return finalPools;
  } catch (error) {
    logError('❌ Error searching for AMM pools:', error);
    return [];
  }
}

/**
 * Check if AMM pool has liquidity
 */
export async function checkAMMPoolLiquidity(
  connection: Connection,
  tokenMint: PublicKey
): Promise<boolean> {
  try {
    // For now, return false as a placeholder
    // In a full implementation, you would check the pool's liquidity
    log(`Checking AMM pool liquidity for token: ${tokenMint.toString()}`);
    return false;
  } catch (error) {
    logWarning('Error checking AMM pool liquidity:', error);
    return false;
  }
}

/**
 * Get AMM pool info
 */
export async function getAMMPoolInfo(
  connection: Connection,
  tokenMint: PublicKey
): Promise<unknown> {
  try {
    // For now, return null as a placeholder
    // In a full implementation, you would fetch and return pool information
    log(`Getting AMM pool info for token: ${tokenMint.toString()}`);
    return null;
  } catch (error) {
    logWarning('Error getting AMM pool info:', error);
    return null;
  }
}
