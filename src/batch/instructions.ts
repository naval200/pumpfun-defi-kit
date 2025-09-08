import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { PumpAmmSdk } from '@pump-fun/pump-swap-sdk';

import { debugLog } from '../utils/debug';
import {
  chunkArray,
  determineOptimalBatchSize,
  buildInstructionsForOperation,
} from './batch-helper';
import type { BatchOperation, BatchExecutionOptions } from '../@types';

/**
 * Result of instruction creation for a batch
 */
export interface BatchInstructionResult {
  transaction: Transaction;
  blockhash: string;
  lastValidBlockHeight: number;
  signers: Keypair[];
  feePayer: PublicKey;
  operationCount: number;
  instructionCount: number;
  uniqueSendersCount: number;
}

/**
 * Create instructions and prepare transaction for a batch of operations
 *
 * This function handles the instruction creation part of batch transactions:
 * - Collects all unique senders
 * - Builds instructions for all operations
 * - Creates a single transaction with all instructions
 * - Returns transaction details needed for signing and execution
 */
export async function createBatchInstructions(
  connection: Connection,
  operations: BatchOperation[],
  feePayer?: Keypair,
  options: BatchExecutionOptions = {}
): Promise<BatchInstructionResult[]> {
  const { maxParallel = 3, dynamicBatching = false } = options;

  debugLog(`🔧 Creating instructions for ${operations.length} PumpFun operations`);

  // Determine optimal batch size if dynamic batching is enabled
  let actualMaxParallel = maxParallel;
  if (dynamicBatching && operations.length > 0) {
    const { maxOpsPerBatch, reasoning } = await determineOptimalBatchSize(
      connection,
      operations,
      feePayer
    );
    actualMaxParallel = Math.min(maxOpsPerBatch, maxParallel);
    debugLog(`🧠 Dynamic batching: ${reasoning}`);
    debugLog(`📏 Using batch size: ${actualMaxParallel} operations per batch`);
  }

  // Split operations into batches
  const batches = chunkArray(operations, actualMaxParallel);
  const results: BatchInstructionResult[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    
    try {

    const ammSdk = new PumpAmmSdk(connection);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // Collect all unique senders and build all instructions
    const uniqueSenders = new Map<string, Keypair>();
    const allInstructions: TransactionInstruction[] = [];

    // Process all operations in the batch
    for (const op of batch) {
      let senderKeypair: Keypair;

      if (op.sender) {
        if (typeof op.sender === 'object' && 'publicKey' in op.sender) {
          senderKeypair = op.sender;
        } else {
          throw new Error('BatchOperation.sender must be a Keypair when provided');
        }
      } else {
        throw new Error(`Operation ${op.id} is missing sender Keypair`);
      }

      const senderPubkeyStr = senderKeypair.publicKey.toString();

      // Track unique senders
      if (!uniqueSenders.has(senderPubkeyStr)) {
        uniqueSenders.set(senderPubkeyStr, senderKeypair);
      }

      // Build instructions for this operation
      const instructions = await buildInstructionsForOperation(
        connection,
        ammSdk,
        op,
        senderKeypair,
        feePayer
      );
      allInstructions.push(...instructions);
    }

    // Create single transaction with all operations
    const tx = new Transaction();
    allInstructions.forEach(ix => tx.add(ix));
    tx.recentBlockhash = blockhash;

    // Set fee payer
    let finalFeePayer: PublicKey;
    if (feePayer) {
      tx.feePayer = feePayer.publicKey;
      finalFeePayer = feePayer.publicKey;
    } else {
      // If no fee payer, use the first sender as fee payer
      const firstSender = uniqueSenders.values().next().value;
      if (!firstSender) {
        throw new Error('No senders found in batch operations');
      }
      tx.feePayer = firstSender.publicKey;
      finalFeePayer = firstSender.publicKey;
    }

    // Prepare signers array
    const signersInOrder: Keypair[] = [];
    uniqueSenders.forEach((sender, pubkey) => {
      debugLog(`  • Will sign with: ${pubkey}`);
      signersInOrder.push(sender);
    });
    if (feePayer) {
      debugLog(`💸 Will sign with fee payer: ${feePayer.publicKey.toString()}`);
      // Check if fee payer is already in the signers list
      const feePayerAlreadyInSigners = signersInOrder.some(s => s.publicKey.equals(feePayer.publicKey));
      if (!feePayerAlreadyInSigners) {
        signersInOrder.push(feePayer);
      } else {
        debugLog(`  ℹ️  Fee payer already in signers list, not adding duplicate`);
      }
    }

    debugLog(`🔐 All ${uniqueSenders.size} unique senders will sign the combined transaction`);
    debugLog(`📋 Instructions in transaction: ${allInstructions.length}`);
    allInstructions.forEach((ix, index) => {
      debugLog(`  📝 Instruction ${index + 1}: Program ${ix.programId.toString()}`);
      debugLog(`    Keys: ${ix.keys.length} accounts`);
      ix.keys.forEach((key, keyIndex) => {
        debugLog(
          `      ${keyIndex}: ${key.pubkey.toString()} (${key.isSigner ? 'SIGNER' : 'READONLY'})`
        );
      });
    });

    debugLog(`💰 Fee payer: ${finalFeePayer.toString()}`);
    
    // Note: We don't serialize the transaction here because it hasn't been signed yet
    // Serialization will happen in the execution phase after signing


    // Log essential transaction info for debugging
    debugLog(`🔍 Batch ${batchIndex + 1}: ${allInstructions.length} instructions, ${signersInOrder.length} signers`);

    results.push({
      transaction: tx,
      blockhash,
      lastValidBlockHeight,
      signers: signersInOrder,
      feePayer: finalFeePayer,
      operationCount: batch.length,
      instructionCount: allInstructions.length,
      uniqueSendersCount: uniqueSenders.size,
    });
    
    } catch (batchError) {
      debugLog(`❌ Error creating batch ${batchIndex + 1}:`, batchError);
      throw new Error(`Failed to create batch ${batchIndex + 1}: ${batchError}`);
    }
  }


  return results;
}
