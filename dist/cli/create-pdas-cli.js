#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const fs_1 = require("fs");
const path_1 = require("path");
const debug_1 = require("../src/utils/debug");
const connection_1 = require("../src/utils/connection");
const bc_helper_1 = require("../src/bonding-curve/bc-helper");
const instructions_1 = require("../src/bonding-curve/idl/instructions");
function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--wallet':
                parsed.wallet = args[++i];
                break;
            case '--user':
                parsed.user = args[++i];
                break;
            case '--check-only':
                parsed.checkOnly = true;
                break;
            case '--create-all':
                parsed.createAll = true;
                break;
            case '--help':
            case '-h':
                console.log(`
Usage: npm run cli:create-pdas -- [options]

Options:
  --wallet <path>     Path to wallet JSON file (payer)
  --user <address>    User address for user-specific PDAs (optional)
  --check-only        Only check if PDAs exist, don't create
  --create-all        Create all PDAs (system-wide and user-specific)
  --help, -h          Show this help message

Examples:
  # Check all PDAs
  npm run cli:create-pdas -- --wallet fixtures/trading-wallet.json --check-only
  
  # Create all PDAs for a specific user
  npm run cli:create-pdas -- --wallet fixtures/trading-wallet.json --user <USER_ADDRESS> --create-all
  
  # Create system-wide PDAs only
  npm run cli:create-pdas -- --wallet fixtures/trading-wallet.json --create-all
        `);
                process.exit(0);
            default:
                if (!parsed.user) {
                    parsed.user = args[i];
                }
        }
    }
    if (!parsed.wallet) {
        console.error('❌ Error: --wallet is required');
        console.error('Use --help for usage information');
        process.exit(1);
    }
    return parsed;
}
/**
 * Check if a PDA account exists
 */
async function checkPDAExists(connection, pda, name) {
    try {
        const accountInfo = await connection.getAccountInfo(pda);
        const exists = !!accountInfo;
        (0, debug_1.debugLog)(`${exists ? '✅' : '❌'} ${name}: ${pda.toString()}`);
        return exists;
    }
    catch (error) {
        (0, debug_1.debugLog)(`❌ ${name}: ${pda.toString()} (error checking)`);
        return false;
    }
}
/**
 * Create a PDA account with minimum rent
 */
