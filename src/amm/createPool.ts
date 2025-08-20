import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getPoolCreationData } from './amm';
import { sendTransaction } from '../utils/transaction';
import { retryWithBackoff } from '../utils/retry';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { log, logSignature, logError } from '../utils/debug';

/**
 * Create a new pool for a token with retry logic and better error handling
 */
export async function createPool(
  connection: Connection,
  wallet: Keypair,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  baseIn: number,
  quoteIn: number,
  index: number = 0
): Promise<{ success: boolean; poolKey?: PublicKey; signature?: string; error?: string }> {
  try {
    log('🏊 Creating AMM liquidity pool...');
    log(`Base mint: ${baseMint.toString()}`);
    log(`Quote mint: ${quoteMint.toString()}`);
    log(`Base amount: ${baseIn}`);
    log(`Quote amount: ${quoteIn}`);

    // Initialize SDK directly
    const pumpAmmSdk = new PumpAmmSdk(connection);

    // Get pool creation data with retry logic
    log('🔧 Getting pool creation data...');
    const { createPoolSolanaState, createPoolInstructions, initialPoolPrice } =
      await retryWithBackoff(
        async () => {
          return await getPoolCreationData(
            pumpAmmSdk,
            index,
            wallet.publicKey,
            baseMint,
            quoteMint,
            baseIn,
            quoteIn
          );
        },
        3,
        2000
      ); // 3 retries, 2 second base delay

    log(`Initial pool price: ${initialPoolPrice}`);

    // Send transaction with retry logic
    log('📝 Sending pool creation transaction...');
    const signature = await retryWithBackoff(
      async () => {
        return await sendTransaction(connection, wallet, createPoolInstructions);
      },
      3,
      2000
    ); // 3 retries, 2 second base delay

    logSignature(signature, 'Pool creation');

    // Extract pool key from the state
    const poolKey = createPoolSolanaState.poolKey as PublicKey;

    return {
      success: true,
      poolKey,
      signature,
    };
  } catch (error: unknown) {
    logError('❌ Error creating pool:', error);

    // Provide more specific error information
    let errorMessage = 'Pool creation failed';
    if ((error as Error).message) {
      errorMessage = (error as Error).message;
    } else if ((error as Error).toString) {
      errorMessage = (error as Error).toString();
    }

    // Check for specific error patterns
    if (errorMessage.includes('amount.gtn is not a function')) {
      errorMessage = 'SDK type mismatch - parameters need to be converted to BigNumber';
    } else if (errorMessage.includes('AccountNotInitialized')) {
      errorMessage = 'Account not properly initialized - check wallet and mint setup';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
