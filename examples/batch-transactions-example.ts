#!/usr/bin/env tsx

/**
 * Example script demonstrating how to use the Batch Transactions API
 * This script shows how to create and execute batch operations programmatically
 * 
 * Note: Currently only supports consuming operations (transfers, sell-amm, sell-bonding-curve)
 * Buy operations cannot be batched together as they have different dependencies
 */

import { batchTransactions, validateBatchOperations } from '../src/batchTransactions';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example batch operations for demonstration
 * Only consuming operations are supported in combined mode
 */
const exampleOperations = [
  {
    type: 'transfer',
    id: 'transfer-example-1',
    description: 'Send 100 tokens to user A',
    params: {
      recipient: '11111111111111111111111111111111',
      mint: '22222222222222222222222222222222',
      amount: '100000000',
      createAccount: true
    }
  },
  {
    type: 'transfer',
    id: 'transfer-example-2',
    description: 'Send 50 tokens to user B',
    params: {
      recipient: '33333333333333333333333333333333',
      mint: '22222222222222222222222222222222',
      amount: '50000000',
      createAccount: false
    }
  },
  {
    type: 'sell-amm',
    id: 'sell-amm-example',
    description: 'Sell tokens to AMM pool',
    params: {
      poolKey: '44444444444444444444444444444444',
      amount: 1000,
      slippage: 1
    }
  },
  {
    type: 'sell-bonding-curve',
    id: 'sell-bonding-curve-example',
    description: 'Sell tokens via bonding curve',
    params: {
      mint: '22222222222222222222222222222222',
      amount: 500,
      slippage: 1000
    }
  }
];

/**
 * Create example operations file
 */
function createExampleOperationsFile(): void {
  const outputPath = path.join(__dirname, 'batch-operations-example.json');
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(exampleOperations, null, 2));
    console.log(`✅ Example operations file created: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to create operations file: ${error}`);
  }
}

/**
 * Validate operations structure using the built-in validator
 */
function validateOperations(operations: any[]): boolean {
  console.log('🔍 Validating operations structure...');
  
  const validation = validateBatchOperations(operations);
  
  if (!validation.valid) {
    console.error('❌ Validation errors found:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }
  
  console.log('✅ All operations are valid');
  return true;
}

/**
 * Display operations summary
 */
function displayOperationsSummary(operations: any[]): void {
  console.log('\n📋 Operations Summary:');
  console.log('=======================');
  
  const typeCounts: { [key: string]: number } = {};
  operations.forEach(op => {
    typeCounts[op.type] = (typeCounts[op.type] || 0) + 1;
  });
  
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`${type}: ${count} operations`);
  });
  
  console.log(`\nTotal: ${operations.length} operations`);
  
  // Show first few operations as examples
  console.log('\n📝 Sample Operations:');
  operations.slice(0, 3).forEach((op, index) => {
    console.log(`  ${index + 1}. [${op.type.toUpperCase()}] ${op.description}`);
    console.log(`     ID: ${op.id}`);
  });
  
  if (operations.length > 3) {
    console.log(`  ... and ${operations.length - 3} more operations`);
  }
}

/**
 * Generate programmatic API examples
 */
function generateApiExamples(): void {
  console.log('\n🚀 Programmatic API Usage Examples:');
  console.log('===================================');
  
  console.log('\n1. Basic batch execution:');
  console.log('const results = await batchTransactions(');
  console.log('  connection,');
  console.log('  wallet,');
  console.log('  operations,');
  console.log('  feePayer,');
  console.log('  { maxParallel: 3 }');
  console.log(');');
  
  console.log('\n2. With custom options:');
  console.log('const results = await batchTransactions(');
  console.log('  connection,');
  console.log('  wallet,');
  console.log('  operations,');
  console.log('  feePayer,');
  console.log('  {');
  console.log('    maxParallel: 5,');
  console.log('    delayBetween: 2000,');
  console.log('    retryFailed: true,');
  console.log('    maxTransferInstructionsPerTx: 15');
  console.log('  }');
  console.log(');');
  
  console.log('\n3. Validate operations before execution:');
  console.log('const validation = validateBatchOperations(operations);');
  console.log('if (validation.valid) {');
  console.log('  const results = await batchTransactions(...);');
  console.log('}');
}

/**
 * Display current limitations
 */
function displayLimitations(): void {
  console.log('\n⚠️  Current Limitations:');
  console.log('========================');
  console.log('• Only consuming operations can be batched together');
  console.log('• Supported types: transfer, sell-amm, sell-bonding-curve');
  console.log('• All operations must use the same fee payer');
  console.log('• Operations are automatically chunked if they exceed transaction limits');
  console.log('• Each sender must sign their respective operations');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Batch Transactions Example');
  console.log('============================');
  
  try {
    // Create example operations file
    createExampleOperationsFile();
    
    // Validate operations
    if (!validateOperations(exampleOperations)) {
      console.error('❌ Operations validation failed');
      return;
    }
    
    // Display summary
    displayOperationsSummary(exampleOperations);
    
    // Display limitations
    displayLimitations();
    
    // Generate API examples
    generateApiExamples();
    
    console.log('\n✅ Example setup complete!');
    console.log('\n💡 Next steps:');
    console.log('  1. Create a fee payer wallet with sufficient SOL');
    console.log('  2. Update the operations file with real addresses and amounts');
    console.log('  3. Use the programmatic API shown above');
    console.log('  4. Monitor the execution progress and results');
    
  } catch (error) {
    console.error(`❌ Error in example setup: ${error}`);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { exampleOperations, validateOperations, displayOperationsSummary };
