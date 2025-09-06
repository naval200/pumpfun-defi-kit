import { Connection, PublicKey, Keypair, TransactionInstruction } from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';
import { createTokenTransferInstruction } from '../sendToken';
import { createSendSolInstruction } from '../sendSol';
import {
  getBondingCurvePDAs,
  createBondingCurveBuyInstruction,
  createBondingCurveSellInstruction,
} from '../bonding-curve';
import { createAmmBuyInstructionsAssuming, createAmmSellInstructionsAssuming } from '../amm';
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAccountAddress } from '../createAccount';
import { minSolLamports } from '../utils/amounts';
import { debugLog } from '../utils/debug';
import type { BatchOperation } from '../@types';

/**
 * Build instructions for a single batch operation
 */
export async function buildInstructionsForOperation(
  connection: Connection,
  ammSdk: PumpAmmSdk,
  operation: BatchOperation,
  senderKeypair: Keypair,
  feePayer?: Keypair
): Promise<TransactionInstruction[]> {
  const instructions: TransactionInstruction[] = [];

  switch (operation.type) {
    case 'transfer': {
      const { recipient, mint, amount, createAccount = false } = operation.params;

      // If createAccount is true, add the ATA creation instruction first
      if (createAccount) {
        const { instruction: createAtaIx } = createAssociatedTokenAccountInstruction(
          feePayer?.publicKey || senderKeypair.publicKey, // payer
          new PublicKey(recipient), // owner
          new PublicKey(mint), // mint
          false // allowOwnerOffCurve
        );
        instructions.push(createAtaIx);
        debugLog(`🏗️ Added ATA creation instruction for transfer operation ${operation.id}`);
      }

      const ix = createTokenTransferInstruction(
        senderKeypair.publicKey,
        new PublicKey(recipient),
        new PublicKey(mint),
        amount,
        false // allowOwnerOffCurve
      );
      instructions.push(ix);
      break;
    }
    case 'sol-transfer': {
      const { recipient, amount } = operation.params;
      const ix = createSendSolInstruction(
        senderKeypair,
        new PublicKey(recipient),
        amount,
        feePayer?.publicKey
      );
      instructions.push(ix);
      break;
    }
    case 'buy-bonding-curve': {
      const { mint, amount, createAccount = false } = operation.params;

      // If createAccount is true, add the ATA creation instruction first
      if (createAccount) {
        const { instruction: createAtaIx } = createAssociatedTokenAccountInstruction(
          feePayer?.publicKey || senderKeypair.publicKey, // payer
          senderKeypair.publicKey, // owner (buyer)
          new PublicKey(mint), // mint
          false // allowOwnerOffCurve
        );
        instructions.push(createAtaIx);
        debugLog(
          `🏗️ Added ATA creation instruction for bonding curve buy operation ${operation.id}`
        );
      }

      const pdas = await getBondingCurvePDAs(
        connection,
        new PublicKey(mint),
        senderKeypair.publicKey
      );
      const ix = createBondingCurveBuyInstruction(
        senderKeypair.publicKey,
        new PublicKey(mint),
        amount,
        pdas,
        1000
      );
      instructions.push(ix);
      break;
    }
    case 'sell-bonding-curve': {
      const { mint, amount } = operation.params;
      const pdas = await getBondingCurvePDAs(
        connection,
        new PublicKey(mint),
        senderKeypair.publicKey
      );
      const minSolOutput = minSolLamports();
      const ix = createBondingCurveSellInstruction(
        senderKeypair.publicKey,
        new PublicKey(mint),
        amount,
        minSolOutput,
        pdas
      );
      instructions.push(ix);
      break;
    }
    case 'buy-amm': {
      const { poolKey, amount, slippage = 1, createAccount = false, tokenMint } = operation.params;

      // Get pool information to determine base and quote mints
      const pool = await ammSdk.fetchPool(new PublicKey(poolKey));
      const baseMint = pool.baseMint;
      const quoteMint = pool.quoteMint; // This should be SOL
      
      // Get the user's token accounts
      const userBaseTokenAccount = getAssociatedTokenAccountAddress(
        senderKeypair.publicKey,
        baseMint,
        false
      );
      
      // For SOL, use the wallet's main account (no separate token account needed)
      const userQuoteTokenAccount = senderKeypair.publicKey;

      // If createAccount is true, we need the tokenMint parameter
      if (createAccount) {
        if (!tokenMint) {
          throw new Error(
            `tokenMint is required when createAccount is true for AMM buy operation ${operation.id}`
          );
        }
        const { instruction: createAtaIx } = createAssociatedTokenAccountInstruction(
          feePayer?.publicKey || senderKeypair.publicKey, // payer
          senderKeypair.publicKey, // owner (buyer)
          new PublicKey(tokenMint), // mint from params
          false // allowOwnerOffCurve
        );
        instructions.push(createAtaIx);
        debugLog(`🏗️ Added ATA creation instruction for AMM buy operation ${operation.id}`);
      }

      debugLog(`🔍 Using explicit token accounts for buy-amm:`);
      debugLog(`   Base token account: ${userBaseTokenAccount.toString()}`);
      debugLog(`   Quote token account (SOL): ${userQuoteTokenAccount.toString()}`);

      // For buy-amm operations, we need to pass the HUE token account but NOT the SOL token account
      // SOL is native currency and doesn't need a token account
      const state = await ammSdk.swapSolanaState(
        new PublicKey(poolKey), 
        senderKeypair.publicKey,
        userBaseTokenAccount,  // HUE token account
        undefined              // No SOL token account needed
      );
      const ixs = await createAmmBuyInstructionsAssuming(ammSdk, state, amount, slippage);
      instructions.push(...ixs);
      break;
    }
    case 'sell-amm': {
      const { poolKey, amount, slippage = 1 } = operation.params;
      
      // Get pool information to determine base and quote mints
      const pool = await ammSdk.fetchPool(new PublicKey(poolKey));
      const baseMint = pool.baseMint;
      
      // Get the user's token accounts
      const userBaseTokenAccount = getAssociatedTokenAccountAddress(
        senderKeypair.publicKey,
        baseMint,
        false
      );
      
      // For SOL, use the wallet's main account (no separate token account needed)
      const userQuoteTokenAccount = senderKeypair.publicKey;
      
      debugLog(`🔍 Using explicit token accounts for sell-amm:`);
      debugLog(`   Base token account: ${userBaseTokenAccount.toString()}`);
      debugLog(`   Quote token account (SOL): ${userQuoteTokenAccount.toString()}`);
      
      // For sell-amm operations, we need to pass the HUE token account but NOT the SOL token account
      // SOL is native currency and doesn't need a token account
      const state = await ammSdk.swapSolanaState(
        new PublicKey(poolKey), 
        senderKeypair.publicKey,
        userBaseTokenAccount,  // HUE token account
        undefined              // No SOL token account needed
      );
      const ixs = await createAmmSellInstructionsAssuming(ammSdk, state, amount, slippage);
      instructions.push(...ixs);
      break;
    }
    default: {
      throw new Error(`Unknown operation type: ${(operation as BatchOperation).type}`);
    }
  }

  return instructions;
}

