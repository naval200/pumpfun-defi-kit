"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLiquidity = addLiquidity;
exports.removeLiquidity = removeLiquidity;
const tslib_1 = require("tslib");
const transaction_1 = require("../utils/transaction");
const retry_1 = require("../utils/retry");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
/**
 * Add liquidity to pool with retry logic and better error handling
 */
async function addLiquidity(connection, wallet, poolKey, baseAmount, slippage = 1) {
    try {
        (0, debug_1.log)(`💧 Adding liquidity to pool: ${poolKey.toString()}`);
        (0, debug_1.log)(`Token amount: ${baseAmount}`);
        // Initialize SDK directly
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Get liquidity state with retry logic
        (0, debug_1.log)('🔍 Getting liquidity state...');
        const liquiditySolanaState = await (0, retry_1.retryWithBackoff)(async () => {
            return await pumpAmmSdk.liquiditySolanaState(poolKey, wallet.publicKey);
        }, 3, 2000);
        // Calculate quote amount and LP tokens with retry logic
        (0, debug_1.log)('🧮 Calculating liquidity amounts...');
        const { quote, lpToken } = await (0, retry_1.retryWithBackoff)(async () => {
            // Convert to BN for SDK compatibility
            const baseAmountBN = new bn_js_1.default(baseAmount);
            return await pumpAmmSdk.depositAutocompleteQuoteAndLpTokenFromBase(liquiditySolanaState, baseAmountBN, slippage);
        }, 3, 2000);
        (0, debug_1.log)(`Required SOL: ${quote}, LP tokens: ${lpToken}`);
        // Get deposit instructions with retry logic
        (0, debug_1.log)('📝 Getting deposit instructions...');
        const depositInstructions = await (0, retry_1.retryWithBackoff)(async () => {
            return await pumpAmmSdk.depositInstructions(liquiditySolanaState, lpToken, slippage);
        }, 3, 2000);
        // Send transaction with retry logic
        (0, debug_1.log)('📤 Sending liquidity transaction...');
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            return await (0, transaction_1.sendTransaction)(connection, wallet, depositInstructions);
        }, 3, 2000);
        (0, debug_1.logSignature)(signature, 'Liquidity addition');
        return {
            success: true,
            signature,
            lpTokenAmount: Number(lpToken),
        };
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error adding liquidity:', error);
        // Provide more specific error information
        let errorMessage = 'Add liquidity failed';
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
 * Remove liquidity from pool with retry logic and better error handling
 */
async function removeLiquidity(connection, wallet, poolKey, lpTokenAmount, slippage = 1) {
    try {
        (0, debug_1.log)(`💸 Removing liquidity from pool: ${poolKey.toString()}`);
        (0, debug_1.log)(`LP token amount: ${lpTokenAmount}`);
        // Initialize SDK directly
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Get liquidity state with retry logic
        (0, debug_1.log)('🔍 Getting liquidity state...');
        const liquiditySolanaState = await (0, retry_1.retryWithBackoff)(async () => {
            return await pumpAmmSdk.liquiditySolanaState(poolKey, wallet.publicKey);
        }, 3, 2000);
        // Calculate withdrawal amounts with retry logic
        (0, debug_1.log)('🧮 Calculating withdrawal amounts...');
        const { base, quote } = await (0, retry_1.retryWithBackoff)(async () => {
            // Convert to BN for SDK compatibility
            const lpTokenAmountBN = new bn_js_1.default(lpTokenAmount);
            return pumpAmmSdk.withdrawAutoCompleteBaseAndQuoteFromLpToken(liquiditySolanaState, lpTokenAmountBN, slippage);
        }, 3, 2000);
        (0, debug_1.log)(`Expected tokens: ${base}, Expected SOL: ${quote}`);
        // Get withdrawal instructions with retry logic
        (0, debug_1.log)('📝 Getting withdrawal instructions...');
        const withdrawInstructions = await (0, retry_1.retryWithBackoff)(async () => {
            // Convert to BN for SDK compatibility
            const lpTokenAmountBN = new bn_js_1.default(lpTokenAmount);
            return await pumpAmmSdk.withdrawInstructions(liquiditySolanaState, lpTokenAmountBN, slippage);
        }, 3, 2000);
        // Send transaction with retry logic
        (0, debug_1.log)('📤 Sending withdrawal transaction...');
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            return await (0, transaction_1.sendTransaction)(connection, wallet, withdrawInstructions);
        }, 3, 2000);
        (0, debug_1.logSignature)(signature, 'Liquidity removal');
        return {
            success: true,
            signature,
            baseAmount: Number(base),
            quoteAmount: Number(quote),
        };
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error removing liquidity:', error);
        // Provide more specific error information
        let errorMessage = 'Remove liquidity failed';
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
//# sourceMappingURL=liquidity.js.map