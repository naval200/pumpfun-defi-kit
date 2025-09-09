"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInstructionsForOperation = buildInstructionsForOperation;
exports.chunkArray = chunkArray;
exports.estimateTransactionLimits = estimateTransactionLimits;
exports.determineOptimalBatchSize = determineOptimalBatchSize;
const web3_js_1 = require("@solana/web3.js");
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const sendToken_1 = require("../sendToken");
const sendSol_1 = require("../sendSol");
const bonding_curve_1 = require("../bonding-curve");
const amm_1 = require("../amm");
const createAccount_1 = require("../createAccount");
const amounts_1 = require("../utils/amounts");
const debug_1 = require("../utils/debug");
// (Version/build logging moved to batch runner to avoid noisy imports)
function addCreateAccountInstructions(instructions, mint, owner, feePayer) {
    const { instruction: createAtaIx } = (0, createAccount_1.createAssociatedTokenAccountInstruction)(feePayer, // payer
    owner, // owner
    mint // mint
    );
    instructions.push(createAtaIx);
    const { instruction: createWsolAtaIx } = (0, createAccount_1.createAssociatedWSOLAccountInstruction)(feePayer, // payer
    owner // owner
    );
    instructions.push(createWsolAtaIx);
}
/**
 * Build instructions for a single batch operation
 */
async function buildInstructionsForOperation(connection, ammSdk, operation, senderKeypair, feePayer) {
    const instructions = [];
    switch (operation.type) {
        case 'create-account': {
            const { mint, owner } = operation.params;
            addCreateAccountInstructions(instructions, new web3_js_1.PublicKey(mint), new web3_js_1.PublicKey(owner), feePayer?.publicKey || senderKeypair.publicKey);
            break;
        }
        case 'transfer': {
            const { recipient, mint, amount } = operation.params;
            const ix = (0, sendToken_1.createTokenTransferInstruction)(senderKeypair.publicKey, new web3_js_1.PublicKey(recipient), new web3_js_1.PublicKey(mint), amount);
            instructions.push(ix);
            break;
        }
        case 'sol-transfer': {
            const { recipient, amount } = operation.params;
            const ix = (0, sendSol_1.createSendSolInstruction)(senderKeypair, new web3_js_1.PublicKey(recipient), amount, feePayer?.publicKey);
            instructions.push(ix);
            break;
        }
        case 'buy-bonding-curve': {
            const { mint, amount } = operation.params;
            const pdas = await (0, bonding_curve_1.getBondingCurvePDAs)(connection, new web3_js_1.PublicKey(mint), senderKeypair.publicKey);
            const ix = (0, bonding_curve_1.createBondingCurveBuyInstruction)(senderKeypair.publicKey, new web3_js_1.PublicKey(mint), amount, pdas, 1000);
            instructions.push(ix);
            break;
        }
        case 'sell-bonding-curve': {
            const { mint, amount } = operation.params;
            const pdas = await (0, bonding_curve_1.getBondingCurvePDAs)(connection, new web3_js_1.PublicKey(mint), senderKeypair.publicKey);
            const minSolOutput = (0, amounts_1.minSolLamports)();
            const ix = (0, bonding_curve_1.createBondingCurveSellInstruction)(senderKeypair.publicKey, new web3_js_1.PublicKey(mint), amount, minSolOutput, pdas);
            instructions.push(ix);
            break;
        }
        case 'buy-amm': {
            const { poolKey, amount, slippage = 1 } = operation.params;
            (0, debug_1.debugLog)(`🔍 Using native SOL for buy-amm operation`);
            // For buy-amm operations, use the SDK's default method that handles native SOL
            // This avoids the complexity of wrapped SOL token accounts
            const state = await ammSdk.swapSolanaState(new web3_js_1.PublicKey(poolKey), senderKeypair.publicKey);
            const ixs = await (0, amm_1.createAmmBuyInstructionsAssuming)(ammSdk, state, amount, slippage);
            instructions.push(...ixs);
            break;
        }
        case 'sell-amm': {
            const { poolKey, amount, slippage = 1 } = operation.params;
            const state = await ammSdk.swapSolanaState(new web3_js_1.PublicKey(poolKey), senderKeypair.publicKey);
            const ixs = await (0, amm_1.createAmmSellInstructionsAssuming)(ammSdk, state, amount, slippage);
            instructions.push(...ixs);
            break;
        }
        default: {
            throw new Error(`Unknown operation type: ${operation.type}`);
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
function chunkArray(items, chunkSize) {
    if (!Array.isArray(items)) {
        return [];
    }
    if (chunkSize <= 0) {
        return [items];
    }
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}
/**
 * Estimate transaction size and validate against Solana limits
 */
function estimateTransactionLimits(instructions, signers) {
    const reasons = [];
    // Count unique accounts across all instructions
    const uniqueAccounts = new Set();
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
    const estimatedSize = signatureSize + accountKeysSize + instructionDataSize + instructionAccountsSize + 100; // +100 for overhead
    // Check limits
    let canFit = true;
    if (estimatedSize > SOLANA_TRANSACTION_SIZE_LIMIT) {
        canFit = false;
        reasons.push(`Estimated size ${estimatedSize} bytes exceeds limit ${SOLANA_TRANSACTION_SIZE_LIMIT} bytes`);
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
async function determineOptimalBatchSize(connection, operations, feePayer) {
    if (operations.length === 0) {
        return { maxOpsPerBatch: 0, reasoning: 'No operations provided' };
    }
    const ammSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
    let maxSafeOps = 1;
    let lastSuccessfulSize = 0;
    // Test increasing batch sizes until we hit a limit
    for (let testSize = 1; testSize <= Math.min(operations.length, 20); testSize++) {
        const testOps = operations.slice(0, testSize);
        const instructions = [];
        const signers = new Set();
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
                const senderKeypair = op.sender;
                signers.add(senderKeypair.publicKey.toString());
                // Use the helper function to build instructions
                const opInstructions = await buildInstructionsForOperation(connection, ammSdk, op, senderKeypair, feePayer);
                instructions.push(...opInstructions);
            }
            // Check if this batch size fits within limits
            const signersArray = Array.from(signers).map(s => ({ publicKey: new web3_js_1.PublicKey(s) }));
            const limits = estimateTransactionLimits(instructions, signersArray);
            if (limits.canFit) {
                maxSafeOps = testSize;
                lastSuccessfulSize = limits.estimatedSize;
            }
            else {
                // Hit a limit, stop testing
                break;
            }
        }
        catch (error) {
            // Error building instructions, stop testing
            (0, debug_1.debugLog)(`Error testing batch size ${testSize}: ${error}`);
            break;
        }
    }
    const reasoning = `Determined max ${maxSafeOps} operations per batch (last successful size: ${lastSuccessfulSize} bytes)`;
    return { maxOpsPerBatch: maxSafeOps, reasoning };
}
//# sourceMappingURL=batch-helper.js.map