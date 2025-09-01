#!/usr/bin/env tsx

/**
 * Example script demonstrating how to use the Batch Transactions API
 * This script shows how to create and execute batch operations programmatically
 *
 * Note: Currently only supports consuming operations (transfers, sell-amm, sell-bonding-curve)
 * Buy operations cannot be batched together as they have different dependencies
 */

import { Connection, Keypair } from '@solana/web3.js';
import { batchTransactions, BatchOperation } from '../src';

// Example: Batch Transactions with Multiple Senders
async function batchTransactionsExample() {
  const connection = new Connection('https://api.devnet.solana.com');

  // Create or load keypairs for different senders
  const sender1 = Keypair.generate();
  const sender2 = Keypair.generate();
  const sender3 = Keypair.generate();
  const feePayer = Keypair.generate();

  // Define operations with different senders
  const operations: BatchOperation[] = [
    {
      id: 'transfer-1',
      type: 'sol-transfer',
      description: 'Transfer SOL from sender1 to sender2',
      sender: sender1, // Must be a Keypair object
      params: {
        recipient: sender2.publicKey.toString(),
        amount: 0.01,
      },
    },
    {
      id: 'buy-bonding-curve-1',
      type: 'buy-bonding-curve',
      description: 'Buy tokens via bonding curve',
      sender: sender2, // Must be a Keypair object
      params: {
        mint: '22222222222222222222222222222222', // Example mint address
        amount: 0.02,
        slippage: 1000,
      },
    },
    {
      id: 'buy-amm-1',
      type: 'buy-amm',
      description: 'Buy tokens via AMM',
      sender: sender3, // Must be a Keypair object
      params: {
        poolKey: '44444444444444444444444444444444', // Example pool key
        amount: 0.015,
        slippage: 1,
      },
    },
    {
      id: 'transfer-2',
      type: 'sol-transfer',
      description: 'Transfer SOL from sender1 to sender3',
      sender: sender1, // Must be a Keypair object
      params: {
        recipient: sender3.publicKey.toString(),
        amount: 0.005,
      },
    },
  ];

  try {
    console.log('🚀 Executing batch transactions...');

    const results = await batchTransactions(connection, operations, feePayer, {
      maxParallel: 3,
      dynamicBatching: true, // Enable dynamic batch sizing
      retryFailed: true,
      disableFallbackRetry: false, // Allow fallback retry in production
      delayBetween: 1000,
    });

    console.log(`✅ Executed ${results.length} operations`);

    // Process results
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.operationId}: ${result.signature}`);
      } else {
        console.error(`❌ ${result.operationId}: ${result.error}`);
      }
    });
  } catch (error) {
    console.error('❌ Batch execution failed:', error);
  }
}

// Example: Batch Transactions without Fee Payer (each operation pays its own fees)
async function batchTransactionsWithoutFeePayer() {
  const connection = new Connection('https://api.devnet.solana.com');

  const sender1 = Keypair.generate();
  const sender2 = Keypair.generate();

  const operations: BatchOperation[] = [
    {
      id: 'transfer-1',
      type: 'sol-transfer',
      description: 'Transfer SOL from sender1 to sender2',
      sender: sender1, // Must be a Keypair object
      params: {
        recipient: sender2.publicKey.toString(),
        amount: 0.01,
      },
    },
    {
      id: 'buy-bonding-curve-1',
      type: 'buy-bonding-curve',
      description: 'Buy tokens via bonding curve',
      sender: sender2, // Must be a Keypair object
      params: {
        mint: '22222222222222222222222222222222', // Example mint address
        amount: 0.02,
        slippage: 1000,
      },
    },
  ];

  try {
    console.log('🚀 Executing batch transactions without fee payer...');

    // No feePayer parameter - each operation pays its own fees
    const results = await batchTransactions(connection, operations, undefined, {
      maxParallel: 2,
      dynamicBatching: true,
      retryFailed: true,
    });

    console.log(`✅ Executed ${results.length} operations`);

    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.operationId}: ${result.signature}`);
      } else {
        console.error(`❌ ${result.operationId}: ${result.error}`);
      }
    });
  } catch (error) {
    console.error('❌ Batch execution failed:', error);
  }
}

