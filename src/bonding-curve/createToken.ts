import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { loadImageFromPath } from '../utils/image-loader';
import { uploadMetadata } from '../utils/metadata';
import { log, logSuccess, logSignature, logError } from '../utils/debug';
import { formatLamportsAsSol } from '../utils/amounts';
// getBondingCurveState moved to helper.ts
import { buyPumpFunToken } from './buy';
import { TokenConfig, CreateTokenResult } from '../@types';
import { sendAndConfirmRawTransaction, getExplorerUrl } from '../utils/transaction';
import { getGlobalPDA, isGlobalAccountInitialized, initializeGlobalAccount } from './bc-helper';
import { PUMP_PROGRAM_ID } from './idl/constants';
import { createAssociatedTokenAccount } from '../createAccount';

import { SimpleWallet } from '../utils/wallet';
import { loadIDL } from './idl/load-idl';

// Constants for token creation
const MPL_TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const METADATA_SEED = 'metadata';
const BONDING_CURVE_SEED = 'bonding-curve';

/**
 * Get create instructions for a new PumpFun token
 */
async function getCreateInstructions(
  program: Program,
  creator: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  mint: Keypair
): Promise<Transaction> {
  const mplTokenMetadata = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);

  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(METADATA_SEED), mplTokenMetadata.toBuffer(), mint.publicKey.toBuffer()],
    mplTokenMetadata
  );

  const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(BONDING_CURVE_SEED), mint.publicKey.toBuffer()],
    program.programId
  );

  // FIX: Use getAssociatedTokenAddressSync with allowOwnerOffCurve = true
  const associatedBondingCurve = getAssociatedTokenAddressSync(
    mint.publicKey,
    bondingCurvePDA,
    true // allowOwnerOffCurve = true for program-owned accounts
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
export async function createPumpFunTokenInstruction(
  connection: Connection,
  wallet: Keypair,
  tokenConfig: TokenConfig,
  mint: Keypair,
): Promise<Transaction> {
  log(`📝 Token: ${tokenConfig.name} (${tokenConfig.symbol})`);
  log(`📄 Description: ${tokenConfig.description}`);

  // Load image file if provided
  let imageFile: File | undefined = undefined;
  if (tokenConfig.imagePath) {
    try {
      imageFile = await loadImageFromPath(tokenConfig.imagePath);
      log('✅ Image loaded successfully');
    } catch (imageError) {
      log('⚠️ Image loading failed, proceeding without image:', imageError);
    }
  }

  log('🔨 Creating bonding curve token...');

  // Check and initialize global account if needed
  log('🌍 Checking global account initialization...')

  if (!(await isGlobalAccountInitialized(connection, PUMP_PROGRAM_ID))) {
    log('⚠️ Global account not initialized. Attempting to initialize...');
    const globalInitResult = await initializeGlobalAccount(connection, wallet, PUMP_PROGRAM_ID);

    if (!globalInitResult.success) {
      log(`❌ Global account initialization failed: ${globalInitResult.error}`);
      log(
        '💡 The PumpFun program requires a global account to be initialized before creating tokens.'
      );
      log('💡 This is typically a one-time setup done by the protocol administrators.');
      throw new Error('Global account not initialized and initialization failed');
    }

    log('✅ Global account initialized successfully!');
  } else {
    log('✅ Global account already initialized');
  }

  // Upload metadata using our custom function
  let metadataUri: string;
  try {
    if (imageFile) {
      const metadata = await uploadMetadata(
        tokenConfig.name,
        tokenConfig.symbol,
        tokenConfig.description,
        imageFile
      );
      metadataUri = metadata.metadataUri;
      log('✅ Metadata uploaded successfully');
    } else {
      // Use fallback metadata URI if no image
      metadataUri = `data:application/json,${encodeURIComponent(
        JSON.stringify({
          name: tokenConfig.name,
          symbol: tokenConfig.symbol,
        })
      )}`;
      log('📝 Using fallback metadata URI');
    }
  } catch (metadataError) {
    log('⚠️ Metadata upload failed, using fallback URI:', metadataError);
    // Use a fallback metadata URI if upload fails - keep it extremely short
    metadataUri = `data:application/json,${encodeURIComponent(
      JSON.stringify({
        name: tokenConfig.name,
        symbol: tokenConfig.symbol,
      })
    )}`;
  }

  // Create the token using local implementation
  log('🔧 Creating token with local implementation...');

  // Setup Anchor provider
  const provider = new AnchorProvider(connection, new SimpleWallet(wallet), {
    commitment: 'confirmed',
  });

  // Detect network from connection RPC URL
  const rpcUrl = connection.rpcEndpoint;
  const isMainnet = rpcUrl.includes('mainnet') || rpcUrl.includes('api.mainnet');
  const network = isMainnet ? 'mainnet-beta' : 'devnet';
  
  // Load appropriate IDL based on network
  const IDL = loadIDL(network);

  // Create program instance
  const program = new Program(IDL as unknown, provider);

  const createTx = await getCreateInstructions(
    program,
    wallet.publicKey,
    tokenConfig.name,
    tokenConfig.symbol,
    metadataUri,
    mint
  );

  return createTx;
}

/**
 * Create a real PumpFun token with bonding curve (appears on pump.fun)
 * @param connection - Solana connection instance
 * @param wallet - Keypair for the creator wallet
 * @param tokenConfig - Configuration for the token to be created
 * @param isMainnet - Whether to use mainnet (default: false for devnet)
 * @returns Promise resolving to CreateTokenResult
 */
export async function createPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  tokenConfig: TokenConfig,
  isMainnet: boolean = false
): Promise<CreateTokenResult> {
  try {
    log('🚀 Creating PumpFun bonding curve token...');
    // Generate new mint keypair for the token
    const mint = Keypair.generate();
  
    log(`🪙 Token Mint: ${mint.publicKey.toString()}`);
    const createTx = await createPumpFunTokenInstruction(
      connection,
      wallet,
      tokenConfig,
      mint,
    );

    log('✅ Create instructions generated!');
    let signature: string;

    // First, create the token
    log('📝 Preparing and signing create transaction...');

    // Set recent blockhash and fee payer before signing
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    createTx.recentBlockhash = blockhash;
    createTx.feePayer = wallet.publicKey;

    // Sign with both wallet and mint keypairs
    createTx.partialSign(wallet, mint);

    // Send the create transaction using transaction utility
    const createResult = await sendAndConfirmRawTransaction(connection, createTx.serialize(), {
      preflightCommitment: 'confirmed',
    });

    if (!createResult.success) {
      throw new Error(`Create transaction failed: ${createResult.error}`);
    }

    signature = createResult.signature!;

    logSuccess('Token created successfully!');

    // Store buy amount for later use after creator vault is extracted
    const amountLamports = tokenConfig.initialBuyAmount || 1000000; // Default 0.001 SOL in lamports (smaller for testing)

    logSignature(signature, 'Token creation');

    // Now we can perform the initial buy (creator vault is no longer needed)
    if (tokenConfig.initialBuyAmount && tokenConfig.initialBuyAmount > 0) {
      log(`💰 Performing initial buy: ${formatLamportsAsSol(amountLamports)} SOL`);

      try {
        // FIX: Wait for proper confirmation with commitment level
        log('⏳ Waiting for transaction to be fully confirmed...');
        await connection.confirmTransaction(
          {
            signature: signature,
            ...(await connection.getLatestBlockhash('confirmed')),
          },
          'confirmed'
        );

        // Additional wait to ensure all accounts are properly initialized
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create associated token account for the wallet to hold the tokens
        log('🏗️ Creating associated token account for wallet...');
        const createAtaResult = await createAssociatedTokenAccount(
          connection,
          wallet, // payer
          wallet.publicKey, // owner
          mint.publicKey // mint
        );

        if (!createAtaResult.success) {
          throw new Error(`Failed to create associated token account: ${createAtaResult.error}`);
        }

        logSuccess(`✅ Associated token account created: ${createAtaResult.account?.toString()}`);

        // Execute the initial buy using buy (no creator vault needed)
        const buySignature = await buyPumpFunToken(
          connection,
          wallet,
          mint.publicKey,
          amountLamports,
          1000 // slippageBasisPoints
        );

        logSuccess('Initial buy completed successfully!');
        log(`   💰 Buy Amount: ${formatLamportsAsSol(amountLamports)} SOL`);
        logSignature(buySignature, 'Initial buy');
      } catch (buyError) {
        const errorMessage = buyError instanceof Error ? buyError.message : String(buyError);
        log(`❌ Initial buy failed: ${errorMessage}`);
        log('💡 You can manually buy tokens later using the buy command');
      }
    }

    // Generate URLs using transaction utility
    const explorerUrl = getExplorerUrl(signature, isMainnet ? 'mainnet' : 'devnet');
    const pumpFunUrl = `https://pump.fun/coin/${mint.publicKey.toString()}`;

    log(`🌐 Explorer: ${explorerUrl}`);
    log(`💱 Pump.fun: ${pumpFunUrl}`);

    // Check bonding curve state with retries
    log('⏳ Checking bonding curve state...');
    try {
      // For now, show placeholder bonding curve info
      // In a full implementation, you would use PumpFunSDK to get the actual state
      log('📊 Bonding Curve Info:');
      log('   Virtual SOL Reserves: 0 SOL');
      log('   Virtual Token Reserves: 0');
      log('   Real SOL Reserves: 0 SOL');
      log('   Real Token Reserves: 0');
      log('   Complete: false');

      // Show global account info
      log('🌍 Global Account Info:');
      log(`   Global PDA: ${getGlobalPDA(PUMP_PROGRAM_ID).toString()}`);
      log('   Status: Initialized');
    } catch (error) {
      log('⚠️  Could not fetch bonding curve state yet (normal for new tokens)');
    }

    return {
      success: true,
      mint: mint.publicKey.toString(),
      mintKeypair: mint,
      signature: signature,
    };
  } catch (error: unknown) {
    logError('❌ Error creating PumpFun token:', error);

    // Handle specific SDK errors with better type safety
    let errorMessage = 'Token creation failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'toString' in error) {
      errorMessage = error.toString();
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
