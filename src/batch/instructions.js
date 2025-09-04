"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBatchInstructions = createBatchInstructions;
const web3_js_1 = require("@solana/web3.js");
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
const batch_helper_1 = require("./batch-helper");
/**
 * Create instructions and prepare transaction for a batch of operations
 *
 * This function handles the instruction creation part of batch transactions:
 * - Collects all unique senders
 * - Builds instructions for all operations
 * - Creates a single transaction with all instructions
 * - Returns transaction details needed for signing and execution
 */
async function createBatchInstructions(connection, operations, feePayer, options = {}) {
    const { maxParallel = 3, dynamicBatching = false } = options;
    (0, debug_1.debugLog)(`🔧 Creating instructions for ${operations.length} PumpFun operations`);
    // Determine optimal batch size if dynamic batching is enabled
    let actualMaxParallel = maxParallel;
    if (dynamicBatching && operations.length > 0) {
        const { maxOpsPerBatch, reasoning } = await (0, batch_helper_1.determineOptimalBatchSize)(connection, operations, feePayer);
        actualMaxParallel = Math.min(maxOpsPerBatch, maxParallel);
        (0, debug_1.debugLog)(`🧠 Dynamic batching: ${reasoning}`);
        (0, debug_1.debugLog)(`📏 Using batch size: ${actualMaxParallel} operations per batch`);
    }
    // Split operations into batches
    const batches = (0, batch_helper_1.chunkArray)(operations, actualMaxParallel);
    const results = [];
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        try {
            const ammSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            // Collect all unique senders and build all instructions
            const uniqueSenders = new Map();
            const allInstructions = [];
            // Process all operations in the batch
            for (const op of batch) {
                let senderKeypair;
                if (op.sender) {
                    if (typeof op.sender === 'object' && 'publicKey' in op.sender) {
                        senderKeypair = op.sender;
                    }
                    else {
                        throw new Error('BatchOperation.sender must be a Keypair when provided');
                    }
                }
                else {
                    throw new Error(`Operation ${op.id} is missing sender Keypair`);
                }
                const senderPubkeyStr = senderKeypair.publicKey.toString();
                // Track unique senders
                if (!uniqueSenders.has(senderPubkeyStr)) {
                    uniqueSenders.set(senderPubkeyStr, senderKeypair);
                }
                // Build instructions for this operation
                const instructions = await (0, batch_helper_1.buildInstructionsForOperation)(connection, ammSdk, op, senderKeypair, feePayer);
                allInstructions.push(...instructions);
            }
            // Create single transaction with all operations
            const tx = new web3_js_1.Transaction();
            allInstructions.forEach(ix => tx.add(ix));
            tx.recentBlockhash = blockhash;
            // Set fee payer
            let finalFeePayer;
            if (feePayer) {
                tx.feePayer = feePayer.publicKey;
                finalFeePayer = feePayer.publicKey;
            }
            else {
                // If no fee payer, use the first sender as fee payer
                const firstSender = uniqueSenders.values().next().value;
                if (!firstSender) {
                    throw new Error('No senders found in batch operations');
                }
                tx.feePayer = firstSender.publicKey;
                finalFeePayer = firstSender.publicKey;
            }
            // Prepare signers array
            const signersInOrder = [];
            uniqueSenders.forEach((sender, pubkey) => {
                (0, debug_1.debugLog)(`  • Will sign with: ${pubkey}`);
                signersInOrder.push(sender);
            });
            if (feePayer) {
                (0, debug_1.debugLog)(`💸 Will sign with fee payer: ${feePayer.publicKey.toString()}`);
                // Check if fee payer is already in the signers list
                const feePayerAlreadyInSigners = signersInOrder.some(s => s.publicKey.equals(feePayer.publicKey));
                if (!feePayerAlreadyInSigners) {
                    signersInOrder.push(feePayer);
                }
                else {
                    (0, debug_1.debugLog)(`  ℹ️  Fee payer already in signers list, not adding duplicate`);
                }
            }
            (0, debug_1.debugLog)(`🔐 All ${uniqueSenders.size} unique senders will sign the combined transaction`);
            (0, debug_1.debugLog)(`📋 Instructions in transaction: ${allInstructions.length}`);
            allInstructions.forEach((ix, index) => {
                (0, debug_1.debugLog)(`  📝 Instruction ${index + 1}: Program ${ix.programId.toString()}`);
                (0, debug_1.debugLog)(`    Keys: ${ix.keys.length} accounts`);
                ix.keys.forEach((key, keyIndex) => {
                    (0, debug_1.debugLog)(`      ${keyIndex}: ${key.pubkey.toString()} (${key.isSigner ? 'SIGNER' : 'READONLY'})`);
                });
            });
            (0, debug_1.debugLog)(`💰 Fee payer: ${finalFeePayer.toString()}`);
            // Note: We don't serialize the transaction here because it hasn't been signed yet
            // Serialization will happen in the execution phase after signing
            // Log essential transaction info for debugging
            (0, debug_1.debugLog)(`🔍 Batch ${batchIndex + 1}: ${allInstructions.length} instructions, ${signersInOrder.length} signers`);
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
        }
        catch (batchError) {
            (0, debug_1.debugLog)(`❌ Error creating batch ${batchIndex + 1}:`, batchError);
            throw new Error(`Failed to create batch ${batchIndex + 1}: ${batchError}`);
        }
    }
    return results;
}
//# sourceMappingURL=instructions.js.map