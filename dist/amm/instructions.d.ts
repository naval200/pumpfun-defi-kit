import { TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { AmmSwapState } from '../@types';
export declare function createAmmBuyInstructionsAssuming(pumpAmmSdk: PumpAmmSdk, swapSolanaState: AmmSwapState, quoteAmountLamports: number | BN, slippage?: number): Promise<TransactionInstruction[]>;
export declare function createAmmSellInstructionsAssuming(pumpAmmSdk: PumpAmmSdk, swapSolanaState: AmmSwapState, baseAmount: number | BN, slippage?: number): Promise<TransactionInstruction[]>;
//# sourceMappingURL=instructions.d.ts.map