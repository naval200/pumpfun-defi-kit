#!/usr/bin/env tsx

/**
 * Example script demonstrating how to use the batchTransactions API programmatically
 * This shows the clean, simple interface for executing multiple operations
 */

import {
  executeBatch as batchTransactions,
  validatePumpFunBatchOperations as validateBatchOperations,
} from '../src/batch';
import { BatchOperation } from '../src/@types';
import { Connection, Keypair } from '@solana/web3.js';

/**
 * Example batch operations
 */
const exampleOperations: BatchOperation[] = [
  {
    type: 'sol-transfer',
    id: 'sol-transfer-1',
    description: 'Send 0.01 SOL to recipient X',
    params: {
      recipient: '11111111111111111111111111111111',
      lamports: 10000000,
    },
  },
  {
    type: 'transfer',
    id: 'transfer-1',
    description: 'Send 100 tokens to user A',
    params: {
      recipient: '11111111111111111111111111111111',
      mint: '22222222222222222222222222222222',
      amount: '100000000',
      createAccount: true,
    },
  },
  {
    type: 'buy-amm',
    id: 'buy-amm-1',
    description: 'Buy via AMM without ATA creation',
    params: {
      poolKey: '33333333333333333333333333333333',
      quoteAmount: 10000000,
      slippage: 1,
    },
  },
  {
    type: 'sell-amm',
    id: 'sell-amm-1',
    description: 'Sell tokens to AMM pool 1',
    params: {
      poolKey: '44444444444444444444444444444444',
      amount: 1000,
      slippage: 1,
    },
  },
  {
    type: 'sell-bonding-curve',
    id: 'sell-bc-1',
    description: 'Sell tokens via bonding curve',
    params: {
      mint: '66666666666666666666666666666666',
      amount: 500,
      slippage: 1000,
    },
  },
];

/**
 * Main function demonstrating batch transactions
 */
async function main() {
  console.log('🚀 Batch Transactions API Example');
  console.log('==================================');

  try {
    // Setup connection (devnet for testing)
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // In a real scenario, you would load these from wallet files
    const wallet = Keypair.generate(); // Replace with actual wallet
    const feePayer = Keypair.generate(); // Replace with actual fee payer

    console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);
    console.log(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);

    // Validate operations before execution
    console.log('\n🔍 Validating operations...');
    const validation = validateBatchOperations(exampleOperations);

    if (!validation.valid) {
      console.error('❌ Operations validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      return;
    }

    console.log('✅ All operations are valid');

    // Display operations summary
    console.log('\n📋 Operations to execute:');
    exampleOperations.forEach((op, index) => {
      console.log(`  ${index + 1}. [${op.type.toUpperCase()}] ${op.description}`);
      console.log(`     ID: ${op.id}`);
    });

    // Execute batch transactions
    console.log('\n🚀 Executing batch transactions...');

    const results = await batchTransactions(connection, wallet, exampleOperations, feePayer, {
      maxParallel: 2, // Execute 2 operations at a time
      delayBetween: 1500, // 1.5 second delay between batches
      retryFailed: true, // Retry failed operations
    });

    // Display results
    console.log('\n📊 Execution Results:');
    console.log('======================');

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
          const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
          console.log(`    Signature: ${result.signature}`);
          console.log(`    Explorer: ${explorerUrl}`);
        }
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed Operations:');
      failed.forEach(result => {
        console.log(`  • ${result.type}: ${result.operationId}`);
        console.log(`    Error: ${result.error}`);
      });
    }

    console.log('\n🎉 Batch execution complete!');
  } catch (error) {
    console.error('❌ Error executing batch transactions:', error);
  }
}

/**
 * Example of creating operations dynamically
 */
function createDynamicOperations(): BatchOperation[] {
  const operations: BatchOperation[] = [];

  // Add multiple transfers
  for (let i = 0; i < 3; i++) {
    operations.push({
      type: 'transfer',
      id: `transfer-batch-${i + 1}`,
      description: `Batch transfer ${i + 1}`,
      params: {
        recipient: `recipient${i + 1}11111111111111111111111111111111`,
        mint: '22222222222222222222222222222222',
        amount: '50000000',
        createAccount: true,
      },
    });
  }

  // Add AMM operations
  operations.push({
    type: 'sell-amm',
    id: 'dynamic-sell-amm',
    description: 'Dynamic AMM sell',
    params: {
      poolKey: '44444444444444444444444444444444',
      amount: 500,
      slippage: 2,
    },
  });

  return operations;
}

/**
 * Example of conditional operations based on previous results
 */
async function executeConditionalBatch(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair
): Promise<void> {
  console.log('\n🔄 Executing conditional batch...');

  // First batch: transfers
  const transferOperations: BatchOperation[] = [
    {
      type: 'transfer',
      id: 'conditional-transfer-1',
      description: 'First transfer',
      params: {
        recipient: '11111111111111111111111111111111',
        mint: '22222222222222222222222222222222',
        amount: '100000000',
        createAccount: true,
      },
    },
  ];

  const transferResults = await batchTransactions(
    connection,
    wallet,
    transferOperations,
    feePayer,
    { maxParallel: 1 }
  );

  // Check if first operation succeeded
  if (transferResults[0]?.success) {
    console.log('✅ First transfer succeeded, proceeding with additional operations...');

    // Add more operations based on success
    const additionalOperations: BatchOperation[] = [
      {
        type: 'sell-amm',
        id: 'conditional-sell',
        description: 'Conditional AMM sell',
        params: {
          poolKey: '44444444444444444444444444444444',
          amount: 1000,
          slippage: 1,
        },
      },
    ];

    const additionalResults = await batchTransactions(
      connection,
      wallet,
      additionalOperations,
      feePayer,
      { maxParallel: 1 }
    );

    console.log('📊 Additional operations completed:', additionalResults.length);
  } else {
    console.log('❌ First transfer failed, skipping additional operations');
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { exampleOperations, createDynamicOperations, executeConditionalBatch };
