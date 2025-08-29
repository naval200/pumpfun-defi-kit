import { getAllRequiredPDAsForBuy, ensureBondingCurveAtas } from './bc-helper';
import { createBondingCurveBuyInstructionAssuming } from './instructions';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { debugLog, logError, log, logSuccess, logSignature } from '../utils/debug';
import BN from 'bn.js';
import { PUMP_PROGRAM_ID } from './constants';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { getOrCreateAssociatedTokenAccount } from '../createAccount';
import { sendAndConfirmTransactionWithFeePayer } from '../utils/transaction';

interface BuyPDAs {
  globalPDA: PublicKey;
  bondingCurvePDA: PublicKey;
  creatorVaultPDA: PublicKey;
  eventAuthorityPDA: PublicKey;
  globalVolumeAccumulatorPDA: PublicKey;
  userVolumeAccumulatorPDA: PublicKey;
}

/**
 * Common setup for buy operations - gets PDAs and ensures ATAs exist
 */
async function setupBuyOperation(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  options?: { assumeAccountsExist?: boolean }
): Promise<{
  success: boolean;
  pdas?: BuyPDAs;
  associatedBondingCurve?: PublicKey;
  associatedUser?: PublicKey;
  error?: string;
}> {
  try {
    // Get all required PDAs
    const pdas = getAllRequiredPDAsForBuy(PUMP_PROGRAM_ID, mint, wallet.publicKey);

    // Get associated token addresses
    const associatedBondingCurve = getAssociatedTokenAddressSync(
      mint,
      pdas.bondingCurvePDA,
      true // allowOwnerOffCurve for program accounts
    );

    const associatedUser = getAssociatedTokenAddressSync(mint, wallet.publicKey, false);

    if (!options?.assumeAccountsExist) {
      // Ensure bonding curve ATA exists
      debugLog('🔧 Ensuring bonding curve ATA exists...');
      const bondingCurveAtaResult = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        pdas.bondingCurvePDA,
        mint,
        true // allowOwnerOffCurve
      );

      if (!bondingCurveAtaResult.success) {
        throw new Error(`Failed to create bonding curve ATA: ${bondingCurveAtaResult.error}`);
      }
      debugLog(`✅ Bonding curve ATA ready: ${bondingCurveAtaResult.account.toString()}`);
    }

    return {
      success: true,
      pdas,
      associatedBondingCurve,
      associatedUser,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create complete buy instruction with robust PDA resolution
 */
async function createCompleteBuyInstruction(
  buyer: PublicKey,
  mint: PublicKey,
  solAmount: BN,
  maxSlippageBasisPoints: number = 1000
): Promise<TransactionInstruction> {
  // Reuse zero-RPC builder for consistency
  return createBondingCurveBuyInstructionAssuming(buyer, mint, solAmount, maxSlippageBasisPoints);
}

/**
 * Buy PumpFun tokens with robust PDA resolution
 */
export async function buyPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  solAmount: number,
  slippageBasisPoints: number = 1000,
  feePayer?: Keypair,
  options?: { assumeAccountsExist?: boolean }
): Promise<string> {
  log('🏗️ Setting up associated token accounts for buy...');

  if (!options?.assumeAccountsExist) {
    await ensureBondingCurveAtas(connection, wallet, mint);
  }

  // Create complete buy transaction
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    debugLog(`📡 Creating complete buy transaction (attempt ${attempts}/${maxAttempts})...`);

    try {
      // Setup the buy operation (deterministic addresses only when batching)
      const setupResult = await setupBuyOperation(connection, wallet, mint, {
        assumeAccountsExist: true,
      });
      if (!setupResult.success) {
        throw new Error(`Setup failed: ${setupResult.error}`);
      }

      const buyInstruction = await createCompleteBuyInstruction(
        wallet.publicKey,
        mint,
        new BN(solAmount * 1e9), // Convert SOL to lamports
        slippageBasisPoints
      );

      const transaction = new Transaction().add(buyInstruction);

      // Use the new fee payer transaction utility
      if (feePayer) {
        debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
        const signature = await sendAndConfirmTransactionWithFeePayer(
          connection,
          transaction,
          [wallet], // signers
          feePayer, // fee payer
          { preflightCommitment: 'confirmed' }
        );

        if (!signature.success) {
          throw new Error(`Transaction failed: ${signature.error}`);
        }

        logSuccess('Buy transaction confirmed successfully!');
        log(`💰 Purchased tokens for ${solAmount} SOL`);
        logSignature(signature.signature!, 'Buy');
        return signature.signature!;
      } else {
        // Fallback to original method for backward compatibility
        // Set recent blockhash and fee payer
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // Sign the transaction
        transaction.sign(wallet);

        // Send transaction
        debugLog(`📡 Sending transaction (attempt ${attempts}/${maxAttempts})...`);
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
        log(`💰 Purchased tokens for ${solAmount} SOL`);
        logSignature(signature, 'Buy');
        return signature;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(`Transaction attempt ${attempts} failed: ${errorMessage}`);

      // If this is a seed constraint error, extract the expected address
      if (errorMessage.includes('ConstraintSeeds') || errorMessage.includes('seeds constraint')) {
        debugLog('🔧 Detected seed constraint error. Check the logs for the expected address.');
        debugLog('💡 Add the expected address to KNOWN_PDA_MAPPINGS for this wallet.');
      }

      if (attempts >= maxAttempts) {
        throw new Error(
          `Transaction failed after ${maxAttempts} attempts. Last error: ${errorMessage}`
        );
      }

      // Wait before retry
      debugLog(`⏳ Waiting 2000ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error('Transaction failed after maximum attempts');
}

/**
 * Create signed buy transaction without submitting it
 * Returns the signed transaction for batch processing
 */
export async function createSignedBuyTransaction(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  solAmount: number,
  slippageBasisPoints: number = 1000,
  feePayer?: Keypair,
  blockhash?: string,
  options?: { assumeAccountsExist?: boolean }
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    debugLog(`🔧 Creating signed buy transaction for ${solAmount} SOL`);
    debugLog(`🎯 Target mint: ${mint.toString()}`);
    debugLog(`📊 Slippage: ${slippageBasisPoints} basis points`);

    // Setup the buy operation (get PDAs and ensure ATAs exist)
    const setupResult = await setupBuyOperation(connection, wallet, mint, options);
    if (!setupResult.success) {
      throw new Error(`Setup failed: ${setupResult.error}`);
    }

    // Create complete buy instruction
    debugLog('📝 Creating complete buy instruction...');
    const buyInstruction = await createCompleteBuyInstruction(
      wallet.publicKey,
      mint,
      new BN(solAmount * 1e9), // Convert SOL to lamports
      slippageBasisPoints
    );

    // Create transaction
    const transaction = new Transaction().add(buyInstruction);

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

    debugLog('✅ Signed buy transaction created successfully');

    return {
      success: true,
      transaction,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Failed to create signed buy transaction: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
