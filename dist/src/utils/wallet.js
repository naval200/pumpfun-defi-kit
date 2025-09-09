"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleWallet = void 0;
const web3_js_1 = require("@solana/web3.js");
/**
 * Simple wallet wrapper for Anchor
 */
class SimpleWallet {
    _keypair;
    constructor(_keypair) {
        this._keypair = _keypair;
    }
    get publicKey() {
        return this._keypair.publicKey;
    }
    get payer() {
        return this._keypair;
    }
    get keypair() {
        return this._keypair;
    }
    async signTransaction(tx) {
        if (tx instanceof web3_js_1.Transaction) {
            tx.partialSign(this.keypair);
        }
        else if (tx instanceof web3_js_1.VersionedTransaction) {
            tx.sign([this.keypair]);
        }
        return tx;
    }
    async signAllTransactions(txs) {
        return txs.map(tx => {
            if (tx instanceof web3_js_1.Transaction) {
                tx.partialSign(this.keypair);
            }
            else if (tx instanceof web3_js_1.VersionedTransaction) {
                tx.sign([this.keypair]);
            }
            return tx;
        });
    }
}
exports.SimpleWallet = SimpleWallet;
//# sourceMappingURL=wallet.js.map