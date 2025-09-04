import { PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
/**
 * Simple wallet wrapper for Anchor
 */
export declare class SimpleWallet implements Wallet {
    private _keypair;
    constructor(_keypair: Keypair);
    get publicKey(): PublicKey;
    get payer(): Keypair;
    get keypair(): Keypair;
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}
//# sourceMappingURL=wallet.d.ts.map