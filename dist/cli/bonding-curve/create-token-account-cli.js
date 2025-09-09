#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const web3_js_2 = require("@solana/web3.js");
const fs_1 = require("fs");
const path_1 = require("path");
const debug_1 = require("../../src/utils/debug");
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
            case '--check-only':
                parsed.checkOnly = true;
                break;
            case '--help':
            case '-h':
                console.log(`
Usage: npm run cli:bond-create-account -- [options]

Options:
  --wallet <path>     Path to wallet JSON file
  --token <path>      Path to token JSON file
  --check-only        Only check account status, don't create accounts
  --help, -h          Show this help message

Examples:
  npm run cli:bond-create-account -- --wallet fixtures/trading-wallet.json --token fixtures/test-token-new-idl.json
  npm run cli:bond-create-account -- --wallet fixtures/trading-wallet.json --token fixtures/test-token-new-idl.json --check-only
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
async function main() {
    const args = parseArgs();
    (0, debug_1.debugLog)('🚀 Bonding Curve Account Creation');
    (0, debug_1.debugLog)('=================================');
    (0, debug_1.debugLog)(`Wallet: ${args.wallet}`);
    (0, debug_1.debugLog)(`Token: ${args.token}`);
    (0, debug_1.debugLog)(`Mode: ${args.checkOnly ? 'Check Only' : 'Create Accounts'}`);
    try {
        // Load wallet
        const walletPath = (0, path_1.join)(process.cwd(), args.wallet);
        const walletData = JSON.parse((0, fs_1.readFileSync)(walletPath, 'utf8'));
        const wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(walletData));
        // Load token info
        const tokenPath = (0, path_1.join)(process.cwd(), args.token);
        const tokenData = JSON.parse((0, fs_1.readFileSync)(tokenPath, 'utf8'));
        const mint = new web3_js_2.PublicKey(tokenData.mint);
        (0, debug_1.debugLog)(`🔑 Wallet: ${wallet.publicKey.toString()}`);
        (0, debug_1.debugLog)(`🪙 Token Mint: ${mint.toString()}`);
        // Get connection
        // const connection = createConnection();
        if (args.checkOnly) {
            // Check account status only
            (0, debug_1.debugLog)('🔍 Checking account status...');
            // TODO: Implement isUserOnboardedForBondingCurve
            // const status = await isUserOnboardedForBondingCurve(connection, wallet.publicKey, mint);
            // if (status.onboarded) {
            //   logSuccess('✅ User is fully onboarded for bonding curve operations!');
            // } else {
            //   logError('❌ User is NOT fully onboarded');
            //   logError(`Missing accounts: ${status.missingAccounts.join(', ')}`);
            //   console.log('\n📊 Account Status:');
            //   Object.entries(status.details).forEach(([account, exists]) => {
            //     const status = exists ? '✅' : '❌';
            //     console.log(`  ${status} ${account}`);
            //   });
            // }
            return;
        }
        // Perform account creation
        (0, debug_1.debugLog)('🚀 Starting account creation...');
        // TODO: Implement onboardUserForBondingCurve
        // const result = await onboardUserForBondingCurve(connection, wallet, mint);
        // if (result.success) {
        //   logSuccess('✅ User onboarding completed successfully!');
        //   console.log('\n📋 Created Accounts:');
        //   console.log(`  User ATA: ${result.accounts?.userAta.toString()}`);
        //   console.log(`  Bonding Curve ATA: ${result.accounts?.bondingCurveAta.toString()}`);
        //   console.log(
        //     `  Global Volume Accumulator: ${result.accounts?.globalVolumeAccumulator.toString()}`
        //   );
        //   console.log(
        //     `  User Volume Accumulator: ${result.accounts?.userVolumeAccumulator.toString()}`
        //   );
        //   console.log(`  Creator Vault: ${result.accounts?.creatorVault.toString()}`);
        //   console.log(`  Event Authority: ${result.accounts?.eventAuthority.toString()}`);
        //   console.log(`  Fee Config: ${result.accounts?.feeConfig.toString()}`);
        //   // Verify account creation
        //   debugLog('\n🔍 Verifying account creation...');
        //   const verification = await isUserOnboardedForBondingCurve(connection, wallet.publicKey, mint);
        //   if (verification.onboarded) {
        //     logSuccess('✅ Verification successful - all accounts created!');
        //   } else {
        //     logError('❌ Verification failed - some accounts may still be missing');
        //     console.log(`Missing: ${verification.missingAccounts.join(', ')}`);
        //   }
        // } else {
        //   logError(`❌ Account creation failed: ${result.error}`);
        //   process.exit(1);
        // }
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
//# sourceMappingURL=create-token-account-cli.js.map