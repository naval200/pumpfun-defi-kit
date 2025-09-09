"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPool = createPool;
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const amm_1 = require("./amm");
const transaction_1 = require("../utils/transaction");
const retry_1 = require("../utils/retry");
const debug_1 = require("../utils/debug");
const amounts_1 = require("../utils/amounts");
/**
 * Create a new pool for a token with retry logic and better error handling
 */
async function createPool(connection, wallet, baseMint, quoteMint, baseIn, quoteIn, index = 0) {
    try {
        (0, debug_1.log)('🏊 Creating AMM liquidity pool...');
        (0, debug_1.log)(`Base mint: ${baseMint.toString()}`);
        (0, debug_1.log)(`Quote mint: ${quoteMint.toString()}`);
        (0, debug_1.log)(`Base amount: ${baseIn.toString()}`);
        (0, debug_1.log)(`Quote amount: ${(0, amounts_1.formatLamportsAsSol)(quoteIn)} SOL`);
        // Initialize SDK directly
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Get pool creation data with retry logic
        (0, debug_1.log)('🔧 Getting pool creation data...');
        const { createPoolSolanaState, createPoolInstructions, initialPoolPrice } = await (0, retry_1.retryWithBackoff)(async () => {
            return await (0, amm_1.getPoolCreationData)(pumpAmmSdk, index, wallet.publicKey, baseMint, quoteMint, baseIn, quoteIn);
        }, 3, 2000); // 3 retries, 2 second base delay
        (0, debug_1.log)(`Initial pool price: ${initialPoolPrice.toString()}`);
        // Send transaction with retry logic
        (0, debug_1.log)('📝 Sending pool creation transaction...');
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            return await (0, transaction_1.sendTransaction)(connection, wallet, createPoolInstructions);
        }, 3, 2000); // 3 retries, 2 second base delay
        (0, debug_1.logSignature)(signature, 'Pool creation');
        // Extract pool key from the state
        const poolKey = createPoolSolanaState.poolKey;
        return {
            success: true,
            poolKey,
            signature,
        };
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error creating pool:', error);
        // Provide more specific error information
        let errorMessage = 'Pool creation failed';
        if (error.message) {
            errorMessage = error.message;
        }
        else if (error.toString) {
            errorMessage = error.toString();
        }
        // Check for specific error patterns
        if (errorMessage.includes('amount.gtn is not a function')) {
            errorMessage = 'SDK type mismatch - parameters need to be converted to BigNumber';
        }
        else if (errorMessage.includes('AccountNotInitialized')) {
            errorMessage = 'Account not properly initialized - check wallet and mint setup';
        }
        return {
            success: false,
            error: errorMessage,
        };
    }
}
//# sourceMappingURL=createPool.js.map