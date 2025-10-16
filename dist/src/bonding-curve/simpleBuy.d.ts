import { Connection, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
/**
 * Simplified wrapper for creating bonding curve buy instructions
 * Automatically calculates all required PDAs internally
 *
 * This function provides a clean interface for creating buy instructions
 * without manually calculating all the required Program Derived Addresses (PDAs).
 *
 * @param connection - Solana connection instance
 * @param buyerKeypair - Keypair of the buyer
 * @param mint - PublicKey of the token mint
 * @param amountLamports - Amount of SOL to spend (in lamports)
 * @param slippageBasisPoints - Slippage tolerance in basis points (default: 1000 = 10%)
 * @param creator - Optional creator PublicKey (defaults to buyer if not provided)
 * @returns Promise<TransactionInstruction> - The buy instruction ready to be added to a transaction
 *
 * @example
 * ```typescript
 * // Simple usage - no need to calculate PDAs manually!
 * const buyInstruction = await createSimpleBuyInstruction(
 *   connection,
 *   buyerKeypair,
 *   mint,
 *   0.1e9, // 0.1 SOL
 *   1000,  // 10% slippage
 *   creator // Optional creator
 * );
 *
 * // Add to transaction
 * const transaction = new Transaction().add(buyInstruction);
 * ```
 */
export declare function createSimpleBuyInstruction(connection: Connection, buyerKeypair: Keypair, mint: PublicKey, amountLamports: number, slippageBasisPoints?: number, creator?: PublicKey): Promise<TransactionInstruction>;
//# sourceMappingURL=simpleBuy.d.ts.map