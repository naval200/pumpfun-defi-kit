import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import {
  BUY_INSTRUCTION_DISCRIMINATOR,
  SELL_INSTRUCTION_DISCRIMINATOR,
  PUMP_PROGRAM_ID,
  FEE_RECIPIENT,
  TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
} from './constants';
import { getAllRequiredPDAsForBuy } from './bc-helper';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

/**
 * Create Pump program BUY instruction assuming all accounts exist
 * - No RPC calls
 * - Derives PDAs and ATAs deterministically
 * - Caller provides amounts/slippage
 */
export function createBondingCurveBuyInstructionAssuming(
  buyer: PublicKey,
  mint: PublicKey,
  solAmountLamports: number | BN,
  maxSlippageBasisPoints: number = 1000
): TransactionInstruction {
  const solAmount = BN.isBN(solAmountLamports)
    ? (solAmountLamports as BN)
    : new BN(solAmountLamports);

  // Resolve PDAs deterministically
  const pdas = getAllRequiredPDAsForBuy(PUMP_PROGRAM_ID, mint, buyer);

  // Resolve associated accounts deterministically
  const associatedBondingCurve = getAssociatedTokenAddressSync(mint, pdas.bondingCurvePDA, true);
  const associatedUser = getAssociatedTokenAddressSync(mint, buyer, false);

  // Arguments
  const expectedTokenAmount = new BN(100000000); // placeholder conservative amount
  const maxSolCost = solAmount.mul(new BN(10000 + maxSlippageBasisPoints)).div(new BN(10000));
  const trackVolume = true;

  // Serialize data: [discriminator(8)] [expected_token_amount u64] [max_sol_cost u64] [track_volume u8]
  const data = Buffer.alloc(8 + 8 + 8 + 1);
  let offset = 0;
  data.set(BUY_INSTRUCTION_DISCRIMINATOR, offset);
  offset += 8;
  expectedTokenAmount.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  offset += 8;
  maxSolCost.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  offset += 8;
  data.writeUInt8(trackVolume ? 1 : 0, offset);

  // Keys match BUY IDL
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
    ],
    programId: PUMP_PROGRAM_ID,
    data,
  });
}

/**
 * Create Pump program SELL instruction assuming all accounts exist
 * - No RPC calls
 * - Caller must provide min expected SOL output (lamports)
 */
export function createBondingCurveSellInstructionAssuming(
  seller: PublicKey,
  mint: PublicKey,
  tokenAmount: number | BN,
  minSolOutputLamports: number | BN
): TransactionInstruction {
  const amount = BN.isBN(tokenAmount) ? (tokenAmount as BN) : new BN(tokenAmount);
  const minSol = BN.isBN(minSolOutputLamports)
    ? (minSolOutputLamports as BN)
    : new BN(minSolOutputLamports);

  // Resolve PDAs deterministically
  const { globalPDA, bondingCurvePDA, creatorVaultPDA, eventAuthorityPDA } =
    getAllRequiredPDAsForBuy(PUMP_PROGRAM_ID, mint, seller);

  // Resolve associated accounts deterministically
  const associatedBondingCurve = getAssociatedTokenAddressSync(mint, bondingCurvePDA, true);
  const associatedUser = getAssociatedTokenAddressSync(mint, seller, false);

  // Serialize data: [discriminator(8)] [amount u64] [min_sol_output u64]
  const data = Buffer.alloc(8 + 8 + 8);
  let offset = 0;
  data.set(SELL_INSTRUCTION_DISCRIMINATOR, offset);
  offset += 8;
  amount.toArrayLike(Buffer, 'le', 8).copy(data, offset);
  offset += 8;
  minSol.toArrayLike(Buffer, 'le', 8).copy(data, offset);

  // Keys match SELL IDL
  return new TransactionInstruction({
    keys: [
      { pubkey: globalPDA, isSigner: false, isWritable: false },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurvePDA, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: creatorVaultPDA, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: eventAuthorityPDA, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PUMP_PROGRAM_ID,
    data,
  });
}
