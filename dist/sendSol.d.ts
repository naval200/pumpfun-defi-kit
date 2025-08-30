import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
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
export declare function sendSol(connection: Connection, fromWallet: Keypair, toAddress: PublicKey, amountSol: number, feePayer?: Keypair, options?: SendSolOptions): Promise<SendSolResult>;
/**
 * Create a signed SOL transfer instruction for batching
 * @param fromWallet - Source wallet keypair
 * @param toAddress - Destination wallet public key
 * @param amountSol - Amount to send in SOL (will be converted to lamports)
 * @param feePayer - Optional fee payer public key
 * @returns TransactionInstruction ready for batching
 */
export declare function createSendSolInstruction(fromWallet: Keypair, toAddress: PublicKey, amountSol: number, feePayer?: PublicKey): TransactionInstruction;
/**
 * Create a signed SOL transfer transaction for batching
 * @param connection - Solana connection
 * @param fromWallet - Source wallet keypair
 * @param toAddress - Destination wallet public key
 * @param amountSol - Amount to send in SOL (will be converted to lamports)
 * @param feePayer - Optional fee payer public key
 * @returns Signed Transaction ready for batching
 */
export declare function createSignedSendSolTransaction(connection: Connection, fromWallet: Keypair, toAddress: PublicKey, amountSol: number, feePayer?: PublicKey): Promise<Transaction>;
/**
 * Validate SOL transfer parameters
 * @param fromWallet - Source wallet
 * @param toAddress - Destination address
 * @param amountSol - Amount to send
 * @returns Validation result with success status and any errors
 */
export declare function validateSendSolParams(fromWallet: Keypair, toAddress: PublicKey, amountSol: number): {
    isValid: boolean;
    errors: string[];
};
/**
 * Get estimated transaction fee for SOL transfer
 * @param connection - Solana connection
 * @param fromWallet - Source wallet
 * @param toAddress - Destination address
 * @param amountSol - Amount to send
 * @returns Estimated fee in lamports
 */
export declare function getEstimatedSendSolFee(connection: Connection, fromWallet: Keypair, toAddress: PublicKey, amountSol: number): Promise<number>;
//# sourceMappingURL=sendSol.d.ts.map