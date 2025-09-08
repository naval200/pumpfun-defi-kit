# Batch Transactions Usage Guide

This guide explains how to use the PumpFun batch transaction system for executing multiple operations efficiently.

## Overview

The batch transaction system allows you to combine multiple PumpFun operations into single transactions, reducing gas costs and improving efficiency. The system supports two approaches:

1. **Separated approach (Recommended)**: Use `createBatchInstructions()` and `executeBatchInstructions()` for maximum control and flexibility
2. **Combined approach**: Use `batchTransactions()` for a simple one-step process

## Separated Approach (Recommended)

This approach gives you maximum control and is recommended for most use cases:

### Step 1: Create Instructions

```typescript
import { createBatchInstructions } from '@your-package/batch';
import type { BatchOperation } from '@your-package/@types';

const operations: BatchOperation[] = [
  {
    id: 'transfer-1',
    type: 'transfer',
    description: 'Transfer tokens to user 1',
    sender: senderKeypair,
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
    sender: buyerKeypair,
    params: {
      poolKey: 'PoolPublicKey',
      amount: 500,
      slippage: 1,
    },
  },
];

// Create batch instructions
const batchInstructions = await createBatchInstructions(
  connection,
  operations,
  feePayer,
  { 
    maxParallel: 3, 
    dynamicBatching: true 
  }
);

console.log(`Created ${batchInstructions.length} batch instructions`);
batchInstructions.forEach((batch, index) => {
  console.log(`Batch ${index + 1}: ${batch.operationCount} operations`);
  console.log(`Fee payer: ${batch.feePayer.toString()}`);
  console.log(`Signers: ${batch.signers.length}`);
  console.log(`Blockhash: ${batch.blockhash}`);
});
```

### Step 2: Execute Instructions

```typescript
import { executeBatchInstructions } from '@your-package/batch';

const results = await executeBatchInstructions(
  connection,
  batchInstructions,
  operations,
  { 
    delayBetween: 1000, 
    retryFailed: true 
  }
);

console.log(`Executed ${results.length} operations`);
results.forEach(result => {
  if (result.success) {
    console.log(`✅ ${result.operationId}: ${result.signature}`);
  } else {
    console.log(`❌ ${result.operationId}: ${result.error}`);
  }
});
```

## Combined Approach (Simple)

Use this when you want to execute batch operations in one step:

```typescript
import { batchTransactions } from '@your-package/batch';

const results = await batchTransactions(
  connection,
  operations,
  feePayer,
  {
    maxParallel: 3,
    delayBetween: 1000,
    retryFailed: true,
    dynamicBatching: true,
  }
);
```

## API Reference

### `createBatchInstructions(connection, operations, feePayer?, options?)`

Creates batch instructions and prepares transactions for execution.

**Parameters:**
- `connection`: Solana Connection object
- `operations`: Array of BatchOperation objects
- `feePayer?`: Optional Keypair to use as fee payer for all operations
- `options?`: BatchExecutionOptions

**Returns:** Promise<BatchInstructionResult[]>

**Example:**
```typescript
const batchInstructions = await createBatchInstructions(
  connection,
  operations,
  feePayer,
  {
    maxParallel: 3,        // Max operations per batch
    dynamicBatching: true, // Enable dynamic batch sizing
  }
);
```

### `executeBatchInstructions(connection, batchInstructions, operations, options?)`

Executes prepared batch instructions.

**Parameters:**
- `connection`: Solana Connection object
- `batchInstructions`: Array of BatchInstructionResult from createBatchInstructions
- `operations`: Original operations array (for mapping results)
- `options?`: Execution options

**Returns:** Promise<BatchResult[]>

**Example:**
```typescript
const results = await executeBatchInstructions(
  connection,
  batchInstructions,
  operations,
  {
    delayBetween: 1000,  // Delay between batches (ms)
    retryFailed: true,   // Retry failed operations
  }
);
```

