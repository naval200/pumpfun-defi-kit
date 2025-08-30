"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSol = sendSol;
exports.createSendSolInstruction = createSendSolInstruction;
exports.createSignedSendSolTransaction = createSignedSendSolTransaction;
exports.validateSendSolParams = validateSendSolParams;
exports.getEstimatedSendSolFee = getEstimatedSendSolFee;
const web3_js_1 = require("@solana/web3.js");
const debug_1 = require("./utils/debug");
/**
 * Send SOL from one wallet to another
 * @param connection - Solana connection
 * @param fromWallet - Source wallet keypair
 * @param toAddress - Destination wallet public key
 * @param amountSol - Amount to send in SOL (will be converted to lamports)
 * @param feePayer - Optional fee payer keypair (if different from sender)
 * @param options - Additional options
 * @returns SendSolResult with success status and signature or error
 */
async function sendSol(connection, fromWallet, toAddress, amountSol, feePayer, options = {}) {
    try {
        (0, debug_1.debugLog)(`💸 Sending ${amountSol} SOL from ${fromWallet.publicKey.toString()} to ${toAddress.toString()}`);
        // Convert SOL to lamports
        const amountLamports = Math.floor(amountSol * web3_js_1.LAMPORTS_PER_SOL);
        if (amountLamports <= 0) {
            return {
                success: false,
                error: 'Amount must be greater than 0',
            };
        }
        // Check source wallet balance
        const balance = await connection.getBalance(fromWallet.publicKey);
        if (balance < amountLamports) {
            return {
                success: false,
                error: `Insufficient balance. Available: ${(balance / web3_js_1.LAMPORTS_PER_SOL).toFixed(4)} SOL, Required: ${amountSol} SOL`,
            };
        }
        // Create transfer instruction
        const transferInstruction = web3_js_1.SystemProgram.transfer({
            fromPubkey: fromWallet.publicKey,
            toPubkey: toAddress,
            lamports: amountLamports,
        });
        // Create transaction
        const transaction = new web3_js_1.Transaction().add(transferInstruction);
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = feePayer?.publicKey || fromWallet.publicKey;
        // Sign transaction
        if (feePayer && !feePayer.publicKey.equals(fromWallet.publicKey)) {
            transaction.sign(fromWallet, feePayer);
        }
        else {
            transaction.sign(fromWallet);
        }
        // Send and confirm transaction
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, feePayer ? [fromWallet, feePayer] : [fromWallet], {
            commitment: 'confirmed',
            maxRetries: options.maxRetries || 3,
        });
        (0, debug_1.debugLog)(`✅ SOL transfer successful! Signature: ${signature}`);
        return {
            success: true,
            signature,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        (0, debug_1.logError)(`❌ Error sending SOL: ${errorMessage}`);
        // Provide helpful error information
        if (error instanceof web3_js_1.SendTransactionError) {
            if (error.message.includes('InsufficientFunds')) {
                return {
                    success: false,
                    error: 'Insufficient funds for transaction fee',
                };
            }
            else if (error.message.includes('BlockhashNotFound')) {
                return {
                    success: false,
                    error: 'Blockhash expired, please try again',
                };
            }
        }
        return {
            success: false,
            error: errorMessage,
        };
    }
}
/**
 * Create a signed SOL transfer instruction for batching
 * @param fromWallet - Source wallet keypair
 * @param toAddress - Destination wallet public key
 * @param amountSol - Amount to send in SOL (will be converted to lamports)
 * @param feePayer - Optional fee payer public key
 * @returns TransactionInstruction ready for batching
 */
function createSendSolInstruction(fromWallet, toAddress, amountSol, feePayer) {
    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSol * web3_js_1.LAMPORTS_PER_SOL);
    if (amountLamports <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    (0, debug_1.debugLog)(`🔧 Creating SOL transfer instruction: ${amountSol} SOL (${amountLamports} lamports)`);
    // Create transfer instruction
    const transferInstruction = web3_js_1.SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: toAddress,
        lamports: amountLamports,
    });
    return transferInstruction;
}
/**
 * Create a signed SOL transfer transaction for batching
 * @param connection - Solana connection
 * @param fromWallet - Source wallet keypair
 * @param toAddress - Destination wallet public key
 * @param amountSol - Amount to send in SOL (will be converted to lamports)
 * @param feePayer - Optional fee payer public key
 * @returns Signed Transaction ready for batching
 */
async function createSignedSendSolTransaction(connection, fromWallet, toAddress, amountSol, feePayer) {
    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSol * web3_js_1.LAMPORTS_PER_SOL);
    if (amountLamports <= 0) {
        throw new Error('Amount must be greater than 0');
    }
    (0, debug_1.debugLog)(`🔧 Creating signed SOL transfer transaction: ${amountSol} SOL (${amountLamports} lamports)`);
    // Create transfer instruction
    const transferInstruction = web3_js_1.SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: toAddress,
        lamports: amountLamports,
    });
    // Create transaction
    const transaction = new web3_js_1.Transaction().add(transferInstruction);
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    // Set fee payer
    transaction.feePayer = feePayer || fromWallet.publicKey;
    // Sign transaction
    if (feePayer && !feePayer.equals(fromWallet.publicKey)) {
        // If fee payer is different from sender, both need to sign
        // Note: In this case, the fee payer would need to sign when the transaction is actually sent
        transaction.sign(fromWallet);
    }
    else {
        transaction.sign(fromWallet);
    }
    return transaction;
}
/**
 * Validate SOL transfer parameters
 * @param fromWallet - Source wallet
 * @param toAddress - Destination address
 * @param amountSol - Amount to send
 * @returns Validation result with success status and any errors
 */
function validateSendSolParams(fromWallet, toAddress, amountSol) {
    const errors = [];
    // Validate amount
    if (amountSol <= 0) {
        errors.push('Amount must be greater than 0');
    }
    // Validate addresses
    if (!fromWallet.publicKey) {
        errors.push('Invalid source wallet');
    }
    if (!toAddress) {
        errors.push('Invalid destination address');
    }
    // Check if sending to self
    if (fromWallet.publicKey.equals(toAddress)) {
        errors.push('Cannot send SOL to yourself');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * Get estimated transaction fee for SOL transfer
 * @param connection - Solana connection
 * @param fromWallet - Source wallet
 * @param toAddress - Destination address
 * @param amountSol - Amount to send
 * @returns Estimated fee in lamports
 */
async function getEstimatedSendSolFee(connection, fromWallet, toAddress, amountSol) {
    try {
        // Convert SOL to lamports
        const amountLamports = Math.floor(amountSol * web3_js_1.LAMPORTS_PER_SOL);
        // Create transfer instruction
        const transferInstruction = web3_js_1.SystemProgram.transfer({
            fromPubkey: fromWallet.publicKey,
            toPubkey: toAddress,
            lamports: amountLamports,
        });
        // Create transaction
        const transaction = new web3_js_1.Transaction().add(transferInstruction);
        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromWallet.publicKey;
        // Get fee for transaction
        const fee = await transaction.getEstimatedFee(connection);
        return fee || 5000; // Default fallback fee
    }
    catch (error) {
        (0, debug_1.debugLog)(`⚠️ Could not estimate fee, using default: ${error}`);
        return 5000; // Default fallback fee
    }
}
//# sourceMappingURL=sendSol.js.map