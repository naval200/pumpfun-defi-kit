import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { sendTransaction, sendTransactionWithFeePayer } from '../utils/transaction';
import { retryWithBackoff } from '../utils/retry';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { debugLog, log, logError, logSuccess } from '../utils/debug';

/**
 * Buy tokens using SOL with retry logic and better error handling
 */
export async function buyTokens(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  quoteAmount: number,
  slippage: number = 1,
  feePayer?: Keypair
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
    const instructions = await retryWithBackoff(
      async () => {
        // Convert to BN for SDK compatibility
        const quoteAmountBN = new BN(quoteAmount);

        return await pumpAmmSdk.buyQuoteInput(swapSolanaState, quoteAmountBN, slippage);
      },
      3,
      2000
    );

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
  blockhash?: string
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    debugLog(`🔧 Creating signed AMM buy transaction for ${quoteAmount} SOL`);
    debugLog(`🎯 Target pool: ${poolKey.toString()}`);
    debugLog(`📊 Slippage: ${slippage}%`);

    // Initialize SDKs directly
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Get swap state
    debugLog('🔍 Getting swap state...');
    const swapSolanaState = await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);

    // Create buy instructions
    debugLog('📝 Creating buy instructions...');
    const quoteAmountBN = new BN(quoteAmount);
    const instructions = await pumpAmmSdk.buyQuoteInput(swapSolanaState, quoteAmountBN, slippage);

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
