#!/usr/bin/env tsx

import { Connection, Keypair } from '@solana/web3.js';
import { parseArgs } from './cli-args';
import {
  batchTransactions,
  validatePumpFunBatchOperations as validateBatchOperations,
} from '../src/batch';
import type { BatchOperation } from '../src/@types';
import fs from 'fs';
import path from 'path';

/**
 * CLI for executing batch transactions
 */
async function main() {
  try {
    const args = parseArgs();

    if (args.help) {
      console.log(
        'Usage: npm run cli:batch-transactions -- --operations <file> --fee-payer <wallet> [options]'
      );
      console.log('');
      console.log('Required:');
      console.log('  --operations <file>     Path to JSON file containing batch operations');
      console.log('  --fee-payer <wallet>    Path to fee payer wallet JSON file');
      console.log('');
      console.log('Options:');
      console.log('  --max-parallel <num>    Maximum parallel transactions (default: 3)');
      console.log(
        '  --delay-between <ms>    Delay between batches in milliseconds (default: 1000)'
      );
      console.log('  --retry-failed          Retry failed operations automatically');
      console.log('  --disable-fallback-retry Disable fallback retry (operations executed individually)');
      console.log('  --wallet <wallet>       Optional fallback wallet for ops missing "sender"');
      console.log('  --dry-run               Show what would be executed without submitting');
      console.log('');
      console.log('Notes:');
      console.log('  • Each operation should include a "sender" that identifies a wallet.');
      console.log('  • In CLI mode, set "sender" in the operations JSON to a wallet JSON path, e.g.:');
      console.log('      { "type": "transfer", ..., "sender": "./wallets/user1.json" }');
      console.log('  • If an operation omits "sender", the CLI will use --wallet as a fallback.');
      return;
    }

    // Validate required arguments
    if (!args.operations || !args.feePayer) {
      console.error('❌ Error: --operations and --fee-payer are required');
      console.error('Use --help for usage information');
      process.exit(1);
    }

    // Load operations file
    const operationsFile = path.resolve(args.operations);
    if (!fs.existsSync(operationsFile)) {
      console.error(`❌ Error: Operations file not found: ${operationsFile}`);
      process.exit(1);
    }

    // Load fee payer wallet
    const feePayerPath = path.resolve(args.feePayer);
    if (!fs.existsSync(feePayerPath)) {
      console.error(`❌ Error: Fee payer wallet not found: ${feePayerPath}`);
      process.exit(1);
    }

    console.log('🚀 Batch Transactions CLI');
    console.log('=========================');

    // Load operations
    const operationsData = fs.readFileSync(operationsFile, 'utf8');
    let operations: BatchOperation[];

    try {
      // Try to parse as direct array first
      let parsedData = JSON.parse(operationsData);

      // If it's wrapped in an object with 'operations' key, extract it
      if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
        if (parsedData.operations && Array.isArray(parsedData.operations)) {
          operations = parsedData.operations;
        } else {
          throw new Error(
            'Operations file must contain an array or object with "operations" array'
          );
        }
      } else if (Array.isArray(parsedData)) {
        operations = parsedData;
      } else {
        throw new Error('Operations file must contain an array');
      }
    } catch (error) {
      console.error('❌ Error: Failed to load operations file:', error);
      process.exit(1);
    }

    console.log(`📋 Loaded ${operations.length} operations from ${operationsFile}`);

    // Load fee payer wallet
    const feePayerData = JSON.parse(fs.readFileSync(feePayerPath, 'utf8'));
    const feePayer = Keypair.fromSecretKey(Uint8Array.from(feePayerData));
    console.log(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);

    // Resolve sender field on each operation into a Keypair (library requires Keypair)
    operations = operations.map((op, index) => {
      const copy: any = { ...op };
      if (copy.sender) {
        if (typeof copy.sender === 'string') {
          // Treat as wallet path
          const walletPath = path.resolve(copy.sender);
          if (!fs.existsSync(walletPath)) {
            console.error(`❌ Error: Operation ${copy.id || index} sender wallet not found: ${walletPath}`);
            process.exit(1);
          }
          const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
          copy.sender = Keypair.fromSecretKey(Uint8Array.from(walletData));
        }
      } else if (args.wallet) {
        // Fallback: use provided --wallet for ops missing sender
        const fallbackPath = path.resolve(args.wallet);
        if (!fs.existsSync(fallbackPath)) {
          console.error(`❌ Error: Fallback wallet file not found: ${fallbackPath}`);
          process.exit(1);
        }
        const walletData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        copy.sender = Keypair.fromSecretKey(Uint8Array.from(walletData));
      } else {
        console.error(`❌ Error: Operation ${copy.id || index} missing sender and no --wallet provided`);
        process.exit(1);
      }
      return copy;
    });

    // Validate operations
    const validation = validateBatchOperations(operations);
    if (!validation.valid) {
      console.error('❌ Error: Invalid operations:');
      validation.errors.forEach(error => console.error(`  • ${error}`));
      process.exit(1);
    }

    // Parse options
    const maxParallel = args.maxParallel || 3;
    const delayBetween = args.delayBetween || 1000;
    const retryFailed = args.retryFailed || false;
    const disableFallbackRetry = args.disableFallbackRetry || false;
    const dynamicBatching = args.dynamicBatching || false;
    const dryRun = args.dryRun || false;

    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - No transactions will be submitted');
      console.log('📋 Operations to be executed:');
      operations.forEach((op, index) => {
        console.log(`  ${index + 1}. ${op.type}: ${op.description}`);
        console.log(`     Params: ${JSON.stringify(op.params)}`);
      });
      console.log(`\n📊 Configuration:`);
      console.log(`  • Max parallel: ${maxParallel}`);
      console.log(`  • Delay between batches: ${delayBetween}ms`);
      console.log(`  • Retry failed: ${retryFailed}`);
      console.log(`  • Disable fallback retry: ${disableFallbackRetry}`);
      console.log(`  • Dynamic batching: ${dynamicBatching}`);
      console.log(`  • Fee payer: ${feePayer.publicKey.toString()}`);
      return;
    }

    // Connect to Solana
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('🔗 Connected to Solana devnet');

    // Execute batch transactions using the actual module
    console.log('\n🚀 Executing batch transactions...');
    const results = await batchTransactions(connection, operations, feePayer, {
      maxParallel,
      delayBetween,
      retryFailed,
      disableFallbackRetry,
      dynamicBatching,
    });

    // Display results
    console.log('\n📊 Batch Execution Results');
    console.log('=========================');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📈 Success Rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);

    if (successful.length > 0) {
      console.log('\n✅ Successful Operations:');
      successful.forEach(result => {
        console.log(`  • ${result.type}: ${result.operationId}`);
        if (result.signature) {
          console.log(`    Signature: ${result.signature}`);
          console.log(
            `    Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`
          );
        }
        console.log('');
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed Operations:');
      failed.forEach(result => {
        console.log(`  • ${result.type}: ${result.operationId}`);
        console.log(`    Error: ${result.error}`);
        console.log('');
      });
    }

    console.log('\n📋 Summary:');
    console.log(`Total Operations: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);

    if (retryFailed && failed.length > 0) {
      console.log('\n💡 Tip: Use --retry-failed to automatically retry failed operations');
    }

    // Exit with error code if any operations failed
    if (failed.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 CLI failed with error:', error);
    process.exit(1);
  }
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
