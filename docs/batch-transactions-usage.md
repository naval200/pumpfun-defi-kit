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

### Operation Type Reference

#### `create-account` Operation

Creates Associated Token Accounts (ATAs) for SPL tokens and WSOL.

**Parameters:**
- `mint` (string): The token mint public key
- `owner` (string): The owner of the token account

**Example:**
```typescript
{
  id: 'create-ata-user1',
  type: 'create-account',
  description: 'Create ATA for user 1',
  sender: senderKeypair,
  params: {
    mint: 'TokenMintPublicKey',
    owner: 'User1PublicKey',
  },
}
```

**What it creates:**
- SPL token ATA for the specified mint and owner
- WSOL ATA for the owner (needed for AMM operations)

#### `transfer` Operation

Transfers SPL tokens between accounts.

**Parameters:**
- `recipient` (string): Recipient's public key
- `mint` (string): Token mint public key
- `amount` (number): Amount to transfer in token units

#### `sol-transfer` Operation

Transfers SOL between accounts.

**Parameters:**
- `recipient` (string): Recipient's public key
- `amount` (number): Amount to transfer in lamports

#### `buy-bonding-curve` Operation

Buys tokens from the bonding curve.

**Parameters:**
- `mint` (string): Token mint public key
- `amount` (number): SOL amount in lamports
- `slippage` (number): Slippage tolerance (0-100)

#### `sell-bonding-curve` Operation

Sells tokens to the bonding curve.

**Parameters:**
- `mint` (string): Token mint public key
- `amount` (number): Token amount to sell
- `slippage` (number): Slippage tolerance (0-100)

#### `buy-amm` Operation

Buys tokens via AMM.

**Parameters:**
- `poolKey` (string): AMM pool public key
- `amount` (number): SOL amount in lamports
- `slippage` (number): Slippage tolerance (0-100)

#### `sell-amm` Operation

Sells tokens via AMM.

**Parameters:**
- `poolKey` (string): AMM pool public key
- `amount` (number): Token amount to sell
- `slippage` (number): Slippage tolerance (0-100)

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

- `create-account`: Create associated token accounts (ATAs) for SPL tokens and WSOL
- `transfer`: Transfer SPL tokens between accounts
- `sol-transfer`: Transfer SOL between accounts
- `buy-bonding-curve`: Buy tokens via bonding curve
- `sell-bonding-curve`: Sell tokens via bonding curve
- `buy-amm`: Buy tokens via AMM
- `sell-amm`: Sell tokens via AMM

## Account Creation with `create-account` Operations

The `create-account` operation allows you to explicitly create Associated Token Accounts (ATAs) within batch transactions. This is essential for operations that require specific token accounts to exist.

### What `create-account` Does

When you use a `create-account` operation, it automatically creates **two** token accounts:

1. **SPL Token ATA**: For the specified mint and owner
2. **WSOL ATA**: For wrapped SOL operations (needed for AMM trading)

This ensures that all subsequent operations in the batch will have the required accounts available.

### Supported Scenarios

- **Transfer operations**: Create recipient ATA before transferring tokens
- **Buy operations (bonding curve or AMM)**: Create buyer ATA before purchasing tokens
- **AMM trading**: Create both token and WSOL ATAs for trading operations
- **First-time users**: Ensure new users have required accounts before operations

### Basic Usage

```typescript
const operations: BatchOperation[] = [
  // 1) Create ATA for recipient before transfer
  {
    id: 'create-ata-recipient',
    type: 'create-account',
    description: 'Create ATA for token recipient',
    sender: senderKeypair,
    params: {
      mint: 'TokenMintPublicKey',
      owner: 'RecipientPublicKey',
    },
  },
  // 2) Transfer tokens to the newly created ATA
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
];
```

### Advanced Usage Examples

#### Example 1: AMM Trading with Account Creation

```typescript
const operations: BatchOperation[] = [
  // Create ATAs for buyer before AMM operations
  {
    id: 'create-ata-buyer',
    type: 'create-account',
    description: 'Create ATAs for AMM buyer',
    sender: buyerKeypair,
    params: {
      mint: 'TokenMintPublicKey',
      owner: buyerKeypair.publicKey.toString(),
    },
  },
  // AMM buy operation
  {
    id: 'buy-amm-1',
    type: 'buy-amm',
    description: 'Buy tokens via AMM',
    sender: buyerKeypair,
    params: {
      poolKey: 'PoolPublicKey',
      amount: 1000000, // 0.001 SOL in lamports
      slippage: 1,
    },
  },
  // AMM sell operation (uses same ATAs)
  {
    id: 'sell-amm-1',
    type: 'sell-amm',
    description: 'Sell tokens via AMM',
    sender: buyerKeypair,
    params: {
      poolKey: 'PoolPublicKey',
      amount: 500, // Token amount
      slippage: 1,
    },
  },
];
```