// Example: Mixed Operation Types in Single Batch
async function mixedOperationsBatch() {
  const connection = new Connection('https://api.devnet.solana.com');

  const sender1 = Keypair.generate();
  const sender2 = Keypair.generate();
  const feePayer = Keypair.generate();

  const operations: BatchOperation[] = [
    // SOL transfer
    {
      id: 'sol-transfer-1',
      type: 'sol-transfer',
      sender: sender1,
      params: {
        recipient: sender2.publicKey.toString(),
        amount: 0.01,
      },
    },
    // Bonding curve buy
    {
      id: 'buy-bonding-curve-1',
      type: 'buy-bonding-curve',
      sender: sender2,
      params: {
        mint: '22222222222222222222222222222222', // Example mint address
        amount: 0.02,
        slippage: 1000,
      },
    },
    // AMM buy
    {
      id: 'buy-amm-1',
      type: 'buy-amm',
      sender: sender1,
      params: {
        poolKey: '44444444444444444444444444444444', // Example pool key
        amount: 0.015,
        slippage: 1,
      },
    },
    // AMM sell
    {
      id: 'sell-amm-1',
      type: 'sell-amm',
      sender: sender2,
      params: {
        poolKey: '44444444444444444444444444444444', // Example pool key
        amount: 100,
        slippage: 1,
      },
    },
  ];

  try {
    console.log('🚀 Executing mixed operations batch...');

    const results = await batchTransactions(connection, operations, feePayer, {
      maxParallel: 4,
      dynamicBatching: true,
      retryFailed: true,
    });

    console.log(`✅ Executed ${results.length} mixed operations`);

    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.operationId} (${result.type}): ${result.signature}`);
      } else {
        console.error(`❌ ${result.operationId} (${result.type}): ${result.error}`);
      }
    });
  } catch (error) {
    console.error('❌ Mixed operations batch failed:', error);
  }
}

// Example: Error Handling and Retry Logic
async function batchTransactionsWithErrorHandling() {
  const connection = new Connection('https://api.devnet.solana.com');

  const sender1 = Keypair.generate();
  const sender2 = Keypair.generate();
  const feePayer = Keypair.generate();

  const operations: BatchOperation[] = [
    {
      id: 'transfer-1',
      type: 'sol-transfer',
      sender: sender1,
      params: {
        recipient: sender2.publicKey.toString(),
        amount: 0.01,
      },
    },
    {
      id: 'buy-1',
      type: 'buy-bonding-curve',
      sender: sender2,
      params: {
        mint: '22222222222222222222222222222222', // Example mint address
        amount: 0.02,
        slippage: 1000,
      },
    },
  ];

  try {
    console.log('🚀 Executing batch with error handling...');

    const results = await batchTransactions(connection, operations, feePayer, {
      maxParallel: 2,
      dynamicBatching: true,
      retryFailed: true,
      disableFallbackRetry: false, // Allow fallback for failed operations
      delayBetween: 2000, // Longer delay for retry scenarios
    });

    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`📊 Results Summary:`);
    console.log(`  ✅ Successful: ${successful.length}`);
    console.log(`  ❌ Failed: ${failed.length}`);
    console.log(`  📈 Success Rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Operations:');
      failed.forEach(result => {
        console.log(`  • ${result.operationId}: ${result.error}`);
      });
    }

    if (successful.length > 0) {
      console.log('\n✅ Successful Operations:');
      successful.forEach(result => {
        console.log(`  • ${result.operationId}: ${result.signature}`);
      });
    }
  } catch (error) {
    console.error('❌ Batch execution failed:', error);
  }
}

// Export examples for use in other files
export {
  batchTransactionsExample,
  batchTransactionsWithoutFeePayer,
  mixedOperationsBatch,
  batchTransactionsWithErrorHandling,
};

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Running Batch Transactions Examples...\n');

    await batchTransactionsExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await batchTransactionsWithoutFeePayer();
    console.log('\n' + '='.repeat(50) + '\n');

    await mixedOperationsBatch();
    console.log('\n' + '='.repeat(50) + '\n');

    await batchTransactionsWithErrorHandling();

    console.log('\n✅ All examples completed!');
  })().catch(console.error);
}
