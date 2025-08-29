#!/usr/bin/env tsx

/**
 * Example demonstrating single fee payer approach for batch transactions
 * This shows how one fee payer wallet handles all transaction fees in a batch
 */

import {
  executePumpFunBatch as batchTransactions,
  validatePumpFunBatchOperations as validateBatchOperations,
} from '../src/batch';
import { Connection, Keypair } from '@solana/web3.js';
import type { BatchOperation } from '../src/@types';

/**
 * Example batch operations for demonstration
 * Only consuming operations are supported in combined mode
 * - Transfer operations
 * - AMM sell operations
 * - Bonding curve operations
 */
const exampleOperations: BatchOperation[] = [
  {
    type: 'transfer',
    id: 'transfer-1',
    description: 'Transfer tokens to user A',
    params: {
      recipient: '11111111111111111111111111111111',
      mint: '22222222222222222222222222222222',
      amount: '100000000',
      createAccount: true,
    },
  },
  {
    type: 'sell-amm',
    id: 'sell-amm-1',
    description: 'Sell tokens to AMM pool',
    params: {
      poolKey: '44444444444444444444444444444444',
      amount: 1000,
      slippage: 1,
    },
  },
];

/**
 * Main function demonstrating single fee payer approach
 */
async function main() {
  console.log('🚀 Single Fee Payer Batch Transactions Example');
  console.log('=============================================');

  try {
    // Setup connection (devnet for testing)
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // In a real scenario, you would load these from wallet files
    const wallet = Keypair.generate(); // Main wallet with tokens
    const feePayer = Keypair.generate(); // Dedicated fee payer wallet

    console.log(`👛 Main wallet: ${wallet.publicKey.toString()}`);
    console.log(`💸 Fee payer wallet: ${feePayer.publicKey.toString()}`);
    console.log('');

    // Key benefits of single fee payer approach
    console.log('🎯 Benefits of Single Fee Payer:');
    console.log('  ✅ Consistent fee handling across all operations');
    console.log('  ✅ Easier cost tracking and management');
    console.log('  ✅ More efficient batch processing');
    console.log('  ✅ Single point of control for transaction fees');
    console.log('  ✅ Better for automated/scripted operations');
    console.log('');

    // Validate operations
    console.log('🔍 Validating operations...');
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

      // Show operation-specific details
      switch (op.type) {
        case 'transfer':
          console.log(`       Recipient: ${op.params.recipient}`);
          console.log(`       Mint: ${op.params.mint}`);
          console.log(`       Amount: ${op.params.amount}`);
          break;
        case 'sell-amm':
          console.log(`       Pool: ${op.params.poolKey}`);
          console.log(`       Amount: ${op.params.amount}`);
          console.log(`       Slippage: ${op.params.slippage}%`);
          break;
      }
    });

    console.log('\n💡 Note: All operations will use the same fee payer wallet');
    console.log('   This ensures consistent fee handling and efficient processing');
    console.log(
      '   The batch includes ALL operation types - transfers, AMM ops, and bonding curve ops!'
    );

    // Execute batch transactions with single fee payer
    console.log('\n🚀 Executing batch transactions...');

    const results = await batchTransactions(
      connection,
      wallet, // Main wallet (has tokens for operations)
      exampleOperations,
      feePayer, // Single fee payer for ALL transactions
      {
        maxParallel: 2, // Execute 2 operations at a time
        delayBetween: 1000, // 1 second delay between batches
        retryFailed: true, // Retry failed operations
      }
    );

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
    console.log('\n💡 Key Points:');
    console.log('  • All transactions used the same fee payer wallet');
    console.log('  • All transactions used the same recent blockhash');
    console.log('  • This ensures efficient batch processing');
    console.log('  • Fee payer only needs sufficient SOL for transaction fees');
    console.log('  • Main wallet needs tokens for the actual operations');
  } catch (error) {
    console.error('❌ Error executing batch transactions:', error);
  }
}

/**
 * Example of different wallet configurations
 */
function explainWalletConfigurations() {
  console.log('\n🔧 Wallet Configuration Examples:');
  console.log('==================================');

  console.log('\n1. Separate Fee Payer (Recommended for production):');
  console.log('   • Main wallet: Holds tokens for operations');
  console.log('   • Fee payer: Dedicated wallet with SOL for fees');
  console.log('   • Benefits: Better security, easier cost tracking');

  console.log('\n2. Same Wallet (Simpler setup):');
  console.log('   • Main wallet: Also acts as fee payer');
  console.log('   • Must have both tokens AND sufficient SOL for fees');
  console.log('   • Benefits: Simpler, fewer wallets to manage');

  console.log('\n3. Multiple Fee Payers (Advanced):');
  console.log('   • Different fee payers for different operation types');
  console.log('   • More complex but offers flexibility');
  console.log('   • Not currently supported in this implementation');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
  explainWalletConfigurations();
}

export { exampleOperations };
