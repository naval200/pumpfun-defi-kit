import { TransactionInstruction } from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import BN from 'bn.js';

import { AmmSwapState } from '../@types';

export async function createAmmBuyInstructionsAssuming(
  pumpAmmSdk: PumpAmmSdk,
  swapSolanaState: AmmSwapState,
  quoteAmount: number,
  slippage: number = 1
): Promise<TransactionInstruction[]> {
  return await pumpAmmSdk.buyQuoteInput(swapSolanaState, new BN(quoteAmount), slippage);
}

export async function createAmmSellInstructionsAssuming(
  pumpAmmSdk: PumpAmmSdk,
  swapSolanaState: AmmSwapState,
  baseAmount: number,
  slippage: number = 1
): Promise<TransactionInstruction[]> {
  return await pumpAmmSdk.sellBaseInput(swapSolanaState, new BN(baseAmount), slippage);
}
