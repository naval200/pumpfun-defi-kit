import { Connection, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { createBondingCurveBuyInstruction } from './idl/instructions';
import { 
  deriveBondingCurveAddress, 
  deriveCreatorVaultAddress,
  deriveGlobalVolumeAccumulatorAddress,
  getUserVolumeAccumulator,
  getGlobalPDA
} from './bc-helper';
import { log, logSuccess, logError } from '../utils/debug';

/**
 * Simplified wrapper for creating bonding curve buy instructions
 * Automatically calculates all required PDAs internally
 * 
 * This function provides a clean interface for creating buy instructions
 * without manually calculating all the required Program Derived Addresses (PDAs).
 * 
 * @param connection - Solana connection instance
 * @param buyerKeypair - Keypair of the buyer
 * @param mint - PublicKey of the token mint
 * @param amountLamports - Amount of SOL to spend (in lamports)
 * @param slippageBasisPoints - Slippage tolerance in basis points (default: 1000 = 10%)
 * @param creator - Optional creator PublicKey (defaults to buyer if not provided)
 * @returns Promise<TransactionInstruction> - The buy instruction ready to be added to a transaction
 * 
 * @example
 * ```typescript
 * // Simple usage - no need to calculate PDAs manually!
 * const buyInstruction = await createSimpleBuyInstruction(
 *   connection,
 *   buyerKeypair,
 *   mint,
 *   0.1e9, // 0.1 SOL
 *   1000,  // 10% slippage
 *   creator // Optional creator
 * );
 * 
 * // Add to transaction
 * const transaction = new Transaction().add(buyInstruction);
 * ```
 */
export async function createSimpleBuyInstruction(
  connection: Connection,
  buyerKeypair: Keypair,
  mint: PublicKey,
  amountLamports: number,
  slippageBasisPoints: number = 1000,
  creator?: PublicKey // Optional creator, defaults to buyer if not provided
): Promise<TransactionInstruction> {
  log(`💰 Creating buy instruction for ${amountLamports / 1e9} SOL`);
  log(`🎯 Mint: ${mint.toString()}`);
  log(`👤 Buyer: ${buyerKeypair.publicKey.toString()}`);
  
  try {
    const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
    const EVENT_AUTHORITY_SEED = Buffer.from('__event_authority');
    
    // Use provided creator or default to buyer
    const creatorPubkey = creator || buyerKeypair.publicKey;
    
    // Calculate all required PDAs automatically
    log('🔍 Calculating PDAs...');
    
    const globalPDA = getGlobalPDA(PUMP_PROGRAM_ID);
    const [bondingCurvePDA] = deriveBondingCurveAddress(mint);
    const [creatorVaultPDA] = deriveCreatorVaultAddress(creatorPubkey);
    const [eventAuthorityPDA] = PublicKey.findProgramAddressSync([EVENT_AUTHORITY_SEED], PUMP_PROGRAM_ID);
    const [globalVolumeAccumulatorPDA] = deriveGlobalVolumeAccumulatorAddress();
    const userVolumeAccumulatorPDA = getUserVolumeAccumulator(PUMP_PROGRAM_ID, buyerKeypair.publicKey);
    
    // Create PDAs object with correct property names
    const pdas = {
      globalPDA: globalPDA,
      bondingCurvePDA: bondingCurvePDA,
      creatorVaultPDA: creatorVaultPDA,
      eventAuthorityPDA: eventAuthorityPDA,
      globalVolumeAccumulatorPDA: globalVolumeAccumulatorPDA,
      userVolumeAccumulatorPDA: userVolumeAccumulatorPDA,
    };
    
    log('✅ All PDAs calculated successfully');
    
    // Create the buy instruction using the existing function
    const buyInstruction = createBondingCurveBuyInstruction(
      buyerKeypair.publicKey,
      mint,
      amountLamports,
      pdas,
      slippageBasisPoints
    );
    
    logSuccess('✅ Buy instruction created successfully');
    return buyInstruction;
    
  } catch (error) {
    logError('❌ Failed to create buy instruction:', error);
    throw error;
  }
}
