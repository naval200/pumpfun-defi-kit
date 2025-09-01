import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { getAllRequiredPDAsForBuyAsync } from './bc-helper';
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
  tokenAmount: number
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

    const minSolOutput = minSolLamports();
    const sellInstruction = createBondingCurveSellInstruction(
      wallet.publicKey,
      mint,
      tokenAmount,
      minSolOutput,
      pdas
    );

    const transaction = new Transaction().add(sellInstruction);

    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign the transaction
    transaction.sign(wallet);

    // Send transaction
    debugLog('📡 Sending transaction...');
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
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
