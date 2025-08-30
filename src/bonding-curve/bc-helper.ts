import {
  PublicKey,
  Connection,
  TransactionInstruction,
  Keypair,
  Transaction,
  Commitment,
} from '@solana/web3.js';
import {
  PUMP_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  GLOBAL_VOLUME_ACCUMULATOR,
  TOKEN_PROGRAM_ID,
  GLOBAL_SEED,
  BONDING_CURVE_SEED,
  CREATOR_VAULT_SEED,
  GLOBAL_VOLUME_ACCUMULATOR_SEED,
  USER_VOLUME_ACCUMULATOR_SEED,
  EVENT_AUTHORITY_SEED,
  COMPUTE_BUDGET_INSTRUCTIONS,
} from './idl/constants';
import { log, logWarning, logSuccess } from '../utils/debug';

// ============================================================================
// PDA DERIVATION FUNCTIONS
// ============================================================================

/**
 * Derive bonding curve address from mint
 */
export function deriveBondingCurveAddress(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([BONDING_CURVE_SEED, mint.toBuffer()], PUMP_PROGRAM_ID);
}

/**
 * Derive associated bonding curve address
 */
export function deriveAssociatedBondingCurveAddress(
  mint: PublicKey,
  bondingCurve: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [bondingCurve.toBuffer(), mint.toBuffer()],
    PUMP_PROGRAM_ID
  );
}

/**
 * Derive creator vault address from creator
 */
export function deriveCreatorVaultAddress(creator: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CREATOR_VAULT_SEED, creator.toBuffer()],
    PUMP_PROGRAM_ID
  );
}

/**
 * Derive global volume accumulator address
 */
export function deriveGlobalVolumeAccumulatorAddress(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([GLOBAL_VOLUME_ACCUMULATOR_SEED], PUMP_PROGRAM_ID);
}

/**
 * Derive user volume accumulator address
 */
export function deriveUserVolumeAccumulatorAddress(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_VOLUME_ACCUMULATOR_SEED, user.toBuffer()],
    PUMP_PROGRAM_ID
  );
}

/**
 * Derive event authority address
 */
export function deriveEventAuthorityAddress(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([EVENT_AUTHORITY_SEED], PUMP_PROGRAM_ID);
}

/**
 * Derive global account address
 */
export function deriveGlobalAddress(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([GLOBAL_SEED], PUMP_PROGRAM_ID);
}

// ============================================================================
// COMPUTE BUDGET UTILITIES
// ============================================================================

/**
 * Create compute budget instruction for setting compute unit limit
 */
export function createComputeUnitLimitInstruction(units: number): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: COMPUTE_BUDGET_PROGRAM_ID,
    data: Buffer.from([
      COMPUTE_BUDGET_INSTRUCTIONS.SET_COMPUTE_UNIT_LIMIT, // SetComputeUnitLimit instruction discriminator
      ...Array.from(new Uint8Array(new Uint32Array([units]).buffer)), // compute units
    ]),
  });
}

/**
 * Create compute budget instruction for setting compute unit price
 */
export function createComputeUnitPriceInstruction(microLamports: number): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: COMPUTE_BUDGET_PROGRAM_ID,
    data: Buffer.from([
      COMPUTE_BUDGET_INSTRUCTIONS.SET_COMPUTE_UNIT_PRICE, // SetComputeUnitPrice instruction discriminator
      ...Array.from(new Uint8Array(new Uint32Array([microLamports]).buffer)), // micro-lamports per compute unit
    ]),
  });
}

/**
 * Validate bonding curve account before operations
 */
