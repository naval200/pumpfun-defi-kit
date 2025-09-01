import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { debugLog, logSuccess, logSignature } from './utils/debug';

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
    // Use getAssociatedTokenAddressSync for program-owned accounts
    const userTokenAccount = allowOwnerOffCurve
      ? getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve)
      : await getAssociatedTokenAddress(mint, owner);

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

    const createAtaTx = new Transaction();
    createAtaTx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey, // payer
        userTokenAccount, // associated token account
        owner, // owner
        mint, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

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
    // Use getAssociatedTokenAddressSync for program-owned accounts
    const userTokenAccount = allowOwnerOffCurve
      ? getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve)
      : await getAssociatedTokenAddress(mint, owner);

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
    const userTokenAccount = await getAssociatedTokenAddress(mint, owner);
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
    const userTokenAccount = await getAssociatedTokenAddress(mint, owner);
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
