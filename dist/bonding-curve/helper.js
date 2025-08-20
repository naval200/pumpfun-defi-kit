"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveBondingCurveAddress = deriveBondingCurveAddress;
exports.deriveAssociatedBondingCurveAddress = deriveAssociatedBondingCurveAddress;
exports.deriveCreatorVaultAddress = deriveCreatorVaultAddress;
exports.deriveGlobalVolumeAccumulatorAddress = deriveGlobalVolumeAccumulatorAddress;
exports.deriveUserVolumeAccumulatorAddress = deriveUserVolumeAccumulatorAddress;
exports.deriveEventAuthorityAddress = deriveEventAuthorityAddress;
exports.deriveGlobalAddress = deriveGlobalAddress;
exports.createComputeUnitLimitInstruction = createComputeUnitLimitInstruction;
exports.createComputeUnitPriceInstruction = createComputeUnitPriceInstruction;
exports.validateBondingCurve = validateBondingCurve;
exports.getBondingCurveAccount = getBondingCurveAccount;
exports.calculateWithSlippageBuy = calculateWithSlippageBuy;
exports.calculateWithSlippageSell = calculateWithSlippageSell;
exports.getBondingCurvePDA = getBondingCurvePDA;
exports.getGlobalAccountPDA = getGlobalAccountPDA;
exports.getCreatorVaultPDA = getCreatorVaultPDA;
exports.getGlobalVolumeAccumulatorPDA = getGlobalVolumeAccumulatorPDA;
exports.getGlobalIncentiveTokenAccountPDA = getGlobalIncentiveTokenAccountPDA;
exports.getUserVolumeAccumulatorPDA = getUserVolumeAccumulatorPDA;
exports.getUserVolumeAccumulator = getUserVolumeAccumulator;
exports.getCreatorVaultPDAFromWallet = getCreatorVaultPDAFromWallet;
exports.getAllRequiredPDAsForBuy = getAllRequiredPDAsForBuy;
exports.getEventAuthorityPDA = getEventAuthorityPDA;
exports.getGlobalPDA = getGlobalPDA;
exports.isGlobalAccountInitialized = isGlobalAccountInitialized;
exports.initializeGlobalAccount = initializeGlobalAccount;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
const debug_1 = require("../utils/debug");
// ============================================================================
// PUMP.FUN PROGRAM CONSTANTS
// ============================================================================
// Constants moved to constants.ts
// ============================================================================
// PDA DERIVATION FUNCTIONS
// ============================================================================
/**
 * Derive bonding curve address from mint
 */
function deriveBondingCurveAddress(mint) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.BONDING_CURVE_SEED, mint.toBuffer()], constants_1.PUMP_PROGRAM_ID);
}
/**
 * Derive associated bonding curve address
 */
function deriveAssociatedBondingCurveAddress(mint, bondingCurve) {
    return web3_js_1.PublicKey.findProgramAddressSync([bondingCurve.toBuffer(), mint.toBuffer()], constants_1.PUMP_PROGRAM_ID);
}
/**
 * Derive creator vault address from creator
 */
function deriveCreatorVaultAddress(creator) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.CREATOR_VAULT_SEED, creator.toBuffer()], constants_1.PUMP_PROGRAM_ID);
}
/**
 * Derive global volume accumulator address
 */
function deriveGlobalVolumeAccumulatorAddress() {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.GLOBAL_VOLUME_ACCUMULATOR_SEED], constants_1.PUMP_PROGRAM_ID);
}
/**
 * Derive user volume accumulator address
 */
function deriveUserVolumeAccumulatorAddress(user) {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.USER_VOLUME_ACCUMULATOR_SEED, user.toBuffer()], constants_1.PUMP_PROGRAM_ID);
}
/**
 * Derive event authority address
 */
function deriveEventAuthorityAddress() {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.EVENT_AUTHORITY_SEED], constants_1.PUMP_PROGRAM_ID);
}
/**
 * Derive global account address
 */
function deriveGlobalAddress() {
    return web3_js_1.PublicKey.findProgramAddressSync([constants_1.GLOBAL_SEED], constants_1.PUMP_PROGRAM_ID);
}
// ============================================================================
// COMPUTE BUDGET UTILITIES
// ============================================================================
/**
 * Create compute budget instruction for setting compute unit limit
 */
function createComputeUnitLimitInstruction(units) {
    return new web3_js_1.TransactionInstruction({
        keys: [],
        programId: constants_1.COMPUTE_BUDGET_PROGRAM_ID,
        data: Buffer.from([
            constants_1.COMPUTE_BUDGET_INSTRUCTIONS.SET_COMPUTE_UNIT_LIMIT, // SetComputeUnitLimit instruction discriminator
            ...Array.from(new Uint8Array(new Uint32Array([units]).buffer)), // compute units
        ]),
    });
}
/**
 * Create compute budget instruction for setting compute unit price
 */
