"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellPumpFunToken = sellPumpFunToken;
const web3_js_1 = require("@solana/web3.js");
const bc_helper_1 = require("./bc-helper");
const instructions_1 = require("./idl/instructions");
const constants_1 = require("./idl/constants");
const debug_1 = require("../utils/debug");
/**
 * Sell PumpFun tokens with simple approach
 */
async function sellPumpFunToken(connection, wallet, mint, tokenAmount) {
    try {
        // Validate that tokenAmount is specified
        if (tokenAmount === undefined) {
            return {
                success: false,
                error: 'Token amount is required. Please specify the number of tokens to sell.',
            };
        }
        (0, debug_1.log)('🔄 Executing sell of', tokenAmount, 'tokens...');
        // Calculate minSolOutput based on bonding curve price
        // For now, use a very low minimum to avoid slippage issues
        // TODO: Calculate this properly based on bonding curve reserves
        const minSolOutput = 0.000001; // Very low minimum to avoid slippage rejection
        // Get all required PDAs (including correct creator vault)
        const pdas = await (0, bc_helper_1.getAllRequiredPDAsForBuyAsync)(connection, constants_1.PUMP_PROGRAM_ID, mint, wallet.publicKey);
        // Create sell instruction using simple approach
        // Convert token amount to smallest units (6 decimals based on buy instruction)
        const tokenAmountInSmallestUnits = tokenAmount * Math.pow(10, 6);
        const sellInstruction = (0, instructions_1.createBondingCurveSellInstruction)(wallet.publicKey, mint, tokenAmountInSmallestUnits, // Token amount in smallest units (6 decimals)
        minSolOutput * 1e9, // Convert SOL to lamports
        pdas);
        const transaction = new web3_js_1.Transaction().add(sellInstruction);
        // Set recent blockhash and fee payer
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        // Sign the transaction
        transaction.sign(wallet);
        // Send transaction
        (0, debug_1.debugLog)('📡 Sending transaction...');
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        // Wait for confirmation
        await connection.confirmTransaction({
            signature,
            ...(await connection.getLatestBlockhash('confirmed')),
        }, 'confirmed');
        (0, debug_1.logSuccess)('Sell transaction confirmed successfully!');
        (0, debug_1.log)(`💰 Sold ${tokenAmount} tokens for ${minSolOutput} SOL`);
        (0, debug_1.logSignature)(signature, 'Sell');
        return {
            success: true,
            signature,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`Transaction failed: ${errorMessage}`);
        // If this is a seed constraint error, extract the expected address
        if (errorMessage.includes('ConstraintSeeds') || errorMessage.includes('seeds constraint')) {
            (0, debug_1.debugLog)('🔧 Detected seed constraint error. Check the logs for the expected address.');
            (0, debug_1.debugLog)('💡 Add the expected address to KNOWN_PDA_MAPPINGS for this wallet.');
        }
        return {
            success: false,
            error: errorMessage,
        };
    }
}
//# sourceMappingURL=sell.js.map