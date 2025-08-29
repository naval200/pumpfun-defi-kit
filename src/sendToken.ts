import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { debugLog, logSuccess, logSignature, logError } from './utils/debug';
import { sendAndConfirmTransaction, sendAndConfirmTransactionWithFeePayer } from './utils/transaction';
import { createAssociatedTokenAccount } from './createAccount';

/**
 * Send tokens from one address to another
 * Works with both bonding curve and AMM tokens since they are standard SPL tokens
 *
 * @param connection - Solana connection instance
 * @param sender - Keypair for the sender wallet
 * @param recipient - PublicKey of the recipient
 * @param mint - PublicKey of the token mint
 * @param amount - Amount of tokens to send
 * @param allowOwnerOffCurve - Whether to allow owner off curve (default: false)
 * @param createRecipientAccount - Whether to create recipient account if needed (default: true)
 * @param feePayer - Optional Keypair for the fee payer (if different from sender)
 * @returns Promise resolving to transfer result object
 */
export async function sendToken(
  connection: Connection,
  sender: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: bigint,
  allowOwnerOffCurve: boolean = false,
  createRecipientAccount: boolean = true,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; error?: string; recipientAccount?: PublicKey }> {
  try {
    debugLog(
      `🚀 Starting token transfer: ${amount} tokens from ${sender.publicKey.toString()} to ${recipient.toString()}`
    );

    // Get sender's token account
    const senderTokenAccount = await getAssociatedTokenAddress(mint, sender.publicKey);

    // Check if sender has sufficient balance
    try {
      const senderAccount = await getAccount(connection, senderTokenAccount);
      if (senderAccount.amount < amount) {
        return {
          success: false,
          error: `Insufficient balance. Available: ${senderAccount.amount}, Required: ${amount}`,
        };
      }
      debugLog(`✅ Sender has sufficient balance: ${senderAccount.amount}`);
    } catch (error) {
      return {
        success: false,
        error: `Sender token account not found or invalid: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    let recipientTokenAccount: PublicKey | undefined = undefined;

    if (!createRecipientAccount) {
      try {
        recipientTokenAccount = await getAssociatedTokenAddress(
          mint,
          recipient,
          allowOwnerOffCurve
        );
      } catch (error) {
        return {
          success: false,
          error: `Failed to get recipient token account: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    if (!recipientTokenAccount) {
      const result = await createAssociatedTokenAccount(
        connection,
        sender,
        recipient,
        mint,
        allowOwnerOffCurve
      );
      if (result.success && result.account) {
        recipientTokenAccount = result.account;
      } else {
        return {
          success: false,
          error: `Failed to create recipient token account: ${result.error}`,
        };
      }
    }

    // Create the transfer transaction
    const transferTx = new Transaction();

    // Add transfer instruction
    transferTx.add(
      createTransferInstruction(
        senderTokenAccount, // source
        recipientTokenAccount, // destination
        sender.publicKey, // owner
        amount, // amount
        [], // multisigners
        TOKEN_PROGRAM_ID
      )
    );

    // Send and confirm the transfer transaction
    debugLog(`📡 Sending transfer transaction...`);
    
    let transferResult;
    if (feePayer) {
      debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
      transferResult = await sendAndConfirmTransactionWithFeePayer(
        connection,
        transferTx,
        [sender], // signers
        feePayer, // fee payer
        { preflightCommitment: 'confirmed' }
      );
    } else {
      transferResult = await sendAndConfirmTransaction(connection, transferTx, [sender], {
        preflightCommitment: 'confirmed',
      });
    }

    if (!transferResult.success) {
      return {
        success: false,
        error: `Transfer failed: ${transferResult.error}`,
      };
    }

    logSuccess(`✅ Token transfer completed successfully!`);
    logSignature(transferResult.signature!, 'Token transfer');

    // Verify the transfer by checking balances
    try {
      const newSenderBalance = await getAccount(connection, senderTokenAccount);
      const newRecipientBalance = await getAccount(connection, recipientTokenAccount);

      debugLog(`📊 Transfer verification:`);
      debugLog(`   Sender new balance: ${newSenderBalance.amount}`);
      debugLog(`   Recipient new balance: ${newRecipientBalance.amount}`);
    } catch (error) {
      debugLog(
        `⚠️ Could not verify transfer balances: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      success: true,
      signature: transferResult.signature,
      recipientAccount: recipientTokenAccount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('Token transfer failed:', error);

    return {
      success: false,
      error: `Token transfer error: ${errorMessage}`,
    };
  }
}

/**
 * Send tokens assuming both sender and recipient ATAs already exist.
 * - No getAccountInfo balance/existence checks
 * - No ATA creation
 * - Fails if accounts are missing or balance insufficient
 */
export async function sendTokenAssumingExistingAccounts(
  connection: Connection,
  sender: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: bigint,
  allowOwnerOffCurve: boolean = false,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; error?: string; recipientAccount?: PublicKey }> {
  try {
    const senderTokenAccount = await getAssociatedTokenAddress(mint, sender.publicKey);
    const recipientTokenAccount = await getAssociatedTokenAddress(mint, recipient, allowOwnerOffCurve);

    const tx = new Transaction().add(
      createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        sender.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const result = feePayer
      ? await sendAndConfirmTransactionWithFeePayer(connection, tx, [sender], feePayer, {
          preflightCommitment: 'confirmed',
        })
      : await sendAndConfirmTransaction(connection, tx, [sender], {
          preflightCommitment: 'confirmed',
        });

    if (!result.success) {
      return { success: false, error: `Transfer failed: ${result.error}` };
    }

    logSuccess(`✅ Token transfer (assumed ATAs) completed successfully!`);
    logSignature(result.signature!, 'Token transfer (assumed)');

    return { success: true, signature: result.signature, recipientAccount: recipientTokenAccount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('Token transfer (assumed ATAs) failed:', error);
    return { success: false, error: `Token transfer error: ${errorMessage}` };
  }
}

/**
 * Send tokens with automatic recipient account creation
 * This is a convenience function that always creates the recipient account if needed
 */
export async function sendTokenWithAccountCreation(
  connection: Connection,
  sender: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: bigint,
  allowOwnerOffCurve: boolean = false,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; error?: string; recipientAccount?: PublicKey }> {
  return sendToken(
    connection,
    sender,
    recipient,
    mint,
    amount,
    allowOwnerOffCurve,
    true,
    feePayer
  );
}

/**
 * Send tokens without creating recipient account
 * This function will fail if the recipient doesn't have a token account
 */
export async function sendTokenToExistingAccount(
  connection: Connection,
  sender: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: bigint,
  allowOwnerOffCurve: boolean = false,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; error?: string; recipientAccount?: PublicKey }> {
  return sendToken(
    connection,
    sender,
    recipient,
    mint,
    amount,
    allowOwnerOffCurve,
    false,
    feePayer
  );
}

/**
 * Check if a recipient can receive tokens (has token account or can create one)
 */
export async function canReceiveTokens(
  connection: Connection,
  recipient: PublicKey,
  mint: PublicKey,
  allowOwnerOffCurve: boolean = false
): Promise<{ canReceive: boolean; hasAccount: boolean; accountAddress?: PublicKey }> {
  try {
    const tokenAccount = await getAssociatedTokenAddress(mint, recipient, allowOwnerOffCurve);

    try {
      await getAccount(connection, tokenAccount);
      return {
        canReceive: true,
        hasAccount: true,
        accountAddress: tokenAccount,
      };
    } catch (error) {
      // Account doesn't exist, but can be created
      return {
        canReceive: true,
        hasAccount: false,
        accountAddress: tokenAccount,
      };
    }
  } catch (error) {
    return {
      canReceive: false,
      hasAccount: false,
    };
  }
}