"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchTransactions = batchTransactions;
exports.executeBatchInstructions = executeBatchInstructions;
exports.validatePumpFunBatchOperations = validatePumpFunBatchOperations;
const web3_js_1 = require("@solana/web3.js");
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
const instructions_1 = require("./instructions");
const batch_helper_1 = require("./batch-helper");
/**
 * Execute a batch of PumpFun operations with true multi-sender batching
 *
 * This function processes operations by combining them into single transactions
 * that require signatures from all senders involved in the operations.
 * - All operations are combined into one transaction per batch
 * - All unique senders must sign the combined transaction
 * - Fee payer signs last (if provided)
 * - Accounts are always assumed to exist (users must check beforehand)
 */
async function batchTransactions(connection, operations, feePayer, options = {}) {
    const { delayBetween = 1000, retryFailed = false, disableFallbackRetry = false } = options;
    (0, debug_1.debugLog)(`🚀 Executing ${operations.length} PumpFun operations with true multi-sender batching`);
    (0, debug_1.debugLog)(`📊 Batch options: delayBetween=${delayBetween}ms, retryFailed=${retryFailed}, disableFallbackRetry=${disableFallbackRetry}`);
    if (feePayer) {
        (0, debug_1.debugLog)(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
    }
    else {
        (0, debug_1.debugLog)('💸 No fee payer provided: each signer will pay their own fees');
    }
    // Create instructions for all batches
    const batchInstructions = await (0, instructions_1.createBatchInstructions)(connection, operations, feePayer, options);
    // Execute all batches
    const results = await executeBatchInstructions(connection, batchInstructions, operations, {
        delayBetween,
        retryFailed,
        disableFallbackRetry,
    });
    return results;
}
/**
 * Execute prepared batch instructions
 *
 * This function handles the execution part of batch transactions:
 * - Signs transactions with all required signers
 * - Submits transactions to the network
 * - Handles retries for failed operations
 * - Returns results for all operations
 */
async function executeBatchInstructions(connection, batchInstructions, operations, options = {}) {
    (0, debug_1.debugLog)(`🚀 Executing ${batchInstructions.length} batch instructions`);
    const { delayBetween = 1000, retryFailed = false, disableFallbackRetry = false } = options;
    const results = [];
    for (let batchIndex = 0; batchIndex < batchInstructions.length; batchIndex++) {
        const batchInstruction = batchInstructions[batchIndex];
        (0, debug_1.debugLog)(`🔄 Executing Batch ${batchIndex + 1}/${batchInstructions.length} (${batchInstruction.operationCount} operations)`);
        try {
            const { transaction, blockhash, lastValidBlockHeight, signers } = batchInstruction;
            // Validate transaction before signing
            const validation = validateTransaction(transaction, signers);
            if (!validation.valid) {
                (0, debug_1.debugLog)(`❌ Transaction validation failed:`);
                validation.errors.forEach(error => (0, debug_1.debugLog)(`  - ${error}`));
                throw new Error(`Transaction validation failed: ${validation.errors.join(', ')}`);
            }
            (0, debug_1.debugLog)(`✅ Transaction validation passed`);
            // Sign ONCE with all signers to avoid overwriting previous signatures
            transaction.sign(...signers);
            (0, debug_1.debugLog)(`🔍 Signatures: ${transaction.signatures.length}/${signers.length} present`);
            // Validate all required signers have signatures
            const requiredSigners = new Set();
            transaction.instructions.forEach(ix => {
                ix.keys.filter(k => k.isSigner).forEach(key => {
                    requiredSigners.add(key.pubkey.toString());
                });
            });
            if (transaction.feePayer) {
                requiredSigners.add(transaction.feePayer.toString());
            }
            const signedKeys = new Set(transaction.signatures.map(s => s.publicKey.toString()));
            const missingSignatures = Array.from(requiredSigners).filter(key => !signedKeys.has(key));
            if (missingSignatures.length > 0) {
                (0, debug_1.debugLog)(`❌ Missing signatures: ${missingSignatures.join(', ')}`);
                throw new Error(`Missing signatures for required signers: ${missingSignatures.join(', ')}`);
            }
            // Submit the combined transaction
            let serializedTransaction;
            try {
                serializedTransaction = transaction.serialize();
                (0, debug_1.debugLog)(`📦 Submitting ${serializedTransaction.length} byte transaction`);
            }
            catch (serializeError) {
                throw new Error(`Failed to serialize transaction: ${serializeError}`);
            }
            const signature = await connection.sendRawTransaction(serializedTransaction, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });
            (0, debug_1.debugLog)(`📝 Signature: ${signature}`);
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, 'confirmed');
            if (confirmation.value.err) {
                throw new Error(`Combined multi-sender transaction failed: ${confirmation.value.err}`);
            }
            // Push results for all operations in this batch
            // We need to map the batch index back to the original operations
            const startIndex = batchIndex * batchInstruction.operationCount;
            const endIndex = startIndex + batchInstruction.operationCount;
            const batchOperations = operations.slice(startIndex, endIndex);
            batchOperations.forEach(op => {
                results.push({ operationId: op.id, type: op.type, success: true, signature });
            });
            (0, debug_1.debugLog)(`✅ Multi-sender batch executed successfully with signature: ${signature}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            (0, debug_1.debugLog)(`❌ Multi-sender batch failed: ${errorMessage}`);
            // Push failure results for all operations in this batch
            const startIndex = batchIndex * batchInstruction.operationCount;
            const endIndex = startIndex + batchInstruction.operationCount;
            const batchOperations = operations.slice(startIndex, endIndex);
            batchOperations.forEach(op => {
                results.push({
                    operationId: op.id,
                    type: op.type,
                    success: false,
                    error: errorMessage,
                });
            });
        }
        // Delay between batches if configured
        if (batchIndex < batchInstructions.length - 1 && delayBetween > 0) {
            (0, debug_1.debugLog)(`⏳ Waiting ${delayBetween}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
    }
    // Retry failed operations if requested
    if (retryFailed) {
        const failedOperations = operations.filter(op => !results.find(r => r.operationId === op.id && r.success));
        if (failedOperations.length > 0) {
            if (disableFallbackRetry) {
                (0, debug_1.debugLog)(`⚠️  Fallback retry disabled - ${failedOperations.length} operations failed and will not be retried`);
                (0, debug_1.debugLog)(`💡 To enable fallback retry, set disableFallbackRetry=false`);
            }
            else {
                (0, debug_1.debugLog)(`🔄 Retrying ${failedOperations.length} failed operations using fallback method...`);
                (0, debug_1.debugLog)(`⚠️  WARNING: Using fallback retry - operations will be executed individually (not batched)`);
                for (const operation of failedOperations) {
                    (0, debug_1.debugLog)(`🔄 Retrying operation: ${operation.id}`);
                    const retryResult = await executeOperation(connection, undefined, operation);
                    // Update the existing result
                    const existingIndex = results.findIndex(r => r.operationId === operation.id);
                    if (existingIndex >= 0) {
                        results[existingIndex] = retryResult;
                    }
                    else {
                        results.push(retryResult);
                    }
                }
            }
        }
    }
    return results;
}
/**
 * Validate transaction before sending
 */
function validateTransaction(transaction, signers) {
    const errors = [];
    // Check if transaction has fee payer
    if (!transaction.feePayer) {
        errors.push('Transaction missing fee payer');
    }
    // Check if transaction has recent blockhash
    if (!transaction.recentBlockhash) {
        errors.push('Transaction missing recent blockhash');
    }
    // Check if transaction has instructions
    if (transaction.instructions.length === 0) {
        errors.push('Transaction has no instructions');
    }
    // Collect all required signers from instructions
    const requiredSigners = new Set();
    transaction.instructions.forEach((ix, index) => {
        ix.keys.filter(k => k.isSigner).forEach(key => {
            requiredSigners.add(key.pubkey.toString());
        });
    });
    // Add fee payer to required signers
    if (transaction.feePayer) {
        requiredSigners.add(transaction.feePayer.toString());
    }
    // Check if all required signers are in the signers array
    const signerKeys = new Set(signers.map(s => s.publicKey.toString()));
    const missingSigners = Array.from(requiredSigners).filter(key => !signerKeys.has(key));
    if (missingSigners.length > 0) {
        errors.push(`Missing signers in signers array: ${missingSigners.join(', ')}`);
    }
    // Check for duplicate signers
    const signerKeyStrings = signers.map(s => s.publicKey.toString());
    const uniqueSignerKeys = new Set(signerKeyStrings);
    if (signerKeyStrings.length !== uniqueSignerKeys.size) {
        errors.push('Duplicate signers in signers array');
    }
    // Check transaction size (estimate without serializing since it's not signed yet)
    try {
        // Estimate transaction size without serializing
        const signatureSize = signers.length * 64; // 64 bytes per signature
        const accountKeysSize = transaction.instructions.reduce((total, ix) => {
            return total + ix.keys.length * 32; // 32 bytes per account
        }, 0);
        const instructionDataSize = transaction.instructions.reduce((total, ix) => {
            return total + ix.data.length + 4; // instruction data + overhead
        }, 0);
        const estimatedSize = signatureSize + accountKeysSize + instructionDataSize + 100; // +100 for overhead
        if (estimatedSize > 1232) {
            errors.push(`Estimated transaction size too large: ${estimatedSize} bytes (limit: 1232)`);
        }
    }
    catch (error) {
        errors.push(`Failed to estimate transaction size: ${error}`);
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Execute a single operation
 */
async function executeOperation(connection, feePayer, operation) {
    try {
        (0, debug_1.debugLog)(`🚀 Executing ${operation.type}: ${operation.description}`);
        if (!operation.sender) {
            throw new Error(`Operation ${operation.id} is missing sender Keypair`);
        }
        const wallet = operation.sender;
        // Build instructions using the helper function
        const instructions = await (0, batch_helper_1.buildInstructionsForOperation)(connection, new pump_swap_sdk_1.PumpAmmSdk(connection), operation, wallet, feePayer);
        // Create and send transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        const transaction = new web3_js_1.Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = feePayer?.publicKey || wallet.publicKey;
        instructions.forEach(ix => transaction.add(ix));
        const signers = [wallet];
        if (feePayer) {
            signers.push(feePayer);
        }
        transaction.sign(...signers);
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');
        let result;
        if (confirmation.value.err) {
            result = { success: false, error: `Transaction failed: ${confirmation.value.err}` };
        }
        else {
            result = { success: true, signature };
        }
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
}
/**
 * Validate PumpFun batch operations structure
 */
function validatePumpFunBatchOperations(operations) {
    const errors = [];
    const validTypes = [
        'transfer',
        'sell-bonding-curve',
        'sell-amm',
        'buy-amm',
        'buy-bonding-curve',
        'sol-transfer',
    ];
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
        // Validate parameters based on type
        switch (op.type) {
            case 'transfer':
                if (!op.params.recipient || !op.params.mint || !op.params.amount) {
                    errors.push(`Operation ${index}: Missing required transfer parameters`);
                }
                break;
            case 'sol-transfer':
                if (!op.params.recipient || op.params.amount === undefined) {
                    errors.push(`Operation ${index}: Missing required SOL transfer parameters`);
                }
                break;
            case 'sell-amm':
                if (!op.params.poolKey ||
                    op.params.amount === undefined ||
                    op.params.slippage === undefined) {
                    errors.push(`Operation ${index}: Missing required AMM parameters`);
                }
                break;
            case 'sell-bonding-curve':
                if (!op.params.mint || op.params.amount === undefined || op.params.slippage === undefined) {
                    errors.push(`Operation ${index}: Missing required bonding curve parameters`);
                }
                break;
            case 'buy-amm':
                if (!op.params.poolKey || op.params.amount === undefined) {
                    errors.push(`Operation ${index}: Missing required buy AMM parameters`);
                }
                break;
            case 'buy-bonding-curve':
                if (!op.params.mint || op.params.amount === undefined) {
                    errors.push(`Operation ${index}: Missing required buy bonding curve parameters`);
                }
                break;
        }
    });
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=pumpfun-batch.js.map