### `BatchInstructionResult` Interface

```typescript
interface BatchInstructionResult {
  transaction: Transaction;           // Prepared transaction
  blockhash: string;                 // Recent blockhash
  lastValidBlockHeight: number;      // Last valid block height
  signers: Keypair[];                // Required signers
  feePayer: PublicKey;               // Fee payer public key
  operationCount: number;            // Operations in this batch
  instructionCount: number;          // Instructions in transaction
  uniqueSendersCount: number;        // Unique senders in batch
}
```

## Use Cases for Separated Approach

### 1. Create Instructions Once, Execute Multiple Times

```typescript
// Create instructions once
const batchInstructions = await createBatchInstructions(connection, operations, feePayer);

// Execute with different retry strategies
const results1 = await executeBatchInstructions(connection, batchInstructions, operations, { retryFailed: false });
const results2 = await executeBatchInstructions(connection, batchInstructions, operations, { retryFailed: true });
```

### 2. Inspect Transaction Details Before Execution

```typescript
const batchInstructions = await createBatchInstructions(connection, operations, feePayer);

batchInstructions.forEach((batch, index) => {
  console.log(`Batch ${index + 1} details:`);
  console.log(`  Transaction size: ${batch.transaction.serialize().length} bytes`);
  console.log(`  Fee payer: ${batch.feePayer.toString()}`);
  console.log(`  Required signers: ${batch.signers.map(s => s.publicKey.toString()).join(', ')}`);
  console.log(`  Blockhash: ${batch.blockhash}`);
  console.log(`  Last valid block height: ${batch.lastValidBlockHeight}`);
});
```

### 3. Custom Execution Logic

```typescript
const batchInstructions = await createBatchInstructions(connection, operations, feePayer);

for (let i = 0; i < batchInstructions.length; i++) {
  const batch = batchInstructions[i];
  
  // Custom logic: only execute if transaction size is reasonable
  if (batch.transaction.serialize().length < 1000000) { // 1MB limit
    console.log(`Executing batch ${i + 1}`);
    const result = await executeBatchInstructions(
      connection, 
      [batch], 
      operations.slice(i * batch.operationCount, (i + 1) * batch.operationCount)
    );
  } else {
    console.log(`Skipping batch ${i + 1} (too large)`);
  }
}
```

### 4. Parallel Execution

```typescript
const batchInstructions = await createBatchInstructions(connection, operations, feePayer);

// Execute batches in parallel (be careful with rate limits)
const executionPromises = batchInstructions.map((batch, index) => 
  executeBatchInstructions(
    connection, 
    [batch], 
    operations.slice(index * batch.operationCount, (index + 1) * batch.operationCount)
  )
);

const results = await Promise.all(executionPromises);
```

## Supported Operation Types

- `create-account`: Create an associated token account (ATA)
- `transfer`: Transfer tokens between accounts
- `sol-transfer`: Transfer SOL between accounts
- `buy-bonding-curve`: Buy tokens via bonding curve
- `sell-bonding-curve`: Sell tokens via bonding curve
- `buy-amm`: Buy tokens via AMM
- `sell-amm`: Sell tokens via AMM

## Account Creation

Account creation is now modeled as an explicit operation: `create-account`. Add this operation before any operation that requires an ATA to exist.

### Supported Scenarios

- **Transfer operations**: Create recipient ATA ahead of the transfer
- **Buy operations (bonding curve or AMM)**: Create buyer ATA ahead of the buy

### Usage

