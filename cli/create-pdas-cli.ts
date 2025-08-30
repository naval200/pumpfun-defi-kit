#!/usr/bin/env node

import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { debugLog, logSuccess, logError, logWarning } from '../src/utils/debug';
import { createConnection } from '../src/utils/connection';
import { 
  deriveGlobalVolumeAccumulatorAddress,
  deriveUserVolumeAccumulatorAddress,
  deriveCreatorVaultAddress,
  deriveEventAuthorityAddress
} from '../src/bonding-curve/bc-helper';
import { deriveFeeConfigPDA } from '../src/bonding-curve/idl/instructions';

interface Args {
  wallet: string;
  user?: string;
  checkOnly?: boolean;
  createAll?: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {};

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

  return parsed as Args;
}

/**
 * Check if a PDA account exists
 */
async function checkPDAExists(connection: Connection, pda: PublicKey, name: string): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(pda);
    const exists = !!accountInfo;
    debugLog(`${exists ? '✅' : '❌'} ${name}: ${pda.toString()}`);
    return exists;
  } catch (error) {
    debugLog(`❌ ${name}: ${pda.toString()} (error checking)`);
    return false;
  }
}

/**
 * Create a PDA account with minimum rent
 */
async function createPDA(
  connection: Connection,
  wallet: Keypair,
  pda: PublicKey,
  name: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    // Check if already exists
    const exists = await checkPDAExists(connection, pda, name);
    if (exists) {
      debugLog(`✅ ${name} already exists, skipping creation`);
      return { success: true };
    }

    // Get minimum rent for the account
    const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(0);

    // Create transaction to fund the PDA
    const transaction = new Transaction();
    
    // Transfer SOL to the PDA to make it rent-exempt
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: pda,
        lamports: rentExemptionAmount,
      })
    );

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

    debugLog(`🔗 Created ${name}: ${signature}`);
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    if (confirmation.value.err) {
      return {
        success: false,
        error: `Failed to confirm ${name} creation: ${confirmation.value.err}`,
      };
    }

    return { success: true, signature };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to create ${name}: ${errorMessage}`,
    };
  }
}

async function main() {
  const args = parseArgs();

  debugLog('🏗️ Program Derived Address (PDA) Management');
  debugLog('============================================');
  debugLog(`Wallet: ${args.wallet}`);
  debugLog(`User: ${args.user || 'Not specified'}`);
  debugLog(`Mode: ${args.checkOnly ? 'Check Only' : 'Create/Check'}`);

  try {
    // Load wallet
    const walletPath = join(process.cwd(), args.wallet);
    const walletData = JSON.parse(readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

    debugLog(`🔑 Payer Wallet: ${wallet.publicKey.toString()}`);

    // Get connection
    const connection = createConnection();

    // Derive all PDAs
    const pdas = {
      globalVolumeAccumulator: deriveGlobalVolumeAccumulatorAddress()[0],
      eventAuthority: deriveEventAuthorityAddress()[0],
      feeConfig: deriveFeeConfigPDA(),
      ...(args.user && {
        userVolumeAccumulator: deriveUserVolumeAccumulatorAddress(new PublicKey(args.user))[0],
        creatorVault: deriveCreatorVaultAddress(new PublicKey(args.user))[0],
      }),
    };

    debugLog('\n📋 PDA Addresses:');
    Object.entries(pdas).forEach(([name, pda]) => {
      debugLog(`  ${name}: ${pda.toString()}`);
    });

    if (args.checkOnly) {
      // Check all PDAs
      debugLog('\n🔍 Checking PDA existence...');
      
      const results = await Promise.all(
        Object.entries(pdas).map(async ([name, pda]) => ({
          name,
          pda,
          exists: await checkPDAExists(connection, pda, name),
        }))
      );

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
      debugLog('\n🚀 Creating missing PDAs...');
      
      const results = await Promise.all(
        Object.entries(pdas).map(async ([name, pda]) => {
          const result = await createPDA(connection, wallet, pda, name);
          return { name, pda, result };
        })
      );

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
      debugLog('\n🔍 Verifying final PDA status...');
      const finalResults = await Promise.all(
        Object.entries(pdas).map(async ([name, pda]) => ({
          name,
          pda,
          exists: await checkPDAExists(connection, pda, name),
        }))
      );

      const finalExisting = finalResults.filter(r => r.exists);
      const finalMissing = finalResults.filter(r => !r.exists);

      if (finalMissing.length === 0) {
        logSuccess('🎉 All PDAs are now available!');
      } else {
        logWarning(`⚠️ Some PDAs are still missing: ${finalMissing.map(r => r.name).join(', ')}`);
      }
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
