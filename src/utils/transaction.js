"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComputeBudgetInstructions = addComputeBudgetInstructions;
exports.prepareTransaction = prepareTransaction;
exports.sendTransactionWithRetry = sendTransactionWithRetry;
exports.sendRawTransactionWithRetry = sendRawTransactionWithRetry;
exports.confirmTransaction = confirmTransaction;
exports.sendAndConfirmTransaction = sendAndConfirmTransaction;
exports.sendAndConfirmTransactionWithFeePayer = sendAndConfirmTransactionWithFeePayer;
exports.sendAndConfirmRawTransaction = sendAndConfirmRawTransaction;
exports.createTransactionWithComputeBudget = createTransactionWithComputeBudget;
exports.sendLamports = sendLamports;
exports.sendTransaction = sendTransaction;
exports.sendTransactionWithFeePayer = sendTransactionWithFeePayer;
exports.getExplorerUrl = getExplorerUrl;
const web3_js_1 = require("@solana/web3.js");
const debug_1 = require("./debug");
/**
 * Transaction sending options with sensible defaults
 */
// TransactionOptions moved to src/@types.ts
/**
 * Transaction options with fee payer support
 */
// TransactionWithFeePayerOptions moved to src/@types.ts
/**
 * Result of a transaction operation
 */
// TransactionResult moved to src/@types.ts
/**
 * Default transaction options
 */
const DEFAULT_OPTIONS = {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
    retryDelay: 1000,
    computeUnitLimit: 100000,
    computeUnitPrice: 1000,
};
/**
 * Add compute budget instructions to a transaction
 * @param transaction - The transaction to add compute budget instructions to
 * @param options - Transaction options including compute unit settings
 */
function addComputeBudgetInstructions(transaction, options = {}) {
    const { computeUnitLimit, computeUnitPrice } = { ...DEFAULT_OPTIONS, ...options };
    // Add compute budget instruction for unit limit
    transaction.add(web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }));
    // Add compute budget instruction for unit price (priority fee)
    transaction.add(web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPrice }));
}
/**
 * Prepare a transaction for sending by setting recent blockhash and fee payer
 * @param connection - Solana connection
 * @param transaction - Transaction to prepare
 * @param feePayer - Public key of the fee payer
 * @param commitment - Commitment level for getting blockhash
 * @returns The prepared transaction
 */
async function prepareTransaction(connection, transaction, feePayer, commitment = 'confirmed') {
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash(commitment);
    // Set transaction properties
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = feePayer;
    return transaction;
}
/**
 * Send a transaction with retry logic and proper error handling
 * @param connection - Solana connection
 * @param transaction - Transaction to send
 * @param signers - Array of keypairs to sign the transaction
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult
 */