/**
 * Solana transaction limits
 */
const SOLANA_TRANSACTION_SIZE_LIMIT = 1232; // bytes
const SOLANA_MAX_ACCOUNTS_PER_TX = 64;

// Single-purpose helper used by batchTransactions
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (!Array.isArray(items)) {
    return [];
  }
  if (chunkSize <= 0) {
    return [items];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Estimate transaction size and validate against Solana limits
 */
export function estimateTransactionLimits(
  instructions: TransactionInstruction[],
  signers: Keypair[]
): {
  canFit: boolean;
  estimatedSize: number;
  accountCount: number;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Count unique accounts across all instructions
  const uniqueAccounts = new Set<string>();

  // Add signers
  signers.forEach(signer => uniqueAccounts.add(signer.publicKey.toString()));

  // Add accounts from instructions
  instructions.forEach(ix => {
    ix.keys.forEach(key => uniqueAccounts.add(key.pubkey.toString()));
    uniqueAccounts.add(ix.programId.toString());
  });

  const accountCount = uniqueAccounts.size;

  // Rough transaction size estimation
  const signatureSize = signers.length * 64; // 64 bytes per signature
  const accountKeysSize = accountCount * 32; // 32 bytes per account
  const instructionDataSize = instructions.reduce((total, ix) => {
    return total + ix.data.length + 4; // instruction data + overhead
  }, 0);
  const instructionAccountsSize = instructions.reduce((total, ix) => {
    return total + ix.keys.length * 1; // 1 byte per account index
  }, 0);

  const estimatedSize =
    signatureSize + accountKeysSize + instructionDataSize + instructionAccountsSize + 100; // +100 for overhead

  // Check limits
  let canFit = true;

  if (estimatedSize > SOLANA_TRANSACTION_SIZE_LIMIT) {
    canFit = false;
    reasons.push(
      `Estimated size ${estimatedSize} bytes exceeds limit ${SOLANA_TRANSACTION_SIZE_LIMIT} bytes`
    );
  }

  if (accountCount > SOLANA_MAX_ACCOUNTS_PER_TX) {
    canFit = false;
    reasons.push(`Account count ${accountCount} exceeds limit ${SOLANA_MAX_ACCOUNTS_PER_TX}`);
  }

  return {
    canFit,
    estimatedSize,
    accountCount,
    reasons,
  };
}

/**
 * Dynamically determine optimal batch size for operations
 */
export async function determineOptimalBatchSize(
  connection: Connection,
  operations: BatchOperation[],
  feePayer?: Keypair
): Promise<{
  maxOpsPerBatch: number;
  reasoning: string;
}> {
  if (operations.length === 0) {
    return { maxOpsPerBatch: 0, reasoning: 'No operations provided' };
  }

  const ammSdk = new PumpAmmSdk(connection);
  let maxSafeOps = 1;
  let lastSuccessfulSize = 0;

  // Test increasing batch sizes until we hit a limit
  for (let testSize = 1; testSize <= Math.min(operations.length, 20); testSize++) {
    const testOps = operations.slice(0, testSize);
    const instructions: TransactionInstruction[] = [];
    const signers = new Set<string>();

    try {
      // Add fee payer if provided
      if (feePayer) {
        signers.add(feePayer.publicKey.toString());
      }

      // Build instructions for test batch
      for (const op of testOps) {
        if (!op.sender) {
          throw new Error(`Operation ${op.id} is missing sender Keypair for sizing`);
        }
        const senderKeypair = op.sender as Keypair;

        signers.add(senderKeypair.publicKey.toString());

        // Use the helper function to build instructions
        const opInstructions = await buildInstructionsForOperation(
          connection,
          ammSdk,
          op,
          senderKeypair,
          feePayer
        );
        instructions.push(...opInstructions);
      }

      // Check if this batch size fits within limits
      const signersArray = Array.from(signers).map(
        s => ({ publicKey: new PublicKey(s) }) as Keypair
      );
      const limits = estimateTransactionLimits(instructions, signersArray);

      if (limits.canFit) {
        maxSafeOps = testSize;
        lastSuccessfulSize = limits.estimatedSize;
      } else {
        // Hit a limit, stop testing
        break;
      }
    } catch (error) {
      // Error building instructions, stop testing
      debugLog(`Error testing batch size ${testSize}: ${error}`);
      break;
    }
  }

  const reasoning = `Determined max ${maxSafeOps} operations per batch (last successful size: ${lastSuccessfulSize} bytes)`;
  return { maxOpsPerBatch: maxSafeOps, reasoning };
}
