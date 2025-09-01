#!/usr/bin/env node

import { Connection, Keypair } from '@solana/web3.js';
import {
  createBatchInstructions,
  executeBatchInstructions,
  validatePumpFunBatchOperations,
} from '../src/batch';
import type { BatchOperation } from '../src/@types';

/**
 * CLI Example: Using separated batch transaction APIs
 *
 * This example shows how to use the separated APIs in a CLI context
 * where you might want to create instructions, inspect them, and then execute.
 *
 * Usage:
 *   npm run example:batch-cli
 *   node examples/batch-cli-example.js
 */

async function main() {
  console.log('🚀 PumpFun Batch Transaction CLI Example');
  console.log('==========================================\n');

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('📡 Connected to Solana devnet');

  // Example operations
  const operations: BatchOperation[] = [
    {
      id: 'transfer-1',
      type: 'transfer',
      description: 'Transfer tokens to user 1',
      sender: Keypair.generate(),
      params: {
        recipient: 'RecipientPublicKey1',
        mint: 'TokenMintPublicKey',
        amount: 1000,
      },
    },
    {
      id: 'buy-amm-1',
      type: 'buy-amm',
      description: 'Buy tokens via AMM',
      sender: Keypair.generate(),
      params: {
        poolKey: 'PoolPublicKey',
        amount: 500,
        slippage: 1,
      },
    },
    {
      id: 'sol-transfer-1',
      type: 'sol-transfer',
      description: 'Transfer SOL to user 2',
      sender: Keypair.generate(),
      params: {
        recipient: 'RecipientPublicKey2',
        amount: 0.01,
      },
    },
  ];

  const feePayer = Keypair.generate();

  console.log(`📝 Processing ${operations.length} operations:`);
  operations.forEach((op, index) => {
    console.log(`  ${index + 1}. ${op.type}: ${op.description}`);
  });
  console.log();

  try {
    // Step 1: Validate operations
    console.log('🔍 Step 1: Validating operations...');
    const validation = validatePumpFunBatchOperations(operations);
    if (!validation.valid) {
      console.error('❌ Validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    console.log('✅ Operations validated successfully\n');

    // Step 2: Create batch instructions
    console.log('📝 Step 2: Creating batch instructions...');
    const batchInstructions = await createBatchInstructions(connection, operations, feePayer, {
      maxParallel: 2,
      dynamicBatching: true,
    });

    console.log(`✅ Created ${batchInstructions.length} batch instructions:\n`);
    batchInstructions.forEach((batch, index) => {
      console.log(`Batch ${index + 1}:`);
      console.log(`  Operations: ${batch.operationCount}`);
      console.log(`  Instructions: ${batch.instructionCount}`);
      console.log(`  Signers: ${batch.signers.length}`);
      console.log(`  Fee payer: ${batch.feePayer.toString()}`);
      console.log(`  Transaction size: ${batch.transaction.serialize().length} bytes`);
      console.log(`  Blockhash: ${batch.blockhash}`);
      console.log();
    });

    // Step 3: Ask user if they want to proceed
    console.log(
      '🤔 Ready to execute transactions? (This is a demo - no real transactions will be sent)'
    );
    console.log('   In a real CLI, you might ask for user confirmation here.');
    console.log();

    // Step 4: Execute batch instructions
    console.log('🔄 Step 3: Executing batch instructions...');
    const results = await executeBatchInstructions(connection, batchInstructions, operations, {
      delayBetween: 1000,
      retryFailed: true,
    });

    console.log(`✅ Execution completed!\n`);

    // Step 5: Display results
    console.log('📊 Results:');
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ ${successful.length} operations succeeded:`);
    successful.forEach(result => {
      console.log(`  • ${result.operationId}: ${result.signature}`);
    });

    if (failed.length > 0) {
      console.log(`❌ ${failed.length} operations failed:`);
      failed.forEach(result => {
        console.log(`  • ${result.operationId}: ${result.error}`);
      });
    }

    console.log(`\n🎉 Batch transaction example completed successfully!`);
  } catch (error) {
    console.error('❌ Error during batch execution:', error);
    process.exit(1);
  }
}

// Run the CLI example
if (require.main === module) {
  main().catch(console.error);
}
