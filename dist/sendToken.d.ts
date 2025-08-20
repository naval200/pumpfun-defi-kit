import { Connection, PublicKey, Keypair } from '@solana/web3.js';
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
 * @returns Promise resolving to transfer result object
 */
export declare function sendToken(connection: Connection, sender: Keypair, recipient: PublicKey, mint: PublicKey, amount: bigint, allowOwnerOffCurve?: boolean, createRecipientAccount?: boolean): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
    recipientAccount?: PublicKey;
}>;
/**
 * Send tokens with automatic recipient account creation
 * This is a convenience function that always creates the recipient account if needed
 */
export declare function sendTokenWithAccountCreation(connection: Connection, sender: Keypair, recipient: PublicKey, mint: PublicKey, amount: bigint, allowOwnerOffCurve?: boolean): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
    recipientAccount?: PublicKey;
}>;
/**
 * Send tokens without creating recipient account
 * This function will fail if the recipient doesn't have a token account
 */
export declare function sendTokenToExistingAccount(connection: Connection, sender: Keypair, recipient: PublicKey, mint: PublicKey, amount: bigint, allowOwnerOffCurve?: boolean): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
    recipientAccount?: PublicKey;
}>;
/**
 * Check if a recipient can receive tokens (has token account or can create one)
 */
export declare function canReceiveTokens(connection: Connection, recipient: PublicKey, mint: PublicKey, allowOwnerOffCurve?: boolean): Promise<{
    canReceive: boolean;
    hasAccount: boolean;
    accountAddress?: PublicKey;
}>;
//# sourceMappingURL=sendToken.d.ts.map