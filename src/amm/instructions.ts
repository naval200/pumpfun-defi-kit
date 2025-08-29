import { TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';

import { AmmSwapState } from '../@types';

export async function createAmmBuyInstructionsAssuming(
  pumpAmmSdk: PumpAmmSdk,
  swapSolanaState: AmmSwapState,
  quoteAmountLamports: number | BN,
  slippage: number = 1
): Promise<TransactionInstruction[]> {
  const quoteAmount = BN.isBN(quoteAmountLamports)
    ? (quoteAmountLamports as BN)
    : new BN(quoteAmountLamports);
  return await pumpAmmSdk.buyQuoteInput(swapSolanaState, quoteAmount, slippage);
}

export async function createAmmSellInstructionsAssuming(
  pumpAmmSdk: PumpAmmSdk,
  swapSolanaState: AmmSwapState,
  baseAmount: number | BN,
  slippage: number = 1
): Promise<TransactionInstruction[]> {
  const base = BN.isBN(baseAmount) ? (baseAmount as BN) : new BN(baseAmount);
  return await pumpAmmSdk.sellBaseInput(swapSolanaState, base, slippage);
}
