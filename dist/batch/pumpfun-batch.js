"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchTransactions = batchTransactions;
exports.validatePumpFunBatchOperations = validatePumpFunBatchOperations;
const web3_js_1 = require("@solana/web3.js");
const sendToken_1 = require("../sendToken");
const sendSol_1 = require("../sendSol");
const buy_1 = require("../bonding-curve/buy");
const sell_1 = require("../bonding-curve/sell");
const instructions_1 = require("../amm/instructions");
const bc_helper_1 = require("../bonding-curve/bc-helper");
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
const batch_helper_1 = require("./batch-helper");
const amm_1 = require("../amm");
const bonding_curve_1 = require("../bonding-curve");
/**
 * Execute a batch of PumpFun operations
 *
 * This function processes operations in parallel batches with configurable delays.
 * Supports both individual operation execution and combined transaction execution.
 * - combinePerBatch: Combines compatible operations into single transactions per sender
 * - Accounts are always assumed to exist (users must check beforehand)
 */
async function batchTransactions(connection, wallet, operations, feePayer, options = {}) {
    const { maxParallel = 3, delayBetween = 1000, retryFailed = false, combinePerBatch = false, } = options;
    const results = [];
    (0, debug_1.debugLog)(`🚀 Executing ${operations.length} PumpFun operations in batches of ${maxParallel}`);
    (0, debug_1.debugLog)(`📊 Batch options: maxParallel=${maxParallel}, delayBetween=${delayBetween}ms, retryFailed=${retryFailed}, combinePerBatch=${combinePerBatch}`);
    if (feePayer) {
        (0, debug_1.debugLog)(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
    }
    else {
        (0, debug_1.debugLog)('💸 No fee payer provided: each signer will pay their own fees');
    }
    // Execute operations in batches
    const batches = (0, batch_helper_1.chunkArray)(operations, maxParallel);
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        (0, debug_1.debugLog)(`🔄 Executing Batch ${batchIndex + 1}/${batches.length} (${batch.length} operations)`);
        if (combinePerBatch) {
            // Combine all compatible operations in this batch into a single transaction per sender
            const groupedBySender = new Map();
            for (const op of batch) {
                const senderPubkey = (op.sender || wallet.publicKey.toString()).toString();
                const sender = op.sender
                    ? web3_js_1.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(op.sender)))
                    : wallet;
                const entry = groupedBySender.get(senderPubkey) || { sender, ops: [] };
                entry.ops.push(op);
                groupedBySender.set(senderPubkey, entry);
            }
            for (const [, group] of groupedBySender) {
                try {
                    const instructions = [];
                    const sender = group.sender;
                    const ammSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
                    for (const operation of group.ops) {
                        switch (operation.type) {
                            case 'transfer': {
                                const { recipient, mint, amount } = operation.params;
                                // Use the utility function from sendToken.ts for consistency
                                const transferInstruction = (0, sendToken_1.createTokenTransferInstruction)(sender.publicKey, new web3_js_1.PublicKey(recipient), new web3_js_1.PublicKey(mint), BigInt(amount), false // allowOwnerOffCurve
                                );
                                instructions.push(transferInstruction);
                                break;
                            }
                            case 'sol-transfer': {
                                const { recipient, lamports } = operation.params;
                                // Use the utility function from sendSol.ts for consistency
                                const solTransferInstruction = (0, sendSol_1.createSendSolInstruction)(sender, new web3_js_1.PublicKey(recipient), Number(lamports) / 1e9, // Convert lamports to SOL
                                feePayer?.publicKey);
                                instructions.push(solTransferInstruction);
                                break;
                            }
                            case 'buy-bonding-curve': {
                                const { mint, solAmount } = operation.params;
                                // Get PDAs for bonding curve buy
                                const pdas = await (0, bc_helper_1.getBondingCurvePDAs)(connection, new web3_js_1.PublicKey(mint), sender.publicKey);
                                // Convert SOL amount to smallest units (9 decimals)
                                const solAmountInSmallestUnits = solAmount * Math.pow(10, 9);
                                instructions.push((0, bonding_curve_1.createBondingCurveBuyInstruction)(sender.publicKey, new web3_js_1.PublicKey(mint), solAmountInSmallestUnits, pdas, 1000 // maxSlippageBasisPoints
                                ));
                                break;
                            }
                            case 'sell-bonding-curve': {
                                const { mint, amount } = operation.params;
                                // Get PDAs for bonding curve sell
                                const pdas = await (0, bc_helper_1.getBondingCurvePDAs)(connection, new web3_js_1.PublicKey(mint), sender.publicKey);
                                // Convert amount to smallest units (6 decimals)
                                const tokenAmountInSmallestUnits = amount * Math.pow(10, 6);
                                // Calculate min SOL output (very low to avoid slippage issues)
                                const minSolOutput = 0.000001 * 1e9; // 0.000001 SOL in lamports
                                instructions.push((0, bonding_curve_1.createBondingCurveSellInstruction)(sender.publicKey, new web3_js_1.PublicKey(mint), tokenAmountInSmallestUnits, minSolOutput, pdas));
                                break;
                            }
                            case 'buy-amm': {
                                const { poolKey, quoteAmount, slippage = 1 } = operation.params;
                                const state = await ammSdk.swapSolanaState(new web3_js_1.PublicKey(poolKey), sender.publicKey);
                                const ixs = await (0, instructions_1.createAmmBuyInstructionsAssuming)(ammSdk, state, Number(quoteAmount), Number(slippage));
                                ixs.forEach(ix => instructions.push(ix));
                                break;
                            }
                            case 'sell-amm': {
                                const { poolKey, amount, slippage = 1 } = operation.params;
                                const state = await ammSdk.swapSolanaState(new web3_js_1.PublicKey(poolKey), sender.publicKey);
                                const ixs = await (0, instructions_1.createAmmSellInstructionsAssuming)(ammSdk, state, Number(amount), Number(slippage));
                                ixs.forEach(ix => instructions.push(ix));
                                break;
                            }
                            default:
                                throw new Error(`Unknown operation type: ${operation.type}`);
                        }
                    }
                    // Assemble and send single transaction for this sender group
                    const tx = new web3_js_1.Transaction();
                    instructions.forEach(ix => tx.add(ix));
                    const { blockhash } = await connection.getLatestBlockhash('confirmed');
                    tx.recentBlockhash = blockhash;
                    tx.feePayer = feePayer?.publicKey || sender.publicKey; // Use fee payer if provided
                    tx.sign(sender);
                    if (feePayer && !feePayer.publicKey.equals(sender.publicKey)) {
                        tx.sign(feePayer);
                    }
                    const signature = await connection.sendRawTransaction(tx.serialize(), {
                        skipPreflight: false,
                        preflightCommitment: 'confirmed',
                    });
                    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
                    if (confirmation.value.err) {
                        throw new Error(`Combined transaction failed: ${confirmation.value.err}`);
                    }
                    // Push a result per operation sharing the same signature
                    group.ops.forEach(op => {
                        results.push({ operationId: op.id, type: op.type, success: true, signature });
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    group.ops.forEach(op => {
                        results.push({
                            operationId: op.id,
                            type: op.type,
                            success: false,
                            error: errorMessage,
                        });
                    });
                }
            }
            // Delay between batches if configured
            if (batchIndex < batches.length - 1 && delayBetween > 0) {
                (0, debug_1.debugLog)(`⏳ Waiting ${delayBetween}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayBetween));
            }
            continue;
        }
        // Execute batch in parallel (legacy per-op mode)
        const batchPromises = batch.map(async (operation) => {
            try {
                (0, debug_1.debugLog)(`🚀 Executing ${operation.type}: ${operation.description}`);
                let result;
                switch (operation.type) {
                    case 'transfer': {
                        const { recipient, mint, amount, createAccount = true } = operation.params;
                        if (createAccount) {
                            const transferResult = await (0, sendToken_1.sendTokenWithAccountCreation)(connection, wallet, new web3_js_1.PublicKey(recipient), new web3_js_1.PublicKey(mint), BigInt(amount), false, // allowOwnerOffCurve
                            feePayer);
                            if (transferResult.success && transferResult.signature) {
                                result = { success: true, signature: transferResult.signature, amount, mint };
                            }
                            else {
                                result = { success: false, error: transferResult.error || 'Transfer failed' };
                            }
                        }
                        else {
                            const transferResult = await (0, sendToken_1.sendToken)(connection, wallet, new web3_js_1.PublicKey(recipient), new web3_js_1.PublicKey(mint), BigInt(amount), false, // allowOwnerOffCurve
                            false, // createRecipientAccount
                            feePayer);
                            if (transferResult.success && transferResult.signature) {
                                result = { success: true, signature: transferResult.signature, amount, mint };
                            }
                            else {
                                result = { success: false, error: transferResult.error || 'Transfer failed' };
                            }
                        }
                        break;
                    }
                    case 'sol-transfer': {
                        const { recipient, lamports, sender } = operation.params;
                        // Convert lamports to SOL and use sendSol for consistency
                        const amountSol = Number(lamports) / 1e9;
                        const senderKeypair = sender && sender !== wallet.publicKey.toString()
                            ? web3_js_1.Keypair.fromSecretKey(Buffer.from(JSON.parse(sender)))
                            : wallet;
                        const sendResult = await (0, sendSol_1.sendSol)(connection, senderKeypair, new web3_js_1.PublicKey(recipient), amountSol, feePayer);
                        if (sendResult.success && sendResult.signature) {
                            result = { success: true, signature: sendResult.signature };
                        }
                        else {
                            result = { success: false, error: sendResult.error || 'SOL transfer failed' };
                        }
                        break;
                    }
                    case 'sell-bonding-curve': {
                        const { mint, amount } = operation.params;
                        const sellResult = await (0, sell_1.sellPumpFunToken)(connection, wallet, new web3_js_1.PublicKey(mint), amount);
                        if (sellResult.success && sellResult.signature) {
                            result = { success: true, signature: sellResult.signature, amount, mint };
                        }
                        else {
                            result = { success: false, error: sellResult.error || 'Sell failed' };
                        }
                        break;
                    }
                    case 'sell-amm': {
                        const { poolKey, amount, slippage = 1 } = operation.params;
                        const sellResult = await (0, amm_1.sellAmmTokens)(connection, wallet, new web3_js_1.PublicKey(poolKey), amount, slippage, feePayer);
                        if (sellResult.success && sellResult.signature) {
                            // For AMM operations, poolKey is not a mint, so we use it as identifier
                            result = { success: true, signature: sellResult.signature, amount, mint: poolKey };
                        }
                        else {
                            result = { success: false, error: sellResult.error || 'Sell failed' };
                        }
                        break;
                    }
                    case 'buy-amm': {
                        const { poolKey, quoteAmount, slippage = 1 } = operation.params;
                        const buyResult = await (0, amm_1.buyAmmTokens)(connection, wallet, new web3_js_1.PublicKey(poolKey), Number(quoteAmount), Number(slippage), feePayer || wallet);
                        if (buyResult.success && buyResult.signature) {
                            result = {
                                success: true,
                                signature: buyResult.signature,
                                amount: quoteAmount,
                                mint: poolKey,
                            };
                        }
                        else {
                            result = { success: false, error: buyResult.error || 'Buy failed' };
                        }
                        break;
                    }
                    case 'buy-bonding-curve': {
                        const { mint, solAmount } = operation.params;
                        const signature = await (0, buy_1.buyPumpFunToken)(connection, wallet, new web3_js_1.PublicKey(mint), Number(solAmount), 1000);
                        result = { success: true, signature, amount: solAmount, mint };
                        break;
                    }
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
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
                const retryResult = await executeOperation(connection, wallet, feePayer, operation);
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
    return results;
}
/**
 * Execute a single operation
 */
async function executeOperation(connection, wallet, feePayer, operation) {
    try {
        (0, debug_1.debugLog)(`🚀 Executing ${operation.type}: ${operation.description}`);
        let result;
        switch (operation.type) {
            case 'transfer': {
                const { recipient, mint, amount, createAccount = true } = operation.params;
                if (createAccount) {
                    const transferResult = await (0, sendToken_1.sendTokenWithAccountCreation)(connection, wallet, new web3_js_1.PublicKey(recipient), new web3_js_1.PublicKey(mint), BigInt(amount), false, // allowOwnerOffCurve
                    feePayer);
                    if (transferResult.success && transferResult.signature) {
                        result = { success: true, signature: transferResult.signature, amount, mint };
                    }
                    else {
                        result = { success: false, error: transferResult.error || 'Transfer failed' };
                    }
                }
                else {
                    const transferResult = await (0, sendToken_1.sendToken)(connection, wallet, new web3_js_1.PublicKey(recipient), new web3_js_1.PublicKey(mint), BigInt(amount), false, // allowOwnerOffCurve
                    false, // createRecipientAccount
                    feePayer);
                    if (transferResult.success && transferResult.signature) {
                        result = { success: true, signature: transferResult.signature, amount, mint };
                    }
                    else {
                        result = { success: false, error: transferResult.error || 'Transfer failed' };
                    }
                }
                break;
            }
            case 'sell-bonding-curve': {
                const { mint, amount } = operation.params;
                const sellResult = await (0, sell_1.sellPumpFunToken)(connection, wallet, new web3_js_1.PublicKey(mint), amount);
                if (sellResult.success && sellResult.signature) {
                    result = { success: true, signature: sellResult.signature, amount, mint };
                }
                else {
                    result = { success: false, error: sellResult.error || 'Sell failed' };
                }
                break;
            }
            case 'sell-amm': {
                const { poolKey, amount, slippage = 1 } = operation.params;
                const sellResult = await (0, amm_1.sellAmmTokens)(connection, wallet, new web3_js_1.PublicKey(poolKey), amount, slippage, feePayer);
                if (sellResult.success && sellResult.signature) {
                    result = { success: true, signature: sellResult.signature, amount, mint: poolKey };
                }
                else {
                    result = { success: false, error: sellResult.error || 'Sell failed' };
                }
                break;
            }
            case 'buy-amm': {
                const { poolKey, quoteAmount, slippage = 1 } = operation.params;
                const buyResult = await (0, amm_1.buyAmmTokens)(connection, wallet, new web3_js_1.PublicKey(poolKey), Number(quoteAmount), Number(slippage), feePayer || wallet);
                if (buyResult.success && buyResult.signature) {
                    result = {
                        success: true,
                        signature: buyResult.signature,
                        amount: quoteAmount,
                        mint: poolKey,
                    };
                }
                else {
                    result = { success: false, error: buyResult.error || 'Buy failed' };
                }
                break;
            }
            case 'buy-bonding-curve': {
                const { mint, solAmount } = operation.params;
                const signature = await (0, buy_1.buyPumpFunToken)(connection, wallet, new web3_js_1.PublicKey(mint), Number(solAmount), 1000);
                result = { success: true, signature, amount: solAmount, mint };
                break;
            }
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
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
                if (!op.params.recipient || op.params.lamports === undefined) {
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
                if (!op.params.poolKey || op.params.quoteAmount === undefined) {
                    errors.push(`Operation ${index}: Missing required buy AMM parameters`);
                }
                break;
            case 'buy-bonding-curve':
                if (!op.params.mint || op.params.solAmount === undefined) {
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