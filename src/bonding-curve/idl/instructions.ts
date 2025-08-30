import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import {
  PUMP_PROGRAM_ID,
  FEE_RECIPIENT,
  TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  BUY_INSTRUCTION_DISCRIMINATOR,
  SELL_INSTRUCTION_DISCRIMINATOR,
  FEE_PROGRAM_ID,
  FEE_CONFIG_SEED,
  FEE_CONFIG_PDA_SECOND_SEED,
} from './constants';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Derive fee config PDA dynamically from IDL seeds
 * This matches the exact derivation logic from the IDL
 */
export function deriveFeeConfigPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      FEE_CONFIG_SEED,
      Buffer.from(FEE_CONFIG_PDA_SECOND_SEED)
    ],
    FEE_PROGRAM_ID  // IDL shows fee_config is derived from fee_program
  );
  
  console.log(`🔧 Fee Config PDA Debug:`);
  console.log(`   Derived from: ${FEE_PROGRAM_ID.toString()}`);
  console.log(`   Account: ${pda.toString()}`);
  console.log(`   Seeds: [${FEE_CONFIG_SEED.toString()}, ${Buffer.from(FEE_CONFIG_PDA_SECOND_SEED).toString('hex')}]`);
  
  return pda;
}

// ============================================================================
// SIMPLE INSTRUCTION CREATION
// ============================================================================

/**
 * Create Pump program BUY instruction with pre-resolved PDAs
 */
export function createBondingCurveBuyInstruction(
  buyer: PublicKey,
  mint: PublicKey,
  solAmountLamports: number | BN,
  pdas: {
    globalPDA: PublicKey;
    bondingCurvePDA: PublicKey;
    creatorVaultPDA: PublicKey;
    eventAuthorityPDA: PublicKey;
    globalVolumeAccumulatorPDA: PublicKey;
    userVolumeAccumulatorPDA: PublicKey;
  },
  maxSlippageBasisPoints: number = 1000
): TransactionInstruction {
  const solAmount = BN.isBN(solAmountLamports) ? solAmountLamports : new BN(solAmountLamports);
  const associatedBondingCurve = getAssociatedTokenAddressSync(mint, pdas.bondingCurvePDA, true);
  const associatedUser = getAssociatedTokenAddressSync(mint, buyer, false);
  const feeConfigPDA = deriveFeeConfigPDA();

  const expectedTokenAmount = new BN(100000000);
  const maxSolCost = solAmount.mul(new BN(10000 + maxSlippageBasisPoints)).div(new BN(10000));
  const trackVolume = true;

  const data = Buffer.alloc(8 + 8 + 8 + 1);
  let offset = 0;
  data.set(BUY_INSTRUCTION_DISCRIMINATOR, offset);
  offset += 8;
  expectedTokenAmount.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  offset += 8;
  maxSolCost.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  offset += 8;
  data.writeUInt8(trackVolume ? 1 : 0, offset);

  return new TransactionInstruction({
    keys: [
      { pubkey: pdas.globalPDA, isSigner: false, isWritable: true },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: pdas.bondingCurvePDA, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: pdas.creatorVaultPDA, isSigner: false, isWritable: true },
      { pubkey: pdas.eventAuthorityPDA, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: pdas.globalVolumeAccumulatorPDA, isSigner: false, isWritable: true },
      { pubkey: pdas.userVolumeAccumulatorPDA, isSigner: false, isWritable: true },
      { pubkey: feeConfigPDA, isSigner: false, isWritable: false },
      { pubkey: FEE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PUMP_PROGRAM_ID,
    data,
  });
}

/**
 * Create Pump program SELL instruction with pre-resolved PDAs
 */
export function createBondingCurveSellInstruction(
  seller: PublicKey,
  mint: PublicKey,
  tokenAmount: number | BN,
  minSolOutputLamports: number | BN,
  pdas: {
    globalPDA: PublicKey;
    bondingCurvePDA: PublicKey;
    creatorVaultPDA: PublicKey;
    eventAuthorityPDA: PublicKey;
    globalVolumeAccumulatorPDA: PublicKey;
    userVolumeAccumulatorPDA: PublicKey;
  }
): TransactionInstruction {
  const amount = BN.isBN(tokenAmount) ? tokenAmount : new BN(tokenAmount);
  const minSol = BN.isBN(minSolOutputLamports) ? minSolOutputLamports : new BN(minSolOutputLamports);
  const associatedBondingCurve = getAssociatedTokenAddressSync(mint, pdas.bondingCurvePDA, true);
  const associatedUser = getAssociatedTokenAddressSync(mint, seller, false);
  const feeConfigPDA = deriveFeeConfigPDA();

  const data = Buffer.alloc(8 + 8 + 8);
  let offset = 0;
  data.set(SELL_INSTRUCTION_DISCRIMINATOR, offset);
  offset += 8;
  amount.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  offset += 8;
  minSol.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  
  console.log(`🔧 SELL Instruction Debug:`);
  console.log(`   Amount: ${amount.toString()} (${amount.toArrayLike(Buffer, 'le', 8).toString('hex')})`);
  console.log(`   MinSol: ${minSol.toString()} (${minSol.toArrayLike(Buffer, 'le', 8).toString('hex')})`);
  console.log(`   Data: ${data.toString('hex')}`);

  return new TransactionInstruction({
    keys: [
      { pubkey: pdas.globalPDA, isSigner: false, isWritable: true },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: pdas.bondingCurvePDA, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: pdas.creatorVaultPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: pdas.eventAuthorityPDA, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: feeConfigPDA, isSigner: false, isWritable: false },
      { pubkey: FEE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PUMP_PROGRAM_ID,
    data,
  });
}
