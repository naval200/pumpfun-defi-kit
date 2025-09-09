#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const fs_1 = require("fs");
const path_1 = require("path");
const debug_1 = require("../src/utils/debug");
const createAccount_1 = require("../src/createAccount");
const connection_1 = require("../src/utils/connection");
function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--wallet':
                parsed.wallet = args[++i];
                break;
            case '--mint':
                parsed.mint = args[++i];
                break;
            case '--owner':
                parsed.owner = args[++i];
                break;
            case '--check-only':
                parsed.checkOnly = true;
                break;
            case '--force':
                parsed.force = true;
                break;
            case '--help':
            case '-h':
                console.log(`
Usage: npm run cli:create-ata -- [options]

Options:
  --wallet <path>              Path to wallet JSON file (payer)
  --mint <address>             Token mint address
  --owner <address>            Owner of the ATA
  --allow-owner-off-curve      Allow owner to be off curve (for program-owned accounts)
  --check-only                 Only check if ATA exists, don't create
  --force                      Force creation even if ATA exists
  --help, -h                   Show this help message

Examples:
  # Create user ATA
  npm run cli:create-ata -- --wallet fixtures/trading-wallet.json --mint <MINT_ADDRESS> --owner <USER_ADDRESS>
  
  # Create bonding curve ATA (program-owned)
  npm run cli:create-ata -- --wallet fixtures/trading-wallet.json --mint <MINT_ADDRESS> --owner <BONDING_CURVE_ADDRESS> --allow-owner-off-curve
  
  # Check if ATA exists
  npm run cli:create-ata -- --wallet fixtures/trading-wallet.json --mint <MINT_ADDRESS> --owner <USER_ADDRESS> --check-only
        `);
                process.exit(0);
            default:
                if (!parsed.mint) {
                    parsed.mint = args[i];
                }
                else if (!parsed.owner) {
                    parsed.owner = args[i];
                }
        }
    }
    if (!parsed.wallet || !parsed.mint || !parsed.owner) {
        console.error('❌ Error: --wallet, --mint, and --owner are required');
        console.error('Use --help for usage information');
        process.exit(1);
    }
    return parsed;
}
async function main() {
    const args = parseArgs();
    (0, debug_1.debugLog)('🏗️ Associated Token Account (ATA) Management');
    (0, debug_1.debugLog)('=============================================');
    (0, debug_1.debugLog)(`Wallet: ${args.wallet}`);
    (0, debug_1.debugLog)(`Mint: ${args.mint}`);
    (0, debug_1.debugLog)(`Owner: ${args.owner}`);
    (0, debug_1.debugLog)(`Mode: ${args.checkOnly ? 'Check Only' : 'Create/Get'}`);
    try {
        // Load wallet
        const walletPath = args.wallet.startsWith('/') ? args.wallet : (0, path_1.join)(process.cwd(), args.wallet);
        const walletData = JSON.parse((0, fs_1.readFileSync)(walletPath, 'utf8'));
        const wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(walletData));
        // Parse mint and owner
        const mint = new web3_js_1.PublicKey(args.mint);
        const owner = new web3_js_1.PublicKey(args.owner);
        (0, debug_1.debugLog)(`🔑 Payer Wallet: ${wallet.publicKey.toString()}`);
        (0, debug_1.debugLog)(`�� Token Mint: ${mint.toString()}`);
        (0, debug_1.debugLog)(`�� ATA Owner: ${owner.toString()}`);
        // Get connection
        const connection = (0, connection_1.createConnection)();
        if (args.checkOnly) {
            // Check if ATA exists
            (0, debug_1.debugLog)('🔍 Checking if ATA exists...');
            const exists = await (0, createAccount_1.checkAssociatedTokenAccountExists)(connection, owner, mint);
            if (exists) {
                (0, debug_1.logSuccess)('✅ Associated Token Account already exists!');
                process.exit(0); // ✅ ATA exists - success
            }
            else {
                (0, debug_1.logError)('❌ Associated Token Account does not exist');
                process.exit(1); // ❌ ATA doesn't exist - failure
            }
        }
        // Create or get ATA
        if (args.force) {
            // Force creation
            (0, debug_1.debugLog)('🏗️ Force creating ATA...');
            const result = await (0, createAccount_1.createAssociatedTokenAccount)(connection, wallet, owner, mint);
            if (result.success) {
                (0, debug_1.logSuccess)('✅ ATA created successfully!');
                console.log(`📋 ATA Address: ${result.account?.toString()}`);
                if (result.signature) {
                    console.log(`🔗 Transaction: ${result.signature}`);
                }
            }
            else {
                (0, debug_1.logError)(`❌ ATA creation failed: ${result.error}`);
                process.exit(1);
            }
        }
        else {
            // Get or create ATA
            (0, debug_1.debugLog)('🔍 Getting or creating ATA...');
            const result = await (0, createAccount_1.getOrCreateAssociatedTokenAccount)(connection, wallet, owner, mint);
            if (result.success) {
                // Check if ATA already existed
                const exists = await (0, createAccount_1.checkAssociatedTokenAccountExists)(connection, owner, mint);
                if (exists) {
                    (0, debug_1.logSuccess)('✅ Associated Token Account already exists!');
                    console.log(`📋 ATA Address: ${result.account.toString()}`);
                }
                else {
                    (0, debug_1.logSuccess)('✅ ATA created successfully!');
                    console.log(`📋 ATA Address: ${result.account.toString()}`);
                }
            }
            else {
                (0, debug_1.logError)(`❌ Failed to get/create ATA: ${result.error}`);
                process.exit(1);
            }
        }
    }
    catch (error) {
        (0, debug_1.logError)(`❌ Fatal error: ${error}`);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch((error) => {
        (0, debug_1.logError)(`❌ Unhandled error: ${error}`);
        process.exit(1);
    });
}
//# sourceMappingURL=create-ata-cli.js.map