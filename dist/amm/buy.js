"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyTokens = buyTokens;
const tslib_1 = require("tslib");
const transaction_1 = require("../utils/transaction");
const retry_1 = require("../utils/retry");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
/**
 * Buy tokens using SOL with retry logic and better error handling
 */
async function buyTokens(connection, wallet, poolKey, quoteAmount, slippage = 1) {
    try {
        (0, debug_1.log)(`💰 Buying tokens from pool: ${poolKey.toString()}`);
        (0, debug_1.log)(`SOL amount: ${quoteAmount}`);
        // Initialize SDKs directly
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Get swap state with retry logic
        (0, debug_1.debugLog)('🔍 Getting swap state...');
        const swapSolanaState = await (0, retry_1.retryWithBackoff)(async () => {
            return await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);
        }, 3, 2000);
        const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
        const baseReserve = Number(poolBaseAmount);
        const quoteReserve = Number(poolQuoteAmount);
        (0, debug_1.debugLog)(`Pool reserves - Base: ${baseReserve}, Quote: ${quoteReserve}`);
        // Calculate expected base amount using simple AMM formula
        // This is a simplified calculation - in practice, you'd use the SDK's methods
        const k = baseReserve * quoteReserve;
        const newQuoteReserve = quoteReserve + quoteAmount;
        const newBaseReserve = k / newQuoteReserve;
        const baseOut = baseReserve - newBaseReserve;
        (0, debug_1.debugLog)(`Expected base amount: ${baseOut}`);
        // Execute buy transaction with retry logic
        (0, debug_1.debugLog)('📝 Executing buy transaction...');
        const instructions = await (0, retry_1.retryWithBackoff)(async () => {
            // Convert to BN for SDK compatibility
            const quoteAmountBN = new bn_js_1.default(quoteAmount);
            return await pumpAmmSdk.buyQuoteInput(swapSolanaState, quoteAmountBN, slippage);
        }, 3, 2000);
        // Send transaction with retry logic
        (0, debug_1.debugLog)('📤 Sending buy transaction...');
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            return await (0, transaction_1.sendTransaction)(connection, wallet, instructions);
        }, 3, 2000);
        (0, debug_1.logSuccess)(`Buy transaction successful! Signature: ${signature}`);
        return {
            success: true,
            signature,
            baseAmount: Number(baseOut),
        };
    }
    catch (error) {
        (0, debug_1.logError)('Error buying tokens:', error);
        // Provide more specific error information
        let errorMessage = 'Buy operation failed';
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
//# sourceMappingURL=buy.js.map