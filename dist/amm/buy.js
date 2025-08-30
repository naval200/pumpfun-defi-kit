"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyAmmTokens = buyAmmTokens;
exports.createSignedAmmBuyTransaction = createSignedAmmBuyTransaction;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const transaction_1 = require("../utils/transaction");
const retry_1 = require("../utils/retry");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const pump_swap_sdk_1 = require("@pump-fun/pump-swap-sdk");
const debug_1 = require("../utils/debug");
const instructions_1 = require("./instructions");
/**
 * Buy tokens using SOL with retry logic and better error handling
 */
async function buyAmmTokens(connection, wallet, poolKey, quoteAmount, slippage = 1, feePayer, options) {
    try {
        (0, debug_1.log)(`💰 Buying tokens from pool: ${poolKey.toString()}`);
        (0, debug_1.log)(`SOL amount: ${quoteAmount}`);
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
        // Enhanced pool state debugging
        (0, debug_1.debugLog)('🔍 Pool State Analysis:');
        (0, debug_1.debugLog)(`  📊 Base Reserve: ${baseReserve.toLocaleString()} TBC tokens`);
        (0, debug_1.debugLog)(`  💰 Quote Reserve: ${(quoteReserve / 1e9).toFixed(9)} SOL`);
        (0, debug_1.debugLog)(`  🔢 Raw Base Amount: ${poolBaseAmount.toString()} (hex: 0x${poolBaseAmount.toString(16)})`);
        (0, debug_1.debugLog)(`  🔢 Raw Quote Amount: ${poolQuoteAmount.toString()} (hex: 0x${poolQuoteAmount.toString(16)})`);
        (0, debug_1.debugLog)(`  📈 Pool Value: ${((baseReserve * (quoteReserve / 1e9)) / baseReserve).toFixed(9)} SOL per TBC token`);
        // Check if reserves are valid
        if (baseReserve <= 0 || quoteReserve <= 0) {
            throw new Error(`Invalid pool reserves: Base=${baseReserve}, Quote=${quoteReserve}. Pool may be empty or corrupted.`);
        }
        // Calculate expected base amount using simple AMM formula
        // This is a simplified calculation - in practice, you'd use the SDK's methods
        const k = baseReserve * quoteReserve;
        const newQuoteReserve = quoteReserve + quoteAmount;
        const newBaseReserve = k / newQuoteReserve;
        const baseOut = baseReserve - newBaseReserve;
        (0, debug_1.debugLog)(`Expected base amount: ${baseOut}`);
        // Enhanced AMM calculation debugging
        (0, debug_1.debugLog)('🧮 AMM Calculation Analysis:');
        (0, debug_1.debugLog)(`  🔢 Constant Product K: ${k.toLocaleString()}`);
        (0, debug_1.debugLog)(`  📊 Current Quote Reserve: ${quoteReserve.toLocaleString()} lamports (${(quoteReserve / 1e9).toFixed(9)} SOL)`);
        (0, debug_1.debugLog)(`  📊 New Quote Reserve: ${newQuoteReserve.toLocaleString()} lamports (${(newQuoteReserve / 1e9).toFixed(9)} SOL)`);
        (0, debug_1.debugLog)(`  📊 Current Base Reserve: ${baseReserve.toLocaleString()} TBC`);
        (0, debug_1.debugLog)(`  📊 New Base Reserve: ${newBaseReserve.toLocaleString()} TBC`);
        (0, debug_1.debugLog)(`  🎯 Expected TBC Output: ${baseOut.toFixed(9)} TBC tokens`);
        (0, debug_1.debugLog)(`  💰 Input SOL: ${quoteAmount} SOL`);
        (0, debug_1.debugLog)(`  📈 Price Impact: ${(((newQuoteReserve - quoteReserve) / quoteReserve) * 100).toFixed(4)}%`);
        // Validate calculation result
        if (baseOut <= 0) {
            throw new Error(`Invalid AMM calculation: baseOut=${baseOut}. This suggests insufficient liquidity or calculation error.`);
        }
        // Execute buy transaction with retry logic
        (0, debug_1.debugLog)('📝 Executing buy transaction...');
        // Build swap instructions (prefer provided swap state)
        const effectiveState = options?.swapSolanaState || swapSolanaState;
        (0, debug_1.debugLog)('📝 Transaction Preparation:');
        (0, debug_1.debugLog)(`  💰 Input Amount: ${quoteAmount} SOL`);
        (0, debug_1.debugLog)(`  📊 Slippage: ${slippage} basis points (${(slippage / 100).toFixed(2)}%)`);
        (0, debug_1.debugLog)(`  🔢 Quote Amount (lamports): ${Math.floor(quoteAmount * 1e9).toLocaleString()}`);
        (0, debug_1.debugLog)(`  🎯 Target Pool: ${poolKey.toString()}`);
        // Safely log swap state without BigInt serialization issues
        try {
            const safeState = JSON.parse(JSON.stringify(effectiveState, (key, value) => typeof value === 'bigint' ? value.toString() : value));
            (0, debug_1.debugLog)(`Using swap state: ${JSON.stringify(safeState, null, 2)}`);
            // Extract and display key swap state values
            if (safeState.poolBaseAmount && safeState.poolQuoteAmount) {
                (0, debug_1.debugLog)(`🔢 Swap State Summary:`);
                (0, debug_1.debugLog)(`  🏊 Pool Key: ${safeState.poolKey}`);
                (0, debug_1.debugLog)(`  🪙 Base Mint: ${safeState.baseMint}`);
                (0, debug_1.debugLog)(`  💰 Quote Mint: ${safeState.quoteMint || 'Wrapped SOL'}`);
                (0, debug_1.debugLog)(`  📊 Pool Base Amount: ${Number(safeState.poolBaseAmount).toLocaleString()} TBC`);
                (0, debug_1.debugLog)(`  📊 Pool Quote Amount: ${(Number(safeState.poolQuoteAmount) / 1e9).toFixed(9)} SOL`);
                (0, debug_1.debugLog)(`  👤 User: ${safeState.user}`);
                (0, debug_1.debugLog)(`  🏦 User Base Account: ${safeState.userBaseTokenAccount}`);
                (0, debug_1.debugLog)(`  🏦 User Quote Account: ${safeState.userQuoteTokenAccount}`);
            }
        }
        catch (e) {
            (0, debug_1.debugLog)(`Swap state logging failed: ${e}`);
            (0, debug_1.debugLog)(`Swap state keys: ${Object.keys(effectiveState || {}).join(', ')}`);
        }
        // Convert SOL amount to lamports before creating BN
        const quoteAmountLamports = Math.floor(quoteAmount * 1e9);
        let instructions = await (0, instructions_1.createAmmBuyInstructionsAssuming)(pumpAmmSdk, effectiveState, new bn_js_1.default(quoteAmountLamports), slippage);
        (0, debug_1.debugLog)(`Created ${instructions.length} instructions`);
        (0, debug_1.debugLog)(`🔍 Transaction Summary:`);
        (0, debug_1.debugLog)(`  💰 Input: ${quoteAmount} SOL (${quoteAmountLamports.toLocaleString()} lamports)`);
        (0, debug_1.debugLog)(`  📊 Slippage: ${slippage} basis points (${(slippage / 100).toFixed(2)}%)`);
        (0, debug_1.debugLog)(`  🎯 Expected Output: ${baseOut.toFixed(9)} TBC tokens`);
        (0, debug_1.debugLog)(`  📈 Price Impact: ${((quoteAmount / (quoteReserve / 1e9)) * 100).toFixed(4)}%`);
        instructions.forEach((ix, i) => {
            (0, debug_1.debugLog)(`📝 Instruction ${i}:`);
            (0, debug_1.debugLog)(`  🏛️  Program: ${ix.programId.toString()}`);
            (0, debug_1.debugLog)(`  📏 Data: ${ix.data.length} bytes`);
            (0, debug_1.debugLog)(`  🔑 Accounts: ${ix.keys.length}`);
            // Log instruction data signature
            if (ix.data.length > 0) {
                const dataHex = Array.from(ix.data.slice(0, 8))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                (0, debug_1.debugLog)(`  🔢 Data: 0x${dataHex}`);
            }
            // Enhanced AMM instruction analysis
            if (i === 3) {
                // AMM instruction is typically the 4th one (after ATA creation, SOL transfer, token init)
                (0, debug_1.debugLog)(`  🏊 AMM Buy Instruction Details:`);
                (0, debug_1.debugLog)(`    📊 Total Accounts: ${ix.keys.length}`);
                (0, debug_1.debugLog)(`    🔑 Key Accounts:`);
                // Log important accounts with better formatting
                const keyAccounts = [
                    { index: 0, name: 'User', _desc: 'User wallet' },
                    { index: 1, name: 'Pool', _desc: 'Pool account' },
                    { index: 2, name: 'Pool Authority', _desc: 'Pool authority' },
                    { index: 3, name: 'User Base ATA', _desc: 'User TBC account' },
                    { index: 4, name: 'User Quote ATA', _desc: 'User SOL account' },
                    { index: 5, name: 'Pool Base ATA', _desc: 'Pool TBC account' },
                    { index: 6, name: 'Pool Quote ATA', _desc: 'Pool SOL account' },
                    { index: 7, name: 'Token Program', _desc: 'SPL Token program' },
                    { index: 8, name: 'Pool Base ATA', _desc: 'Pool TBC account' },
                    { index: 9, name: 'Pool Quote ATA', _desc: 'Pool SOL account' },
                ];
                keyAccounts.forEach(({ index, name }) => {
                    if (ix.keys[index]) {
                        const key = ix.keys[index];
                        (0, debug_1.debugLog)(`      ${index.toString().padStart(2)}: ${name} = ${key.pubkey.toString()}`);
                        (0, debug_1.debugLog)(`           ${key.isSigner ? '👤 Signer' : '👁️  Non-signer'}, ${key.isWritable ? '✏️  Writable' : '👁️  Read-only'}`);
                    }
                });
            }
        });
        // Send transaction with retry logic
        (0, debug_1.debugLog)('📤 Executing Transaction:');
        (0, debug_1.debugLog)(`  👤 Signer: ${wallet.publicKey.toString()}`);
        (0, debug_1.debugLog)(`  💸 Fee Payer: ${feePayer ? feePayer.publicKey.toString() : 'Same as signer'}`);
        (0, debug_1.debugLog)(`  🔄 Retry Strategy: 3 attempts with 2s backoff`);
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
        (0, debug_1.debugLog)(`  💰 SOL Spent: ${quoteAmount} SOL`);
        (0, debug_1.debugLog)(`  🪙 TBC Received: ${baseOut.toFixed(9)} TBC tokens`);
        (0, debug_1.debugLog)(`  📊 Effective Rate: ${(quoteAmount / baseOut).toFixed(9)} SOL per TBC`);
        (0, debug_1.debugLog)(`  📈 Price Impact: ${((quoteAmount / (quoteReserve / 1e9)) * 100).toFixed(4)}%`);
        return {
            success: true,
            signature,
            baseAmount: Number(baseOut),
        };
    }
    catch (error) {
        (0, debug_1.logError)('Error buying tokens:', error);
        // Provide more specific error information
        let errorMessage = 'Buy operation failed';
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
 * Create signed AMM buy transaction without submitting it
 * Returns the signed transaction for batch processing
 */
async function createSignedAmmBuyTransaction(connection, wallet, poolKey, quoteAmount, slippage = 1, feePayer, blockhash, options) {
    try {
        (0, debug_1.debugLog)(`🔧 Creating Signed AMM Buy Transaction:`);
        (0, debug_1.debugLog)(`  💰 Amount: ${quoteAmount} SOL`);
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
        // Convert SOL amount to lamports before creating BN
        const quoteAmountLamports = Math.floor(quoteAmount * 1e9);
        (0, debug_1.debugLog)(`  🔢 Unit Conversion: ${quoteAmount} SOL → ${quoteAmountLamports.toLocaleString()} lamports`);
        let instructions = await (0, instructions_1.createAmmBuyInstructionsAssuming)(pumpAmmSdk, swapSolanaState, new bn_js_1.default(quoteAmountLamports), slippage);
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