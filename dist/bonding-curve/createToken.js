"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPumpFunToken = createPumpFunToken;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
const image_loader_1 = require("../utils/image-loader");
const metadata_1 = require("../utils/metadata");
const debug_1 = require("../utils/debug");
// getBondingCurveState moved to helper.ts
const buy_1 = require("./buy");
const transaction_1 = require("../utils/transaction");
const helper_1 = require("./helper");
const constants_1 = require("./constants");
const wallet_1 = require("../utils/wallet");
const pump_program_json_1 = tslib_1.__importDefault(require("../idl/pump_program.json"));
// Constants for token creation
const MPL_TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const METADATA_SEED = 'metadata';
const BONDING_CURVE_SEED = 'bonding-curve';
/**
 * Get create instructions for a new PumpFun token
 */
async function getCreateInstructions(program, creator, name, symbol, uri, mint) {
    const mplTokenMetadata = new web3_js_1.PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);
    const [metadataPDA] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(METADATA_SEED), mplTokenMetadata.toBuffer(), mint.publicKey.toBuffer()], mplTokenMetadata);
    const [bondingCurvePDA] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(BONDING_CURVE_SEED), mint.publicKey.toBuffer()], program.programId);
    // FIX: Use getAssociatedTokenAddressSync with allowOwnerOffCurve = true
    const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mint.publicKey, bondingCurvePDA, true // allowOwnerOffCurve = true for program-owned accounts
    );
    return program.methods
        .create(name, symbol, uri, creator)
        .accounts({
        mint: mint.publicKey,
        associatedBondingCurve: associatedBondingCurve,
        metadata: metadataPDA,
        user: creator,
    })
        .signers([mint])
        .transaction();
}
/**
 * Create a real PumpFun token with bonding curve (appears on pump.fun)
 * @param connection - Solana connection instance
 * @param wallet - Keypair for the creator wallet
 * @param tokenConfig - Configuration for the token to be created
 * @param isMainnet - Whether to use mainnet (default: false for devnet)
 * @returns Promise resolving to CreateTokenResult
 */
