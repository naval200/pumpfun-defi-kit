import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SendTransactionError,
} from '@solana/web3.js';
import { debugLog, logError } from './utils/debug';
import { SendSolOptions, SendSolResult } from './@types';

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
export async function sendSol(
  connection: Connection,
  fromWallet: Keypair,
  toAddress: PublicKey,
  amountSol: number,
  feePayer?: Keypair,
  options: SendSolOptions = {}
): Promise<SendSolResult> {
  try {
    debugLog(`💸 Sending ${amountSol} SOL from ${fromWallet.publicKey.toString()} to ${toAddress.toString()}`);

    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    
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
        error: `Insufficient balance. Available: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL, Required: ${amountSol} SOL`,
      };
    }

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey: toAddress,
      lamports: amountLamports,
    });

    // Create transaction
    const transaction = new Transaction().add(transferInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = feePayer?.publicKey || fromWallet.publicKey;

    // Sign transaction
    if (feePayer && !feePayer.publicKey.equals(fromWallet.publicKey)) {
      transaction.sign(fromWallet, feePayer);
    } else {
      transaction.sign(fromWallet);
    }

    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      feePayer ? [fromWallet, feePayer] : [fromWallet],
      {
        commitment: 'confirmed',
        maxRetries: options.maxRetries || 3,
      }
    );

    debugLog(`✅ SOL transfer successful! Signature: ${signature}`);
    
    return {
      success: true,
      signature,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`❌ Error sending SOL: ${errorMessage}`);
    
    // Provide helpful error information
    if (error instanceof SendTransactionError) {
      if (error.message.includes('InsufficientFunds')) {
        return {
          success: false,
          error: 'Insufficient funds for transaction fee',
        };
      } else if (error.message.includes('BlockhashNotFound')) {
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
export function createSendSolInstruction(
  fromWallet: Keypair,
  toAddress: PublicKey,
  amountSol: number,
  feePayer?: PublicKey
): TransactionInstruction {
  // Convert SOL to lamports
  const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  
  if (amountLamports <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  debugLog(`🔧 Creating SOL transfer instruction: ${amountSol} SOL (${amountLamports} lamports)`);

  // Create transfer instruction
  const transferInstruction = SystemProgram.transfer({
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
export async function createSignedSendSolTransaction(
  connection: Connection,
  fromWallet: Keypair,
  toAddress: PublicKey,
  amountSol: number,
  feePayer?: PublicKey
): Promise<Transaction> {
  // Convert SOL to lamports
  const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  
  if (amountLamports <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  debugLog(`🔧 Creating signed SOL transfer transaction: ${amountSol} SOL (${amountLamports} lamports)`);

  // Create transfer instruction
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: fromWallet.publicKey,
    toPubkey: toAddress,
    lamports: amountLamports,
  });

  // Create transaction
  const transaction = new Transaction().add(transferInstruction);
  
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
  } else {
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
export function validateSendSolParams(
  fromWallet: Keypair,
  toAddress: PublicKey,
  amountSol: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

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
export async function getEstimatedSendSolFee(
  connection: Connection,
  fromWallet: Keypair,
  toAddress: PublicKey,
  amountSol: number
): Promise<number> {
  try {
    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    
    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey: toAddress,
      lamports: amountLamports,
    });

    // Create transaction
    const transaction = new Transaction().add(transferInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromWallet.publicKey;

    // Get fee for transaction
    const fee = await transaction.getEstimatedFee(connection);
    
    return fee || 5000; // Default fallback fee
  } catch (error) {
    debugLog(`⚠️ Could not estimate fee, using default: ${error}`);
    return 5000; // Default fallback fee
  }
}
