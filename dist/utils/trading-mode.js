"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineTradingMode = determineTradingMode;
const amm_1 = require("../amm/amm");
const debug_1 = require("./debug");
/**
 * Determine the best trading mode for a token
 */
async function determineTradingMode(connection, tokenMint) {
    try {
        // Check AMM liquidity first
        (0, debug_1.log)(`Checking AMM liquidity for token: ${tokenMint.toString()}`);
        const hasAMMLiquidity = await (0, amm_1.checkAMMPoolLiquidity)(connection, tokenMint);
        if (hasAMMLiquidity) {
            return 'amm';
        }
        // For now, assume bonding curve if no AMM liquidity
        // In a full implementation, you would check for bonding curve parameters
        (0, debug_1.log)(`Checking bonding curve for token: ${tokenMint.toString()}`);
        // Simple check: if no AMM, assume bonding curve
        return 'bonding-curve';
    }
    catch (error) {
        // If we can't determine, default to none
        return 'none';
    }
}
//# sourceMappingURL=trading-mode.js.map