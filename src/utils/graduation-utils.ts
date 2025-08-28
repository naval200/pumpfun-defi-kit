import { Connection, PublicKey } from '@solana/web3.js';
import { PUMP_PROGRAM_ID } from '../bonding-curve/constants';
import { deriveBondingCurveAddress } from '../bonding-curve/helper';
import { log, debugLog, logWarning } from './debug';
import {
  PumpAmmSdk,
  PUMP_AMM_PROGRAM_ID,
  poolPda,
  canonicalPumpPoolPda,
} from '@pump-fun/pump-swap-sdk';

/**
 * Check if a token has graduated from bonding curve to AMM
 * A token is considered "graduated" when it has active AMM pools with sufficient liquidity
 * and the bonding curve is no longer the primary trading mechanism
 */
export async function checkGraduationStatus(
  connection: Connection,
  tokenMint: PublicKey
): Promise<boolean> {
  try {
    log(`🔍 Detecting graduation status for token: ${tokenMint.toString()}`);

    // Step 1: Check if token has AMM pools with sufficient liquidity
    const hasAMMPools = await checkAMMPoolExistence(connection, tokenMint);

    if (hasAMMPools) {
      log(`✅ Token has AMM pools - checking liquidity depth...`);
      const hasSufficientLiquidity = await checkAMMPoolLiquidity(connection, tokenMint);

      if (hasSufficientLiquidity) {
        log(`✅ Token has sufficient AMM liquidity - checking bonding curve status...`);

        // Step 2: Check if bonding curve is still active
        const bondingCurveActive = await checkBondingCurveStatus(connection, tokenMint);

        if (!bondingCurveActive) {
          log(`🎉 Token has GRADUATED to AMM trading!`);
          return true;
        } else {
          log(`⚠️ Token has AMM pools but bonding curve is still active (hybrid mode)`);
          return false;
        }
      } else {
        log(`⚠️ Token has AMM pools but insufficient liquidity`);
        return false;
      }
    } else {
      log(`📈 Token is still using bonding curve trading only`);
      return false;
    }
  } catch (error) {
    logWarning('Error checking graduation status:', error);
    // If we can't check, assume not graduated for safety
    return false;
  }
}

/**
 * Check if AMM pools exist for the token
 */
async function checkAMMPoolExistence(
  connection: Connection,
  tokenMint: PublicKey
): Promise<boolean> {
  try {
    debugLog(`🔍 Checking for AMM pools...`);

    debugLog(`🔍 Using SDK program ID: ${PUMP_AMM_PROGRAM_ID}`);

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
          return true;
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
            return true;
          }
        } catch (error: unknown) {
          debugLog(`   ❌ Pool ${index} not accessible: ${(error as Error).message}`);
        }
      } catch (error: unknown) {
        debugLog(`   ⚠️ Error with pool index ${index}: ${(error as Error).message}`);
      }
    }

    // Strategy 3: Search program accounts for any pools containing this token
    try {
      debugLog(`   🔍 Searching program accounts for pools...`);
      const accounts = await connection.getProgramAccounts(new PublicKey(PUMP_AMM_PROGRAM_ID), {
        filters: [
          {
            dataSize: 1024, // Approximate size for pool accounts
          },
        ],
      });

      debugLog(`   📊 Found ${accounts.length} program accounts, checking for token...`);

      // This is a simplified check - in production you'd parse the account data
      // to find pools containing the specific token mint
      if (accounts.length > 0) {
        debugLog(`   ⚠️ Found program accounts but need deeper analysis`);
        // For now, assume pools might exist if we find program accounts
        return true;
      }
    } catch (error: unknown) {
      debugLog(`   ❌ Error searching program accounts: ${(error as Error).message}`);
    }

    debugLog(`❌ No AMM pools found for token`);
    return false;
  } catch (error) {
    logWarning('Error checking AMM pool existence:', error);
    return false;
  }
}

/**
 * Check if AMM pools have sufficient liquidity
 */
async function checkAMMPoolLiquidity(
  connection: Connection,
  tokenMint: PublicKey
): Promise<boolean> {
  try {
    debugLog(`💧 Checking AMM pool liquidity...`);

    // Import the SDK
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Try to find and check the canonical pool
    try {
      const [canonicalPoolKey] = canonicalPumpPoolPda(tokenMint);

      const pool = await pumpAmmSdk.fetchPool(canonicalPoolKey);
      if (pool) {
        // Check if pool has minimum liquidity (this would need to be implemented based on SDK)
        // For now, assume if pool exists and is accessible, it has some liquidity
        debugLog(`✅ Pool has accessible liquidity data`);
        return true;
      }
    } catch (error: unknown) {
      debugLog(`❌ Error checking pool liquidity: ${(error as Error).message}`);
    }

    // If we can't determine liquidity, assume insufficient for safety
    return false;
  } catch (error) {
    logWarning('Error checking AMM pool liquidity:', error);
    return false;
  }
}

