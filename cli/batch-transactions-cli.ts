#!/usr/bin/env tsx

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { sendToken, sendTokenWithAccountCreation } from '../src/sendToken';
// Note: Bonding-curve and AMM ops are executed via helper functions below.
// We don't import non-existent symbol exports here to avoid linter errors.
import { parseArgs, loadWallet, loadFeePayerWallet, printUsage } from './cli-args';
import { log, logError } from '../src/utils/debug';
import { buyTokens as buyAmm } from '../src/amm/buy';
import { sellTokens as sellAmm } from '../src/amm/sell';

/**
 * Interface for batch transaction operations
 */
interface BatchOperation {
  type: 'transfer' | 'buy-bonding-curve' | 'sell-bonding-curve' | 'buy-amm' | 'sell-amm';
  id: string;
  params: any;
  description: string;
}

/**
 * Interface for batch transaction result
 */
interface BatchResult {
  operationId: string;
  type: string;
  success: boolean;
  signature?: string;
  error?: string;
  details?: any;
}

/**
 * CLI for executing batch transactions
 * Supports multiple types of PumpFun operations with mandatory fee payer
 */
export async function batchTransactionsCli() {
  const args = parseArgs();

  if (args.help) {
    printUsage('cli:batch-transactions', [
      '  --operations <path>           Path to JSON file containing batch operations (required)',
      '  --fee-payer <path>            Path to fee payer wallet JSON file (required)',
      '  --wallet <path>               Path to wallet JSON file (optional, uses default if not specified)',
      '  --dry-run                     Show what would be executed without actually running',
      '  --max-parallel <number>       Maximum parallel transactions (default: 3)',
      '  --retry-failed                Retry failed transactions once',
      '  --delay-between <ms>          Delay between transaction batches in milliseconds (default: 1000)',
    ]);
    return;
  }

  // Validate required arguments
  if (!args.operations || !args.feePayer) {
    console.error('❌ Error: --operations and --fee-payer are required');
    printUsage('cli:batch-transactions');
    return;
  }

  console.log('🚀 Batch Transactions CLI');
  console.log('=========================');

  try {
    // Load operations from JSON file
    const operations = await loadOperationsFile(args.operations);
    if (!operations || operations.length === 0) {
      console.error('❌ Error: No operations found in operations file');
      return;
    }

    console.log(`📋 Loaded ${operations.length} operations from ${args.operations}`);

    // Load fee payer wallet (mandatory)
    const feePayer = loadFeePayerWallet(args.feePayer);
    if (!feePayer) {
      console.error('❌ Error: Failed to load fee payer wallet');
      return;
    }

    // Load main wallet (optional, uses default if not specified)
    const wallet = loadWallet(args.wallet);
    console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);
    console.log(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);

    // Setup connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Parse additional arguments
    const maxParallel = args.maxParallel || 3;
    const delayBetween = args.delayBetween || 1000;
    const retryFailed = args.retryFailed || false;
    const dryRun = args.dryRun || false;

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No transactions will be executed');
      await displayBatchPlan(operations, maxParallel);
      return;
    }

    // Execute batch transactions
    const results = await executeBatchTransactions(
      connection,
      wallet,
      feePayer,
      operations,
      maxParallel,
      delayBetween,
      retryFailed
    );

    // Display results
    displayBatchResults(results);

  } catch (error) {
    console.error(`❌ Error: ${error}`);
    return;
  }
}

/**
 * Load operations from JSON file
 */
async function loadOperationsFile(filePath: string): Promise<BatchOperation[]> {
  try {
    const fs = await import('fs');
    const operationsData = fs.readFileSync(filePath, 'utf8');
    const operations = JSON.parse(operationsData);
    
    // Validate operations structure
    if (!Array.isArray(operations)) {
      throw new Error('Operations file must contain an array');
    }

    return operations.map((op, index) => ({
      ...op,
      id: op.id || `op-${index}`,
      description: op.description || `Operation ${index + 1}`
    }));
  } catch (error) {
    throw new Error(`Failed to load operations file: ${error}`);
  }
}

