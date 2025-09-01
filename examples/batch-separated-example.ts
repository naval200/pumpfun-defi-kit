import { Connection, Keypair } from '@solana/web3.js';
import {
  createBatchInstructions,
  executeBatchInstructions,
  batchTransactions,
  validatePumpFunBatchOperations,
} from '../src/batch';
import type { BatchOperation } from '../src/@types';

/**
 * Example demonstrating the separated batch transaction APIs
 *
 * This shows how to use the recommended separated approach:
 * 1. Create instructions and get transaction details
 * 2. Execute the prepared instructions
 * 3. Handle results and errors
 */
async function exampleSeparatedBatchTransactions() {
  // Setup connection (replace with your RPC endpoint)
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Example operations
  const operations: BatchOperation[] = [
    {
      id: 'transfer-1',
      type: 'transfer',
      description: 'Transfer tokens to user 1',
      sender: Keypair.generate(), // Replace with actual keypair
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
      sender: Keypair.generate(), // Replace with actual keypair
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
      sender: Keypair.generate(), // Replace with actual keypair
      params: {
        recipient: 'RecipientPublicKey2',
        amount: 0.01,
      },
    },
  ];

  const feePayer = Keypair.generate(); // Replace with actual fee payer

  console.log('🚀 Example: Using separated batch transaction APIs');
  console.log(`📝 Processing ${operations.length} operations`);

  // Step 1: Validate operations
  const validation = validatePumpFunBatchOperations(operations);
  if (!validation.valid) {
    console.error('❌ Invalid operations:', validation.errors);
    return;
  }
  console.log('✅ Operations validated successfully');

  // Step 2: Create batch instructions
  console.log('📝 Creating batch instructions...');
  const batchInstructions = await createBatchInstructions(connection, operations, feePayer, {
    maxParallel: 2,
    dynamicBatching: true,
  });

  console.log(`✅ Created ${batchInstructions.length} batch instructions`);
  batchInstructions.forEach((batch, index) => {
    console.log(
      `  Batch ${index + 1}: ${batch.operationCount} operations, ${batch.instructionCount} instructions`
    );
    console.log(`    Fee payer: ${batch.feePayer.toString()}`);
    console.log(`    Signers: ${batch.signers.length}`);
    console.log(`    Blockhash: ${batch.blockhash}`);
    console.log(`    Transaction size: ${batch.transaction.serialize().length} bytes`);
  });

  // Step 3: Execute batch instructions
  console.log('🔄 Executing batch instructions...');
  const results = await executeBatchInstructions(connection, batchInstructions, operations, {
    delayBetween: 1000,
    retryFailed: true,
  });

  console.log(`✅ Executed ${results.length} operations`);

  // Process results
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
}

/**
 * Example showing different use cases for the separated APIs
 */
