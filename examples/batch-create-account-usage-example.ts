import { Connection, Keypair } from '@solana/web3.js';
import { createBatchInstructions, executeBatchInstructions } from '../src/batch';
import type { BatchOperation } from '../src/@types';

/**
 * Complete example showing how to use batch operations with explicit create-account functionality
 * This demonstrates the full workflow from creating operations to executing them
 */

// Example: Batch operations with automatic ATA creation
export const createExampleBatchOperations = (): BatchOperation[] => {
  // Note: In a real application, you would use actual keypairs and public keys
  const senderKeypair = Keypair.generate();
  const buyerKeypair = Keypair.generate();

  return [
    // Explicitly create ATA for the recipient
    {
      type: 'create-account',
      id: 'create-ata-for-recipient',
      description: 'Create ATA for recipient before transfer',
      sender: senderKeypair,
      params: {
        mint: 'TokenMintPublicKeyHere',
        owner: 'RecipientPublicKeyHere',
      },
    },
    // Then transfer tokens
    {
      type: 'transfer',
      id: 'transfer-with-ata',
      description: 'Transfer tokens to new user',
      sender: senderKeypair,
      params: {
        recipient: 'RecipientPublicKeyHere', // Replace with actual recipient
        mint: 'TokenMintPublicKeyHere', // Replace with actual token mint
        amount: 1000,
      },
    },
    // Create ATA for buyer before bonding curve buy
    {
      type: 'create-account',
      id: 'create-ata-for-buyer',
      description: 'Create ATA for buyer',
      sender: buyerKeypair,
      params: {
        mint: 'TokenMintPublicKeyHere',
        owner: buyerKeypair.publicKey.toString(),
      },
    },
    // Bonding curve buy
    {
      type: 'buy-bonding-curve',
      id: 'buy-bc',
      description: 'Buy tokens from bonding curve',
      sender: buyerKeypair,
      params: {
        mint: 'TokenMintPublicKeyHere', // Replace with actual token mint
        amount: 1000000, // 0.001 SOL in lamports
        slippage: 1,
      },
    },
    // AMM buy
    {
      type: 'buy-amm',
      id: 'buy-amm',
      description: 'Buy tokens via AMM',
      sender: buyerKeypair,
      params: {
        poolKey: 'PoolPublicKeyHere', // Replace with actual pool key
        amount: 2000000, // 0.002 SOL in lamports
        slippage: 1,
      },
    },
    // Transfer to an existing ATA
    {
      type: 'transfer',
      id: 'transfer-existing-ata',
      description: 'Transfer to existing ATA (no creation needed)',
      sender: senderKeypair,
      params: {
        recipient: 'ExistingRecipientPublicKeyHere', // Replace with actual recipient
        mint: 'TokenMintPublicKeyHere', // Replace with actual token mint
        amount: 500,
      },
    },
    // SOL transfer (no ATA)
    {
      type: 'sol-transfer',
      id: 'sol-transfer-example',
      description: 'Transfer SOL (no ATA creation needed)',
      sender: senderKeypair,
      params: {
        recipient: 'RecipientPublicKeyHere', // Replace with actual recipient
        amount: 50000000, // 0.05 SOL in lamports
      },
    },
  ];
};

/**
 * Example function showing the complete batch workflow with createAccount
 */
export async function executeBatchWithCreateAccountExample(
  connection: Connection,
  feePayer?: Keypair
): Promise<void> {
  console.log('🚀 Starting Batch Operations with Create Account Example');
  console.log('=======================================================');

  try {
    // 1. Create batch operations
    const operations = createExampleBatchOperations();
    console.log(`📋 Created ${operations.length} batch operations`);

    // 2. Create batch instructions
    console.log('\n🔧 Creating batch instructions...');
    const batchInstructions = await createBatchInstructions(connection, operations, feePayer, {
      maxParallel: 3,
      dynamicBatching: true,
    });

    console.log(`✅ Created ${batchInstructions.length} batch instruction groups`);

    // 3. Inspect batch instructions
    batchInstructions.forEach((batch, index) => {
      console.log(`\n📦 Batch ${index + 1}:`);
      console.log(`   Operations: ${batch.operationCount}`);
      console.log(`   Instructions: ${batch.instructionCount}`);
      console.log(`   Fee Payer: ${batch.feePayer.toString()}`);
      console.log(`   Signers: ${batch.signers.length}`);
      console.log(`   Transaction Size: ${batch.transaction.serialize().length} bytes`);
    });

    // 4. Execute batch instructions
    console.log('\n⚡ Executing batch instructions...');
    const results = await executeBatchInstructions(connection, batchInstructions, operations, {
      delayBetween: 1000,
      retryFailed: true,
    });

    // 5. Process results
    console.log('\n📊 Execution Results:');
    console.log('====================');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful operations: ${successful.length}`);
    successful.forEach(result => {
      console.log(`   ${result.operationId}: ${result.signature}`);
    });

    if (failed.length > 0) {
      console.log(`\n❌ Failed operations: ${failed.length}`);
      failed.forEach(result => {
        console.log(`   ${result.operationId}: ${result.error}`);
      });
    }

    console.log('\n🎉 Batch execution completed!');
  } catch (error) {
    console.error('❌ Error executing batch operations:', error);
    throw error;
  }
}

/**
 * Example showing how to validate operations before execution
 */
export function validateBatchOperations(operations: BatchOperation[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  operations.forEach(op => {
    // Check for valid amounts
    if ('amount' in op.params && op.params.amount <= 0) {
      errors.push(`Operation ${op.id}: amount must be positive`);
    }

    // Check for valid slippage
    if ('slippage' in op.params && (op.params.slippage < 0 || op.params.slippage > 100)) {
      errors.push(`Operation ${op.id}: slippage must be between 0 and 100`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Example showing different createAccount scenarios
 */
export function demonstrateCreateAccountScenarios(): void {
  console.log('📚 Create Account Scenarios');
  console.log('===========================');

  console.log('\n1. Transfer with ATA Creation:');
  console.log("   - Creates ATA for recipient if it doesn't exist");
  console.log('   - Then transfers tokens to the newly created ATA');
  console.log('   - Use case: Sending tokens to new users');

  console.log('\n2. Buy with ATA Creation:');
  console.log("   - Creates ATA for buyer if it doesn't exist");
  console.log('   - Then executes the buy operation');
  console.log('   - Use case: First-time token purchases');

  console.log('\n3. AMM Buy with ATA Creation:');
  console.log('   - Requires tokenMint parameter');
  console.log('   - Creates ATA for buyer with specified token mint');
  console.log('   - Then executes the AMM buy operation');
  console.log('   - Use case: AMM trading for new tokens');

  console.log('\n4. Operations without ATA Creation:');
  console.log('   - Assumes all required ATAs already exist');
  console.log('   - Faster execution, but will fail if ATAs are missing');
  console.log('   - Use case: Operations between established accounts');

  console.log('\n5. SOL Transfers:');
  console.log('   - No ATA creation needed (SOL uses native accounts)');
  console.log('   - Independent of SPL token account existence');
  console.log('   - Use case: SOL payments and fees');
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('📖 Batch Operations with Create Account Examples');
  console.log('===============================================\n');

  demonstrateCreateAccountScenarios();

  console.log('\n' + '='.repeat(50));
  console.log('To run the full example, call:');
  console.log('executeBatchWithCreateAccountExample(connection, feePayer)');
  console.log('='.repeat(50));
}
