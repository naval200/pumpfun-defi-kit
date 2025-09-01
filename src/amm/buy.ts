import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';

import { sendTransaction, sendTransactionWithFeePayer } from '../utils/transaction';
import { retryWithBackoff } from '../utils/retry';
import { debugLog, log, logError, logSuccess } from '../utils/debug';
import { createAmmBuyInstructionsAssuming } from './instructions';
import type { AmmSwapState } from '../@types';
import { formatLamportsAsSol } from '../utils/amounts';

/**
 * Buy tokens using SOL with retry logic and better error handling
 */
export async function buyAmmTokens(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  amountLamports: number,
  slippage: number = 1,
  feePayer?: Keypair,
  options?: { swapSolanaState?: AmmSwapState }
): Promise<{ success: boolean; signature?: string; baseAmount?: number; error?: string }> {
  try {
    // Validate amount is positive and reasonable
    if (amountLamports <= 0) {
      throw new Error('Amount must be positive');
    }

    log(`💰 Buying tokens from pool: ${poolKey.toString()}`);
    log(`SOL amount: ${formatLamportsAsSol(amountLamports)} SOL`);

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

    debugLog(
      `Pool reserves - Base: ${poolBaseAmount.toString()}, Quote: ${poolQuoteAmount.toString()}`
    );

    // Check if reserves are valid
    if (poolBaseAmount.lt(new BN(0)) || poolQuoteAmount.lt(new BN(0))) {
      throw new Error(
        `Invalid pool reserves: Base=${poolBaseAmount.toString()}, Quote=${poolQuoteAmount.toString()}. Pool may be empty or corrupted.`
      );
    }

    // Calculate expected base amount using simple AMM formula
    const amountLamportsBN = new BN(amountLamports);
    const k = poolBaseAmount.mul(poolQuoteAmount);
    const newQuoteReserve = poolQuoteAmount.add(amountLamportsBN);
    const newBaseReserve = k.div(newQuoteReserve);
    const baseOut = poolBaseAmount.sub(newBaseReserve);

    debugLog(`Expected base amount: ${baseOut.toString()}`);

    // Validate calculation result
    if (baseOut.lt(new BN(0))) {
      throw new Error(
        `Invalid AMM calculation: baseOut=${baseOut.toString()}. This suggests insufficient liquidity or calculation error.`
      );
    }

    // Execute buy transaction with retry logic
    debugLog('📝 Executing buy transaction...');
    const effectiveState = options?.swapSolanaState || swapSolanaState;

    let instructions = await createAmmBuyInstructionsAssuming(
      pumpAmmSdk,
      effectiveState,
      amountLamports,
      slippage
    );

    debugLog(`Created ${instructions.length} instructions`);

    // Send transaction with retry logic
    debugLog('📤 Executing Transaction...');

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

    logSuccess(`Buy transaction successful! Signature: ${signature}`);

    // Final transaction summary
    debugLog('🎉 Transaction Success Summary:');
    debugLog(`  ✅ Status: Confirmed on-chain`);
    debugLog(`  🔗 Signature: ${signature}`);
    debugLog(`  💰 SOL Spent: ${formatLamportsAsSol(amountLamports)} SOL`);
    debugLog(`  🪙 TBC Received: ${baseOut.toString()} TBC tokens`);

    return {
      success: true,
      signature,
      baseAmount: Number(baseOut.toString()),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Buy failed: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create signed AMM buy transaction without submitting it
 * Returns the signed transaction for batch processing
 */
export async function createSignedAmmBuyTransaction(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  quoteAmountLamports: number,
  slippage: number = 1,
  feePayer?: Keypair,
  blockhash?: string,
  options?: { swapSolanaState?: AmmSwapState }
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    // Validate amount is positive
    if (quoteAmountLamports < 0) {
      throw new Error('Quote amount must be positive');
    }

    debugLog(`🔧 Creating Signed AMM Buy Transaction:`);
    debugLog(`  💰 Amount: ${formatLamportsAsSol(quoteAmountLamports)} SOL`);
    debugLog(`  🎯 Pool: ${poolKey.toString()}`);
    debugLog(`  📊 Slippage: ${slippage} basis points (${(slippage / 100).toFixed(2)}%)`);
    debugLog(`  👤 Wallet: ${wallet.publicKey.toString()}`);
    debugLog(`  💸 Fee Payer: ${feePayer ? feePayer.publicKey.toString() : 'Same as wallet'}`);

    // Initialize SDKs directly
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Get swap state unless provided
    const swapSolanaState = options?.swapSolanaState
      ? options.swapSolanaState
      : await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);

    // Create buy instructions
    debugLog('📝 Creating buy instructions...');

    let instructions = await createAmmBuyInstructionsAssuming(
      pumpAmmSdk,
      swapSolanaState,
      quoteAmountLamports,
      slippage
    );

    debugLog(`  📝 Created ${instructions.length} instructions`);

    // Create and configure transaction
    debugLog(`  🏗️  Building transaction...`);
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    debugLog(`    📝 Added ${instructions.length} instructions`);

    // Set recent blockhash
    if (blockhash) {
      transaction.recentBlockhash = blockhash;
      debugLog(`    🔗 Using provided blockhash: ${blockhash}`);
    } else {
      const { blockhash: newBlockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = newBlockhash;
      debugLog(`    🔗 Using fresh blockhash: ${newBlockhash}`);
    }

    // Set fee payer
    transaction.feePayer = feePayer ? feePayer.publicKey : wallet.publicKey;
    debugLog(`    💸 Fee payer: ${transaction.feePayer.toString()}`);

    // Sign the transaction
    if (feePayer && feePayer.publicKey.toString() !== wallet.publicKey.toString()) {
      transaction.sign(wallet, feePayer);
      debugLog(
        `    ✍️  Signed by: ${wallet.publicKey.toString()} + ${feePayer.publicKey.toString()}`
      );
    } else {
      transaction.sign(wallet);
      debugLog(`    ✍️  Signed by: ${wallet.publicKey.toString()}`);
    }

    debugLog('✅ Signed AMM buy transaction created successfully');

    return {
      success: true,
      transaction,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Failed to create signed AMM buy transaction: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
