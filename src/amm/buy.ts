import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { sendTransaction, sendTransactionWithFeePayer } from '../utils/transaction';
import { retryWithBackoff } from '../utils/retry';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { debugLog, log, logError, logSuccess } from '../utils/debug';
import { createAmmBuyInstructionsAssuming } from './instructions';
import type { AmmSwapState } from '../@types';

/**
 * Buy tokens using SOL with retry logic and better error handling
 */
export async function buyAmmTokens(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  quoteAmount: number,
  slippage: number = 1,
  feePayer?: Keypair,
  options?: { swapSolanaState?: AmmSwapState }
): Promise<{ success: boolean; signature?: string; baseAmount?: number; error?: string }> {
  try {
    log(`💰 Buying tokens from pool: ${poolKey.toString()}`);
    log(`SOL amount: ${quoteAmount}`);

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

    // Enhanced pool state debugging
    debugLog('🔍 Pool State Analysis:');
    debugLog(`  📊 Base Reserve: ${baseReserve.toLocaleString()} TBC tokens`);
    debugLog(`  💰 Quote Reserve: ${(quoteReserve / 1e9).toFixed(9)} SOL`);
    debugLog(
      `  🔢 Raw Base Amount: ${poolBaseAmount.toString()} (hex: 0x${poolBaseAmount.toString(16)})`
    );
    debugLog(
      `  🔢 Raw Quote Amount: ${poolQuoteAmount.toString()} (hex: 0x${poolQuoteAmount.toString(16)})`
    );
    debugLog(
      `  📈 Pool Value: ${((baseReserve * (quoteReserve / 1e9)) / baseReserve).toFixed(9)} SOL per TBC token`
    );

    // Check if reserves are valid
    if (baseReserve <= 0 || quoteReserve <= 0) {
      throw new Error(
        `Invalid pool reserves: Base=${baseReserve}, Quote=${quoteReserve}. Pool may be empty or corrupted.`
      );
    }

    // Calculate expected base amount using simple AMM formula
    // This is a simplified calculation - in practice, you'd use the SDK's methods
    const k = baseReserve * quoteReserve;
    const newQuoteReserve = quoteReserve + quoteAmount;
    const newBaseReserve = k / newQuoteReserve;
    const baseOut = baseReserve - newBaseReserve;

    debugLog(`Expected base amount: ${baseOut}`);

    // Enhanced AMM calculation debugging
    debugLog('🧮 AMM Calculation Analysis:');
    debugLog(`  🔢 Constant Product K: ${k.toLocaleString()}`);
    debugLog(
      `  📊 Current Quote Reserve: ${quoteReserve.toLocaleString()} lamports (${(quoteReserve / 1e9).toFixed(9)} SOL)`
    );
    debugLog(
      `  📊 New Quote Reserve: ${newQuoteReserve.toLocaleString()} lamports (${(newQuoteReserve / 1e9).toFixed(9)} SOL)`
    );
    debugLog(`  📊 Current Base Reserve: ${baseReserve.toLocaleString()} TBC`);
    debugLog(`  📊 New Base Reserve: ${newBaseReserve.toLocaleString()} TBC`);
    debugLog(`  🎯 Expected TBC Output: ${baseOut.toFixed(9)} TBC tokens`);
    debugLog(`  💰 Input SOL: ${quoteAmount} SOL`);
    debugLog(
      `  📈 Price Impact: ${(((newQuoteReserve - quoteReserve) / quoteReserve) * 100).toFixed(4)}%`
    );

    // Validate calculation result
    if (baseOut <= 0) {
      throw new Error(
        `Invalid AMM calculation: baseOut=${baseOut}. This suggests insufficient liquidity or calculation error.`
      );
    }

    // Execute buy transaction with retry logic
    debugLog('📝 Executing buy transaction...');
    // Build swap instructions (prefer provided swap state)
    const effectiveState = options?.swapSolanaState || swapSolanaState;

    debugLog('📝 Transaction Preparation:');
    debugLog(`  💰 Input Amount: ${quoteAmount} SOL`);
    debugLog(`  📊 Slippage: ${slippage} basis points (${(slippage / 100).toFixed(2)}%)`);
    debugLog(`  🔢 Quote Amount (lamports): ${Math.floor(quoteAmount * 1e9).toLocaleString()}`);
    debugLog(`  🎯 Target Pool: ${poolKey.toString()}`);

    // Safely log swap state without BigInt serialization issues
    try {
      const safeState = JSON.parse(
        JSON.stringify(effectiveState, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );
      debugLog(`Using swap state: ${JSON.stringify(safeState, null, 2)}`);

      // Extract and display key swap state values
      if (safeState.poolBaseAmount && safeState.poolQuoteAmount) {
        debugLog(`🔢 Swap State Summary:`);
        debugLog(`  🏊 Pool Key: ${safeState.poolKey}`);
        debugLog(`  🪙 Base Mint: ${safeState.baseMint}`);
        debugLog(`  💰 Quote Mint: ${safeState.quoteMint || 'Wrapped SOL'}`);
        debugLog(`  📊 Pool Base Amount: ${Number(safeState.poolBaseAmount).toLocaleString()} TBC`);
        debugLog(
          `  📊 Pool Quote Amount: ${(Number(safeState.poolQuoteAmount) / 1e9).toFixed(9)} SOL`
        );
        debugLog(`  👤 User: ${safeState.user}`);
        debugLog(`  🏦 User Base Account: ${safeState.userBaseTokenAccount}`);
        debugLog(`  🏦 User Quote Account: ${safeState.userQuoteTokenAccount}`);
      }
    } catch (e) {
      debugLog(`Swap state logging failed: ${e}`);
      debugLog(`Swap state keys: ${Object.keys(effectiveState || {}).join(', ')}`);
    }

    // Convert SOL amount to lamports before creating BN
    const quoteAmountLamports = Math.floor(quoteAmount * 1e9);

    let instructions = await createAmmBuyInstructionsAssuming(
      pumpAmmSdk,
      effectiveState,
      new BN(quoteAmountLamports),
      slippage
    );

    debugLog(`Created ${instructions.length} instructions`);
    debugLog(`🔍 Transaction Summary:`);
    debugLog(`  💰 Input: ${quoteAmount} SOL (${quoteAmountLamports.toLocaleString()} lamports)`);
    debugLog(`  📊 Slippage: ${slippage} basis points (${(slippage / 100).toFixed(2)}%)`);
    debugLog(`  🎯 Expected Output: ${baseOut.toFixed(9)} TBC tokens`);
    debugLog(`  📈 Price Impact: ${((quoteAmount / (quoteReserve / 1e9)) * 100).toFixed(4)}%`);

    instructions.forEach((ix, i) => {
      debugLog(`📝 Instruction ${i}:`);
      debugLog(`  🏛️  Program: ${ix.programId.toString()}`);
      debugLog(`  📏 Data: ${ix.data.length} bytes`);
      debugLog(`  🔑 Accounts: ${ix.keys.length}`);

      // Log instruction data signature
      if (ix.data.length > 0) {
        const dataHex = Array.from(ix.data.slice(0, 8))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        debugLog(`  🔢 Data: 0x${dataHex}`);
      }

      // Enhanced AMM instruction analysis
      if (i === 3) {
        // AMM instruction is typically the 4th one (after ATA creation, SOL transfer, token init)
        debugLog(`  🏊 AMM Buy Instruction Details:`);
        debugLog(`    📊 Total Accounts: ${ix.keys.length}`);
        debugLog(`    🔑 Key Accounts:`);

        // Log important accounts with better formatting
        const keyAccounts = [
          { index: 0, name: 'User', _desc: 'User wallet' },
          { index: 1, name: 'Pool', _desc: 'Pool account' },
          { index: 2, name: 'Pool Authority', _desc: 'Pool authority' },
          { index: 3, name: 'User Base ATA', _desc: 'User TBC account' },
          { index: 4, name: 'User Quote ATA', _desc: 'User SOL account' },
          { index: 5, name: 'Pool Base ATA', _desc: 'Pool TBC account' },
          { index: 6, name: 'Pool Quote ATA', _desc: 'Pool SOL account' },
          { index: 7, name: 'Token Program', _desc: 'SPL Token program' },
          { index: 8, name: 'Pool Base ATA', _desc: 'Pool TBC account' },
          { index: 9, name: 'Pool Quote ATA', _desc: 'Pool SOL account' },
        ];

        keyAccounts.forEach(({ index, name }) => {
          if (ix.keys[index]) {
            const key = ix.keys[index];
            debugLog(`      ${index.toString().padStart(2)}: ${name} = ${key.pubkey.toString()}`);
            debugLog(
              `           ${key.isSigner ? '👤 Signer' : '👁️  Non-signer'}, ${key.isWritable ? '✏️  Writable' : '👁️  Read-only'}`
            );
          }
        });
      }
    });

    // Send transaction with retry logic
    debugLog('📤 Executing Transaction:');
    debugLog(`  👤 Signer: ${wallet.publicKey.toString()}`);
    debugLog(`  💸 Fee Payer: ${feePayer ? feePayer.publicKey.toString() : 'Same as signer'}`);
    debugLog(`  🔄 Retry Strategy: 3 attempts with 2s backoff`);

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
    debugLog(`  💰 SOL Spent: ${quoteAmount} SOL`);
    debugLog(`  🪙 TBC Received: ${baseOut.toFixed(9)} TBC tokens`);
    debugLog(`  📊 Effective Rate: ${(quoteAmount / baseOut).toFixed(9)} SOL per TBC`);
    debugLog(`  📈 Price Impact: ${((quoteAmount / (quoteReserve / 1e9)) * 100).toFixed(4)}%`);

    return {
      success: true,
      signature,
      baseAmount: Number(baseOut),
    };
  } catch (error: unknown) {
    logError('Error buying tokens:', error);

    // Provide more specific error information
    let errorMessage = 'Buy operation failed';
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
 * Create signed AMM buy transaction without submitting it
 * Returns the signed transaction for batch processing
 */
export async function createSignedAmmBuyTransaction(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  quoteAmount: number,
  slippage: number = 1,
  feePayer?: Keypair,
  blockhash?: string,
  options?: { swapSolanaState?: AmmSwapState }
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    debugLog(`🔧 Creating Signed AMM Buy Transaction:`);
    debugLog(`  💰 Amount: ${quoteAmount} SOL`);
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

    // Convert SOL amount to lamports before creating BN
    const quoteAmountLamports = Math.floor(quoteAmount * 1e9);
    debugLog(
      `  🔢 Unit Conversion: ${quoteAmount} SOL → ${quoteAmountLamports.toLocaleString()} lamports`
    );

    let instructions = await createAmmBuyInstructionsAssuming(
      pumpAmmSdk,
      swapSolanaState,
      new BN(quoteAmountLamports),
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
