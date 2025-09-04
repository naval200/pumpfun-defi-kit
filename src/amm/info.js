"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPoolInfo = getPoolInfo;
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
/**
 * Get pool information for AMM trading
 */
async function getPoolInfo(connection, poolKey, wallet) {
    try {
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        const swapSolanaState = await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);
        return swapSolanaState;
    }
    catch (error) {
        (0, debug_1.logError)('Error getting pool info:', error);
        return null;
    }
}
//# sourceMappingURL=info.js.map