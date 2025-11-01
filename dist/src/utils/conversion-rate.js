"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenToSolConversionRate = getTokenToSolConversionRate;
exports.getSolToTokenConversionRate = getSolToTokenConversionRate;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const retry_1 = require("./retry");
const debug_1 = require("./debug");
const amm_1 = require("../amm/amm");
/**
 * Get the conversion rate from token to SOL using PumpFun SDK
 *
 * @param connection - Solana connection
 * @param tokenMint - Token mint address
 * @param tokenAmount - Amount of tokens (in token units, not accounting for decimals)
 * @param tokenDecimals - Token decimals (default: 0, assumes amount is already in base units)
 * @param slippage - Slippage tolerance as a decimal (default: 0.005 = 0.5%)
 * @param poolKey - Optional pool key. If not provided, will search for pools
 * @returns Promise resolving to conversion rate (SOL per token) or null if unable to fetch
 */
async function getTokenToSolConversionRate(connection, tokenMint, tokenAmount = 1, tokenDecimals = 0, slippage = 0.005, poolKey) {
    try {
        (0, debug_1.debugLog)(`💱 Getting conversion rate for ${tokenAmount} tokens to SOL`);
        // Find pool if not provided
        let targetPoolKey;
        if (poolKey) {
            targetPoolKey = poolKey;
            (0, debug_1.debugLog)(`Using provided pool: ${targetPoolKey.toString()}`);
        }
        else {
            (0, debug_1.debugLog)('🔍 Searching for AMM pools...');
            const pools = await (0, amm_1.findPoolsForToken)(connection, tokenMint);
            if (pools.length === 0) {
                (0, debug_1.logError)('No AMM pools found for this token');
                return null;
            }
            targetPoolKey = pools[0];
            (0, debug_1.debugLog)(`✅ Found pool: ${targetPoolKey.toString()}`);
        }
        // Initialize SDK
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Use a dummy wallet for quote calculations (we're not executing a transaction)
        const dummyWallet = web3_js_1.PublicKey.default;
        // Get swap state
        const swapSolanaState = await (0, retry_1.retryWithBackoff)(async () => {
            return await pumpAmmSdk.swapSolanaState(targetPoolKey, dummyWallet);
        }, 3, 2000);
        // Convert token amount to base units (accounting for decimals)
        const baseAmount = new bn_js_1.default(Math.floor(tokenAmount * Math.pow(10, tokenDecimals)));
        // Calculate expected SOL amount using AMM formula (constant product)
        // Formula: k = baseReserve * quoteReserve (constant product)
        // After adding baseAmount to baseReserve, new quoteReserve = k / newBaseReserve
        // SOL received = quoteReserve - newQuoteReserve
        const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
        const baseReserve = new bn_js_1.default(poolBaseAmount);
        const quoteReserve = new bn_js_1.default(poolQuoteAmount);
        const k = baseReserve.mul(quoteReserve);
        const newBaseReserve = baseReserve.add(baseAmount);
        const newQuoteReserve = k.div(newBaseReserve);
        const quoteOut = quoteReserve.sub(newQuoteReserve);
        // Apply slippage tolerance (reduce output by slippage amount)
        const slippageMultiplier = new bn_js_1.default(Math.floor((1 - slippage) * 10000)); // Convert to basis points
        const quoteOutWithSlippage = quoteOut.mul(slippageMultiplier).div(new bn_js_1.default(10000));
        if (quoteOutWithSlippage.lt(new bn_js_1.default(0))) {
            (0, debug_1.logError)('Invalid calculation result: negative SOL amount');
            return null;
        }
        // Convert SOL amount from lamports to SOL
        const solAmount = quoteOutWithSlippage.toNumber() / web3_js_1.LAMPORTS_PER_SOL;
        // Calculate conversion rate (SOL per token)
        const conversionRate = solAmount / tokenAmount;
        (0, debug_1.debugLog)(`✅ Conversion rate: ${conversionRate} SOL per token`);
        (0, debug_1.debugLog)(`   ${tokenAmount} tokens = ${solAmount} SOL`);
        return conversionRate;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`❌ Error fetching token to SOL conversion rate: ${errorMessage}`);
        return null;
    }
}
/**
 * Get the conversion rate from SOL to token using PumpFun SDK
 *
 * @param connection - Solana connection
 * @param tokenMint - Token mint address
 * @param solAmount - Amount of SOL (default: 1 SOL)
 * @param slippage - Slippage tolerance as a decimal (default: 0.005 = 0.5%)
 * @param poolKey - Optional pool key. If not provided, will search for pools
 * @returns Promise resolving to conversion rate (tokens per SOL) or null if unable to fetch
 */
