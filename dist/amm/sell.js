"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellTokens = sellTokens;
const tslib_1 = require("tslib");
const transaction_1 = require("../utils/transaction");
const retry_1 = require("../utils/retry");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
/**
 * Sell tokens for SOL with retry logic and better error handling
 */
async function sellTokens(connection, wallet, poolKey, baseAmount, slippage = 1) {
    try {
        (0, debug_1.log)(`💸 Selling tokens to pool: ${poolKey.toString()}`);
        (0, debug_1.log)(`Token amount: ${baseAmount}`);
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
        // Calculate expected quote amount using simple AMM formula
        // This is a simplified calculation - in practice, you'd use the SDK's methods
        const k = baseReserve * quoteReserve;
        const newBaseReserve = baseReserve + baseAmount;
        const newQuoteReserve = k / newBaseReserve;
        const quoteOut = quoteReserve - newQuoteReserve;
        (0, debug_1.debugLog)(`Expected quote amount: ${quoteOut}`);
        // Execute sell transaction with retry logic
        (0, debug_1.debugLog)('📝 Executing sell transaction...');
        const instructions = await (0, retry_1.retryWithBackoff)(async () => {
            // Convert to BN for SDK compatibility and use type assertion to bypass TypeScript issues
            const baseAmountBN = new bn_js_1.default(baseAmount);
            return await pumpAmmSdk.sellBaseInput(swapSolanaState, baseAmountBN, slippage);
        }, 3, 2000);
        // Send transaction with retry logic
        (0, debug_1.debugLog)('📤 Sending sell transaction...');
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            return await (0, transaction_1.sendTransaction)(connection, wallet, instructions);
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
//# sourceMappingURL=sell.js.map