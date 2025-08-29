import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { sendTransaction, sendTransactionWithFeePayer } from '../utils/transaction';
import { retryWithBackoff } from '../utils/retry';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { debugLog, log, logError, logSuccess } from '../utils/debug';
import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createAmmBuyInstructionsAssuming } from './instructions';

/**
 * Buy tokens using SOL with retry logic and better error handling
 */
export async function buyTokens(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  quoteAmount: number,
  slippage: number = 1,
  feePayer?: Keypair,
  options?: { assumeAccountsExist?: boolean; swapSolanaState?: any }
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

    // Calculate expected base amount using simple AMM formula
    // This is a simplified calculation - in practice, you'd use the SDK's methods
    const k = baseReserve * quoteReserve;
    const newQuoteReserve = quoteReserve + quoteAmount;
    const newBaseReserve = k / newQuoteReserve;
    const baseOut = baseReserve - newBaseReserve;

    debugLog(`Expected base amount: ${baseOut}`);

    // Execute buy transaction with retry logic
    debugLog('📝 Executing buy transaction...');
    // Build swap instructions (prefer provided swap state)
    const effectiveState = options?.swapSolanaState || swapSolanaState;
    let instructions = await createAmmBuyInstructionsAssuming(
      pumpAmmSdk,
      effectiveState,
      new BN(quoteAmount),
      slippage
    );

    if (options?.assumeAccountsExist) {
      debugLog('⛔ Assuming accounts exist: filtering out ATA creation instructions for AMM buy');
      instructions = instructions.filter(
        ix => ix.programId.toString() !== ASSOCIATED_TOKEN_PROGRAM_ID.toString()
      );
    }

    // Send transaction with retry logic
    debugLog('📤 Sending buy transaction...');
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
  options?: { assumeAccountsExist?: boolean; swapSolanaState?: any }
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    debugLog(`🔧 Creating signed AMM buy transaction for ${quoteAmount} SOL`);
    debugLog(`🎯 Target pool: ${poolKey.toString()}`);
    debugLog(`📊 Slippage: ${slippage}%`);

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
      new BN(quoteAmount),
      slippage
    );

    if (options?.assumeAccountsExist) {
      debugLog(
        '⛔ Assuming accounts exist: filtering ATA creation instructions for signed AMM buy'
      );
      instructions = instructions.filter(
        ix => ix.programId.toString() !== ASSOCIATED_TOKEN_PROGRAM_ID.toString()
      );
    }

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
    // The main wallet signs if it's different from the fee payer
    if (feePayer && feePayer.publicKey.toString() !== wallet.publicKey.toString()) {
      transaction.sign(wallet, feePayer);
    } else {
      transaction.sign(wallet);
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
