"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyPumpFunToken = buyPumpFunToken;
const bc_helper_1 = require("./bc-helper");
const web3_js_1 = require("@solana/web3.js");
const debug_1 = require("../utils/debug");
const amounts_1 = require("../utils/amounts");
const constants_1 = require("./idl/constants");
const instructions_1 = require("./idl/instructions");
/**
 * Buy PumpFun tokens with robust PDA resolution
 */
async function buyPumpFunToken(connection, wallet, mint, amountLamports, maxSlippageBasisPoints = 1000) {
    try {
        (0, debug_1.log)(`🛒 Executing buy of ${(0, amounts_1.formatLamportsAsSol)(amountLamports)} SOL worth of tokens...`);
        // Get all required PDAs (including correct creator vault)
        const pdas = await (0, bc_helper_1.getAllRequiredPDAsForBuyAsync)(connection, constants_1.PUMP_PROGRAM_ID, mint, wallet.publicKey);
        // Create buy instruction using simple approach
        const buyInstruction = (0, instructions_1.createBondingCurveBuyInstruction)(wallet.publicKey, mint, amountLamports, // Already in lamports
        pdas, maxSlippageBasisPoints);
        const transaction = new web3_js_1.Transaction().add(buyInstruction);
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
        (0, debug_1.logSuccess)('Buy transaction confirmed successfully!');
        (0, debug_1.log)(`💰 Purchased tokens for ${(0, amounts_1.formatLamportsAsSol)(amountLamports)} SOL`);
        (0, debug_1.logSignature)(signature, 'Buy');
        return signature;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`Transaction failed: ${errorMessage}`);
        // If this is a seed constraint error, extract the expected address
        if (errorMessage.includes('ConstraintSeeds') || errorMessage.includes('seeds constraint')) {
            (0, debug_1.debugLog)('🔧 Detected seed constraint error. Check the logs for the expected address.');
            (0, debug_1.debugLog)('💡 Add the expected address to KNOWN_PDA_MAPPINGS for this wallet.');
        }
        throw error; // Re-throw to match expected behavior
    }
}
//# sourceMappingURL=buy.js.map