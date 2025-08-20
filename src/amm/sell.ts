import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { sendTransaction } from '../utils/transaction';
import { retryWithBackoff } from '../utils/retry';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { debugLog, log, logError, logSuccess } from '../utils/debug';

/**
 * Sell tokens for SOL with retry logic and better error handling
 */
export async function sellTokens(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  baseAmount: number,
  slippage: number = 1
): Promise<{ success: boolean; signature?: string; quoteAmount?: number; error?: string }> {
  try {
    log(`💸 Selling tokens to pool: ${poolKey.toString()}`);
    log(`Token amount: ${baseAmount}`);

    // Initialize SDKs directly
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Get swap state with retry logic
    debugLog('🔍 Getting swap state...');
    const swapSolanaState = await retryWithBackoff(
      async () => {
        return await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);
      },
      3,
      2000
    );

    const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
    const baseReserve = Number(poolBaseAmount);
    const quoteReserve = Number(poolQuoteAmount);

    debugLog(`Pool reserves - Base: ${baseReserve}, Quote: ${quoteReserve}`);

    // Calculate expected quote amount using simple AMM formula
    // This is a simplified calculation - in practice, you'd use the SDK's methods
    const k = baseReserve * quoteReserve;
    const newBaseReserve = baseReserve + baseAmount;
    const newQuoteReserve = k / newBaseReserve;
    const quoteOut = quoteReserve - newQuoteReserve;

    debugLog(`Expected quote amount: ${quoteOut}`);

    // Execute sell transaction with retry logic
    debugLog('📝 Executing sell transaction...');
    const instructions = await retryWithBackoff(
      async () => {
        // Convert to BN for SDK compatibility and use type assertion to bypass TypeScript issues
        const baseAmountBN = new BN(baseAmount);

        return await pumpAmmSdk.sellBaseInput(swapSolanaState, baseAmountBN, slippage);
      },
      3,
      2000
    );

    // Send transaction with retry logic
    debugLog('📤 Sending sell transaction...');
    const signature = await retryWithBackoff(
      async () => {
        return await sendTransaction(connection, wallet, instructions);
      },
      3,
      2000
    );

    logSuccess(`Sell transaction successful! Signature: ${signature}`);

    return {
      success: true,
      signature,
      quoteAmount: Number(quoteOut),
    };
  } catch (error: unknown) {
    logError('Error selling tokens:', error);

    // Provide more specific error information
    let errorMessage = 'Sell operation failed';
    if ((error as Error).message) {
      errorMessage = (error as Error).message;
    } else if ((error as Error).toString) {
      errorMessage = (error as Error).toString();
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