/**
 * Display batch execution plan
 */
async function displayBatchPlan(operations: BatchOperation[], maxParallel: number): Promise<void> {
  console.log('\n📋 Batch Execution Plan:');
  console.log('========================');
  
  const batches = chunkArray(operations, maxParallel);
  
  batches.forEach((batch, batchIndex) => {
    console.log(`\n🔄 Batch ${batchIndex + 1} (${batch.length} operations):`);
    batch.forEach((op, opIndex) => {
      console.log(`  ${opIndex + 1}. [${op.type.toUpperCase()}] ${op.description}`);
      console.log(`     ID: ${op.id}`);
      
      // Display operation-specific details
      switch (op.type) {
        case 'transfer':
          console.log(`     From: ${op.params.from || 'Default Wallet'}`);
          console.log(`     To: ${op.params.recipient}`);
          console.log(`     Mint: ${op.params.mint}`);
          console.log(`     Amount: ${op.params.amount}`);
          break;
        case 'buy-bonding-curve':
        case 'sell-bonding-curve':
          console.log(`     Mint: ${op.params.mint}`);
          console.log(`     Amount: ${op.params.amount}`);
          console.log(`     Slippage: ${op.params.slippage || 'Default'}%`);
          break;
        case 'buy-amm':
        case 'sell-amm':
          console.log(`     Pool Key: ${op.params.poolKey}`);
          console.log(`     Amount: ${op.params.amount}`);
          console.log(`     Slippage: ${op.params.slippage || 'Default'}%`);
          break;
      }
    });
  });
}

/**
 * Execute batch transactions
 */
async function executeBatchTransactions(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair,
  operations: BatchOperation[],
  maxParallel: number,
  delayBetween: number,
  retryFailed: boolean
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  const batches = chunkArray(operations, maxParallel);

  console.log(`\n🚀 Executing ${operations.length} operations in ${batches.length} batches`);
  console.log(`📊 Max parallel transactions: ${maxParallel}`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n🔄 Executing Batch ${batchIndex + 1}/${batches.length} (${batch.length} operations)`);

    // Execute batch in parallel
    const batchPromises = batch.map(operation => 
      executeOperation(connection, wallet, feePayer, operation)
    );

    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process batch results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          operationId: batch[index].id,
          type: batch[index].type,
          success: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    // Add delay between batches (except for the last batch)
    if (batchIndex < batches.length - 1 && delayBetween > 0) {
      console.log(`⏳ Waiting ${delayBetween}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetween));
    }
  }

  // Retry failed transactions if requested
  if (retryFailed) {
    const failedOperations = operations.filter(op => 
      !results.find(r => r.operationId === op.id && r.success)
    );

    if (failedOperations.length > 0) {
      console.log(`\n🔄 Retrying ${failedOperations.length} failed operations...`);
      
      for (const operation of failedOperations) {
        console.log(`🔄 Retrying operation: ${operation.id}`);
        const retryResult = await executeOperation(connection, wallet, feePayer, operation);
        
        // Update the existing result
        const existingIndex = results.findIndex(r => r.operationId === operation.id);
        if (existingIndex >= 0) {
          results[existingIndex] = retryResult;
        } else {
          results.push(retryResult);
        }
      }
    }
  }

  return results;
}

/**
 * Execute a single operation
 */