```typescript
const operations: BatchOperation[] = [
  // 1) Create ATA for recipient
  {
    id: 'create-ata-recipient',
    type: 'create-account',
    description: 'Ensure recipient ATA exists',
    sender: senderKeypair, // payer can be sender or fee payer
    params: {
      mint: 'TokenMintPublicKey',
      owner: 'RecipientPublicKey',
    },
  },
  // 2) Transfer tokens
  {
    id: 'transfer-1',
    type: 'transfer',
    description: 'Transfer tokens to user',
    sender: senderKeypair,
    params: {
      recipient: 'RecipientPublicKey',
      mint: 'TokenMintPublicKey',
      amount: 1000,
    },
  },
  // 3) Create ATA for buyer before AMM buy
  {
    id: 'create-ata-buyer',
    type: 'create-account',
    description: 'Ensure buyer ATA exists',
    sender: buyerKeypair,
    params: {
      mint: 'TokenMintPublicKey',
      owner: buyerKeypair.publicKey.toString(),
    },
  },
  // 4) AMM buy
  {
    id: 'buy-amm-1',
    type: 'buy-amm',
    description: 'Buy tokens via AMM',
    sender: buyerKeypair,
    params: {
      poolKey: 'PoolPublicKey',
      amount: 1000000, // SOL amount in lamports
      slippage: 1,
    },
  },
];
```

### Notes

1. `create-account` adds both the SPL ATA (for the specified `mint` and `owner`) and an associated WSOL ATA as needed, using the fee payer if provided.
2. Place `create-account` operations before the consuming operations in the same batch for atomicity.
3. The payer for account creation will be the provided `feePayer` (if any), otherwise the `sender`.

## Configuration Options

### Batch Creation Options

- `maxParallel`: Maximum operations per batch (default: 3)
- `dynamicBatching`: Enable dynamic batch size optimization (default: false)

### Execution Options

- `delayBetween`: Delay between batches in milliseconds (default: 1000)
- `retryFailed`: Whether to retry failed operations individually (default: false)
- `disableFallbackRetry`: Disable fallback retry mechanism (default: false)

### Dynamic Batching

When `dynamicBatching` is enabled, the system automatically determines the optimal batch size based on:
- Network congestion
- Transaction size limits
- Fee optimization
- Account limits

## Error Handling

The batch system provides comprehensive error handling:

1. **Batch-level errors**: If a batch fails, all operations in that batch are marked as failed
2. **Individual retry**: Failed operations can be retried individually using the fallback mechanism
3. **Detailed error reporting**: Each operation result includes success status and error details

## Best Practices

1. **Use separated approach**: Prefer `createBatchInstructions` + `executeBatchInstructions` for better control
2. **Validate operations**: Use `validatePumpFunBatchOperations()` before execution
3. **Check account existence**: Ensure all required accounts exist before batching
4. **Monitor transaction size**: Large batches may hit transaction size limits
5. **Use appropriate fee payers**: Consider using a dedicated fee payer for better control
6. **Handle retries**: Enable retry for important operations
7. **Monitor network conditions**: Use dynamic batching during high congestion

## Example: Complete Workflow

```typescript
import { 
  createBatchInstructions, 
  executeBatchInstructions,
  validatePumpFunBatchOperations 
} from '@your-package/batch';

async function executeBatchWorkflow() {
  // 1. Validate operations
  const validation = validatePumpFunBatchOperations(operations);
  if (!validation.valid) {
    console.error('Invalid operations:', validation.errors);
    return;
  }

  // 2. Create instructions
  const batchInstructions = await createBatchInstructions(
    connection,
    operations,
    feePayer,
    { maxParallel: 3, dynamicBatching: true }
  );

  // 3. Inspect and validate instructions
  batchInstructions.forEach((batch, index) => {
    if (batch.transaction.serialize().length > 1000000) {
      console.warn(`Batch ${index + 1} is very large: ${batch.transaction.serialize().length} bytes`);
    }
  });

  // 4. Execute with retry
  const results = await executeBatchInstructions(
    connection,
    batchInstructions,
    operations,
    { retryFailed: true, delayBetween: 1000 }
  );

  // 5. Process results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ ${successful.length} operations succeeded`);
  console.log(`❌ ${failed.length} operations failed`);

  return results;
}
```