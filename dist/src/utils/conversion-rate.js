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
const bc_helper_1 = require("../bonding-curve/bc-helper");
const constants_1 = require("../bonding-curve/idl/constants");
/**
 * Parse bonding curve account data from account info
 */
async function getBondingCurveData(connection, mint) {
    try {
        const [bondingCurvePDA] = (0, bc_helper_1.deriveBondingCurveAddress)(mint);
        const accountInfo = await connection.getAccountInfo(bondingCurvePDA);
        if (!accountInfo) {
            return null;
        }
        // Verify it's owned by PumpFun program
        if (!accountInfo.owner.equals(constants_1.PUMP_PROGRAM_ID)) {
            return null;
        }
        // Bonding curve account layout (based on IDL):
        // - discriminator: [u8; 8] (8 bytes) - Anchor account discriminator
        // - virtual_token_reserves: u64 (8 bytes)
        // - virtual_sol_reserves: u64 (8 bytes)
        // - real_token_reserves: u64 (8 bytes)
        // - real_sol_reserves: u64 (8 bytes)
        // - token_total_supply: u64 (8 bytes)
        // - complete: bool (1 byte)
        // - creator: pubkey (32 bytes)
        const data = accountInfo.data;
        let offset = 8; // Skip discriminator
        // Read u64 values (little-endian)
        const readU64 = (start) => {
            const buffer = data.slice(start, start + 8);
            return new bn_js_1.default(buffer, 'le');
        };
        const virtualTokenReserves = readU64(offset);
        offset += 8;
        const virtualSolReserves = readU64(offset);
        offset += 8;
        const realTokenReserves = readU64(offset);
        offset += 8;
        const realSolReserves = readU64(offset);
        offset += 8;
        const tokenTotalSupply = readU64(offset);
        offset += 8;
        const complete = data[offset] !== 0;
        return {
            virtualTokenReserves,
            virtualSolReserves,
            realTokenReserves,
            realSolReserves,
            tokenTotalSupply,
            complete,
        };
    }
    catch (error) {
        (0, debug_1.debugLog)(`Failed to parse bonding curve data: ${error}`);
        return null;
    }
}
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
        // Convert token amount to base units (accounting for decimals)
        const baseAmount = new bn_js_1.default(Math.floor(tokenAmount * Math.pow(10, tokenDecimals)));
        // Try AMM first if poolKey is provided, or if we can find AMM pools
        let quoteOut = null;
        if (poolKey) {
            // Use provided AMM pool
            (0, debug_1.debugLog)(`Using provided AMM pool: ${poolKey.toString()}`);
            try {
                const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
                const dummyWallet = web3_js_1.PublicKey.default;
                const swapSolanaState = await (0, retry_1.retryWithBackoff)(async () => {
                    return await pumpAmmSdk.swapSolanaState(poolKey, dummyWallet);
                }, 3, 2000);
                const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
                const baseReserve = new bn_js_1.default(poolBaseAmount);
                const quoteReserve = new bn_js_1.default(poolQuoteAmount);
                const k = baseReserve.mul(quoteReserve);
                const newBaseReserve = baseReserve.add(baseAmount);
                const newQuoteReserve = k.div(newBaseReserve);
                quoteOut = quoteReserve.sub(newQuoteReserve);
                (0, debug_1.debugLog)(`✅ Calculated using AMM pool`);
            }
            catch (error) {
                (0, debug_1.debugLog)(`AMM pool calculation failed, trying bonding curve...`);
            }
        }
        else {
            // Try to find AMM pool first
            (0, debug_1.debugLog)('🔍 Searching for AMM pools...');
            const pools = await (0, amm_1.findPoolsForToken)(connection, tokenMint);
            if (pools.length > 0) {
                const targetPoolKey = pools[0];
                (0, debug_1.debugLog)(`✅ Found AMM pool: ${targetPoolKey.toString()}`);
                try {
                    const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
                    const dummyWallet = web3_js_1.PublicKey.default;
                    const swapSolanaState = await (0, retry_1.retryWithBackoff)(async () => {
                        return await pumpAmmSdk.swapSolanaState(targetPoolKey, dummyWallet);
                    }, 3, 2000);
                    const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
                    const baseReserve = new bn_js_1.default(poolBaseAmount);
                    const quoteReserve = new bn_js_1.default(poolQuoteAmount);
                    const k = baseReserve.mul(quoteReserve);
                    const newBaseReserve = baseReserve.add(baseAmount);
                    const newQuoteReserve = k.div(newBaseReserve);
                    quoteOut = quoteReserve.sub(newQuoteReserve);
                    (0, debug_1.debugLog)(`✅ Calculated using AMM pool`);
                }
                catch (error) {
                    (0, debug_1.debugLog)(`AMM pool calculation failed, trying bonding curve...`);
                }
            }
        }
        // If AMM didn't work, try bonding curve
        if (quoteOut === null) {
            (0, debug_1.debugLog)('🔍 Trying bonding curve...');
            const bondingCurveData = await getBondingCurveData(connection, tokenMint);
            if (!bondingCurveData) {
                (0, debug_1.logError)('No AMM pools or bonding curve found for this token');
                return null;
            }
            if (bondingCurveData.complete) {
                (0, debug_1.logError)('Bonding curve is complete - token has been migrated to AMM');
                return null;
            }
            // Calculate using bonding curve formula (constant product with virtual reserves)
            // Formula: k = virtual_token_reserves * virtual_sol_reserves (constant product)
            // After adding baseAmount to virtual_token_reserves, new virtual_sol_reserves = k / new_virtual_token_reserves
            // SOL received = virtual_sol_reserves - new_virtual_sol_reserves
            const { virtualTokenReserves, virtualSolReserves } = bondingCurveData;
            const k = virtualTokenReserves.mul(virtualSolReserves);
            const newVirtualTokenReserves = virtualTokenReserves.add(baseAmount);
            const newVirtualSolReserves = k.div(newVirtualTokenReserves);
            quoteOut = virtualSolReserves.sub(newVirtualSolReserves);
            (0, debug_1.debugLog)(`✅ Calculated using bonding curve`);
            (0, debug_1.debugLog)(`   Virtual reserves - Tokens: ${virtualTokenReserves.toString()}, SOL: ${virtualSolReserves.toString()}`);
        }
        if (!quoteOut || quoteOut.lt(new bn_js_1.default(0))) {
            (0, debug_1.logError)('Invalid calculation result: negative SOL amount');
            return null;
        }
        // Apply slippage tolerance (reduce output by slippage amount)
        const slippageMultiplier = new bn_js_1.default(Math.floor((1 - slippage) * 10000)); // Convert to basis points
        const quoteOutWithSlippage = quoteOut.mul(slippageMultiplier).div(new bn_js_1.default(10000));
        if (quoteOutWithSlippage.lt(new bn_js_1.default(0))) {
            (0, debug_1.logError)('Invalid calculation result after slippage: negative SOL amount');
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
        // Convert SOL amount to lamports
        const solAmountLamports = new bn_js_1.default(Math.floor(solAmount * web3_js_1.LAMPORTS_PER_SOL));
        // Try AMM first if poolKey is provided, or if we can find AMM pools
        let baseOut = null;
        if (poolKey) {
            // Use provided AMM pool
            (0, debug_1.debugLog)(`Using provided AMM pool: ${poolKey.toString()}`);
            try {
                const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
                const dummyWallet = web3_js_1.PublicKey.default;
                const swapSolanaState = await (0, retry_1.retryWithBackoff)(async () => {
                    return await pumpAmmSdk.swapSolanaState(poolKey, dummyWallet);
                }, 3, 2000);
                const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
                const baseReserve = new bn_js_1.default(poolBaseAmount);
                const quoteReserve = new bn_js_1.default(poolQuoteAmount);
                const k = baseReserve.mul(quoteReserve);
                const newQuoteReserve = quoteReserve.add(solAmountLamports);
                const newBaseReserve = k.div(newQuoteReserve);
                baseOut = baseReserve.sub(newBaseReserve);
                (0, debug_1.debugLog)(`✅ Calculated using AMM pool`);
            }
            catch (error) {
                (0, debug_1.debugLog)(`AMM pool calculation failed, trying bonding curve...`);
            }
        }
        else {
            // Try to find AMM pool first
            (0, debug_1.debugLog)('🔍 Searching for AMM pools...');
            const pools = await (0, amm_1.findPoolsForToken)(connection, tokenMint);
            if (pools.length > 0) {
                const targetPoolKey = pools[0];
                (0, debug_1.debugLog)(`✅ Found AMM pool: ${targetPoolKey.toString()}`);
                try {
                    const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
                    const dummyWallet = web3_js_1.PublicKey.default;
                    const swapSolanaState = await (0, retry_1.retryWithBackoff)(async () => {
                        return await pumpAmmSdk.swapSolanaState(targetPoolKey, dummyWallet);
                    }, 3, 2000);
                    const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
                    const baseReserve = new bn_js_1.default(poolBaseAmount);
                    const quoteReserve = new bn_js_1.default(poolQuoteAmount);
                    const k = baseReserve.mul(quoteReserve);
                    const newQuoteReserve = quoteReserve.add(solAmountLamports);
                    const newBaseReserve = k.div(newQuoteReserve);
                    baseOut = baseReserve.sub(newBaseReserve);
                    (0, debug_1.debugLog)(`✅ Calculated using AMM pool`);
                }
                catch (error) {
                    (0, debug_1.debugLog)(`AMM pool calculation failed, trying bonding curve...`);
                }
            }
        }
        // If AMM didn't work, try bonding curve
        if (baseOut === null) {
            (0, debug_1.debugLog)('🔍 Trying bonding curve...');
            const bondingCurveData = await getBondingCurveData(connection, tokenMint);
            if (!bondingCurveData) {
                (0, debug_1.logError)('No AMM pools or bonding curve found for this token');
                return null;
            }
            if (bondingCurveData.complete) {
                (0, debug_1.logError)('Bonding curve is complete - token has been migrated to AMM');
                return null;
            }
            // Calculate using bonding curve formula (constant product with virtual reserves)
            // Formula: k = virtual_token_reserves * virtual_sol_reserves (constant product)
            // After adding solAmountLamports to virtual_sol_reserves, new virtual_token_reserves = k / new_virtual_sol_reserves
            // Tokens received = virtual_token_reserves - new_virtual_token_reserves
            const { virtualTokenReserves, virtualSolReserves } = bondingCurveData;
            const k = virtualTokenReserves.mul(virtualSolReserves);
            const newVirtualSolReserves = virtualSolReserves.add(solAmountLamports);
            const newVirtualTokenReserves = k.div(newVirtualSolReserves);
            baseOut = virtualTokenReserves.sub(newVirtualTokenReserves);
            (0, debug_1.debugLog)(`✅ Calculated using bonding curve`);
            (0, debug_1.debugLog)(`   Virtual reserves - Tokens: ${virtualTokenReserves.toString()}, SOL: ${virtualSolReserves.toString()}`);
        }
        if (!baseOut || baseOut.lt(new bn_js_1.default(0))) {
            (0, debug_1.logError)('Invalid calculation result: negative token amount');
            return null;
        }
        // Apply slippage tolerance (reduce output by slippage amount)
        const slippageMultiplier = new bn_js_1.default(Math.floor((1 - slippage) * 10000)); // Convert to basis points
        const baseOutWithSlippage = baseOut.mul(slippageMultiplier).div(new bn_js_1.default(10000));
        if (baseOutWithSlippage.lt(new bn_js_1.default(0))) {
            (0, debug_1.logError)('Invalid calculation result after slippage: negative token amount');
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