async function sendTransactionWithRetry(connection, transaction, signers, options = {}) {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    const { maxRetries, retryDelay, preflightCommitment } = finalOptions;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            (0, debug_1.log)(`📡 Sending transaction (attempt ${attempt}/${maxRetries})...`);
            // Send the transaction
            const signature = await connection.sendTransaction(transaction, signers, {
                skipPreflight: finalOptions.skipPreflight,
                preflightCommitment,
                maxRetries: 1, // We handle retries ourselves
            });
            (0, debug_1.logSuccess)('Transaction sent successfully!');
            (0, debug_1.logSignature)(signature, 'Transaction');
            return {
                success: true,
                signature,
            };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            (0, debug_1.log)(`❌ Transaction attempt ${attempt} failed: ${lastError.message}`);
            if (attempt < maxRetries) {
                (0, debug_1.log)(`⏳ Waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                // Get a fresh blockhash for the retry
                try {
                    const { blockhash } = await connection.getLatestBlockhash(preflightCommitment);
                    transaction.recentBlockhash = blockhash;
                }
                catch (blockhashError) {
                    (0, debug_1.logError)('Failed to get fresh blockhash:', blockhashError);
                }
            }
        }
    }
    return {
        success: false,
        error: `Transaction failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
    };
}
/**
 * Send a raw transaction with retry logic
 * @param connection - Solana connection
 * @param rawTransaction - Serialized transaction bytes
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult
 */
async function sendRawTransactionWithRetry(connection, rawTransaction, options = {}) {
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };
    const { maxRetries, retryDelay, preflightCommitment } = finalOptions;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            (0, debug_1.log)(`📡 Sending raw transaction (attempt ${attempt}/${maxRetries})...`);
            // Send the raw transaction
            const signature = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: finalOptions.skipPreflight,
                preflightCommitment,
                maxRetries: 1, // We handle retries ourselves
            });
            (0, debug_1.logSuccess)('Raw transaction sent successfully!');
            (0, debug_1.logSignature)(signature, 'Raw transaction');
            return {
                success: true,
                signature,
            };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            (0, debug_1.log)(`❌ Raw transaction attempt ${attempt} failed: ${lastError.message}`);
            if (attempt < maxRetries) {
                (0, debug_1.log)(`⏳ Waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    return {
        success: false,
        error: `Raw transaction failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
    };
}
/**
 * Confirm a transaction with specified commitment level
 * @param connection - Solana connection
 * @param signature - Transaction signature to confirm
 * @param commitment - Commitment level for confirmation
 * @returns Promise resolving to TransactionResult with confirmation details
 */
async function confirmTransaction(connection, signature, commitment = 'confirmed') {
    try {
        (0, debug_1.log)(`⏳ Confirming transaction: ${signature}`);
        const confirmation = await connection.confirmTransaction(signature, commitment);
        if (confirmation.value.err) {
            return {
                success: false,
                signature,
                error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
            };
        }
        (0, debug_1.logSuccess)('Transaction confirmed successfully!');
        return {
            success: true,
            signature,
            slot: confirmation.context.slot,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            signature,
            error: `Confirmation failed: ${errorMessage}`,
        };
    }
}
/**
 * Send and confirm a transaction in one operation
 * @param connection - Solana connection
 * @param transaction - Transaction to send
 * @param signers - Array of keypairs to sign the transaction
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult with confirmation details
 */
async function sendAndConfirmTransaction(connection, transaction, signers, options = {}) {
    // Send the transaction
    const sendResult = await sendTransactionWithRetry(connection, transaction, signers, options);
    if (!sendResult.success || !sendResult.signature) {
        return sendResult;
    }
    // Confirm the transaction
    const confirmResult = await confirmTransaction(connection, sendResult.signature, options.preflightCommitment);
    // Merge the results
    return {
        success: true,
        signature: sendResult.signature,
        error: confirmResult.error,
        slot: confirmResult.slot,
    };
}
/**
 * Send and confirm a transaction with separate fee payer and signers
 * @param connection - Solana connection
 * @param transaction - Transaction to send
 * @param signers - Array of keypairs to sign the transaction
 * @param feePayer - Keypair for the fee payer (if different from signers)
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult with confirmation details
 */
async function sendAndConfirmTransactionWithFeePayer(connection, transaction, signers, feePayer, options = {}) {
    // Set fee payer if provided
    if (feePayer) {
        transaction.feePayer = feePayer.publicKey;
    }
    // Prepare transaction with recent blockhash
    const preparedTransaction = await prepareTransaction(connection, transaction, transaction.feePayer || signers[0].publicKey, options.preflightCommitment);
    // Combine all signers (fee payer + transaction signers)
    const allSigners = feePayer ? [feePayer, ...signers] : signers;
    // Send the transaction
    const sendResult = await sendTransactionWithRetry(connection, preparedTransaction, allSigners, options);
    if (!sendResult.success || !sendResult.signature) {
        return sendResult;
    }
    // Confirm the transaction
    const confirmResult = await confirmTransaction(connection, sendResult.signature, options.preflightCommitment);
    // Merge the results
    return {
        success: true,
        signature: sendResult.signature,
        error: confirmResult.error,
        slot: confirmResult.slot,
    };
}
/**
 * Send and confirm a raw transaction in one operation
 * @param connection - Solana connection
 * @param rawTransaction - Serialized transaction bytes
 * @param options - Transaction options
 * @returns Promise resolving to TransactionResult with confirmation details
 */
