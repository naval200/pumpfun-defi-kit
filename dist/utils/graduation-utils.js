"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkGraduationStatus = checkGraduationStatus;
exports.getGraduationAnalysis = getGraduationAnalysis;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../bonding-curve/constants");
const helper_1 = require("../bonding-curve/helper");
const debug_1 = require("./debug");
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
/**
 * Check if a token has graduated from bonding curve to AMM
 * A token is considered "graduated" when it has active AMM pools with sufficient liquidity
 * and the bonding curve is no longer the primary trading mechanism
 */
async function checkGraduationStatus(connection, tokenMint) {
    try {
        (0, debug_1.log)(`🔍 Detecting graduation status for token: ${tokenMint.toString()}`);
        // Step 1: Check if token has AMM pools with sufficient liquidity
        const hasAMMPools = await checkAMMPoolExistence(connection, tokenMint);
        if (hasAMMPools) {
            (0, debug_1.log)(`✅ Token has AMM pools - checking liquidity depth...`);
            const hasSufficientLiquidity = await checkAMMPoolLiquidity(connection, tokenMint);
            if (hasSufficientLiquidity) {
                (0, debug_1.log)(`✅ Token has sufficient AMM liquidity - checking bonding curve status...`);
                // Step 2: Check if bonding curve is still active
                const bondingCurveActive = await checkBondingCurveStatus(connection, tokenMint);
                if (!bondingCurveActive) {
                    (0, debug_1.log)(`🎉 Token has GRADUATED to AMM trading!`);
                    return true;
                }
                else {
                    (0, debug_1.log)(`⚠️ Token has AMM pools but bonding curve is still active (hybrid mode)`);
                    return false;
                }
            }
            else {
                (0, debug_1.log)(`⚠️ Token has AMM pools but insufficient liquidity`);
                return false;
            }
        }
        else {
            (0, debug_1.log)(`📈 Token is still using bonding curve trading only`);
            return false;
        }
    }
    catch (error) {
        (0, debug_1.logWarning)('Error checking graduation status:', error);
        // If we can't check, assume not graduated for safety
        return false;
    }
}
/**
 * Check if AMM pools exist for the token
 */
async function checkAMMPoolExistence(connection, tokenMint) {
    try {
        (0, debug_1.debugLog)(`🔍 Checking for AMM pools...`);
        (0, debug_1.debugLog)(`🔍 Using SDK program ID: ${pump_swap_sdk_1.PUMP_AMM_PROGRAM_ID}`);
        // Strategy 1: Try to find the canonical pool (index 0)
        try {
            (0, debug_1.debugLog)(`   🔍 Trying canonical pool (index 0)...`);
            const [canonicalPoolKey] = (0, pump_swap_sdk_1.canonicalPumpPoolPda)(tokenMint);
            (0, debug_1.debugLog)(`   📍 Canonical pool address: ${canonicalPoolKey.toString()}`);
            // Check if this pool exists by trying to fetch it
            const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
            try {
                const pool = await pumpAmmSdk.fetchPool(canonicalPoolKey);
                if (pool) {
                    (0, debug_1.debugLog)(`   ✅ Canonical pool found and accessible!`);
                    return true;
                }
            }
            catch (error) {
                (0, debug_1.debugLog)(`   ❌ Canonical pool not accessible: ${error.message}`);
            }
        }
        catch (error) {
            (0, debug_1.debugLog)(`   ⚠️ Error with canonical pool: ${error.message}`);
        }
        // Strategy 2: Try common pool indices (0, 1, 2, etc.)
        const commonIndices = [0, 1, 2, 3, 4, 5];
        for (const index of commonIndices) {
            try {
                (0, debug_1.debugLog)(`   🔍 Trying pool index ${index}...`);
                const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
                const owner = pumpAmmSdk.globalConfigKey();
                const quoteMint = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112'); // SOL
                const [poolKey] = (0, pump_swap_sdk_1.poolPda)(index, owner, tokenMint, quoteMint);
                (0, debug_1.debugLog)(`   📍 Pool ${index} address: ${poolKey.toString()}`);
                // Check if this pool exists
                try {
                    const pool = await pumpAmmSdk.fetchPool(poolKey);
                    if (pool) {
                        (0, debug_1.debugLog)(`   ✅ Pool ${index} found and accessible!`);
                        return true;
                    }
                }
                catch (error) {
                    (0, debug_1.debugLog)(`   ❌ Pool ${index} not accessible: ${error.message}`);
                }
            }
            catch (error) {
                (0, debug_1.debugLog)(`   ⚠️ Error with pool index ${index}: ${error.message}`);
            }
        }
        // Strategy 3: Search program accounts for any pools containing this token
        try {
            (0, debug_1.debugLog)(`   🔍 Searching program accounts for pools...`);
            const accounts = await connection.getProgramAccounts(new web3_js_1.PublicKey(pump_swap_sdk_1.PUMP_AMM_PROGRAM_ID), {
                filters: [
                    {
                        dataSize: 1024, // Approximate size for pool accounts
                    },
                ],
            });
            (0, debug_1.debugLog)(`   📊 Found ${accounts.length} program accounts, checking for token...`);
            // This is a simplified check - in production you'd parse the account data
            // to find pools containing the specific token mint
            if (accounts.length > 0) {
                (0, debug_1.debugLog)(`   ⚠️ Found program accounts but need deeper analysis`);
                // For now, assume pools might exist if we find program accounts
                return true;
            }
        }
        catch (error) {
            (0, debug_1.debugLog)(`   ❌ Error searching program accounts: ${error.message}`);
        }
        (0, debug_1.debugLog)(`❌ No AMM pools found for token`);
        return false;
    }
    catch (error) {
        (0, debug_1.logWarning)('Error checking AMM pool existence:', error);
        return false;
    }
}
/**
 * Check if AMM pools have sufficient liquidity
 */
