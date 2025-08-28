import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { getOrCreateAssociatedTokenAccount } from '../createAccount';
import { deriveBondingCurveAddress, getAllRequiredPDAsForBuy } from './helper';
import {
  BUY_INSTRUCTION_DISCRIMINATOR,
  PUMP_PROGRAM_ID,
  FEE_RECIPIENT,
  TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  GLOBAL_VOLUME_ACCUMULATOR,
} from './constants';
import { debugLog, log, logError, logSignature, logSuccess } from '../utils/debug';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { sendAndConfirmTransactionWithFeePayer } from '../utils/transaction';

/**
 * Common setup for buy operations - gets PDAs and ensures ATAs exist
 */
async function setupBuyOperation(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  feePayer?: Keypair
): Promise<{ 
  success: boolean; 
  pdas?: any; 
  associatedBondingCurve?: PublicKey; 
  associatedUser?: PublicKey; 
  error?: string 
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

    return {
      success: true,
      pdas,
      associatedBondingCurve,
      associatedUser
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Create complete buy instruction with robust PDA resolution
 */
async function createCompleteBuyInstruction(
  programId: PublicKey,
  buyer: PublicKey,
  mint: PublicKey,
  solAmount: BN,
  maxSlippageBasisPoints: number = 1000,
  pdas: any,
  associatedBondingCurve: PublicKey,
  associatedUser: PublicKey
): Promise<TransactionInstruction> {
  // Calculate parameters
  const expectedTokenAmount = new BN(100000000); // Reasonable estimate
  const maxSolCost = solAmount.mul(new BN(10000 + maxSlippageBasisPoints)).div(new BN(10000));
  const trackVolume = true; // Enable volume tracking

  const {
    globalPDA,
    bondingCurvePDA,
    creatorVaultPDA,
    eventAuthorityPDA,
    globalVolumeAccumulatorPDA,
    userVolumeAccumulatorPDA,
  } = pdas;

  debugLog('🔧 Creating complete buy instruction with all required accounts:');
  debugLog(`   0. Global: ${globalPDA.toString()}`);
  debugLog(`   1. FeeRecipient: ${FEE_RECIPIENT.toString()}`);
  debugLog(`   2. Mint: ${mint.toString()}`);
  debugLog(`   3. BondingCurve: ${bondingCurvePDA.toString()}`);
  debugLog(`   4. AssociatedBondingCurve: ${associatedBondingCurve.toString()}`);
  debugLog(`   5. AssociatedUser: ${associatedUser.toString()}`);
  debugLog(`   6. User: ${buyer.toString()}`);
  debugLog(`   7. SystemProgram: ${SYSTEM_PROGRAM_ID.toString()}`);
  debugLog(`   8. TokenProgram: ${TOKEN_PROGRAM_ID.toString()}`);
  debugLog(`   9. CreatorVault: ${creatorVaultPDA.toString()}`);
  debugLog(`  10. EventAuthority: ${eventAuthorityPDA.toString()}`);
  debugLog(`  11. Program: ${programId.toString()}`);
  debugLog(`  12. GlobalVolumeAccumulator: ${globalVolumeAccumulatorPDA.toString()}`);
  debugLog(`  13. UserVolumeAccumulator: ${userVolumeAccumulatorPDA.toString()}`);

  // Verify addresses
  const expectedGlobal = GLOBAL_VOLUME_ACCUMULATOR;
  if (globalVolumeAccumulatorPDA.toString() === expectedGlobal) {
    debugLog('✅ Using correct GlobalVolumeAccumulator address');
  } else {
    logError('GlobalVolumeAccumulator address mismatch');
  }

  const instructionData = Buffer.alloc(1000); // Allocate enough space
  let offset = 0;

  // Write discriminator
  instructionData.set(BUY_INSTRUCTION_DISCRIMINATOR, offset);
  offset += 8;

  // Write arguments: amount (u64), max_sol_cost (u64), track_volume (bool)
  expectedTokenAmount.toArrayLike(Buffer, 'le', 8).copy(instructionData, offset);
  offset += 8;

  maxSolCost.toArrayLike(Buffer, 'le', 8).copy(instructionData, offset);
  offset += 8;

  // Write track_volume as boolean (1 byte)
  instructionData.writeUInt8(trackVolume ? 1 : 0, offset);
  offset += 1;

  const finalInstructionData = instructionData.slice(0, offset);

  // Create instruction with all required accounts in exact IDL order
  const buyInstruction = new TransactionInstruction({
    keys: [
      // 0-6: Core accounts
      { pubkey: globalPDA, isSigner: false, isWritable: true },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurvePDA, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },

      // 7-8: System programs
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },

      // 9-13: Additional required accounts from IDL
      { pubkey: creatorVaultPDA, isSigner: false, isWritable: true },
      { pubkey: eventAuthorityPDA, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
      { pubkey: globalVolumeAccumulatorPDA, isSigner: false, isWritable: true },
      { pubkey: userVolumeAccumulatorPDA, isSigner: false, isWritable: true },
    ],
    programId: programId,
    data: finalInstructionData,
  });

  return buyInstruction;
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
  feePayer?: Keypair
): Promise<string> {
  log('🏗️ Setting up associated token accounts for buy...');

  // Setup user ATA
  debugLog('👤 Setting up user associated token account...');
  const userAtaResult = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    wallet.publicKey,
    mint
  );

  if (!userAtaResult.success) {
    throw new Error(`Failed to create user ATA: ${userAtaResult.error}`);
  }
  debugLog(`✅ User ATA ready: ${userAtaResult.account.toString()}`);

  // Setup bonding curve ATA
  const [bondingCurve] = deriveBondingCurveAddress(mint);
  debugLog(`📈 Derived bonding curve: ${bondingCurve.toString()}`);

  debugLog('🔗 Setting up bonding curve associated token account...');
  const bondingCurveAtaResult = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    bondingCurve,
    mint,
    true // allowOwnerOffCurve
  );

  if (!bondingCurveAtaResult.success) {
    throw new Error(`Failed to create bonding curve ATA: ${bondingCurveAtaResult.error}`);
  }
  debugLog(`✅ Bonding curve ATA ready: ${bondingCurveAtaResult.account.toString()}`);

  // Create complete buy transaction
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    debugLog(`📡 Creating complete buy transaction (attempt ${attempts}/${maxAttempts})...`);

    try {
      // Setup the buy operation (get PDAs and ensure ATAs exist)
      const setupResult = await setupBuyOperation(connection, wallet, mint, feePayer);
      if (!setupResult.success) {
        throw new Error(`Setup failed: ${setupResult.error}`);
      }

      const buyInstruction = await createCompleteBuyInstruction(
        PUMP_PROGRAM_ID,
        wallet.publicKey,
        mint,
        new BN(solAmount * 1e9), // Convert SOL to lamports
        slippageBasisPoints,
        setupResult.pdas!,
        setupResult.associatedBondingCurve!,
        setupResult.associatedUser!
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
  blockhash?: string
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    debugLog(`🔧 Creating signed buy transaction for ${solAmount} SOL`);
    debugLog(`🎯 Target mint: ${mint.toString()}`);
    debugLog(`📊 Slippage: ${slippageBasisPoints} basis points`);

    // Setup the buy operation (get PDAs and ensure ATAs exist)
    const setupResult = await setupBuyOperation(connection, wallet, mint, feePayer);
    if (!setupResult.success) {
      throw new Error(`Setup failed: ${setupResult.error}`);
    }

    // Create complete buy instruction
    debugLog('📝 Creating complete buy instruction...');
    const buyInstruction = await createCompleteBuyInstruction(
      PUMP_PROGRAM_ID,
      wallet.publicKey,
      mint,
      new BN(solAmount * 1e9), // Convert SOL to lamports
      slippageBasisPoints,
      setupResult.pdas!,
      setupResult.associatedBondingCurve!,
      setupResult.associatedUser!
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
