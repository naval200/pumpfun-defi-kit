import { PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

/**
 * Simple wallet wrapper for Anchor
 */
export class SimpleWallet implements Wallet {
  constructor(private _keypair: Keypair) {}

  get publicKey(): PublicKey {
    return this._keypair.publicKey;
  }

  get payer(): Keypair {
    return this._keypair;
  }

  get keypair(): Keypair {
    return this._keypair;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.keypair);
    } else if (tx instanceof VersionedTransaction) {
      tx.sign([this.keypair]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return txs.map(tx => {
      if (tx instanceof Transaction) {
        tx.partialSign(this.keypair);
      } else if (tx instanceof VersionedTransaction) {
        tx.sign([this.keypair]);
      }
      return tx;
    });
  }
}
