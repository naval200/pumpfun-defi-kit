"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellAmmTokens = sellAmmTokens;
exports.createSignedAmmSellTransaction = createSignedAmmSellTransaction;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const transaction_1 = require("../utils/transaction");
const retry_1 = require("../utils/retry");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
const instructions_1 = require("./instructions");
/**
 * Sell tokens for SOL using AMM
 */
async function sellAmmTokens(connection, wallet, poolKey, baseAmount, slippage = 1, feePayer, options) {
    try {
        (0, debug_1.log)(`💸 Selling tokens to pool: ${poolKey.toString()}`);
        (0, debug_1.log)(`Token amount: ${baseAmount}`);
        // Initialize SDKs directly
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Get swap state with retry logic unless provided
        const swapSolanaState = options?.swapSolanaState
            ? options.swapSolanaState
            : await (0, retry_1.retryWithBackoff)(async () => {
                (0, debug_1.debugLog)('🔍 Getting swap state...');
                return await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);
            }, 3, 2000);
        const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
        const baseReserve = Number(poolBaseAmount);
        const quoteReserve = Number(poolQuoteAmount);
        (0, debug_1.debugLog)(`Pool reserves - Base: ${baseReserve}, Quote: ${quoteReserve}`);
        // Calculate expected quote amount using simple AMM formula
        // This is a simplified calculation - in practice, you'd use the SDK's methods
        const k = baseReserve * quoteReserve;
        const newBaseReserve = baseReserve + baseAmount;
        const newQuoteReserve = k / newBaseReserve;
        const quoteOut = quoteReserve - newQuoteReserve;
        (0, debug_1.debugLog)(`Expected quote amount: ${quoteOut}`);
        // Execute sell transaction with retry logic
        (0, debug_1.debugLog)('📝 Executing sell transaction...');
        const instructions = await (0, instructions_1.createAmmSellInstructionsAssuming)(pumpAmmSdk, swapSolanaState, new bn_js_1.default(baseAmount), slippage);
        // Send transaction with retry logic
        (0, debug_1.debugLog)('📤 Sending sell transaction...');
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            if (feePayer) {
                (0, debug_1.debugLog)(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
                return await (0, transaction_1.sendTransactionWithFeePayer)(connection, wallet, instructions, feePayer);
            }
            else {
                return await (0, transaction_1.sendTransaction)(connection, wallet, instructions);
            }
        }, 3, 2000);
        (0, debug_1.logSuccess)(`Sell transaction successful! Signature: ${signature}`);
        return {
            success: true,
            signature,
            quoteAmount: Number(quoteOut),
        };
    }
    catch (error) {
        (0, debug_1.logError)('Error selling tokens:', error);
        // Provide more specific error information
        let errorMessage = 'Sell operation failed';
        if (error.message) {
            errorMessage = error.message;
        }
        else if (error.toString) {
            errorMessage = error.toString();
        }
        return {
            success: false,
            error: errorMessage,
        };
    }
}
/**
 * Create signed AMM sell transaction without submitting it
 * Returns the signed transaction for batch processing
 */
async function createSignedAmmSellTransaction(connection, wallet, poolKey, baseAmount, slippage = 1, feePayer, blockhash, _options) {
    try {
        (0, debug_1.debugLog)(`🔧 Creating signed AMM sell transaction for ${baseAmount} tokens`);
        (0, debug_1.debugLog)(`🎯 Target pool: ${poolKey.toString()}`);
        (0, debug_1.debugLog)(`📊 Slippage: ${slippage}%`);
        // Initialize SDKs directly
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Get swap state (use provided one if available, otherwise fetch)
        (0, debug_1.debugLog)('🔍 Getting swap state...');
        const swapSolanaState = _options?.swapSolanaState || (await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey));
        // Create sell instructions
        (0, debug_1.debugLog)('📝 Creating sell instructions...');
        const baseAmountBN = new bn_js_1.default(baseAmount);
        const instructions = await pumpAmmSdk.sellBaseInput(swapSolanaState, baseAmountBN, slippage);
        // Create transaction
        const transaction = new web3_js_1.Transaction();
        instructions.forEach(instruction => transaction.add(instruction));
        // Set recent blockhash
        // Use provided blockhash for batch operations, or get new one if not provided
        if (blockhash) {
            transaction.recentBlockhash = blockhash;
        }
        else {
            const { blockhash: newBlockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = newBlockhash;
        }
        // Set fee payer (use feePayer if provided, otherwise use wallet)
        transaction.feePayer = feePayer ? feePayer.publicKey : wallet.publicKey;
        // Sign the transaction
        // For batch transactions, the fee payer signs all transactions
        // The main wallet signs if it's different from the payment
        if (feePayer && feePayer.publicKey.toString() !== wallet.publicKey.toString()) {
            transaction.sign(wallet, feePayer);
        }
        else {
            transaction.sign(wallet);
        }
        (0, debug_1.debugLog)('✅ Signed AMM sell transaction created successfully');
        return {
            success: true,
            transaction,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`Failed to create signed AMM sell transaction: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage,
        };
    }
}
//# sourceMappingURL=sell.js.map