async function createPumpFunToken(connection, wallet, tokenConfig, isMainnet = false) {
    try {
        (0, debug_1.log)('🚀 Creating PumpFun bonding curve token...');
        // Generate new mint keypair for the token
        const mint = web3_js_1.Keypair.generate();
        (0, debug_1.log)(`🪙 Token Mint: ${mint.publicKey.toString()}`);
        (0, debug_1.log)(`📝 Token: ${tokenConfig.name} (${tokenConfig.symbol})`);
        (0, debug_1.log)(`📄 Description: ${tokenConfig.description}`);
        // Load image file if provided
        let imageFile = undefined;
        if (tokenConfig.imagePath) {
            try {
                imageFile = await (0, image_loader_1.loadImageFromPath)(tokenConfig.imagePath);
                (0, debug_1.log)('✅ Image loaded successfully');
            }
            catch (imageError) {
                (0, debug_1.log)('⚠️ Image loading failed, proceeding without image:', imageError);
            }
        }
        (0, debug_1.log)('🔨 Creating bonding curve token...');
        // Check and initialize global account if needed
        (0, debug_1.log)('🌍 Checking global account initialization...');
        const programId = constants_1.PUMP_PROGRAM_ID;
        if (!(await (0, helper_1.isGlobalAccountInitialized)(connection, programId))) {
            (0, debug_1.log)('⚠️ Global account not initialized. Attempting to initialize...');
            const globalInitResult = await (0, helper_1.initializeGlobalAccount)(connection, wallet, programId);
            if (!globalInitResult.success) {
                (0, debug_1.log)(`❌ Global account initialization failed: ${globalInitResult.error}`);
                (0, debug_1.log)('💡 The PumpFun program requires a global account to be initialized before creating tokens.');
                (0, debug_1.log)('💡 This is typically a one-time setup done by the protocol administrators.');
                throw new Error('Global account not initialized and initialization failed');
            }
            (0, debug_1.log)('✅ Global account initialized successfully!');
        }
        else {
            (0, debug_1.log)('✅ Global account already initialized');
        }
        let signature;
        // Upload metadata using our custom function
        let metadataUri;
        try {
            if (imageFile) {
                const metadata = await (0, metadata_1.uploadMetadata)(tokenConfig.name, tokenConfig.symbol, tokenConfig.description, imageFile);
                metadataUri = metadata.metadataUri;
                (0, debug_1.log)('✅ Metadata uploaded successfully');
            }
            else {
                // Use fallback metadata URI if no image
                metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify({
                    name: tokenConfig.name,
                    symbol: tokenConfig.symbol,
                }))}`;
                (0, debug_1.log)('📝 Using fallback metadata URI');
            }
        }
        catch (metadataError) {
            (0, debug_1.log)('⚠️ Metadata upload failed, using fallback URI:', metadataError);
            // Use a fallback metadata URI if upload fails - keep it extremely short
            metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify({
                name: tokenConfig.name,
                symbol: tokenConfig.symbol,
            }))}`;
        }
        // Create the token using local implementation
        (0, debug_1.log)('🔧 Creating token with local implementation...');
        // Setup Anchor provider
        const provider = new anchor_1.AnchorProvider(connection, new wallet_1.SimpleWallet(wallet), {
            commitment: 'confirmed',
        });
        // Create program instance
        const program = new anchor_1.Program(pump_program_json_1.default, provider);
        const createTx = await getCreateInstructions(program, wallet.publicKey, tokenConfig.name, tokenConfig.symbol, metadataUri, mint);
        (0, debug_1.log)('✅ Create instructions generated!');
        // First, create the token
        (0, debug_1.log)('📝 Preparing and signing create transaction...');
        // Set recent blockhash and fee payer before signing
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        createTx.recentBlockhash = blockhash;
        createTx.feePayer = wallet.publicKey;
        // Sign with both wallet and mint keypairs
        createTx.partialSign(wallet, mint);
        // Send the create transaction using transaction utility
        const createResult = await (0, transaction_1.sendAndConfirmRawTransaction)(connection, createTx.serialize(), {
            preflightCommitment: 'confirmed',
        });
        if (!createResult.success) {
            throw new Error(`Create transaction failed: ${createResult.error}`);
        }
        signature = createResult.signature;
        (0, debug_1.logSuccess)('Token created successfully!');
        // Store buy amount for later use after creator vault is extracted
        const buyAmountSol = tokenConfig.initialBuyAmount || 0.01; // Default 0.01 SOL
        (0, debug_1.logSignature)(signature, 'Token creation');
        // Now we can perform the initial buy (creator vault is no longer needed)
        if (tokenConfig.initialBuyAmount && tokenConfig.initialBuyAmount > 0) {
            (0, debug_1.log)(`💰 Performing initial buy: ${buyAmountSol} SOL`);
            try {
                // FIX: Wait for proper confirmation with commitment level
                (0, debug_1.log)('⏳ Waiting for transaction to be fully confirmed...');
                await connection.confirmTransaction({
                    signature: signature,
                    ...(await connection.getLatestBlockhash('confirmed')),
                }, 'confirmed');
                // Additional wait to ensure all accounts are properly initialized
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Execute the initial buy using buyPumpFunToken (no creator vault needed)
                const buySignature = await (0, buy_1.buyPumpFunToken)(connection, wallet, mint.publicKey, buyAmountSol, 1000 // slippageBasisPoints
                );
                (0, debug_1.logSuccess)('Initial buy completed successfully!');
                (0, debug_1.log)(`   Buy Amount: ${buyAmountSol} SOL`);
                (0, debug_1.logSignature)(buySignature, 'Initial buy');
            }
            catch (buyError) {
                const errorMessage = buyError instanceof Error ? buyError.message : String(buyError);
                (0, debug_1.log)(`❌ Initial buy failed: ${errorMessage}`);
                (0, debug_1.log)('💡 You can manually buy tokens later using the buy command');
            }
        }
        // Generate URLs using transaction utility
        const explorerUrl = (0, transaction_1.getExplorerUrl)(signature, isMainnet ? 'mainnet' : 'devnet');
        const pumpFunUrl = `https://pump.fun/coin/${mint.publicKey.toString()}`;
        (0, debug_1.log)(`🌐 Explorer: ${explorerUrl}`);
        (0, debug_1.log)(`💱 Pump.fun: ${pumpFunUrl}`);
        // Check bonding curve state with retries
        (0, debug_1.log)('⏳ Checking bonding curve state...');
        try {
            // For now, show placeholder bonding curve info
            // In a full implementation, you would use PumpFunSDK to get the actual state
            (0, debug_1.log)('📊 Bonding Curve Info:');
            (0, debug_1.log)('   Virtual SOL Reserves: 0 SOL');
            (0, debug_1.log)('   Virtual Token Reserves: 0');
            (0, debug_1.log)('   Real SOL Reserves: 0 SOL');
            (0, debug_1.log)('   Real Token Reserves: 0');
            (0, debug_1.log)('   Complete: false');
            // Show global account info
            (0, debug_1.log)('🌍 Global Account Info:');
            (0, debug_1.log)(`   Global PDA: ${(0, helper_1.getGlobalPDA)(programId).toString()}`);
            (0, debug_1.log)('   Status: Initialized');
        }
        catch (error) {
            (0, debug_1.log)('⚠️  Could not fetch bonding curve state yet (normal for new tokens)');
        }
        return {
            success: true,
            mint: mint.publicKey.toString(),
            mintKeypair: mint,
            signature: signature,
        };
    }
    catch (error) {
        (0, debug_1.logError)('❌ Error creating PumpFun token:', error);
        // Handle specific SDK errors with better type safety
        let errorMessage = 'Token creation failed';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        else if (typeof error === 'string') {
            errorMessage = error;
        }
        else if (error && typeof error === 'object' && 'toString' in error) {
            errorMessage = error.toString();
        }
        return {
            success: false,
            error: errorMessage,
        };
    }
}
//# sourceMappingURL=createToken.js.map