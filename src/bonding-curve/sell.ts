import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { getAllRequiredPDAsForBuyAsync, getFeeRecipientFromGlobal } from './bc-helper';
import { createBondingCurveSellInstruction } from './idl/instructions';
import { PUMP_PROGRAM_ID } from './idl/constants';
import { debugLog, logError, log, logSuccess, logSignature } from '../utils/debug';
import { minSolLamports, formatLamportsAsSol } from '../utils/amounts';
/**
 * Sell PumpFun tokens with simple approach
 */
export async function sellPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  tokenAmount: number,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    // Validate that tokenAmount is specified
    if (tokenAmount === undefined) {
      return {
        success: false,
        error: 'Token amount is required. Please specify the number of tokens to sell.',
      };
    }

    log('🔄 Executing sell of', tokenAmount, 'tokens...');

    // Get all required PDAs (including correct creator vault)
    const pdas = await getAllRequiredPDAsForBuyAsync(
      connection,
      PUMP_PROGRAM_ID,
      mint,
      wallet.publicKey
    );

    // Fetch fee recipient from Global account (required, no hardcoded fallback)
    const feeRecipient = await getFeeRecipientFromGlobal(connection, PUMP_PROGRAM_ID);
    debugLog(`✅ Using fee recipient from Global account: ${feeRecipient.toString()}`);

    const minSolOutput = minSolLamports();
    const sellInstruction = createBondingCurveSellInstruction(
      wallet.publicKey,
      mint,
      tokenAmount,
      minSolOutput,
      pdas,
      feeRecipient
    );

    const transaction = new Transaction();

    // Set fee payer FIRST (before adding instructions) - CRITICAL for custodial wallets
    transaction.feePayer = feePayer ? feePayer.publicKey : wallet.publicKey;

    // Add instruction after setting fee payer
    transaction.add(sellInstruction);

    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;

    // Sign the transaction - fee payer signs FIRST when present
    if (feePayer) {
      transaction.sign(feePayer, wallet); // Fee payer signs first!
    } else {
      transaction.sign(wallet);
    }

    // Send transaction
    debugLog('📡 Sending transaction...');
    // Skip preflight when fee payer is present - simulation may incorrectly check user wallet for rent
    // but fee payer will cover the transaction fee in reality
    const skipPreflight = feePayer !== undefined;
    if (skipPreflight) {
      debugLog('⚠️  Skipping preflight (fee payer will cover transaction costs)');
    }
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    await connection.confirmTransaction(
      {
        signature,
        ...(await connection.getLatestBlockhash('confirmed')),
      },
      'confirmed'
    );

    logSuccess('Sell transaction confirmed successfully!');
    log(`💰 Sold ${tokenAmount} tokens for at least ${formatLamportsAsSol(minSolOutput)} SOL`);
    logSignature(signature, 'Sell');

    return {
      success: true,
      signature,
    };
  } catch (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
      // Log full error details for debugging
      if (error.stack) {
        debugLog(`Error stack: ${error.stack}`);
      }
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error, null, 2);
    } else {
      errorMessage = String(error);
    }
    logError(`Transaction failed: ${errorMessage}`);

    // If this is a seed constraint error, extract the expected address
    if (errorMessage.includes('ConstraintSeeds') || errorMessage.includes('seeds constraint')) {
      debugLog('🔧 Detected seed constraint error. Check the logs for the expected address.');
      debugLog('💡 Add the expected address to KNOWN_PDA_MAPPINGS for this wallet.');
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
