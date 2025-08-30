#!/usr/bin/env node

import { Connection, Keypair } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { debugLog, logSuccess, logError } from '../../src/utils/debug';
import { createConnection } from '../../src/utils/connection';
import {
  PUMP_PROGRAM_ID,
  CREATOR_VAULT_SEED,
  GLOBAL_VOLUME_ACCUMULATOR_SEED,
  USER_VOLUME_ACCUMULATOR_SEED,
  EVENT_AUTHORITY_SEED,
} from '../../src/bonding-curve/idl/constants';

interface Args {
  wallet: string;
  token: string;
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
      case '--help':
      case '-h':
        console.log(`
Usage: npm run cli:curve:check-accounts -- [options]

Options:
  --wallet <path>     Path to wallet JSON file
  --token <path>      Path to token JSON file
  --help, -h          Show this help message

Examples:
  npm run cli:curve:check-accounts -- --wallet fixtures/creator-wallet.json --token fixtures/test-token.json
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

/**
 * Check if a creator has all required PDAs for bonding curve operations
 * Note: PDAs are created automatically by the program during instruction execution
 */
async function checkCreatorAccountStatus(
  connection: Connection,
  creator: PublicKey
): Promise<{
  onboarded: boolean;
  missingAccounts: string[];
  details: {
    creatorVault: boolean;
    globalVolumeAccumulator: boolean;
    userVolumeAccumulator: boolean;
    eventAuthority: boolean;
  };
}> {
  try {
    // Derive all required PDAs
    const [creatorVault] = PublicKey.findProgramAddressSync(
      [CREATOR_VAULT_SEED, creator.toBytes()],
      PUMP_PROGRAM_ID
    );

    const [globalVolumeAccumulator] = PublicKey.findProgramAddressSync(
      [GLOBAL_VOLUME_ACCUMULATOR_SEED],
      PUMP_PROGRAM_ID
    );

    const [userVolumeAccumulator] = PublicKey.findProgramAddressSync(
      [USER_VOLUME_ACCUMULATOR_SEED, creator.toBytes()],
      PUMP_PROGRAM_ID
    );

    const [eventAuthority] = PublicKey.findProgramAddressSync(
      [EVENT_AUTHORITY_SEED],
      PUMP_PROGRAM_ID
    );

    debugLog(`📍 Creator Vault: ${creatorVault.toString()}`);
    debugLog(`📍 Global Volume Accumulator: ${globalVolumeAccumulator.toString()}`);
    debugLog(`📍 User Volume Accumulator: ${userVolumeAccumulator.toString()}`);
    debugLog(`📍 Event Authority: ${eventAuthority.toString()}`);

    // Check if accounts exist
    const [
      creatorVaultExists,
      globalVolumeAccumulatorExists,
      userVolumeAccumulatorExists,
      eventAuthorityExists,
    ] = await Promise.all([
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
      .map(
        ([account]) =>
          account as
            | 'creatorVault'
            | 'globalVolumeAccumulator'
            | 'userVolumeAccumulator'
            | 'eventAuthority'
      );

    return {
      onboarded: missingAccounts.length === 0,
      missingAccounts,
      details,
    };
  } catch (error) {
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

  debugLog('🔍 PumpFun Creator Account Status Check');
  debugLog('=======================================');
  debugLog(`Wallet: ${args.wallet}`);
  debugLog(`Token: ${args.token}`);

  try {
    // Load wallet
    const walletPath = join(process.cwd(), args.wallet);
    const walletData = JSON.parse(readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

    // Load token info
    const tokenPath = join(process.cwd(), args.token);
    const tokenData = JSON.parse(readFileSync(tokenPath, 'utf8'));
    const mint = new PublicKey(tokenData.mint);

    debugLog(` Creator Wallet: ${wallet.publicKey.toString()}`);
    debugLog(` Token Mint: ${mint.toString()}`);

    // Get connection
    const connection = createConnection();

    // Check creator account status
    debugLog('🔍 Checking creator account status...');

    const status = await checkCreatorAccountStatus(connection, wallet.publicKey);

    if (status.onboarded) {
      logSuccess('✅ Creator is fully onboarded for bonding curve operations!');
      logSuccess('🚀 You can now proceed to buy initial tokens on PumpFun.');
    } else {
      logError('❌ Creator is NOT fully onboarded');
      logError(`Missing accounts: ${status.missingAccounts.join(', ')}`);

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

      logSuccess(
        '🚀 You can still proceed to buy initial tokens - PDAs will be created automatically!'
      );
    }
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
