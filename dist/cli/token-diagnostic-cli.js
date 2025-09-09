#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const fs_1 = require("fs");
const path_1 = require("path");
const debug_1 = require("../src/utils/debug");
const amounts_1 = require("../src/utils/amounts");
const connection_1 = require("../src/utils/connection");
const bc_helper_1 = require("../src/bonding-curve/bc-helper");
const instructions_1 = require("../src/bonding-curve/idl/instructions");
const spl_token_1 = require("@solana/spl-token");
function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--token':
                parsed.token = args[++i];
                break;
            case '--user':
                parsed.user = args[++i];
                break;
            case '--help':
            case '-h':
                console.log(`
Usage: npm run cli:token-diagnostic -- [options]

Options:
  --token <path>     Path to token JSON file
  --user <address>   User address to check (optional)
  --help, -h         Show this help message

Examples:
  # Check token setup status
  npm run cli:token-diagnostic -- --token fixtures/test-token-new-idl.json
  
  # Check token setup status for a specific user
  npm run cli:token-diagnostic -- --token fixtures/test-token-new-idl.json --user <USER_ADDRESS>
        `);
                process.exit(0);
            default:
                if (!parsed.user) {
                    parsed.user = args[i];
                }
        }
    }
    if (!parsed.token) {
        console.error('❌ Error: --token is required');
        console.error('Use --help for usage information');
        process.exit(1);
    }
    return parsed;
}
/**
 * Check if an account exists
 */
async function checkAccountExists(connection, address, name) {
    try {
        const accountInfo = await connection.getAccountInfo(address);
        const exists = !!accountInfo;
        const status = exists ? '✅' : '❌';
        const size = exists ? `(${accountInfo.data.length} bytes)` : '';
        (0, debug_1.debugLog)(`${status} ${name}: ${address.toString()} ${size}`);
        return exists;
    }
    catch (error) {
        (0, debug_1.debugLog)(`❌ ${name}: ${address.toString()} (error checking)`);
        return false;
    }
}
/**
 * Check bonding curve account details
 */
async function checkBondingCurveAccount(connection, mint) {
    const [bondingCurve] = (0, bc_helper_1.deriveBondingCurveAddress)(mint);
    (0, debug_1.debugLog)(`\n🔍 Bonding Curve Account: ${bondingCurve.toString()}`);
    try {
        const accountInfo = await connection.getAccountInfo(bondingCurve);
        if (accountInfo) {
            (0, debug_1.debugLog)(`  ✅ Exists: ${accountInfo.data.length} bytes`);
            (0, debug_1.debugLog)(`  👤 Owner: ${accountInfo.owner.toString()}`);
            (0, debug_1.debugLog)(`  💰 Rent: ${(0, amounts_1.formatLamportsAsSol)(accountInfo.lamports)} SOL`);
            // Try to parse bonding curve data (basic check)
            if (accountInfo.data.length > 0) {
                (0, debug_1.debugLog)(`  📊 Data: ${accountInfo.data.length} bytes available`);
            }
        }
        else {
            (0, debug_1.debugLog)(`  ❌ Does not exist`);
        }
    }
    catch (error) {
        (0, debug_1.debugLog)(`  ❌ Error checking: ${error}`);
    }
}
/**
 * Check token metadata
 */
