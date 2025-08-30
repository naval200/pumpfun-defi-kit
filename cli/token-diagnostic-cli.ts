#!/usr/bin/env node

import { Connection, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { debugLog, logSuccess, logError, logWarning } from '../src/utils/debug';
import { createConnection } from '../src/utils/connection';
import { 
  deriveBondingCurveAddress,
  deriveGlobalVolumeAccumulatorAddress,
  deriveUserVolumeAccumulatorAddress,
  deriveCreatorVaultAddress,
  deriveEventAuthorityAddress
} from '../src/bonding-curve/bc-helper';
import { deriveFeeConfigPDA } from '../src/bonding-curve/idl/instructions';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

interface Args {
  token: string;
  user?: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {};

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

  return parsed as Args;
}

/**
 * Check if an account exists
 */
async function checkAccountExists(connection: Connection, address: PublicKey, name: string): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(address);
    const exists = !!accountInfo;
    const status = exists ? '✅' : '❌';
    const size = exists ? `(${accountInfo!.data.length} bytes)` : '';
    debugLog(`${status} ${name}: ${address.toString()} ${size}`);
    return exists;
  } catch (error) {
    debugLog(`❌ ${name}: ${address.toString()} (error checking)`);
    return false;
  }
}

/**
 * Check bonding curve account details
 */
async function checkBondingCurveAccount(connection: Connection, mint: PublicKey) {
  const [bondingCurve] = deriveBondingCurveAddress(mint);
  debugLog(`\n🔍 Bonding Curve Account: ${bondingCurve.toString()}`);
  
  try {
    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (accountInfo) {
      debugLog(`  ✅ Exists: ${accountInfo.data.length} bytes`);
      debugLog(`  👤 Owner: ${accountInfo.owner.toString()}`);
      debugLog(`  💰 Rent: ${accountInfo.lamports} lamports`);
      
      // Try to parse bonding curve data (basic check)
      if (accountInfo.data.length > 0) {
        debugLog(`  📊 Data: ${accountInfo.data.length} bytes available`);
      }
    } else {
      debugLog(`  ❌ Does not exist`);
    }
  } catch (error) {
    debugLog(`  ❌ Error checking: ${error}`);
  }
}

/**
 * Check token metadata
 */
async function checkTokenMetadata(connection: Connection, mint: PublicKey) {
  debugLog(`\n🔍 Token Mint: ${mint.toString()}`);
  
  try {
    const accountInfo = await connection.getAccountInfo(mint);
    if (accountInfo) {
      debugLog(`  ✅ Exists: ${accountInfo.data.length} bytes`);
      debugLog(`  👤 Owner: ${accountInfo.owner.toString()}`);
      debugLog(`  💰 Rent: ${accountInfo.lamports} lamports`);
      
      // Check if it's a token mint
      if (accountInfo.owner.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        debugLog(`  🪙 Type: SPL Token Mint`);
      } else {
        debugLog(`  ⚠️ Type: Not an SPL Token Mint`);
      }
    } else {
      debugLog(`  ❌ Does not exist`);
    }
  } catch (error) {
    debugLog(`  ❌ Error checking: ${error}`);
  }
}

async function main() {
  const args = parseArgs();

  debugLog('🔍 Token Diagnostic Tool');
  debugLog('========================');
  debugLog(`Token: ${args.token}`);
  debugLog(`User: ${args.user || 'Not specified'}`);

  try {
    // Load token info
    const tokenPath = join(process.cwd(), args.token);
    const tokenData = JSON.parse(readFileSync(tokenPath, 'utf8'));
    const mint = new PublicKey(tokenData.mint);

    debugLog(`🪙 Token Mint: ${mint.toString()}`);
    if (tokenData.creator) {
      debugLog(`👤 Creator: ${tokenData.creator}`);
    }

    // Get connection
    const connection = createConnection();

    // Check token mint
    await checkTokenMetadata(connection, mint);

    // Check bonding curve account
    await checkBondingCurveAccount(connection, mint);

    // Check system-wide PDAs
    debugLog(`\n🔍 System-Wide PDAs:`);
    const systemPDAs = {
      globalVolumeAccumulator: deriveGlobalVolumeAccumulatorAddress()[0],
      eventAuthority: deriveEventAuthorityAddress()[0],
      feeConfig: deriveFeeConfigPDA(),
    };

    const systemResults = await Promise.all(
      Object.entries(systemPDAs).map(async ([name, pda]) => ({
        name,
        pda,
        exists: await checkAccountExists(connection, pda, name),
      }))
    );

    // Check user-specific PDAs if user is specified
    if (args.user) {
      const user = new PublicKey(args.user);
      debugLog(`\n🔍 User-Specific PDAs for ${user.toString()}:`);
      
      const userPDAs = {
        userVolumeAccumulator: deriveUserVolumeAccumulatorAddress(user)[0],
        creatorVault: deriveCreatorVaultAddress(user)[0],
      };

      const userResults = await Promise.all(
        Object.entries(userPDAs).map(async ([name, pda]) => ({
          name,
          pda,
          exists: await checkAccountExists(connection, pda, name),
        }))
      );

      // Check user ATAs
      debugLog(`\n🔍 User Associated Token Accounts:`);
      const userAta = getAssociatedTokenAddressSync(mint, user, false);
      const userAtaExists = await checkAccountExists(connection, userAta, 'user_ata');

      // Check bonding curve ATA
      const [bondingCurve] = deriveBondingCurveAddress(mint);
      const bondingCurveAta = getAssociatedTokenAddressSync(mint, bondingCurve, true);
      const bondingCurveAtaExists = await checkAccountExists(connection, bondingCurveAta, 'bonding_curve_ata');

      // Summary for user
      const userMissing = userResults.filter(r => !r.exists);
      const ataMissing = !userAtaExists || !bondingCurveAtaExists;
      
      if (userMissing.length === 0 && !ataMissing) {
        logSuccess(`\n✅ User ${user.toString()} is fully onboarded for this token!`);
      } else {
        logWarning(`\n⚠️ User ${user.toString()} is NOT fully onboarded`);
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
      logSuccess(`\n🎉 Token system is fully initialized!`);
    } else {
      logWarning(`\n⚠️ Token system needs initialization`);
    }

  } catch (error) {
    logError(`❌ Fatal error: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    logError(`❌ Unhandled error: ${error}`);
    process.exit(1);
  });
}