async function getSolToTokenConversionRate(connection, tokenMint, solAmount = 1, slippage = 0.005, poolKey) {
    try {
        (0, debug_1.debugLog)(`💱 Getting conversion rate for ${solAmount} SOL to tokens`);
        // Find pool if not provided
        let targetPoolKey;
        if (poolKey) {
            targetPoolKey = poolKey;
            (0, debug_1.debugLog)(`Using provided pool: ${targetPoolKey.toString()}`);
        }
        else {
            (0, debug_1.debugLog)('🔍 Searching for AMM pools...');
            const pools = await (0, amm_1.findPoolsForToken)(connection, tokenMint);
            if (pools.length === 0) {
                (0, debug_1.logError)('No AMM pools found for this token');
                return null;
            }
            targetPoolKey = pools[0];
            (0, debug_1.debugLog)(`✅ Found pool: ${targetPoolKey.toString()}`);
        }
        // Initialize SDK
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Use a dummy wallet for quote calculations
        const dummyWallet = web3_js_1.PublicKey.default;
        // Get swap state
        const swapSolanaState = await (0, retry_1.retryWithBackoff)(async () => {
            return await pumpAmmSdk.swapSolanaState(targetPoolKey, dummyWallet);
        }, 3, 2000);
        // Convert SOL amount to lamports
        const solAmountLamports = new bn_js_1.default(Math.floor(solAmount * web3_js_1.LAMPORTS_PER_SOL));
        // Calculate expected token amount using AMM formula (constant product)
        // Formula: k = baseReserve * quoteReserve (constant product)
        // After adding solAmountLamports to quoteReserve, new baseReserve = k / newQuoteReserve
        // Tokens received = baseReserve - newBaseReserve
        const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
        const baseReserve = new bn_js_1.default(poolBaseAmount);
        const quoteReserve = new bn_js_1.default(poolQuoteAmount);
        const k = baseReserve.mul(quoteReserve);
        const newQuoteReserve = quoteReserve.add(solAmountLamports);
        const newBaseReserve = k.div(newQuoteReserve);
        const baseOut = baseReserve.sub(newBaseReserve);
        // Apply slippage tolerance (reduce output by slippage amount)
        const slippageMultiplier = new bn_js_1.default(Math.floor((1 - slippage) * 10000)); // Convert to basis points
        const baseOutWithSlippage = baseOut.mul(slippageMultiplier).div(new bn_js_1.default(10000));
        if (baseOutWithSlippage.lt(new bn_js_1.default(0))) {
            (0, debug_1.logError)('Invalid calculation result: negative token amount');
            return null;
        }
        // Calculate conversion rate (tokens per SOL)
        // Note: baseOut is in token base units
        const tokenAmount = baseOutWithSlippage.toNumber();
        const conversionRate = tokenAmount / solAmount;
        (0, debug_1.debugLog)(`✅ Conversion rate: ${conversionRate} tokens per SOL`);
        (0, debug_1.debugLog)(`   ${solAmount} SOL = ${tokenAmount} tokens`);
        return conversionRate;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`❌ Error fetching SOL to token conversion rate: ${errorMessage}`);
        return null;
    }
}
//# sourceMappingURL=conversion-rate.js.map