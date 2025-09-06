import { getAllRequiredPDAsForBuyAsync } from './bc-helper';
import { Connection, Keypair, PublicKey, Transaction, SendTransactionError } from '@solana/web3.js';
import { debugLog, logError, log, logSuccess, logSignature } from '../utils/debug';
import { formatLamportsAsSol } from '../utils/amounts';
import { PUMP_PROGRAM_ID } from './idl/constants';
import { createBondingCurveBuyInstruction } from './idl/instructions';

/**
 * Buy PumpFun tokens with robust PDA resolution
 */
export async function buyPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  amountLamports: number,
  maxSlippageBasisPoints: number = 1000
): Promise<string> {
  try {
    log(`🛒 Executing buy of ${formatLamportsAsSol(amountLamports)} SOL worth of tokens...`);

    // Get all required PDAs (including correct creator vault)
    const pdas = await getAllRequiredPDAsForBuyAsync(
      connection,
      PUMP_PROGRAM_ID,
      mint,
      wallet.publicKey
    );

    // Create buy instruction using simple approach
    const buyInstruction = createBondingCurveBuyInstruction(
      wallet.publicKey,
      mint,
      amountLamports, // Already in lamports
      pdas,
      maxSlippageBasisPoints
    );

    const transaction = new Transaction().add(buyInstruction);

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

    logSuccess('Buy transaction confirmed successfully!');
    log(`💰 Purchased tokens for ${formatLamportsAsSol(amountLamports)} SOL`);
    logSignature(signature, 'Buy');

    return signature;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Transaction failed: ${errorMessage}`);

    // Enhanced error logging for SendTransactionError
    if (error instanceof SendTransactionError) {
      try {
        const logs = await error.getLogs(connection);
        if (logs && logs.length > 0) {
          logError('📋 Transaction Logs:');
          logs.forEach((logLine, index) => {
            logError(`  ${index + 1}: ${logLine}`);
          });
        }
      } catch (logError) {
        debugLog('⚠️ Could not retrieve transaction logs');
      }
    }

    // If this is a seed constraint error, extract the expected address
    if (errorMessage.includes('ConstraintSeeds') || errorMessage.includes('seeds constraint')) {
      debugLog('🔧 Detected seed constraint error. Check the logs for the expected address.');
      debugLog('💡 Add the expected address to KNOWN_PDA_MAPPINGS for this wallet.');
    }

    // Check for AccountNotInitialized error (ATA issues)
    if (errorMessage.includes('AccountNotInitialized') || errorMessage.includes('0xbc4')) {
      logError('🔧 Account not initialized error detected!');
      logError('💡 This usually means an Associated Token Account (ATA) needs to be created.');
      logError('💡 Make sure the ATA exists for the correct token mint and wallet.');
    }

    throw error; // Re-throw to match expected behavior
  }
}