async function sendAndConfirmRawTransaction(connection, rawTransaction, options = {}) {
    // Send the raw transaction
    const sendResult = await sendRawTransactionWithRetry(connection, rawTransaction, options);
    if (!sendResult.success || !sendResult.signature) {
        return sendResult;
    }
    // Confirm the transaction
    const confirmResult = await confirmTransaction(connection, sendResult.signature, options.preflightCommitment);
    // Merge the results
    return {
        success: true,
        signature: sendResult.signature,
        error: confirmResult.error,
        slot: confirmResult.slot,
    };
}
/**
 * Utility function to create a transaction with compute budget instructions
 * @param options - Transaction options
 * @returns A new transaction with compute budget instructions
 */
function createTransactionWithComputeBudget(options = {}) {
    const transaction = new web3_js_1.Transaction();
    addComputeBudgetInstructions(transaction, options);
    return transaction;
}
/**
 * Send SOL (lamports) from one wallet to another
 */
async function sendLamports(connection, sender, recipient, lamports, feePayer) {
    const transferIx = web3_js_1.SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: recipient,
        lamports,
    });
    const tx = new web3_js_1.Transaction().add(transferIx);
    const result = await sendAndConfirmTransactionWithFeePayer(connection, tx, [sender], feePayer ?? sender, { preflightCommitment: 'confirmed' });
    if (!result.success || !result.signature) {
        throw new Error(`SOL transfer failed: ${result.error}`);
    }
    return result.signature;
}
/**
 * Create and send a transaction with the given instructions
 * @param connection - Solana connection
 * @param wallet - Keypair to sign the transaction
 * @param instructions - Array of transaction instructions
 * @returns Promise resolving to transaction signature
 */
async function sendTransaction(connection, wallet, instructions) {
    const transaction = new web3_js_1.Transaction();
    // Add all instructions
    instructions.forEach(instruction => {
        transaction.add(instruction);
    });
    // Send and confirm transaction using transaction utility
    const result = await sendAndConfirmTransaction(connection, transaction, [wallet], {
        preflightCommitment: 'confirmed',
    });
    if (!result.success) {
        throw new Error(`Transaction failed: ${result.error}`);
    }
    return result.signature;
}
/**
 * Create and send a transaction with the given instructions and separate fee payer
 * @param connection - Solana connection
 * @param wallet - Keypair to sign the transaction
 * @param instructions - Array of transaction instructions
 * @param feePayer - Keypair for the fee payer (if different from wallet)
 * @returns Promise resolving to transaction signature
 */
async function sendTransactionWithFeePayer(connection, wallet, instructions, feePayer) {
    const transaction = new web3_js_1.Transaction();
    // Add all instructions
    instructions.forEach(instruction => {
        transaction.add(instruction);
    });
    // Send and confirm transaction using fee payer utility
    const result = await sendAndConfirmTransactionWithFeePayer(connection, transaction, [wallet], feePayer, { preflightCommitment: 'confirmed' });
    if (!result.success) {
        throw new Error(`Transaction failed: ${result.error}`);
    }
    return result.signature;
}
/**
 * Get transaction explorer URL
 * @param signature - Transaction signature
 * @param network - Network ('mainnet' or 'devnet')
 * @returns Explorer URL string
 */
function getExplorerUrl(signature, network = 'devnet') {
    const baseUrl = 'https://explorer.solana.com/tx/';
    const clusterParam = network === 'mainnet' ? '' : '?cluster=devnet';
    return `${baseUrl}${signature}${clusterParam}`;
}
//# sourceMappingURL=transaction.js.map