function createComputeUnitPriceInstruction(microLamports) {
    return new web3_js_1.TransactionInstruction({
        keys: [],
        programId: constants_1.COMPUTE_BUDGET_PROGRAM_ID,
        data: Buffer.from([
            constants_1.COMPUTE_BUDGET_INSTRUCTIONS.SET_COMPUTE_UNIT_PRICE, // SetComputeUnitPrice instruction discriminator
            ...Array.from(new Uint8Array(new Uint32Array([microLamports]).buffer)), // micro-lamports per compute unit
        ]),
    });
}
/**
 * Validate bonding curve account before operations
 */
async function validateBondingCurve(connection, mint) {
    try {
        const [bondingCurve] = deriveBondingCurveAddress(mint);
        // Try to get the bonding curve account info
        const accountInfo = await connection.getAccountInfo(bondingCurve);
        if (!accountInfo) {
            (0, debug_1.log)('❌ Bonding curve account not found');
            return false;
        }
        if (accountInfo.data.length === 0) {
            (0, debug_1.log)('❌ Bonding curve account has no data');
            return false;
        }
        (0, debug_1.log)('✅ Bonding curve account is valid');
        return true;
    }
    catch (error) {
        (0, debug_1.logWarning)('Error validating bonding curve:', error);
        return false;
    }
}
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Get bonding curve account info (placeholder implementation)
 */
async function getBondingCurveAccount(connection, mint, commitment = 'confirmed') {
    const [bondingCurvePDA] = deriveBondingCurveAddress(mint);
    const tokenAccount = await connection.getAccountInfo(bondingCurvePDA, {
        commitment: commitment,
    });
    if (!tokenAccount) {
        return null;
    }
    // For now, return a placeholder object - you'll need to implement BondingCurveAccount
    return {
        getBuyPrice: (solAmount) => solAmount * 1000n, // Placeholder
        getSellPrice: (tokenAmount, _feeBasisPoints) => (tokenAmount * (10000n - _feeBasisPoints)) / 10000n, // Placeholder
    };
}
/**
 * Calculate buy amount with slippage
 */
function calculateWithSlippageBuy(solAmount, slippageBasisPoints) {
    return (solAmount * (10000n + slippageBasisPoints)) / 10000n;
}
/**
 * Calculate sell amount with slippage
 */
function calculateWithSlippageSell(solAmount, slippageBasisPoints) {
    return (solAmount * (10000n - slippageBasisPoints)) / 10000n;
}
// ============================================================================
// ADDITIONAL PDA DERIVATION FUNCTIONS
// ============================================================================
/**
 * Get bonding curve PDA (alias for deriveBondingCurveAddress)
 */
function getBondingCurvePDA(mint) {
    const [bondingCurve] = deriveBondingCurveAddress(mint);
    return bondingCurve;
}
/**
 * Get global account PDA (alias for deriveGlobalAddress)
 */
function getGlobalAccountPDA() {
    const [globalAccount] = deriveGlobalAddress();
    return globalAccount;
}
/**
 * Get creator vault PDA (alias for deriveCreatorVaultAddress)
 */
function getCreatorVaultPDA(creator) {
    const [creatorVault] = deriveCreatorVaultAddress(creator);
    return creatorVault;
}
/**
 * Get global volume accumulator PDA (alias for deriveGlobalVolumeAccumulatorAddress)
 */
function getGlobalVolumeAccumulatorPDA() {
    const [globalVolumeAccumulator] = deriveGlobalVolumeAccumulatorAddress();
    return globalVolumeAccumulator;
}
/**
 * Get global incentive token account PDA
 */
function getGlobalIncentiveTokenAccountPDA(mint) {
    const [globalIncentiveTokenAccount] = web3_js_1.PublicKey.findProgramAddressSync([getGlobalVolumeAccumulatorPDA().toBuffer(), constants_1.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], constants_1.PUMP_PROGRAM_ID);
    return globalIncentiveTokenAccount;
}
/**
 * Get user volume accumulator PDA (alias for deriveUserVolumeAccumulatorAddress)
 */
function getUserVolumeAccumulatorPDA(user) {
    const [userVolumeAccumulator] = deriveUserVolumeAccumulatorAddress(user);
    return userVolumeAccumulator;
}
/**
 * Get user volume accumulator using reverse engineered pattern
 * Based on analysis of working transactions: ["user_volume_accumulator", wallet_address]
 */
function getUserVolumeAccumulator(programId, user) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([constants_1.USER_VOLUME_ACCUMULATOR_SEED, user.toBuffer()], programId);
    (0, debug_1.log)(`✅ Derived user volume accumulator: ${pda.toString()}`);
    return pda;
}
/**
 * Get creator vault PDA using reverse engineered pattern
 * Based on analysis of working transactions: ["creator-vault", wallet_address]
 */
