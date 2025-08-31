#!/usr/bin/env node

import { Keypair } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { debugLog, logError } from '../../src/utils/debug';
// import { createConnection } from '../../src/utils/connection';

interface Args {
  wallet: string;
  token: string;
  checkOnly?: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {};

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
Usage: npm run cli:curve:create-account -- [options]

Options:
  --wallet <path>     Path to wallet JSON file
  --token <path>      Path to token JSON file
  --check-only        Only check account status, don't create accounts
  --help, -h          Show this help message

Examples:
  npm run cli:curve:create-account -- --wallet fixtures/trading-wallet.json --token fixtures/test-token-new-idl.json
  npm run cli:curve:create-account -- --wallet fixtures/trading-wallet.json --token fixtures/test-token-new-idl.json --check-only
        `);
        break;
      default:
        if (!parsed.wallet) {
          parsed.wallet = args[i];
        } else if (!parsed.token) {
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

  return parsed as Args;
}

async function main() {
  const args = parseArgs();

  debugLog('🚀 Bonding Curve Account Creation');
  debugLog('=================================');
  debugLog(`Wallet: ${args.wallet}`);
  debugLog(`Token: ${args.token}`);
  debugLog(`Mode: ${args.checkOnly ? 'Check Only' : 'Create Accounts'}`);

  try {
    // Load wallet
    const walletPath = join(process.cwd(), args.wallet);
    const walletData = JSON.parse(readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

    // Load token info
    const tokenPath = join(process.cwd(), args.token);
    const tokenData = JSON.parse(readFileSync(tokenPath, 'utf8'));
    const mint = new PublicKey(tokenData.mint);

    debugLog(`🔑 Wallet: ${wallet.publicKey.toString()}`);
    debugLog(`🪙 Token Mint: ${mint.toString()}`);

    // Get connection
    // const connection = createConnection();

    if (args.checkOnly) {
      // Check account status only
      debugLog('🔍 Checking account status...');

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
      //     console.log(`  ${status} ${status} ${account}`);
      //   });
      // }

      return;
    }

    // Perform account creation
    debugLog('🚀 Starting account creation...');

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
    //     console.log(`Missing: ${verification.missingAccounts.join(', ')}`);
    //   } else {
    //     logError('❌ Verification failed - some accounts may still be missing');
    //     console.log(`Missing: ${verification.missingAccounts.join(', ')}`);
    //   }
    // } else {
    //   logError(`❌ Account creation failed: ${result.error}`);
    //   process.exit(1);
    // }
  } catch (error) {
    logError(`❌ Fatal error: ${error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    logError(`❌ Unhandled error: ${error}`);
    process.exit(1);
  });
}