async function checkTokenMetadata(connection, mint) {
    (0, debug_1.debugLog)(`\n🔍 Token Mint: ${mint.toString()}`);
    try {
        const accountInfo = await connection.getAccountInfo(mint);
        if (accountInfo) {
            (0, debug_1.debugLog)(`  ✅ Exists: ${accountInfo.data.length} bytes`);
            (0, debug_1.debugLog)(`  👤 Owner: ${accountInfo.owner.toString()}`);
            (0, debug_1.debugLog)(`  💰 Rent: ${(0, amounts_1.formatLamportsAsSol)(accountInfo.lamports)} SOL`);
            // Check if it's a token mint
            if (accountInfo.owner.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                (0, debug_1.debugLog)(`  🪙 Type: SPL Token Mint`);
            }
            else {
                (0, debug_1.debugLog)(`  ⚠️ Type: Not an SPL Token Mint`);
            }
        }
        else {
            (0, debug_1.debugLog)(`  ❌ Does not exist`);
        }
    }
    catch (error) {
        (0, debug_1.debugLog)(`  ❌ Error checking: ${error}`);
    }
}
async function main() {
    const args = parseArgs();
    (0, debug_1.debugLog)('🔍 Token Diagnostic Tool');
    (0, debug_1.debugLog)('========================');
    (0, debug_1.debugLog)(`Token: ${args.token}`);
    (0, debug_1.debugLog)(`User: ${args.user || 'Not specified'}`);
    try {
        // Load token info
        const tokenPath = (0, path_1.join)(process.cwd(), args.token);
        const tokenData = JSON.parse((0, fs_1.readFileSync)(tokenPath, 'utf8'));
        const mint = new web3_js_1.PublicKey(tokenData.mint);
        (0, debug_1.debugLog)(`🪙 Token Mint: ${mint.toString()}`);
        if (tokenData.creator) {
            (0, debug_1.debugLog)(`👤 Creator: ${tokenData.creator}`);
        }
        // Get connection
        const connection = (0, connection_1.createConnection)();
        // Check token mint
        await checkTokenMetadata(connection, mint);
        // Check bonding curve account
        await checkBondingCurveAccount(connection, mint);
        // Check system-wide PDAs
        (0, debug_1.debugLog)(`\n🔍 System-Wide PDAs:`);
        const systemPDAs = {
            globalVolumeAccumulator: (0, bc_helper_1.deriveGlobalVolumeAccumulatorAddress)()[0],
            eventAuthority: (0, bc_helper_1.deriveEventAuthorityAddress)()[0],
            feeConfig: (0, instructions_1.deriveFeeConfigPDA)(),
        };
        const systemResults = await Promise.all(Object.entries(systemPDAs).map(async ([name, pda]) => ({
            name,
            pda,
            exists: await checkAccountExists(connection, pda, name),
        })));
        // Check user-specific PDAs if user is specified
        if (args.user) {
            const user = new web3_js_1.PublicKey(args.user);
            (0, debug_1.debugLog)(`\n🔍 User-Specific PDAs for ${user.toString()}:`);
            const userPDAs = {
                userVolumeAccumulator: (0, bc_helper_1.deriveUserVolumeAccumulatorAddress)(user)[0],
                creatorVault: (0, bc_helper_1.deriveCreatorVaultAddress)(user)[0],
            };
            const userResults = await Promise.all(Object.entries(userPDAs).map(async ([name, pda]) => ({
                name,
                pda,
                exists: await checkAccountExists(connection, pda, name),
            })));
            // Check user ATAs
            (0, debug_1.debugLog)(`\n🔍 User Associated Token Accounts:`);
            const userAta = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, user, false);
            const userAtaExists = await checkAccountExists(connection, userAta, 'user_ata');
            // Check bonding curve ATA
            const [bondingCurve] = (0, bc_helper_1.deriveBondingCurveAddress)(mint);
            const bondingCurveAta = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, bondingCurve, true);
            const bondingCurveAtaExists = await checkAccountExists(connection, bondingCurveAta, 'bonding_curve_ata');
            // Summary for user
            const userMissing = userResults.filter(r => !r.exists);
            const ataMissing = !userAtaExists || !bondingCurveAtaExists;
            if (userMissing.length === 0 && !ataMissing) {
                (0, debug_1.logSuccess)(`\n✅ User ${user.toString()} is fully onboarded for this token!`);
            }
            else {
                (0, debug_1.logWarning)(`\n⚠️ User ${user.toString()} is NOT fully onboarded`);
                if (userMissing.length > 0) {
                    console.log(`  Missing PDAs: ${userMissing.map(r => r.name).join(', ')}`);
                }
                if (ataMissing) {
                    console.log(`  Missing ATAs: user_ata and/or bonding_curve_ata`);
                }
            }
        }
        // Overall summary
        const systemMissing = systemResults.filter(r => !r.exists);
        console.log(`\n📊 System Setup Summary:`);
        console.log(`  ✅ System PDAs: ${systemResults.length - systemMissing.length}/${systemResults.length}`);
        console.log(`  ❌ Missing System PDAs: ${systemMissing.length}`);
        if (systemMissing.length > 0) {
            console.log(`\n❌ Missing System PDAs:`);
            systemMissing.forEach(({ name, pda }) => {
                console.log(`  ${name}: ${pda.toString()}`);
            });
            console.log(`\n💡 These should be created by the creator wallet during token setup.`);
        }
        if (systemMissing.length === 0) {
            (0, debug_1.logSuccess)(`\n🎉 Token system is fully initialized!`);
        }
        else {
            (0, debug_1.logWarning)(`\n⚠️ Token system needs initialization`);
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
//# sourceMappingURL=token-diagnostic-cli.js.map