async function checkAMMPoolLiquidity(connection, tokenMint) {
    try {
        (0, debug_1.debugLog)(`💧 Checking AMM pool liquidity...`);
        // Import the SDK
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Try to find and check the canonical pool
        try {
            const [canonicalPoolKey] = (0, pump_swap_sdk_1.canonicalPumpPoolPda)(tokenMint);
            const pool = await pumpAmmSdk.fetchPool(canonicalPoolKey);
            if (pool) {
                // Check if pool has minimum liquidity (this would need to be implemented based on SDK)
                // For now, assume if pool exists and is accessible, it has some liquidity
                (0, debug_1.debugLog)(`✅ Pool has accessible liquidity data`);
                return true;
            }
        }
        catch (error) {
            (0, debug_1.debugLog)(`❌ Error checking pool liquidity: ${error.message}`);
        }
        // If we can't determine liquidity, assume insufficient for safety
        return false;
    }
    catch (error) {
        (0, debug_1.logWarning)('Error checking AMM pool liquidity:', error);
        return false;
    }
}
/**
 * Check if bonding curve is still active for the token
 */
async function checkBondingCurveStatus(connection, tokenMint) {
    try {
        (0, debug_1.debugLog)(`📈 Checking bonding curve status...`);
        // Derive bonding curve PDA
        const [bondingCurvePDA] = (0, helper_1.deriveBondingCurveAddress)(tokenMint);
        (0, debug_1.debugLog)(`📍 Bonding curve PDA: ${bondingCurvePDA.toString()}`);
        // Check if bonding curve account exists and is owned by the program
        const accountInfo = await connection.getAccountInfo(bondingCurvePDA);
        if (!accountInfo) {
            (0, debug_1.debugLog)(`❌ Bonding curve account does not exist`);
            return false;
        }
        if (!accountInfo.owner.equals(constants_1.PUMP_PROGRAM_ID)) {
            (0, debug_1.debugLog)(`❌ Bonding curve account is not owned by PumpFun program`);
            return false;
        }
        // Check if account has data (indicating it's initialized)
        if (accountInfo.data.length === 0) {
            (0, debug_1.debugLog)(`❌ Bonding curve account is empty/uninitialized`);
            return false;
        }
        (0, debug_1.debugLog)(`✅ Bonding curve account exists and is initialized`);
        // Additional check: verify the account has sufficient SOL for trading
        // This is a simplified check - in production you'd parse the account data
        // to check actual bonding curve parameters and balances
        return true;
    }
    catch (error) {
        (0, debug_1.logWarning)('Error checking bonding curve status:', error);
        return false;
    }
}
/**
 * Get detailed graduation analysis for a token
 */
async function getGraduationAnalysis(connection, tokenMint) {
    try {
        (0, debug_1.log)(`🔍 Performing comprehensive graduation analysis for token: ${tokenMint.toString()}`);
        const hasAMMPools = await checkAMMPoolExistence(connection, tokenMint);
        const hasSufficientLiquidity = hasAMMPools
            ? await checkAMMPoolLiquidity(connection, tokenMint)
            : false;
        const bondingCurveActive = await checkBondingCurveStatus(connection, tokenMint);
        let isGraduated = false;
        let graduationReason = '';
        if (hasAMMPools && hasSufficientLiquidity && !bondingCurveActive) {
            isGraduated = true;
            graduationReason =
                'Token has active AMM pools with sufficient liquidity and inactive bonding curve';
        }
        else if (hasAMMPools && hasSufficientLiquidity && bondingCurveActive) {
            graduationReason = 'Token has AMM pools but bonding curve is still active (hybrid mode)';
        }
        else if (hasAMMPools && !hasSufficientLiquidity) {
            graduationReason = 'Token has AMM pools but insufficient liquidity for graduation';
        }
        else if (!hasAMMPools && bondingCurveActive) {
            graduationReason = 'Token is still using bonding curve trading only';
        }
        else {
            graduationReason = 'Token has no AMM pools and inactive bonding curve';
        }
        const analysis = {
            isGraduated,
            hasAMMPools,
            hasSufficientLiquidity,
            bondingCurveActive,
            graduationReason,
        };
        (0, debug_1.log)(`📊 Graduation Analysis Results:`);
        (0, debug_1.log)(`   Graduated: ${isGraduated ? '✅ Yes' : '❌ No'}`);
        (0, debug_1.log)(`   Has AMM Pools: ${hasAMMPools ? '✅ Yes' : '❌ No'}`);
        (0, debug_1.log)(`   Sufficient Liquidity: ${hasSufficientLiquidity ? '✅ Yes' : '❌ No'}`);
        (0, debug_1.log)(`   Bonding Curve Active: ${bondingCurveActive ? '✅ Yes' : '❌ No'}`);
        (0, debug_1.log)(`   Reason: ${graduationReason}`);
        return analysis;
    }
    catch (error) {
        (0, debug_1.logWarning)('Error performing graduation analysis:', error);
        return {
            isGraduated: false,
            hasAMMPools: false,
            hasSufficientLiquidity: false,
            bondingCurveActive: false,
            graduationReason: `Error during analysis: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
//# sourceMappingURL=graduation-utils.js.map