async function createPDA(connection, wallet, pda, name) {
    try {
        // Check if already exists
        const exists = await checkPDAExists(connection, pda, name);
        if (exists) {
            (0, debug_1.debugLog)(`✅ ${name} already exists, skipping creation`);
            return { success: true };
        }
        // Get minimum rent for the account
        const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(0);
        // Create transaction to fund the PDA
        const transaction = new web3_js_1.Transaction();
        // Transfer SOL to the PDA to make it rent-exempt
        transaction.add(web3_js_1.SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: pda,
            lamports: rentExemptionAmount,
        }));
        // Get recent blockhash and set fee payer
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        // Sign and send transaction
        transaction.sign(wallet);
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3,
        });
        (0, debug_1.debugLog)(`🔗 Created ${name}: ${signature}`);
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            return {
                success: false,
                error: `Failed to confirm ${name} creation: ${confirmation.value.err}`,
            };
        }
        return { success: true, signature };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Failed to create ${name}: ${errorMessage}`,
        };
    }
}
async function main() {
    const args = parseArgs();
    (0, debug_1.debugLog)('🏗️ Program Derived Address (PDA) Management');
    (0, debug_1.debugLog)('============================================');
    (0, debug_1.debugLog)(`Wallet: ${args.wallet}`);
    (0, debug_1.debugLog)(`User: ${args.user || 'Not specified'}`);
    (0, debug_1.debugLog)(`Mode: ${args.checkOnly ? 'Check Only' : 'Create/Check'}`);
    try {
        // Load wallet
        const walletPath = (0, path_1.join)(process.cwd(), args.wallet);
        const walletData = JSON.parse((0, fs_1.readFileSync)(walletPath, 'utf8'));
        const wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(walletData));
        (0, debug_1.debugLog)(`🔑 Payer Wallet: ${wallet.publicKey.toString()}`);
        // Get connection
        const connection = (0, connection_1.createConnection)();
        // Derive all PDAs
        const pdas = {
            globalVolumeAccumulator: (0, bc_helper_1.deriveGlobalVolumeAccumulatorAddress)()[0],
            eventAuthority: (0, bc_helper_1.deriveEventAuthorityAddress)()[0],
            feeConfig: (0, instructions_1.deriveFeeConfigPDA)(),
            ...(args.user && {
                userVolumeAccumulator: (0, bc_helper_1.deriveUserVolumeAccumulatorAddress)(new web3_js_1.PublicKey(args.user))[0],
                creatorVault: (0, bc_helper_1.deriveCreatorVaultAddress)(new web3_js_1.PublicKey(args.user))[0],
            }),
        };
        (0, debug_1.debugLog)('\n📋 PDA Addresses:');
        Object.entries(pdas).forEach(([name, pda]) => {
            (0, debug_1.debugLog)(`  ${name}: ${pda.toString()}`);
        });
        if (args.checkOnly) {
            // Check all PDAs
            (0, debug_1.debugLog)('\n🔍 Checking PDA existence...');
            const results = await Promise.all(Object.entries(pdas).map(async ([name, pda]) => ({
                name,
                pda,
                exists: await checkPDAExists(connection, pda, name),
            })));
            const existing = results.filter(r => r.exists);
            const missing = results.filter(r => !r.exists);
            console.log(`\n📊 Summary:`);
            console.log(`  ✅ Existing: ${existing.length}`);
            console.log(`  ❌ Missing: ${missing.length}`);
            if (missing.length > 0) {
                console.log(`\n❌ Missing PDAs:`);
                missing.forEach(({ name, pda }) => {
                    console.log(`  ${name}: ${pda.toString()}`);
                });
            }
            return;
        }
        if (args.createAll) {
            // Create all PDAs
            (0, debug_1.debugLog)('\n🚀 Creating missing PDAs...');
            const results = await Promise.all(Object.entries(pdas).map(async ([name, pda]) => {
                const result = await createPDA(connection, wallet, pda, name);
                return { name, pda, result };
            }));
            const successful = results.filter(r => r.result.success);
            const failed = results.filter(r => !r.result.success);
            console.log(`\n📊 Creation Results:`);
            console.log(`  ✅ Successful: ${successful.length}`);
            console.log(`  ❌ Failed: ${failed.length}`);
            if (successful.length > 0) {
                console.log(`\n✅ Successfully created:`);
                successful.forEach(({ name, pda, result }) => {
                    console.log(`  ${name}: ${pda.toString()}`);
                    if (result.signature) {
                        console.log(`    Transaction: ${result.signature}`);
                    }
                });
            }
            if (failed.length > 0) {
                console.log(`\n❌ Failed to create:`);
                failed.forEach(({ name, pda, result }) => {
                    console.log(`  ${name}: ${pda.toString()}`);
                    console.log(`    Error: ${result.error}`);
                });
            }
            // Verify final status
            (0, debug_1.debugLog)('\n🔍 Verifying final PDA status...');
            const finalResults = await Promise.all(Object.entries(pdas).map(async ([name, pda]) => ({
                name,
                pda,
                exists: await checkPDAExists(connection, pda, name),
            })));
            const finalExisting = finalResults.filter(r => r.exists);
            const finalMissing = finalResults.filter(r => !r.exists);
            if (finalMissing.length === 0) {
                (0, debug_1.logSuccess)('🎉 All PDAs are now available!');
            }
            else {
                (0, debug_1.logWarning)(`⚠️ Some PDAs are still missing: ${finalMissing.map(r => r.name).join(', ')}`);
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
//# sourceMappingURL=create-pdas-cli.js.map