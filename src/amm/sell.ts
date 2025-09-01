import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { sendTransaction, sendTransactionWithFeePayer } from '../utils/transaction';
import { retryWithBackoff } from '../utils/retry';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { debugLog, log, logError, logSuccess } from '../utils/debug';
import { createAmmSellInstructionsAssuming } from './instructions';
import type { AmmSwapState } from '../@types';

/**
 * Sell tokens for SOL using AMM
 */
export async function sellAmmTokens(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  baseAmount: number,
  slippage: number = 1,
  feePayer?: Keypair,
  options?: { swapSolanaState?: AmmSwapState }
): Promise<{ success: boolean; signature?: string; quoteAmount?: number; error?: string }> {
  try {
    log(`💸 Selling tokens to pool: ${poolKey.toString()}`);
    log(`Token amount: ${baseAmount}`);

    // Initialize SDKs directly
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Get swap state with retry logic unless provided
    const swapSolanaState = options?.swapSolanaState
      ? options.swapSolanaState
      : await retryWithBackoff(
          async () => {
            debugLog('🔍 Getting swap state...');
            return await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);
          },
          3,
          2000
        );

    const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
    const baseReserve = new BN(poolBaseAmount);
    const quoteReserve = new BN(poolQuoteAmount);

    debugLog(`Pool reserves - Base: ${baseReserve.toString()}, Quote: ${quoteReserve.toString()}`);

    // Calculate expected quote amount using simple AMM formula
    // This is a simplified calculation - in practice, you'd use the SDK's methods
    const k = baseReserve.mul(quoteReserve);
    const newBaseReserve = baseReserve.add(new BN(baseAmount));
    const newQuoteReserve = k.div(newBaseReserve);
    const quoteOut = quoteReserve.sub(newQuoteReserve);

    debugLog(`Expected quote amount: ${quoteOut.toString()}`);

    // Execute sell transaction with retry logic
    debugLog('📝 Executing sell transaction...');
    const instructions = await createAmmSellInstructionsAssuming(
      pumpAmmSdk,
      swapSolanaState,
      baseAmount,
      slippage
    );

    // Send transaction with retry logic
    debugLog('📤 Sending sell transaction...');
    const signature = await retryWithBackoff(
      async () => {
        if (feePayer) {
          debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
          return await sendTransactionWithFeePayer(connection, wallet, instructions, feePayer);
        } else {
          return await sendTransaction(connection, wallet, instructions);
        }
      },
      3,
      2000
    );

    logSuccess(`Sell transaction successful! Signature: ${signature}`);

    return {
      success: true,
      signature,
      quoteAmount: Number(quoteOut.toString()),
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

/**
 * Create signed AMM sell transaction without submitting it
 * Returns the signed transaction for batch processing
 */
export async function createSignedAmmSellTransaction(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  baseAmount: number,
  slippage: number = 1,
  feePayer?: Keypair,
  blockhash?: string,
  _options?: { swapSolanaState?: AmmSwapState }
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    debugLog(`🔧 Creating signed AMM sell transaction for ${baseAmount} tokens`);
    debugLog(`🎯 Target pool: ${poolKey.toString()}`);
    debugLog(`📊 Slippage: ${slippage}%`);

    // Initialize SDKs directly
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Get swap state (use provided one if available, otherwise fetch)
    debugLog('🔍 Getting swap state...');
    const swapSolanaState =
      _options?.swapSolanaState || (await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey));

    // Create sell instructions
    debugLog('📝 Creating sell instructions...');
    const instructions = await pumpAmmSdk.sellBaseInput(
      swapSolanaState,
      new BN(baseAmount),
      slippage
    );

    // Create transaction
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));

    // Set recent blockhash
    // Use provided blockhash for batch operations, or get new one if not provided
    if (blockhash) {
      transaction.recentBlockhash = blockhash;
    } else {
      const { blockhash: newBlockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = newBlockhash;
    }

    // Set fee payer (use feePayer if provided, otherwise use wallet)
    transaction.feePayer = feePayer ? feePayer.publicKey : wallet.publicKey;

    // Sign the transaction
    // For batch transactions, the fee payer signs all transactions
    // The main wallet signs if it's different from the payment
    if (feePayer && feePayer.publicKey.toString() !== wallet.publicKey.toString()) {
      transaction.sign(wallet, feePayer);
    } else {
      transaction.sign(wallet);
    }

    debugLog('✅ Signed AMM sell transaction created successfully');

    return {
      success: true,
      transaction,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Failed to create signed AMM sell transaction: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