#### Example 2: Multi-User Token Distribution

```typescript
const operations: BatchOperation[] = [
  // Create ATAs for multiple recipients
  {
    id: 'create-ata-user1',
    type: 'create-account',
    description: 'Create ATA for user 1',
    sender: distributorKeypair,
    params: {
      mint: 'TokenMintPublicKey',
      owner: 'User1PublicKey',
    },
  },
  {
    id: 'create-ata-user2',
    type: 'create-account',
    description: 'Create ATA for user 2',
    sender: distributorKeypair,
    params: {
      mint: 'TokenMintPublicKey',
      owner: 'User2PublicKey',
    },
  },
  // Transfer tokens to each user
  {
    id: 'transfer-user1',
    type: 'transfer',
    description: 'Transfer tokens to user 1',
    sender: distributorKeypair,
    params: {
      recipient: 'User1PublicKey',
      mint: 'TokenMintPublicKey',
      amount: 1000,
    },
  },
  {
    id: 'transfer-user2',
    type: 'transfer',
    description: 'Transfer tokens to user 2',
    sender: distributorKeypair,
    params: {
      recipient: 'User2PublicKey',
      mint: 'TokenMintPublicKey',
      amount: 2000,
    },
  },
];
```

#### Example 3: Bonding Curve Trading

```typescript
const operations: BatchOperation[] = [
  // Create ATA for bonding curve buyer
  {
    id: 'create-ata-bc-buyer',
    type: 'create-account',
    description: 'Create ATA for bonding curve buyer',
    sender: buyerKeypair,
    params: {
      mint: 'TokenMintPublicKey',
      owner: buyerKeypair.publicKey.toString(),
    },
  },
  // Buy from bonding curve
  {
    id: 'buy-bonding-curve',
    type: 'buy-bonding-curve',
    description: 'Buy tokens from bonding curve',
    sender: buyerKeypair,
    params: {
      mint: 'TokenMintPublicKey',
      amount: 1000000, // 0.001 SOL in lamports
      slippage: 1,
    },
  },
  // Sell back to bonding curve
  {
    id: 'sell-bonding-curve',
    type: 'sell-bonding-curve',
    description: 'Sell tokens to bonding curve',
    sender: buyerKeypair,
    params: {
      mint: 'TokenMintPublicKey',
      amount: 500, // Token amount
      slippage: 1,
    },
  },
];
```

### Fee Payer Integration

When using a fee payer, the `create-account` operation will use the fee payer to pay for account creation costs:

```typescript
const operations: BatchOperation[] = [
  {
    id: 'create-ata-with-fee-payer',
    type: 'create-account',
    description: 'Create ATA using fee payer',
    sender: userKeypair, // User who will own the account
    params: {
      mint: 'TokenMintPublicKey',
      owner: userKeypair.publicKey.toString(),
    },
  },
];

// Execute with fee payer
const results = await batchTransactions(
  connection,
  operations,
  feePayerKeypair, // Fee payer pays for account creation
  { maxParallel: 1 }
);
```

### Important Notes

1. **Automatic WSOL Creation**: `create-account` automatically creates both the specified token ATA and a WSOL ATA, which is required for AMM operations.

2. **Fee Payer Priority**: If a fee payer is provided, it will pay for account creation costs. Otherwise, the sender pays.

3. **Atomic Operations**: Place `create-account` operations in the same batch as the operations that need them for atomicity.

4. **Idempotent**: If the ATA already exists, the operation will succeed without creating duplicates.

5. **Order Matters**: Always place `create-account` operations before the operations that require the accounts.

### Error Handling

The `create-account` operation handles common scenarios gracefully:

- **Account already exists**: Operation succeeds without error
- **Insufficient funds**: Will fail if neither sender nor fee payer has enough SOL
- **Invalid parameters**: Will fail with clear error messages

### Best Practices

1. **Batch Account Creation**: Create multiple ATAs in a single batch for efficiency
2. **Use Fee Payers**: Use fee payers for account creation to reduce user friction
3. **Validate First**: Check if accounts exist before creating them (optional optimization)
4. **Order Operations**: Always place `create-account` before dependent operations
5. **Handle Errors**: Implement proper error handling for account creation failures

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