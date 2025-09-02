import { Connection, PublicKey, Keypair } from '@solana/web3.js';
/**
 * Get the Associated Token Account address for a user and mint
 */
export declare function getAssociatedTokenAccountAddress(owner: PublicKey, mint: PublicKey, allowOwnerOffCurve?: boolean): PublicKey;
/**
 * Create the instruction for creating an Associated Token Account (ATA)
 * This function only creates the instruction without executing it
 */
export declare function createAssociatedTokenAccountInstruction(payer: PublicKey, owner: PublicKey, mint: PublicKey, allowOwnerOffCurve?: boolean): {
    instruction: any;
    account: PublicKey;
};
/**
 * Create an Associated Token Account (ATA) for a user and mint
 */
export declare function createAssociatedTokenAccount(connection: Connection, payer: Keypair, owner: PublicKey, mint: PublicKey, allowOwnerOffCurve?: boolean): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
    account?: PublicKey;
}>;
/**
 * Get or create an Associated Token Account (ATA) for a user and mint
 */
export declare function getOrCreateAssociatedTokenAccount(connection: Connection, payer: Keypair, owner: PublicKey, mint: PublicKey, allowOwnerOffCurve?: boolean): Promise<{
    success: boolean;
    account: PublicKey;
    error?: string;
}>;
/**
 * Check if an Associated Token Account exists
 */
export declare function checkAssociatedTokenAccountExists(connection: Connection, owner: PublicKey, mint: PublicKey): Promise<boolean>;
/**
 * Get the balance of tokens in an Associated Token Account
 */
export declare function getAssociatedTokenBalance(connection: Connection, owner: PublicKey, mint: PublicKey): Promise<{
    success: boolean;
    balance?: bigint;
    error?: string;
}>;
//# sourceMappingURL=createAccount.d.ts.map