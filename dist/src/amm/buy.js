"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyAmmTokens = buyAmmTokens;
exports.createSignedAmmBuyTransaction = createSignedAmmBuyTransaction;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const transaction_1 = require("../utils/transaction");
const retry_1 = require("../utils/retry");
const debug_1 = require("../utils/debug");
const instructions_1 = require("./instructions");
const amounts_1 = require("../utils/amounts");
/**
 * Buy tokens using SOL with retry logic and better error handling
 */
async function buyAmmTokens(connection, wallet, poolKey, amountLamports, slippage = 1, feePayer, options) {
    try {
        // Validate amount is positive and reasonable
        if (amountLamports <= 0) {
            throw new Error('Amount must be positive');
        }
        (0, debug_1.log)(`💰 Buying tokens from pool: ${poolKey.toString()}`);
        (0, debug_1.log)(`SOL amount: ${(0, amounts_1.formatLamportsAsSol)(amountLamports)} SOL`);
        // Initialize SDKs directly
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Get swap state with retry logic
        (0, debug_1.debugLog)('🔍 Getting swap state...');
        const swapSolanaState = await (0, retry_1.retryWithBackoff)(async () => {
            return await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);
        }, 3, 2000);
        const { poolBaseAmount, poolQuoteAmount } = swapSolanaState;
        (0, debug_1.debugLog)(`Pool reserves - Base: ${poolBaseAmount.toString()}, Quote: ${poolQuoteAmount.toString()}`);
        // Check if reserves are valid
        if (poolBaseAmount.lt(new bn_js_1.default(0)) || poolQuoteAmount.lt(new bn_js_1.default(0))) {
            throw new Error(`Invalid pool reserves: Base=${poolBaseAmount.toString()}, Quote=${poolQuoteAmount.toString()}. Pool may be empty or corrupted.`);
        }
        // Calculate expected base amount using simple AMM formula
        const amountLamportsBN = new bn_js_1.default(amountLamports);
        const k = poolBaseAmount.mul(poolQuoteAmount);
        const newQuoteReserve = poolQuoteAmount.add(amountLamportsBN);
        const newBaseReserve = k.div(newQuoteReserve);
        const baseOut = poolBaseAmount.sub(newBaseReserve);
        (0, debug_1.debugLog)(`Expected base amount: ${baseOut.toString()}`);
        // Validate calculation result
        if (baseOut.lt(new bn_js_1.default(0))) {
            throw new Error(`Invalid AMM calculation: baseOut=${baseOut.toString()}. This suggests insufficient liquidity or calculation error.`);
        }
        // Execute buy transaction with retry logic
        (0, debug_1.debugLog)('📝 Executing buy transaction...');
        const effectiveState = options?.swapSolanaState || swapSolanaState;
        let instructions = await (0, instructions_1.createAmmBuyInstructionsAssuming)(pumpAmmSdk, effectiveState, amountLamports, slippage);
        (0, debug_1.debugLog)(`Created ${instructions.length} instructions`);
        // Send transaction with retry logic
        (0, debug_1.debugLog)('📤 Executing Transaction...');
        const signature = await (0, retry_1.retryWithBackoff)(async () => {
            if (feePayer) {
                (0, debug_1.debugLog)(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
                return await (0, transaction_1.sendTransactionWithFeePayer)(connection, wallet, instructions, feePayer);
            }
            else {
                return await (0, transaction_1.sendTransaction)(connection, wallet, instructions);
            }
        }, 3, 2000);
        (0, debug_1.logSuccess)(`Buy transaction successful! Signature: ${signature}`);
        // Final transaction summary
        (0, debug_1.debugLog)('🎉 Transaction Success Summary:');
        (0, debug_1.debugLog)(`  ✅ Status: Confirmed on-chain`);
        (0, debug_1.debugLog)(`  🔗 Signature: ${signature}`);
        (0, debug_1.debugLog)(`  💰 SOL Spent: ${(0, amounts_1.formatLamportsAsSol)(amountLamports)} SOL`);
        (0, debug_1.debugLog)(`  🪙 TBC Received: ${baseOut.toString()} TBC tokens`);
        return {
            success: true,
            signature,
            baseAmount: Number(baseOut.toString()),
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`Buy failed: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage,
        };
    }
}
/**
 * Create signed AMM buy transaction without submitting it
 * Returns the signed transaction for batch processing
 */
async function createSignedAmmBuyTransaction(connection, wallet, poolKey, quoteAmountLamports, slippage = 1, feePayer, blockhash, options) {
    try {
        // Validate amount is positive
        if (quoteAmountLamports < 0) {
            throw new Error('Quote amount must be positive');
        }
        (0, debug_1.debugLog)(`🔧 Creating Signed AMM Buy Transaction:`);
        (0, debug_1.debugLog)(`  💰 Amount: ${(0, amounts_1.formatLamportsAsSol)(quoteAmountLamports)} SOL`);
        (0, debug_1.debugLog)(`  🎯 Pool: ${poolKey.toString()}`);
        (0, debug_1.debugLog)(`  📊 Slippage: ${slippage} basis points (${(slippage / 100).toFixed(2)}%)`);
        (0, debug_1.debugLog)(`  👤 Wallet: ${wallet.publicKey.toString()}`);
        (0, debug_1.debugLog)(`  💸 Fee Payer: ${feePayer ? feePayer.publicKey.toString() : 'Same as wallet'}`);
        // Initialize SDKs directly
        const pumpAmmSdk = new pump_swap_sdk_1.PumpAmmSdk(connection);
        // Get swap state unless provided
        const swapSolanaState = options?.swapSolanaState
            ? options.swapSolanaState
            : await pumpAmmSdk.swapSolanaState(poolKey, wallet.publicKey);
        // Create buy instructions
        (0, debug_1.debugLog)('📝 Creating buy instructions...');
        let instructions = await (0, instructions_1.createAmmBuyInstructionsAssuming)(pumpAmmSdk, swapSolanaState, quoteAmountLamports, slippage);
        (0, debug_1.debugLog)(`  📝 Created ${instructions.length} instructions`);
        // Create and configure transaction
        (0, debug_1.debugLog)(`  🏗️  Building transaction...`);
        const transaction = new web3_js_1.Transaction();
        instructions.forEach(instruction => transaction.add(instruction));
        (0, debug_1.debugLog)(`    📝 Added ${instructions.length} instructions`);
        // Set recent blockhash
        if (blockhash) {
            transaction.recentBlockhash = blockhash;
            (0, debug_1.debugLog)(`    🔗 Using provided blockhash: ${blockhash}`);
        }
        else {
            const { blockhash: newBlockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = newBlockhash;
            (0, debug_1.debugLog)(`    🔗 Using fresh blockhash: ${newBlockhash}`);
        }
        // Set fee payer
        transaction.feePayer = feePayer ? feePayer.publicKey : wallet.publicKey;
        (0, debug_1.debugLog)(`    💸 Fee payer: ${transaction.feePayer.toString()}`);
        // Sign the transaction
        if (feePayer && feePayer.publicKey.toString() !== wallet.publicKey.toString()) {
            transaction.sign(wallet, feePayer);
            (0, debug_1.debugLog)(`    ✍️  Signed by: ${wallet.publicKey.toString()} + ${feePayer.publicKey.toString()}`);
        }
        else {
            transaction.sign(wallet);
            (0, debug_1.debugLog)(`    ✍️  Signed by: ${wallet.publicKey.toString()}`);
        }
        (0, debug_1.debugLog)('✅ Signed AMM buy transaction created successfully');
        return {
            success: true,
            transaction,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`Failed to create signed AMM buy transaction: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage,
        };
    }
}
//# sourceMappingURL=buy.js.map