function getCreatorVaultPDAFromWallet(programId, wallet) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([constants_1.CREATOR_VAULT_SEED, wallet.toBuffer()], programId);
    (0, debug_1.log)(`✅ Derived creator vault using reverse engineered pattern: ${pda.toString()}`);
    return pda;
}
/**
 * Get all required PDAs for buy operations with robust resolution
 * Consolidates all PDA derivation in one place for reuse
 */
function getAllRequiredPDAsForBuy(programId, mint, user) {
    // Global PDA
    const globalPDA = getGlobalPDA(programId);
    // Bonding curve PDA
    const [bondingCurvePDA] = deriveBondingCurveAddress(mint);
    // Creator vault PDA - use reverse engineered pattern: ["creator-vault", wallet_address]
    const creatorVaultPDA = getCreatorVaultPDAFromWallet(programId, user);
    // Event authority PDA - standard Anchor pattern
    const [eventAuthorityPDA] = web3_js_1.PublicKey.findProgramAddressSync([constants_1.EVENT_AUTHORITY_SEED], programId);
    // Global volume accumulator - known constant
    const globalVolumeAccumulatorPDA = new web3_js_1.PublicKey(constants_1.GLOBAL_VOLUME_ACCUMULATOR);
    // User volume accumulator - use reverse engineered pattern
    const userVolumeAccumulatorPDA = getUserVolumeAccumulator(programId, user);
    // Log PDA derivations for debugging
    (0, debug_1.log)('🔧 PDA Derivations:');
    (0, debug_1.log)(`   Global: ${globalPDA.toString()}`);
    (0, debug_1.log)(`   BondingCurve: ${bondingCurvePDA.toString()}`);
    (0, debug_1.log)(`   CreatorVault: ${creatorVaultPDA.toString()}`);
    (0, debug_1.log)(`   EventAuthority: ${eventAuthorityPDA.toString()}`);
    (0, debug_1.log)(`   GlobalVolumeAccumulator: ${globalVolumeAccumulatorPDA.toString()}`);
    (0, debug_1.log)(`   UserVolumeAccumulator: ${userVolumeAccumulatorPDA.toString()}`);
    return {
        globalPDA,
        bondingCurvePDA,
        creatorVaultPDA,
        eventAuthorityPDA,
        globalVolumeAccumulatorPDA,
        userVolumeAccumulatorPDA,
    };
}
/**
 * Get event authority PDA (alias for deriveEventAuthorityAddress)
 */
function getEventAuthorityPDA() {
    const [eventAuthority] = deriveEventAuthorityAddress();
    return eventAuthority;
}
// ============================================================================
// GLOBAL ACCOUNT INITIALIZATION
// ============================================================================
/**
 * Get the global PDA for the PumpFun program
 */
function getGlobalPDA(programId) {
    const [globalPDA] = web3_js_1.PublicKey.findProgramAddressSync([constants_1.GLOBAL_SEED], programId);
    return globalPDA;
}
/**
 * Check if the global account is initialized
 */
async function isGlobalAccountInitialized(connection, programId) {
    try {
        const globalPDA = getGlobalPDA(programId);
        const accountInfo = await connection.getAccountInfo(globalPDA);
        if (!accountInfo) {
            return false;
        }
        // Check if the account is owned by the PumpFun program
        return accountInfo.owner.equals(programId);
    }
    catch (error) {
        return false;
    }
}
/**
 * Initialize the global account (one-time setup)
 * This must be called before creating any tokens
 */
async function initializeGlobalAccount(connection, wallet, programId) {
    try {
        (0, debug_1.log)('🌍 Initializing PumpFun global account...');
        // Check if already initialized
        if (await isGlobalAccountInitialized(connection, programId)) {
            (0, debug_1.log)('✅ Global account already initialized');
            return { success: true };
        }
        // Create the global account
        const globalPDA = getGlobalPDA(programId);
        (0, debug_1.log)(`📍 Global PDA: ${globalPDA.toString()}`);
        // Create a transaction to initialize the global account
        const transaction = new web3_js_1.Transaction();
        // Add instruction to create the global account
        // Note: This would typically be done through the program's initialize instruction
        // For now, we'll create a placeholder - you may need to implement the actual initialize instruction
        // Get recent blockhash and set fee payer
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        // Sign and send transaction
        transaction.sign(wallet);
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });
        (0, debug_1.log)(`📡 Global account initialization transaction sent! Signature: ${signature}`);
        // Wait for confirmation
        (0, debug_1.log)('⏳ Waiting for global account initialization confirmation...');
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            return {
                success: false,
                error: `Global account initialization failed: ${confirmation.value.err}`,
            };
        }
        (0, debug_1.logSuccess)('Global account initialized successfully!');
        return {
            success: true,
            signature,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Global account initialization error: ${errorMessage}`,
        };
    }
}
//# sourceMappingURL=helper.js.map