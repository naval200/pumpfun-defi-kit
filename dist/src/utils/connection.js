"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.createConnection = createConnection;
exports.getWallet = getWallet;
exports.getWalletPublicKey = getWalletPublicKey;
exports.logConnectionInfo = logConnectionInfo;
const web3_js_1 = require("@solana/web3.js");
const debug_1 = require("./debug");
// ConnectionConfig moved to src/@types.ts
/**
 * Default devnet configuration
 */
exports.DEFAULT_CONFIG = {
    rpcUrl: process.env.SOLANA_RPC_URL || (0, web3_js_1.clusterApiUrl)('devnet'),
    wsUrl: process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com',
    network: process.env.NETWORK || 'devnet',
};
/**
 * Create Solana Connection
 */
function createConnection(config = exports.DEFAULT_CONFIG) {
    return new web3_js_1.Connection(config.rpcUrl, 'confirmed');
}
/**
 * Get wallet from environment or create new one
 */
function getWallet() {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (privateKey) {
        try {
            // Try to parse as base58 string first
            const secretKey = JSON.parse(privateKey);
            return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(secretKey));
        }
        catch (error) {
            try {
                // Try to parse as base64 string
                const decoded = Buffer.from(privateKey, 'base64');
                return web3_js_1.Keypair.fromSecretKey(decoded);
            }
            catch (parseError) {
                (0, debug_1.logWarning)('Invalid private key format, creating new wallet');
                return web3_js_1.Keypair.generate();
            }
        }
    }
    (0, debug_1.logWarning)('No private key found in environment, creating new wallet');
    return web3_js_1.Keypair.generate();
}
/**
 * Get wallet public key
 */
function getWalletPublicKey() {
    const wallet = getWallet();
    return wallet.publicKey;
}
/**
 * Log connection information
 */
function logConnectionInfo(config = exports.DEFAULT_CONFIG) {
    (0, debug_1.log)('🔗 Solana Connection Configuration:');
    (0, debug_1.log)(`   Network: ${config.network}`);
    (0, debug_1.log)(`   RPC URL: ${config.rpcUrl}`);
    (0, debug_1.log)(`   WebSocket URL: ${config.wsUrl}`);
    (0, debug_1.log)('');
}
//# sourceMappingURL=connection.js.map