export async function validateBondingCurve(
  connection: Connection,
  mint: PublicKey
): Promise<boolean> {
  try {
    const [bondingCurve] = deriveBondingCurveAddress(mint);

    // Try to get the bonding curve account info
    const accountInfo = await connection.getAccountInfo(bondingCurve);

    if (!accountInfo) {
      log('❌ Bonding curve account not found');
      return false;
    }

    if (accountInfo.data.length === 0) {
      log('❌ Bonding curve account has no data');
      return false;
    }

    log('✅ Bonding curve account is valid');
    return true;
  } catch (error) {
    logWarning('Error validating bonding curve:', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get bonding curve account info (placeholder implementation)
 */
export async function getBondingCurveAccount(
  connection: Connection,
  mint: PublicKey,
  commitment: string = 'confirmed'
) {
  const [bondingCurvePDA] = deriveBondingCurveAddress(mint);

  const tokenAccount = await connection.getAccountInfo(bondingCurvePDA, {
    commitment: commitment as Commitment,
  });
  if (!tokenAccount) {
    return null;
  }
  // For now, return a placeholder object - you'll need to implement BondingCurveAccount
  return {
    getBuyPrice: (solAmount: bigint) => solAmount * 1000n, // Placeholder
    getSellPrice: (tokenAmount: bigint, _feeBasisPoints: bigint) =>
      (tokenAmount * (10000n - _feeBasisPoints)) / 10000n, // Placeholder
  };
}

/**
 * Calculate buy amount with slippage
 */
export function calculateWithSlippageBuy(solAmount: bigint, slippageBasisPoints: bigint): bigint {
  return (solAmount * (10000n + slippageBasisPoints)) / 10000n;
}

/**
 * Calculate sell amount with slippage
 */
export function calculateWithSlippageSell(solAmount: bigint, slippageBasisPoints: bigint): bigint {
  return (solAmount * (10000n - slippageBasisPoints)) / 10000n;
}

// ============================================================================
// ADDITIONAL PDA DERIVATION FUNCTIONS
// ============================================================================

/**
 * Get bonding curve PDA (alias for deriveBondingCurveAddress)
 */
export function getBondingCurvePDA(mint: PublicKey): PublicKey {
  const [bondingCurve] = deriveBondingCurveAddress(mint);
  return bondingCurve;
}

/**
 * Get global account PDA (alias for deriveGlobalAddress)
 */
export function getGlobalAccountPDA(): PublicKey {
  const [globalAccount] = deriveGlobalAddress();
  return globalAccount;
}

/**
 * Get creator vault PDA (alias for deriveCreatorVaultAddress)
 */
export function getCreatorVaultPDA(creator: PublicKey): PublicKey {
  const [creatorVault] = deriveCreatorVaultAddress(creator);
  return creatorVault;
}

/**
 * Get global volume accumulator PDA (alias for deriveGlobalVolumeAccumulatorAddress)
 */
export function getGlobalVolumeAccumulatorPDA(): PublicKey {
  const [globalVolumeAccumulator] = deriveGlobalVolumeAccumulatorAddress();
  return globalVolumeAccumulator;
}

/**
 * Get global incentive token account PDA
 */
export function getGlobalIncentiveTokenAccountPDA(mint: PublicKey): PublicKey {
  const [globalIncentiveTokenAccount] = PublicKey.findProgramAddressSync(
    [getGlobalVolumeAccumulatorPDA().toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    PUMP_PROGRAM_ID
  );
  return globalIncentiveTokenAccount;
}

/**
 * Get user volume accumulator PDA (alias for deriveUserVolumeAccumulatorAddress)
 */
export function getUserVolumeAccumulatorPDA(user: PublicKey): PublicKey {
  const [userVolumeAccumulator] = deriveUserVolumeAccumulatorAddress(user);
  return userVolumeAccumulator;
}

/**
 * Get user volume accumulator using reverse engineered pattern
 * Based on analysis of working transactions: ["user_volume_accumulator", wallet_address]
 */
export function getUserVolumeAccumulator(programId: PublicKey, user: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [USER_VOLUME_ACCUMULATOR_SEED, user.toBuffer()],
    programId
  );
  log(`✅ Derived user volume accumulator: ${pda.toString()}`);
  return pda;
}

/**
 * Get creator vault PDA using reverse engineered pattern
 * Based on analysis of working transactions: ["creator-vault", wallet_address]
 */
export function getCreatorVaultPDAFromWallet(programId: PublicKey, wallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [CREATOR_VAULT_SEED, wallet.toBuffer()],
    programId
  );
  log(`✅ Derived creator vault using reverse engineered pattern: ${pda.toString()}`);
  return pda;
}

/**
 * Fetch bonding curve account data and extract creator
 */
export async function getBondingCurveCreator(
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey> {
  const [bondingCurvePDA] = deriveBondingCurveAddress(mint);

  try {
    const accountInfo = await connection.getAccountInfo(bondingCurvePDA);
    if (!accountInfo) {
      throw new Error(`Bonding curve account not found: ${bondingCurvePDA.toString()}`);
    }

    // Bonding curve account layout (based on IDL):
    // - discriminator: [u8; 8] (8 bytes) - Anchor account discriminator
    // - virtual_token_reserves: u64 (8 bytes)
    // - virtual_sol_reserves: u64 (8 bytes)
    // - real_token_reserves: u64 (8 bytes)
    // - real_sol_reserves: u64 (8 bytes)
    // - token_total_supply: u64 (8 bytes)
    // - complete: bool (1 byte)
    // - creator: pubkey (32 bytes)

    const data = accountInfo.data;
    const creatorOffset = 8 + 8 + 8 + 8 + 8 + 8 + 1; // Skip discriminator + fields to creator field (49 bytes)
    const creatorBytes = data.slice(creatorOffset, creatorOffset + 32);
    const creator = new PublicKey(creatorBytes);

    log(`✅ Fetched creator from bonding curve: ${creator.toString()}`);
    return creator;
  } catch (error) {
    logWarning(`Failed to fetch bonding curve creator: ${error}`);
    throw error;
  }
}

/**
 * Get all required PDAs for buy operations with robust resolution
 * Consolidates all PDA derivation in one place for reuse
 * Now includes async creator resolution from bonding curve
 */
export async function getAllRequiredPDAsForBuyAsync(
  connection: Connection,
  programId: PublicKey,
  mint: PublicKey,
  user: PublicKey
) {
  // Global PDA
  const globalPDA = getGlobalPDA(programId);

  // Bonding curve PDA
  const [bondingCurvePDA] = deriveBondingCurveAddress(mint);

  // Get actual creator from bonding curve account
  const creator = await getBondingCurveCreator(connection, mint);

  // Creator vault PDA - use actual creator from bonding curve
  const [creatorVaultPDA] = deriveCreatorVaultAddress(creator);

  // Event authority PDA - standard Anchor pattern
  const [eventAuthorityPDA] = PublicKey.findProgramAddressSync([EVENT_AUTHORITY_SEED], programId);

  // Global volume accumulator - known constant
  const [globalVolumeAccumulatorPDA] = deriveGlobalVolumeAccumulatorAddress();

  // User volume accumulator - derived from user
  const userVolumeAccumulatorPDA = getUserVolumeAccumulator(programId, user);

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
 * Get all required PDAs for buy operations with robust resolution
 * Consolidates all PDA derivation in one place for reuse
 */
export function getAllRequiredPDAsForBuy(programId: PublicKey, mint: PublicKey, user: PublicKey) {
  // Global PDA
  const globalPDA = getGlobalPDA(programId);

  // Bonding curve PDA
  const [bondingCurvePDA] = deriveBondingCurveAddress(mint);

  // Creator vault PDA - use reverse engineered pattern: ["creator-vault", wallet_address]
  const creatorVaultPDA = getCreatorVaultPDAFromWallet(programId, user);

  // Event authority PDA - standard Anchor pattern
  const [eventAuthorityPDA] = PublicKey.findProgramAddressSync([EVENT_AUTHORITY_SEED], programId);

  // Global volume accumulator - known constant
  const globalVolumeAccumulatorPDA = new PublicKey(GLOBAL_VOLUME_ACCUMULATOR);

  // User volume accumulator - use reverse engineered pattern
  const userVolumeAccumulatorPDA = getUserVolumeAccumulator(programId, user);

  // Log PDA derivations for debugging
  log('🔧 PDA Derivations:');
  log(`   Global: ${globalPDA.toString()}`);
  log(`   BondingCurve: ${bondingCurvePDA.toString()}`);
  log(`   CreatorVault: ${creatorVaultPDA.toString()}`);
  log(`   EventAuthority: ${eventAuthorityPDA.toString()}`);
  log(`   GlobalVolumeAccumulator: ${globalVolumeAccumulatorPDA.toString()}`);
  log(`   UserVolumeAccumulator: ${userVolumeAccumulatorPDA.toString()}`);

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
export function getEventAuthorityPDA(): PublicKey {
  const [eventAuthority] = deriveEventAuthorityAddress();
  return eventAuthority;
}

/**
 * Get bonding curve PDAs for batch operations
 * This function provides a clean interface for batch operations to get required PDAs
 * @param connection - Solana connection
 * @param mint - Token mint public key
 * @param user - User public key
 * @returns Object containing all required PDAs for bonding curve operations
 */
export async function getBondingCurvePDAs(
  connection: Connection,
  mint: PublicKey,
  user: PublicKey
) {
  return await getAllRequiredPDAsForBuyAsync(connection, PUMP_PROGRAM_ID, mint, user);
}

// ============================================================================
// GLOBAL ACCOUNT INITIALIZATION
// ============================================================================

/**
 * Get the global PDA for the PumpFun program
 */
export function getGlobalPDA(programId: PublicKey): PublicKey {
  const [globalPDA] = PublicKey.findProgramAddressSync([GLOBAL_SEED], programId);
  return globalPDA;
}

/**
 * Check if the global account is initialized
 */
export async function isGlobalAccountInitialized(
  connection: Connection,
  programId: PublicKey
): Promise<boolean> {
  try {
    const globalPDA = getGlobalPDA(programId);
    const accountInfo = await connection.getAccountInfo(globalPDA);

    if (!accountInfo) {
      return false;
    }

    // Check if the account is owned by the PumpFun program
    return accountInfo.owner.equals(programId);
  } catch (error) {
    return false;
  }
}

/**
 * Initialize the global account (one-time setup)
 * This must be called before creating any tokens
 */
export async function initializeGlobalAccount(
  connection: Connection,
  wallet: Keypair,
  programId: PublicKey
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    log('🌍 Initializing PumpFun global account...');

    // Check if already initialized
    if (await isGlobalAccountInitialized(connection, programId)) {
      log('✅ Global account already initialized');
      return { success: true };
    }

    // Create the global account
    const globalPDA = getGlobalPDA(programId);
    log(`📍 Global PDA: ${globalPDA.toString()}`);

    // Create a transaction to initialize the global account
    const transaction = new Transaction();

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

    log(`📡 Global account initialization transaction sent! Signature: ${signature}`);

    // Wait for confirmation
    log('⏳ Waiting for global account initialization confirmation...');
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      return {
        success: false,
        error: `Global account initialization failed: ${confirmation.value.err}`,
      };
    }

    logSuccess('Global account initialized successfully!');
    return {
      success: true,
      signature,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Global account initialization error: ${errorMessage}`,
    };
  }
}
