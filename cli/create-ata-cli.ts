#!/usr/bin/env node

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { debugLog, logSuccess, logError } from '../src/utils/debug';
import { 
  createAssociatedTokenAccount, 
  getOrCreateAssociatedTokenAccount,
  checkAssociatedTokenAccountExists 
} from '../src/createAccount';
import { createConnection } from '../src/utils/connection';

interface Args {
  wallet: string;
  mint: string;
  owner: string;
  allowOwnerOffCurve?: boolean;
  checkOnly?: boolean;
  force?: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {};

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
      case '--allow-owner-off-curve':
        parsed.allowOwnerOffCurve = true;
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
        } else if (!parsed.owner) {
          parsed.owner = args[i];
        }
    }
  }

  if (!parsed.wallet || !parsed.mint || !parsed.owner) {
    console.error('❌ Error: --wallet, --mint, and --owner are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  return parsed as Args;
}

async function main() {
  const args = parseArgs();

  debugLog('🏗️ Associated Token Account (ATA) Management');
  debugLog('=============================================');
  debugLog(`Wallet: ${args.wallet}`);
  debugLog(`Mint: ${args.mint}`);
  debugLog(`Owner: ${args.owner}`);
  debugLog(`Allow Owner Off Curve: ${args.allowOwnerOffCurve || false}`);
  debugLog(`Mode: ${args.checkOnly ? 'Check Only' : 'Create/Get'}`);

  try {
    // Load wallet
    const walletPath = join(process.cwd(), args.wallet);
    const walletData = JSON.parse(readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

    // Parse mint and owner
    const mint = new PublicKey(args.mint);
    const owner = new PublicKey(args.owner);

    debugLog(`🔑 Payer Wallet: ${wallet.publicKey.toString()}`);
    debugLog(`�� Token Mint: ${mint.toString()}`);
    debugLog(`�� ATA Owner: ${owner.toString()}`);

    // Get connection
    const connection = createConnection();

    if (args.checkOnly) {
      // Check if ATA exists
      debugLog('🔍 Checking if ATA exists...');
      
      const exists = await checkAssociatedTokenAccountExists(connection, owner, mint);
      
      if (exists) {
        logSuccess('✅ Associated Token Account already exists!');
        process.exit(0);  // ✅ ATA exists - success
      } else {
        logError('❌ Associated Token Account does not exist');
        process.exit(1);  // ❌ ATA doesn't exist - failure
      }
    }

    // Create or get ATA
    if (args.force) {
      // Force creation
      debugLog('🏗️ Force creating ATA...');
      
      const result = await createAssociatedTokenAccount(
        connection,
        wallet,
        owner,
        mint,
        args.allowOwnerOffCurve || false
      );
      
      if (result.success) {
        logSuccess('✅ ATA created successfully!');
        console.log(`📋 ATA Address: ${result.account?.toString()}`);
        if (result.signature) {
          console.log(`🔗 Transaction: ${result.signature}`);
        }
      } else {
        logError(`❌ ATA creation failed: ${result.error}`);
        process.exit(1);
      }
      
    } else {
      // Get or create ATA
      debugLog('🔍 Getting or creating ATA...');
      
      const result = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        owner,
        mint,
        args.allowOwnerOffCurve || false
      );
      
      if (result.success) {
        // Check if ATA already existed
        const exists = await checkAssociatedTokenAccountExists(connection, owner, mint);
        if (exists) {
          logSuccess('✅ Associated Token Account already exists!');
          console.log(`📋 ATA Address: ${result.account.toString()}`);
        } else {
          logSuccess('✅ ATA created successfully!');
          console.log(`📋 ATA Address: ${result.account.toString()}`);
        }
      } else {
        logError(`❌ Failed to get/create ATA: ${result.error}`);
        process.exit(1);
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
