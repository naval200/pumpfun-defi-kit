import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { retryWithBackoff } from './retry';
import { debugLog, logError } from './debug';
import { findPoolsForToken } from '../amm/amm';

/**
 * Get the conversion rate from token to SOL using PumpFun SDK
 * 
 * @param connection - Solana connection
 * @param tokenMint - Token mint address
 * @param tokenAmount - Amount of tokens (in token units, not accounting for decimals)
 * @param tokenDecimals - Token decimals (default: 0, assumes amount is already in base units)
 * @param slippage - Slippage tolerance as a decimal (default: 0.005 = 0.5%)
 * @param poolKey - Optional pool key. If not provided, will search for pools
 * @returns Promise resolving to conversion rate (SOL per token) or null if unable to fetch
 */
export async function getTokenToSolConversionRate(
  connection: Connection,
  tokenMint: PublicKey,
  tokenAmount: number = 1,
  tokenDecimals: number = 0,
  slippage: number = 0.005,
  poolKey?: PublicKey
): Promise<number | null> {
  try {
    debugLog(`💱 Getting conversion rate for ${tokenAmount} tokens to SOL`);

    // Find pool if not provided
    let targetPoolKey: PublicKey;
    if (poolKey) {
      targetPoolKey = poolKey;
      debugLog(`Using provided pool: ${targetPoolKey.toString()}`);
    } else {
      debugLog('🔍 Searching for AMM pools...');
      const pools = await findPoolsForToken(connection, tokenMint);
      if (pools.length === 0) {
        logError('No AMM pools found for this token');
        return null;
      }
      targetPoolKey = pools[0];
      debugLog(`✅ Found pool: ${targetPoolKey.toString()}`);
    }

    // Initialize SDK
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Use a dummy wallet for quote calculations (we're not executing a transaction)
    const dummyWallet = PublicKey.default;

    // Get swap state
    const swapSolanaState = await retryWithBackoff(
      async () => {
        return await pumpAmmSdk.swapSolanaState(targetPoolKey, dummyWallet);
      },
      3,
      2000
    );

    // Convert token amount to base units (accounting for decimals)
    const baseAmount = new BN(Math.floor(tokenAmount * Math.pow(10, tokenDecimals)));

    // Calculate expected SOL amount using AMM formula (constant product)
    // Formula: k = baseReserve * quoteReserve (constant product)
    // After adding baseAmount to baseReserve, new quoteReserve = k / newBaseReserve
    // SOL received = quoteReserve - newQuoteReserve
    const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
    const baseReserve = new BN(poolBaseAmount);
    const quoteReserve = new BN(poolQuoteAmount);

    const k = baseReserve.mul(quoteReserve);
    const newBaseReserve = baseReserve.add(baseAmount);
    const newQuoteReserve = k.div(newBaseReserve);
    const quoteOut = quoteReserve.sub(newQuoteReserve);

    // Apply slippage tolerance (reduce output by slippage amount)
    const slippageMultiplier = new BN(Math.floor((1 - slippage) * 10000)); // Convert to basis points
    const quoteOutWithSlippage = quoteOut.mul(slippageMultiplier).div(new BN(10000));

    if (quoteOutWithSlippage.lt(new BN(0))) {
      logError('Invalid calculation result: negative SOL amount');
      return null;
    }

    // Convert SOL amount from lamports to SOL
    const solAmount = quoteOutWithSlippage.toNumber() / LAMPORTS_PER_SOL;

    // Calculate conversion rate (SOL per token)
    const conversionRate = solAmount / tokenAmount;

    debugLog(`✅ Conversion rate: ${conversionRate} SOL per token`);
    debugLog(`   ${tokenAmount} tokens = ${solAmount} SOL`);

    return conversionRate;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`❌ Error fetching token to SOL conversion rate: ${errorMessage}`);
    return null;
  }
}

/**
 * Get the conversion rate from SOL to token using PumpFun SDK
 * 
 * @param connection - Solana connection
 * @param tokenMint - Token mint address
 * @param solAmount - Amount of SOL (default: 1 SOL)
 * @param slippage - Slippage tolerance as a decimal (default: 0.005 = 0.5%)
 * @param poolKey - Optional pool key. If not provided, will search for pools
 * @returns Promise resolving to conversion rate (tokens per SOL) or null if unable to fetch
 */
export async function getSolToTokenConversionRate(
  connection: Connection,
  tokenMint: PublicKey,
  solAmount: number = 1,
  slippage: number = 0.005,
  poolKey?: PublicKey
): Promise<number | null> {
  try {
    debugLog(`💱 Getting conversion rate for ${solAmount} SOL to tokens`);

    // Find pool if not provided
    let targetPoolKey: PublicKey;
    if (poolKey) {
      targetPoolKey = poolKey;
      debugLog(`Using provided pool: ${targetPoolKey.toString()}`);
    } else {
      debugLog('🔍 Searching for AMM pools...');
      const pools = await findPoolsForToken(connection, tokenMint);
      if (pools.length === 0) {
        logError('No AMM pools found for this token');
        return null;
      }
      targetPoolKey = pools[0];
      debugLog(`✅ Found pool: ${targetPoolKey.toString()}`);
    }

    // Initialize SDK
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Use a dummy wallet for quote calculations
    const dummyWallet = PublicKey.default;

    // Get swap state
    const swapSolanaState = await retryWithBackoff(
      async () => {
        return await pumpAmmSdk.swapSolanaState(targetPoolKey, dummyWallet);
      },
      3,
      2000
    );

    // Convert SOL amount to lamports
    const solAmountLamports = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

    // Calculate expected token amount using AMM formula (constant product)
    // Formula: k = baseReserve * quoteReserve (constant product)
    // After adding solAmountLamports to quoteReserve, new baseReserve = k / newQuoteReserve
    // Tokens received = baseReserve - newBaseReserve
    const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
    const baseReserve = new BN(poolBaseAmount);
    const quoteReserve = new BN(poolQuoteAmount);

    const k = baseReserve.mul(quoteReserve);
    const newQuoteReserve = quoteReserve.add(solAmountLamports);
    const newBaseReserve = k.div(newQuoteReserve);
    const baseOut = baseReserve.sub(newBaseReserve);

    // Apply slippage tolerance (reduce output by slippage amount)
    const slippageMultiplier = new BN(Math.floor((1 - slippage) * 10000)); // Convert to basis points
    const baseOutWithSlippage = baseOut.mul(slippageMultiplier).div(new BN(10000));

    if (baseOutWithSlippage.lt(new BN(0))) {
      logError('Invalid calculation result: negative token amount');
      return null;
    }

    // Calculate conversion rate (tokens per SOL)
    // Note: baseOut is in token base units
    const tokenAmount = baseOutWithSlippage.toNumber();
    const conversionRate = tokenAmount / solAmount;

    debugLog(`✅ Conversion rate: ${conversionRate} tokens per SOL`);
    debugLog(`   ${solAmount} SOL = ${tokenAmount} tokens`);

    return conversionRate;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`❌ Error fetching SOL to token conversion rate: ${errorMessage}`);
    return null;
  }
}
