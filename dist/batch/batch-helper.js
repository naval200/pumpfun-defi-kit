"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeGenericBatch = executeGenericBatch;
exports.executeCombinedTransaction = executeCombinedTransaction;
exports.chunkArray = chunkArray;
exports.validateGenericBatchOperations = validateGenericBatchOperations;
exports.calculateOptimalBatchSize = calculateOptimalBatchSize;
exports.createBatchExecutionPlan = createBatchExecutionPlan;
const web3_js_1 = require("@solana/web3.js");
const debug_1 = require("../utils/debug");
/**
 * Execute generic batch operations with custom execution logic
 *
 * This helper function allows you to batch any type of homogeneous operations
 * by providing a custom executor function for each operation type.
 */
async function executeGenericBatch(connection, operations, executor, options) {
    const { maxParallel = 3, delayBetween = 1000, retryFailed = false, feePayer } = options;
    const results = [];
    if (!feePayer) {
        throw new Error('Fee payer is required for batch transactions');
    }
    (0, debug_1.debugLog)(`🚀 Executing ${operations.length} generic operations in batches of ${maxParallel}`);
    (0, debug_1.debugLog)(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
    // Execute operations individually in batches
    const batches = chunkArray(operations, maxParallel);
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        (0, debug_1.debugLog)(`🔄 Executing Batch ${batchIndex + 1}/${batches.length} (${batch.length} operations)`);
        // Execute batch in parallel
        const batchPromises = batch.map(async (operation) => {
            try {
                (0, debug_1.debugLog)(`🚀 Executing ${operation.type}: ${operation.description}`);
                const result = await executor(operation, connection, feePayer);
                return {
                    operationId: operation.id,
                    type: operation.type,
                    success: result.success,
                    signature: result.signature,
                    error: result.error,
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                (0, debug_1.logError)(`Error executing operation ${operation.id}: ${errorMessage}`);
                return {
                    operationId: operation.id,
                    type: operation.type,
                    success: false,
                    error: errorMessage,
                };
            }
        });
        const batchResults = await Promise.allSettled(batchPromises);
        // Process batch results
        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
            else {
                results.push({
                    operationId: batch[index].id,
                    type: batch[index].type,
                    success: false,
                    error: result.reason?.message || 'Unknown error',
                });
            }
        });
        // Add delay between batches (except for the last batch)
        if (batchIndex < batches.length - 1 && delayBetween > 0) {
            (0, debug_1.debugLog)(`⏳ Waiting ${delayBetween}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
    }
    // Retry failed operations if requested
    if (retryFailed) {
        const failedOperations = operations.filter(op => !results.find(r => r.operationId === op.id && r.success));
        if (failedOperations.length > 0) {
            (0, debug_1.debugLog)(`🔄 Retrying ${failedOperations.length} failed operations...`);
            for (const operation of failedOperations) {
                (0, debug_1.debugLog)(`🔄 Retrying operation: ${operation.id}`);
                const retryResult = await executor(operation, connection, feePayer);
                // Update the existing result
                const existingIndex = results.findIndex(r => r.operationId === operation.id);
                if (existingIndex >= 0) {
                    results[existingIndex] = {
                        operationId: operation.id,
                        type: operation.type,
                        success: retryResult.success,
                        signature: retryResult.signature,
                        error: retryResult.error,
                    };
                }
                else {
                    results.push({
                        operationId: operation.id,
                        type: operation.type,
                        success: retryResult.success,
                        signature: retryResult.signature,
                        error: retryResult.error,
                    });
                }
            }
        }
    }
    return results;
}
/**
 * Execute operations in a single combined transaction
 *
 * This is useful for operations that can be safely combined into one transaction,
 * such as multiple SPL token transfers or other homogeneous operations.
 */
async function executeCombinedTransaction(connection, operations, instructionBuilder, signers, feePayer, options = {}) {
    try {
        (0, debug_1.debugLog)(`🔗 Building combined transaction with ${operations.length} operations`);
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        // Create transaction
        const transaction = new web3_js_1.Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = feePayer.publicKey;
        // Add all instructions
        operations.forEach(operation => {
            const instructions = instructionBuilder(operation);
            instructions.forEach(instruction => transaction.add(instruction));
        });
        // Sign with all signers
        signers.forEach(signer => transaction.partialSign(signer));
        // Send transaction
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: options.skipPreflight || false,
            preflightCommitment: options.preflightCommitment || 'confirmed',
        });
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }
        (0, debug_1.debugLog)(`✅ Combined transaction confirmed: ${signature}`);
        return {
            success: true,
            signature,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`Combined transaction failed: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage,
        };
    }
}
/**
 * Utility function to chunk array into smaller arrays
 */
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
/**
 * Validate generic batch operations structure
 */
function validateGenericBatchOperations(operations, validTypes) {
    const errors = [];
    if (!Array.isArray(operations) || operations.length === 0) {
        errors.push('Operations must be a non-empty array');
        return { valid: false, errors };
    }
    operations.forEach((op, index) => {
        // Check required fields
        if (!op.type || !op.id || !op.description || !op.params) {
            errors.push(`Operation ${index}: Missing required fields`);
            return;
        }
        // Check operation type
        if (!validTypes.includes(op.type)) {
            errors.push(`Operation ${index}: Invalid type '${op.type}'`);
            return;
        }
        // Check ID uniqueness
        const duplicateIds = operations.filter(o => o.id === op.id);
        if (duplicateIds.length > 1) {
            errors.push(`Operation ${index}: Duplicate ID '${op.id}'`);
            return;
        }
    });
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Calculate optimal batch size based on transaction size limits
 *
 * Solana has a transaction size limit of ~1232 bytes for instructions.
 * This helper estimates how many operations can fit in a single transaction.
 */
function calculateOptimalBatchSize(estimatedInstructionSize, maxTransactionSize = 1232) {
    // Reserve some space for transaction overhead
    const overhead = 100;
    const availableSpace = maxTransactionSize - overhead;
    // Calculate how many instructions can fit
    const maxInstructions = Math.floor(availableSpace / estimatedInstructionSize);
    // Ensure we don't exceed reasonable limits
    return Math.min(maxInstructions, 20);
}
/**
 * Create a batch execution plan
 *
 * This helps optimize batch execution by grouping operations that can be combined
 * and determining the optimal execution strategy.
 */
function createBatchExecutionPlan(operations, canCombine, maxBatchSize = 10) {
    const combinedBatches = [];
    const individualOperations = [];
    // Group operations that can be combined
    const processed = new Set();
    for (let i = 0; i < operations.length; i++) {
        if (processed.has(i))
            continue;
        const batch = [operations[i]];
        processed.add(i);
        // Find other operations that can be combined
        for (let j = i + 1; j < operations.length && batch.length < maxBatchSize; j++) {
            if (processed.has(j))
                continue;
            if (canCombine(operations[i], operations[j])) {
                batch.push(operations[j]);
                processed.add(j);
            }
        }
        if (batch.length > 1) {
            combinedBatches.push(batch);
        }
        else {
            individualOperations.push(operations[i]);
        }
    }
    return { combinedBatches, individualOperations };
}
//# sourceMappingURL=batch-helper.js.map