async function executeOperation(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair,
  operation: BatchOperation
): Promise<BatchResult> {
  try {
    log(`🚀 Executing ${operation.type}: ${operation.description}`);

    let result: any;

    switch (operation.type) {
      case 'transfer':
        result = await executeTransfer(connection, wallet, feePayer, operation.params);
        break;
      case 'buy-bonding-curve':
        result = await executeBondingCurveBuy(connection, wallet, feePayer, operation.params);
        break;
      case 'sell-bonding-curve':
        result = await executeBondingCurveSell(connection, wallet, feePayer, operation.params);
        break;
      case 'buy-amm':
        result = await executeAmmBuy(connection, wallet, feePayer, operation.params);
        break;
      case 'sell-amm':
        result = await executeAmmSell(connection, wallet, feePayer, operation.params);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }

    return {
      operationId: operation.id,
      type: operation.type,
      success: result.success,
      signature: result.signature,
      error: result.error,
      details: result
    };

  } catch (error) {
    logError(`Error executing operation ${operation.id}:`, error);
    return {
      operationId: operation.id,
      type: operation.type,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Execute token transfer operation
 */
async function executeTransfer(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair,
  params: any
): Promise<any> {
  const { recipient, mint, amount, createAccount = true } = params;
  
  if (createAccount) {
    return await sendTokenWithAccountCreation(
      connection,
      wallet,
      new PublicKey(recipient),
      new PublicKey(mint),
      BigInt(amount),
      false, // allowOwnerOffCurve
      feePayer
    );
  } else {
    return await sendToken(
      connection,
      wallet,
      new PublicKey(recipient),
      new PublicKey(mint),
      BigInt(amount),
      false, // allowOwnerOffCurve
      false, // createRecipientAccount
      feePayer
    );
  }
}

/**
 * Execute bonding curve buy operation
 */
async function executeBondingCurveBuy(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair,
  params: any
): Promise<any> {
  const { mint, amount, slippage = 1000 } = params;
  
  // Note: This would need to be implemented in the bonding curve buy module
  // For now, returning a placeholder
  return {
    success: false,
    error: 'Bonding curve buy not yet implemented in batch mode'
  };
}

/**
 * Execute bonding curve sell operation
 */
async function executeBondingCurveSell(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair,
  params: any
): Promise<any> {
  const { mint, amount, slippage = 1000 } = params;
  
  try {
    log(`🔧 Executing bonding curve sell for ${amount} tokens`);
    log(`🎯 Mint: ${mint}`);
    log(`📊 Slippage: ${slippage} basis points`);
    
    // Use the createSignedSellTransaction function from the bonding curve module
    const { createSignedSellTransaction } = await import('../src/bonding-curve/sell');
    
    const result = await createSignedSellTransaction(
      connection,
      wallet,
      new PublicKey(mint),
      amount,
      slippage,
      feePayer
    );
    
    if (result.success && result.transaction) {
      // Submit the signed transaction
      const signature = await connection.sendRawTransaction(result.transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      return {
        success: true,
        signature,
        amount,
        mint
      };
    } else {
      throw new Error(result.error || 'Failed to create signed sell transaction');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Bonding curve sell failed: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Execute AMM buy operation
 */
async function executeAmmBuy(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair,
  params: any
): Promise<any> {
  const { poolKey, amount, slippage = 1 } = params;
  
  return await buyAmm(
    connection,
    wallet,
    new PublicKey(poolKey),
    amount,
    slippage,
    feePayer
  );
}

/**
 * Execute AMM sell operation
 */
async function executeAmmSell(
  connection: Connection,
  wallet: Keypair,
  feePayer: Keypair,
  params: any
): Promise<any> {
  const { poolKey, amount, slippage = 1 } = params;
  
  return await sellAmm(
    connection,
    wallet,
    new PublicKey(poolKey),
    amount,
    slippage,
    feePayer
  );
}

/**
 * Display batch execution results
 */
function displayBatchResults(results: BatchResult[]): void {
  console.log('\n📊 Batch Execution Results');
  console.log('==========================');

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

  // Summary
  console.log('\n📋 Summary:');
  console.log(`Total Operations: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n💡 Tip: Use --retry-failed to automatically retry failed operations');
  }
}

/**
 * Utility function to chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  batchTransactionsCli().catch(console.error);
}