async function exampleUseCases() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const feePayer = Keypair.generate();

  // Use case 1: Create instructions once, execute multiple times
  console.log('📋 Use case 1: Create instructions once, execute multiple times');
  const operations: BatchOperation[] = [
    {
      id: 'transfer-1',
      type: 'transfer',
      description: 'Transfer tokens',
      sender: Keypair.generate(),
      params: {
        recipient: 'Recipient1',
        mint: 'TokenMint',
        amount: 100,
      },
    },
  ];

  const batchInstructions = await createBatchInstructions(connection, operations, feePayer);

  // Execute with different retry strategies
  const results1 = await executeBatchInstructions(connection, batchInstructions, operations, {
    retryFailed: false,
  });
  const results2 = await executeBatchInstructions(connection, batchInstructions, operations, {
    retryFailed: true,
  });

  console.log(`Results 1: ${results1.filter(r => r.success).length}/${results1.length} succeeded`);
  console.log(`Results 2: ${results2.filter(r => r.success).length}/${results2.length} succeeded`);

  // Use case 2: Inspect transaction details before execution
  console.log('🔍 Use case 2: Inspect transaction details before execution');
  batchInstructions.forEach((batch, index) => {
    console.log(`Batch ${index + 1} details:`);
    console.log(`  Transaction size: ${batch.transaction.serialize().length} bytes`);
    console.log(`  Fee payer: ${batch.feePayer.toString()}`);
    console.log(`  Required signers: ${batch.signers.map(s => s.publicKey.toString()).join(', ')}`);
    console.log(`  Blockhash: ${batch.blockhash}`);
    console.log(`  Last valid block height: ${batch.lastValidBlockHeight}`);
  });

  // Use case 3: Custom execution logic
  console.log('⚙️ Use case 3: Custom execution logic');
  for (let i = 0; i < batchInstructions.length; i++) {
    const batch = batchInstructions[i];

    // Custom logic: only execute if transaction size is reasonable
    if (batch.transaction.serialize().length < 1000000) {
      // 1MB limit
      console.log(`Executing batch ${i + 1} (size: ${batch.transaction.serialize().length} bytes)`);
      const result = await executeBatchInstructions(
        connection,
        [batch],
        operations.slice(i * batch.operationCount, (i + 1) * batch.operationCount)
      );
      console.log(
        `Batch ${i + 1} result: ${result.filter(r => r.success).length}/${result.length} succeeded`
      );
    } else {
      console.log(
        `Skipping batch ${i + 1} (too large: ${batch.transaction.serialize().length} bytes)`
      );
    }
  }

  // Use case 4: Parallel execution (be careful with rate limits)
  console.log('⚡ Use case 4: Parallel execution');
  const parallelOperations: BatchOperation[] = Array.from({ length: 6 }, (_, i) => ({
    id: `transfer-${i}`,
    type: 'transfer',
    description: `Transfer ${i}`,
    sender: Keypair.generate(),
    params: {
      recipient: `Recipient${i}`,
      mint: 'TokenMint',
      amount: 100 + i,
    },
  }));

  const parallelBatchInstructions = await createBatchInstructions(
    connection,
    parallelOperations,
    feePayer
  );

  // Execute batches in parallel (be careful with rate limits)
  const executionPromises = parallelBatchInstructions.map((batch, index) =>
    executeBatchInstructions(
      connection,
      [batch],
      parallelOperations.slice(index * batch.operationCount, (index + 1) * batch.operationCount)
    )
  );

  const parallelResults = await Promise.all(executionPromises);
  const totalSuccessful = parallelResults.flat().filter(r => r.success).length;
  const totalOperations = parallelResults.flat().length;

  console.log(`Parallel execution: ${totalSuccessful}/${totalOperations} operations succeeded`);
}

/**
 * Example comparing separated vs combined approaches
 */
async function exampleComparison() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const feePayer = Keypair.generate();

  const operations: BatchOperation[] = [
    {
      id: 'transfer-1',
      type: 'transfer',
      description: 'Transfer tokens',
      sender: Keypair.generate(),
      params: {
        recipient: 'Recipient1',
        mint: 'TokenMint',
        amount: 100,
      },
    },
  ];

  console.log('🔄 Example: Comparing separated vs combined approaches');

  // Separated approach
  console.log('📝 Separated approach:');
  const batchInstructions = await createBatchInstructions(connection, operations, feePayer);
  const separatedResults = await executeBatchInstructions(
    connection,
    batchInstructions,
    operations
  );
  console.log(
    `  Result: ${separatedResults.filter(r => r.success).length}/${separatedResults.length} succeeded`
  );

  // Combined approach
  console.log('📝 Combined approach:');
  const combinedResults = await batchTransactions(connection, operations, feePayer);
  console.log(
    `  Result: ${combinedResults.filter(r => r.success).length}/${combinedResults.length} succeeded`
  );

  console.log('✅ Both approaches produce the same results!');
}

// Run examples
if (require.main === module) {
  exampleSeparatedBatchTransactions().catch(console.error);
  exampleUseCases().catch(console.error);
  exampleComparison().catch(console.error);
}
