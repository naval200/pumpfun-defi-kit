import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import BN from 'bn.js';

import { sendTransaction } from '../utils/transaction';
import { retryWithBackoff } from '../utils/retry';
import { log, logSignature, logError } from '../utils/debug';

/**
 * Add liquidity to pool with retry logic and better error handling
 */
export async function addLiquidity(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  baseAmount: number,
  slippage: number = 1
): Promise<{ success: boolean; signature?: string; lpTokenAmount?: number; error?: string }> {
  try {
    log(`💧 Adding liquidity to pool: ${poolKey.toString()}`);
    log(`Token amount: ${baseAmount}`);

    // Initialize SDK directly
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Get liquidity state with retry logic
    log('🔍 Getting liquidity state...');
    const liquiditySolanaState = await retryWithBackoff(
      async () => {
        return await pumpAmmSdk.liquiditySolanaState(poolKey, wallet.publicKey);
      },
      3,
      2000
    );

    // Calculate quote amount and LP tokens with retry logic
    log('🧮 Calculating liquidity amounts...');
    const { quote, lpToken } = await retryWithBackoff(
      async () => {
        return await pumpAmmSdk.depositAutocompleteQuoteAndLpTokenFromBase(
          liquiditySolanaState,
          new BN(baseAmount),
          slippage
        );
      },
      3,
      2000
    );

    log(`Required SOL: ${quote}, LP tokens: ${lpToken}`);

    // Get deposit instructions with retry logic
    log('📝 Getting deposit instructions...');
    const depositInstructions = await retryWithBackoff(
      async () => {
        return await pumpAmmSdk.depositInstructions(liquiditySolanaState, lpToken, slippage);
      },
      3,
      2000
    );

    // Send transaction with retry logic
    log('📤 Sending liquidity transaction...');
    const signature = await retryWithBackoff(
      async () => {
        return await sendTransaction(connection, wallet, depositInstructions);
      },
      3,
      2000
    );

    logSignature(signature, 'Liquidity addition');

    return {
      success: true,
      signature,
      lpTokenAmount: Number(lpToken.toString()),
    };
  } catch (error: unknown) {
    logError('❌ Error adding liquidity:', error);

    // Provide more specific error information
    let errorMessage = 'Add liquidity failed';
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

/**
 * Remove liquidity from pool with retry logic and better error handling
 */
export async function removeLiquidity(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  lpTokenAmount: number,
  slippage: number = 1
): Promise<{
  success: boolean;
  signature?: string;
  baseAmount?: number;
  quoteAmount?: number;
  error?: string;
}> {
  try {
    log(`💸 Removing liquidity from pool: ${poolKey.toString()}`);
    log(`LP token amount: ${lpTokenAmount}`);

    // Initialize SDK directly
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Get liquidity state with retry logic
    log('🔍 Getting liquidity state...');
    const liquiditySolanaState = await retryWithBackoff(
      async () => {
        return await pumpAmmSdk.liquiditySolanaState(poolKey, wallet.publicKey);
      },
      3,
      2000
    );

    // Calculate withdrawal amounts with retry logic
    log('🧮 Calculating withdrawal amounts...');
    const { base, quote } = await retryWithBackoff(
      async () => {
        const lpTokenAmountBN = new BN(lpTokenAmount);

        return pumpAmmSdk.withdrawAutoCompleteBaseAndQuoteFromLpToken(
          liquiditySolanaState,
          lpTokenAmountBN,
          slippage
        );
      },
      3,
      2000
    );

    log(`Expected tokens: ${base}, Expected SOL: ${quote}`);

    // Get withdrawal instructions with retry logic
    log('📝 Getting withdrawal instructions...');
    const withdrawInstructions = await retryWithBackoff(
      async () => {
        const lpTokenAmountBN = new BN(lpTokenAmount);

        return await pumpAmmSdk.withdrawInstructions(
          liquiditySolanaState,
          lpTokenAmountBN,
          slippage
        );
      },
      3,
      2000
    );

    // Send transaction with retry logic
    log('📤 Sending withdrawal transaction...');
    const signature = await retryWithBackoff(
      async () => {
        return await sendTransaction(connection, wallet, withdrawInstructions);
      },
      3,
      2000
    );

    logSignature(signature, 'Liquidity removal');

    return {
      success: true,
      signature,
      baseAmount: Number(base.toString()),
      quoteAmount: Number(quote.toString()),
    };
  } catch (error: unknown) {
    logError('❌ Error removing liquidity:', error);

    // Provide more specific error information
    let errorMessage = 'Remove liquidity failed';
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