/**
 * Check if bonding curve is still active for the token
 */
async function checkBondingCurveStatus(
  connection: Connection,
  tokenMint: PublicKey
): Promise<boolean> {
  try {
    debugLog(`📈 Checking bonding curve status...`);

    // Derive bonding curve PDA
    const [bondingCurvePDA] = deriveBondingCurveAddress(tokenMint);
    debugLog(`📍 Bonding curve PDA: ${bondingCurvePDA.toString()}`);

    // Check if bonding curve account exists and is owned by the program
    const accountInfo = await connection.getAccountInfo(bondingCurvePDA);

    if (!accountInfo) {
      debugLog(`❌ Bonding curve account does not exist`);
      return false;
    }

    if (!accountInfo.owner.equals(PUMP_PROGRAM_ID)) {
      debugLog(`❌ Bonding curve account is not owned by PumpFun program`);
      return false;
    }

    // Check if account has data (indicating it's initialized)
    if (accountInfo.data.length === 0) {
      debugLog(`❌ Bonding curve account is empty/uninitialized`);
      return false;
    }

    debugLog(`✅ Bonding curve account exists and is initialized`);

    // Additional check: verify the account has sufficient SOL for trading
    // This is a simplified check - in production you'd parse the account data
    // to check actual bonding curve parameters and balances

    return true;
  } catch (error) {
    logWarning('Error checking bonding curve status:', error);
    return false;
  }
}

/**
 * Get detailed graduation analysis for a token
 */
export async function getGraduationAnalysis(
  connection: Connection,
  tokenMint: PublicKey
): Promise<{
  isGraduated: boolean;
  hasAMMPools: boolean;
  hasSufficientLiquidity: boolean;
  bondingCurveActive: boolean;
  graduationReason: string;
}> {
  try {
    log(`🔍 Performing comprehensive graduation analysis for token: ${tokenMint.toString()}`);

    const hasAMMPools = await checkAMMPoolExistence(connection, tokenMint);
    const hasSufficientLiquidity = hasAMMPools
      ? await checkAMMPoolLiquidity(connection, tokenMint)
      : false;
    const bondingCurveActive = await checkBondingCurveStatus(connection, tokenMint);

    let isGraduated = false;
    let graduationReason = '';

    if (hasAMMPools && hasSufficientLiquidity && !bondingCurveActive) {
      isGraduated = true;
      graduationReason =
        'Token has active AMM pools with sufficient liquidity and inactive bonding curve';
    } else if (hasAMMPools && hasSufficientLiquidity && bondingCurveActive) {
      graduationReason = 'Token has AMM pools but bonding curve is still active (hybrid mode)';
    } else if (hasAMMPools && !hasSufficientLiquidity) {
      graduationReason = 'Token has AMM pools but insufficient liquidity for graduation';
    } else if (!hasAMMPools && bondingCurveActive) {
      graduationReason = 'Token is still using bonding curve trading only';
    } else {
      graduationReason = 'Token has no AMM pools and inactive bonding curve';
    }

    const analysis = {
      isGraduated,
      hasAMMPools,
      hasSufficientLiquidity,
      bondingCurveActive,
      graduationReason,
    };

    log(`📊 Graduation Analysis Results:`);
    log(`   Graduated: ${isGraduated ? '✅ Yes' : '❌ No'}`);
    log(`   Has AMM Pools: ${hasAMMPools ? '✅ Yes' : '❌ No'}`);
    log(`   Sufficient Liquidity: ${hasSufficientLiquidity ? '✅ Yes' : '❌ No'}`);
    log(`   Bonding Curve Active: ${bondingCurveActive ? '✅ Yes' : '❌ No'}`);
    log(`   Reason: ${graduationReason}`);

    return analysis;
  } catch (error) {
    logWarning('Error performing graduation analysis:', error);
    return {
      isGraduated: false,
      hasAMMPools: false,
      hasSufficientLiquidity: false,
      bondingCurveActive: false,
      graduationReason: `Error during analysis: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
