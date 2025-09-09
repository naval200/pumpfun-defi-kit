#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const web3_js_2 = require("@solana/web3.js");
const fs_1 = require("fs");
const path_1 = require("path");
const debug_1 = require("../../src/utils/debug");
const connection_1 = require("../../src/utils/connection");
const constants_1 = require("../../src/bonding-curve/idl/constants");
function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--wallet':
                parsed.wallet = args[++i];
                break;
            case '--token':
                parsed.token = args[++i];
                break;
            case '--help':
            case '-h':
                console.log(`
Usage: npm run cli:bond-check-accounts -- [options]

Options:
  --wallet <path>     Path to wallet JSON file
  --token <path>      Path to token JSON file
  --help, -h          Show this help message

Examples:
  npm run cli:bond-check-accounts -- --wallet fixtures/creator-wallet.json --token fixtures/test-token.json
        `);
                break;
            default:
                if (!parsed.wallet) {
                    parsed.wallet = args[i];
                }
                else if (!parsed.token) {
                    parsed.token = args[i];
                }
                break;
        }
    }
    if (!parsed.wallet || !parsed.token) {
        console.error('❌ Error: Both --wallet and --token are required');
        console.error('Use --help for usage information');
        process.exit(1);
    }
    // Check if help was requested
    if (args.includes('--help') || args.includes('-h')) {
        process.exit(0);
    }
    return parsed;
}
/**
 * Check if a creator has all required PDAs for bonding curve operations
 * Note: PDAs are created automatically by the program during instruction execution
 */
async function checkCreatorAccountStatus(connection, creator) {
    try {
        // Derive all required PDAs
        const [creatorVault] = web3_js_2.PublicKey.findProgramAddressSync([constants_1.CREATOR_VAULT_SEED, creator.toBytes()], constants_1.PUMP_PROGRAM_ID);
        const [globalVolumeAccumulator] = web3_js_2.PublicKey.findProgramAddressSync([constants_1.GLOBAL_VOLUME_ACCUMULATOR_SEED], constants_1.PUMP_PROGRAM_ID);
        const [userVolumeAccumulator] = web3_js_2.PublicKey.findProgramAddressSync([constants_1.USER_VOLUME_ACCUMULATOR_SEED, creator.toBytes()], constants_1.PUMP_PROGRAM_ID);
        const [eventAuthority] = web3_js_2.PublicKey.findProgramAddressSync([constants_1.EVENT_AUTHORITY_SEED], constants_1.PUMP_PROGRAM_ID);
        (0, debug_1.debugLog)(`📍 Creator Vault: ${creatorVault.toString()}`);
        (0, debug_1.debugLog)(`📍 Global Volume Accumulator: ${globalVolumeAccumulator.toString()}`);
        (0, debug_1.debugLog)(`📍 User Volume Accumulator: ${userVolumeAccumulator.toString()}`);
        (0, debug_1.debugLog)(`📍 Event Authority: ${eventAuthority.toString()}`);
        // Check if accounts exist
        const [creatorVaultExists, globalVolumeAccumulatorExists, userVolumeAccumulatorExists, eventAuthorityExists,] = await Promise.all([
            connection
                .getAccountInfo(creatorVault)
                .then(info => info !== null)
                .catch(() => false),
            connection
                .getAccountInfo(globalVolumeAccumulator)
                .then(info => info !== null)
                .catch(() => false),
            connection
                .getAccountInfo(userVolumeAccumulator)
                .then(info => info !== null)
                .catch(() => false),
            connection
                .getAccountInfo(eventAuthority)
                .then(info => info !== null)
                .catch(() => false),
        ]);
        const details = {
            creatorVault: creatorVaultExists,
            globalVolumeAccumulator: globalVolumeAccumulatorExists,
            userVolumeAccumulator: userVolumeAccumulatorExists,
            eventAuthority: eventAuthorityExists,
        };
        const missingAccounts = Object.entries(details)
            .filter(([, exists]) => !exists)
            .map(([account]) => account);
        return {
            onboarded: missingAccounts.length === 0,
            missingAccounts,
            details,
        };
    }
    catch (error) {
        return {
            onboarded: false,
            missingAccounts: [
                'creatorVault',
                'globalVolumeAccumulator',
                'userVolumeAccumulator',
                'eventAuthority',
            ],
            details: {
                creatorVault: false,
                globalVolumeAccumulator: false,
                userVolumeAccumulator: false,
                eventAuthority: false,
            },
        };
    }
}
async function main() {
    const args = parseArgs();
    (0, debug_1.debugLog)('🔍 PumpFun Creator Account Status Check');
    (0, debug_1.debugLog)('=======================================');
    (0, debug_1.debugLog)(`Wallet: ${args.wallet}`);
    (0, debug_1.debugLog)(`Token: ${args.token}`);
    try {
        // Load wallet
        const walletPath = (0, path_1.join)(process.cwd(), args.wallet);
        const walletData = JSON.parse((0, fs_1.readFileSync)(walletPath, 'utf8'));
        const wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(walletData));
        // Load token info
        const tokenPath = (0, path_1.join)(process.cwd(), args.token);
        const tokenData = JSON.parse((0, fs_1.readFileSync)(tokenPath, 'utf8'));
        const mint = new web3_js_2.PublicKey(tokenData.mint);
        (0, debug_1.debugLog)(` Creator Wallet: ${wallet.publicKey.toString()}`);
        (0, debug_1.debugLog)(` Token Mint: ${mint.toString()}`);
        // Get connection
        const connection = (0, connection_1.createConnection)();
        // Check creator account status
        (0, debug_1.debugLog)('🔍 Checking creator account status...');
        const status = await checkCreatorAccountStatus(connection, wallet.publicKey);
        if (status.onboarded) {
            (0, debug_1.logSuccess)('✅ Creator is fully onboarded for bonding curve operations!');
            (0, debug_1.logSuccess)('🚀 You can now proceed to buy initial tokens on PumpFun.');
        }
        else {
            (0, debug_1.logError)('❌ Creator is NOT fully onboarded');
            (0, debug_1.logError)(`Missing accounts: ${status.missingAccounts.join(', ')}`);
            console.log('\n📊 Account Status:');
            Object.entries(status.details).forEach(([account, exists]) => {
                const statusIcon = exists ? '✅' : '❌';
                console.log(`  ${statusIcon} ${account}`);
            });
            console.log('\n💡 **Important Information:**');
            console.log('   • PDAs are created AUTOMATICALLY by the PumpFun program');
            console.log('   • You cannot create them manually with SystemProgram');
            console.log('   • They will be created when you execute your first buy/sell instruction');
            console.log('   • This is normal for new users - proceed with your token operations');
            (0, debug_1.logSuccess)('🚀 You can still proceed to buy initial tokens - PDAs will be created automatically!');
        }
    }
    catch (error) {
        (0, debug_1.logError)(`❌ Fatal error: ${error}`);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(error => {
        (0, debug_1.logError)(`❌ Unhandled error: ${error}`);
        process.exit(1);
    });
}
//# sourceMappingURL=check-accounts-cli.js.map