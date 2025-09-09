"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPoolCreationData = getPoolCreationData;
exports.findPoolsForToken = findPoolsForToken;
exports.checkAMMPoolLiquidity = checkAMMPoolLiquidity;
exports.getAMMPoolInfo = getAMMPoolInfo;
const tslib_1 = require("tslib");
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const debug_1 = require("../utils/debug");
const amounts_1 = require("../utils/amounts");
/**
 * Get pool creation data with BigNumber parameters
 */
async function getPoolCreationData(pumpAmmSdk, index, creator, baseMint, quoteMint, baseIn, quoteIn) {
    (0, debug_1.debugLog)(`🔧 Converting pool creation parameters to bigint:`);
    (0, debug_1.debugLog)(`   Base amount: ${baseIn.toString()}`);
    (0, debug_1.debugLog)(`   Quote amount: ${(0, amounts_1.formatLamportsAsSol)(quoteIn)} SOL`);
    // Get pool creation state
    const createPoolSolanaState = await pumpAmmSdk.createPoolSolanaState(index, creator, baseMint, quoteMint);
    const baseInBN = new bn_js_1.default(baseIn);
    const quoteInBN = new bn_js_1.default(quoteIn);
    // Get pool creation instructions with BigNumber parameters
    const createPoolInstructions = await pumpAmmSdk.createPoolInstructions(createPoolSolanaState, baseInBN, quoteInBN);
    // Get initial pool price for UI
    const initialPoolPriceBN = await pumpAmmSdk.createAutocompleteInitialPoolPrice(baseInBN, quoteInBN);
    const initialPoolPrice = Number(initialPoolPriceBN.toString());
    return {
        createPoolSolanaState,
        createPoolInstructions,
        initialPoolPrice,
    };
}
/**
 * Find AMM pools for a given token mint using SDK methods
 */
async function findPoolsForToken(connection, tokenMint) {
    try {
        (0, debug_1.debugLog)(`🔍 Searching for AMM pools for token: ${tokenMint.toString()}`);
        (0, debug_1.debugLog)(`🔍 Using SDK program ID: ${pump_swap_sdk_1.PUMP_AMM_PROGRAM_ID}`);
        const foundPools = [];
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
                    foundPools.push(canonicalPoolKey);
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
                // For now, we'll use a simple approach since we need the owner and quote mint
                // We'll use the global config as owner and SOL as quote mint
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
                        if (!foundPools.some(p => p.equals(poolKey))) {
                            foundPools.push(poolKey);
                        }
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
        // Strategy 3: If no pools found, try a broader search using program accounts
        if (foundPools.length === 0) {
            (0, debug_1.debugLog)(`🔍 No pools found with SDK methods, trying program account search...`);
            try {
                // Get all accounts from the program and filter by data content
                const allAccounts = await connection.getProgramAccounts(new web3_js_1.PublicKey(pump_swap_sdk_1.PUMP_AMM_PROGRAM_ID), {
                    commitment: 'confirmed',
                });
                (0, debug_1.debugLog)(`   📊 Found ${allAccounts.length} total accounts in program`);
                // Filter accounts that might be pools by checking if they contain our token mint
                const potentialPools = allAccounts.filter(account => {
                    try {
                        const accountData = account.account.data;
                        const mintString = tokenMint.toBase58();
                        // Check if account data contains our token mint
                        const dataString = accountData.toString('utf8');
                        if (dataString.includes(mintString)) {
                            return true;
                        }
                        // Also check raw bytes for the mint
                        const mintBytes = tokenMint.toBytes();
                        for (let i = 0; i <= accountData.length - mintBytes.length; i++) {
                            let match = true;
                            for (let j = 0; j < mintBytes.length; j++) {
                                if (accountData[i + j] !== mintBytes[j]) {
                                    match = false;
                                    break;
                                }
                            }
                            if (match)
                                return true;
                        }
                        return false;
                    }
                    catch (error) {
                        return false;
                    }
                });
                (0, debug_1.debugLog)(`   🔍 Found ${potentialPools.length} potential pool(s) in program account search`);
                potentialPools.forEach(account => {
                    if (!foundPools.some(pool => pool.equals(account.pubkey))) {
                        foundPools.push(account.pubkey);
                    }
                });
            }
            catch (error) {
                (0, debug_1.debugLog)(`   ⚠️ Program account search failed: ${error.message}`);
            }
        }
        const finalPools = foundPools.filter((pool, index, self) => index === self.findIndex(p => p.equals(pool)));
        (0, debug_1.debugLog)(`🔍 Final total unique pools found: ${finalPools.length}`);
        return finalPools;
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error searching for AMM pools:', error);
        return [];
    }
}
/**
 * Check if AMM pool has liquidity
 */
async function checkAMMPoolLiquidity(connection, tokenMint) {
    try {
        // For now, return false as a placeholder
        // In a full implementation, you would check the pool's liquidity
        (0, debug_1.log)(`Checking AMM pool liquidity for token: ${tokenMint.toString()}`);
        return false;
    }
    catch (error) {
        (0, debug_1.logWarning)('Error checking AMM pool liquidity:', error);
        return false;
    }
}
/**
 * Get AMM pool info
 */
async function getAMMPoolInfo(connection, tokenMint) {
    try {
        // For now, return null as a placeholder
        // In a full implementation, you would fetch and return pool information
        (0, debug_1.log)(`Getting AMM pool info for token: ${tokenMint.toString()}`);
        return null;
    }
    catch (error) {
        (0, debug_1.logWarning)('Error getting AMM pool info:', error);
        return null;
    }
}
//# sourceMappingURL=amm.js.map