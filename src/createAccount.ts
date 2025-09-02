import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction as createAssociatedTokenAccountInstructionSPL,
  getAccount,
} from '@solana/spl-token';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { debugLog, logSuccess, logSignature } from './utils/debug';

/**
 * Get the Associated Token Account address for a user and mint
 */
export function getAssociatedTokenAccountAddress(
  owner: PublicKey,
  mint: PublicKey,
  allowOwnerOffCurve: boolean = false
): PublicKey {
  return allowOwnerOffCurve
    ? getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve)
    : getAssociatedTokenAddressSync(mint, owner);
}

/**
 * Create the instruction for creating an Associated Token Account (ATA)
 * This function only creates the instruction without executing it
 */
export function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  allowOwnerOffCurve: boolean = false
): { instruction: any; account: PublicKey } {
  const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint, allowOwnerOffCurve);
  const instruction = createAssociatedTokenAccountInstructionSPL(
    payer, // payer
    userTokenAccount, // associated token account
    owner, // owner
    mint, // mint
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return {
    instruction,
    account: userTokenAccount,
  };
}

/**
 * Create an Associated Token Account (ATA) for a user and mint
 */
export async function createAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
  mint: PublicKey,
  allowOwnerOffCurve: boolean = false
): Promise<{ success: boolean; signature?: string; error?: string; account?: PublicKey }> {
  try {
    const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint, allowOwnerOffCurve);

    debugLog(`🏗️ Creating ATA: ${userTokenAccount.toString()}`);

    // Check if ATA already exists
    try {
      await getAccount(connection, userTokenAccount);
      debugLog('✅ Associated token account already exists');
      return {
        success: true,
        account: userTokenAccount,
      };
    } catch (error) {
      // ATA doesn't exist, create it
      debugLog('🏗️ Creating new associated token account...');
    }

    const { instruction } = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      owner,
      mint,
      allowOwnerOffCurve
    );

    const createAtaTx = new Transaction();
    createAtaTx.add(instruction);

    // Get recent blockhash and set fee payer
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    createAtaTx.recentBlockhash = blockhash;
    createAtaTx.feePayer = payer.publicKey;

    // Sign and send transaction
    createAtaTx.sign(payer);
    const signature = await connection.sendRawTransaction(createAtaTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    logSignature(signature, 'ATA creation');

    // Wait for confirmation
    debugLog('⏳ Waiting for ATA creation confirmation...');
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      return {
        success: false,
        error: `ATA creation failed: ${confirmation.value.err}`,
      };
    }

    logSuccess('Associated token account created successfully!');
    return {
      success: true,
      signature,
      account: userTokenAccount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `ATA creation error: ${errorMessage}`,
    };
  }
}

/**
 * Get or create an Associated Token Account (ATA) for a user and mint
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
  mint: PublicKey,
  allowOwnerOffCurve: boolean = false
): Promise<{ success: boolean; account: PublicKey; error?: string }> {
  try {
    const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint, allowOwnerOffCurve);

    // Check if ATA exists
    try {
      await getAccount(connection, userTokenAccount);
      // ATA already exists - return success
      return { success: true, account: userTokenAccount };
    } catch (error) {
      // ATA doesn't exist, create it
      const createResult = await createAssociatedTokenAccount(
        connection,
        payer,
        owner,
        mint,
        allowOwnerOffCurve
      );
      if (createResult.success && createResult.account) {
        return { success: true, account: createResult.account };
      } else {
        return {
          success: false,
          account: userTokenAccount,
          error: createResult.error,
        };
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      account: PublicKey.default,
      error: `Error getting/creating ATA: ${errorMessage}`,
    };
  }
}

/**
 * Check if an Associated Token Account exists
 */
export async function checkAssociatedTokenAccountExists(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<boolean> {
  try {
    const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint);
    await getAccount(connection, userTokenAccount);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the balance of tokens in an Associated Token Account
 */
export async function getAssociatedTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<{ success: boolean; balance?: bigint; error?: string }> {
  try {
    const userTokenAccount = getAssociatedTokenAccountAddress(owner, mint);
    const tokenAccount = await getAccount(connection, userTokenAccount);
    return { success: true, balance: tokenAccount.amount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Error getting token balance: ${errorMessage}`,
    };
  }
}
