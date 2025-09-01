# Batch Transactions Usage Guide

This guide explains how to use the batch transactions feature for executing multiple operations efficiently.

## Overview

The batch transactions system allows you to combine multiple operations (token transfers, buys, sells, SOL transfers) into optimized batches that can be executed with reduced transaction fees and improved performance.

## Key Features

- **Multi-Sender Batching**: Combine operations from different senders into single transactions
- **Dynamic Batch Sizing**: Automatically determine optimal batch sizes based on Solana transaction limits
- **Mixed Operation Types**: Support for bonding curve, AMM, and SOL transfer operations
- **Fee Payer Support**: Optional common fee payer for all operations in a batch
- **Atomic Execution**: All operations in a batch succeed or fail together

## CLI Usage

### Basic Command

```bash
npm run cli:batch-transactions -- --operations <operations-file> [options]
```

### Required Arguments

- `--operations <file>`: Path to JSON file containing batch operations

### Optional Arguments

- `--fee-payer <wallet-file>`: Path to wallet file to use as fee payer for all operations
- `--wallet <wallet-file>`: Fallback wallet if operations don't specify individual senders
- `--max-parallel <number>`: Maximum number of operations per batch (default: 3)
- `--retry-failed`: Retry failed operations individually
- `--disable-fallback-retry`: Disable fallback retry (operations executed individually)
- `--delay-between <ms>`: Delay between transaction batches in milliseconds
- `--dynamic-batching`: Enable dynamic batch size determination
- `--dry-run`: Show what would be executed without running
- `-h, --help`: Show help message

### Operations JSON Format

Each operation in the JSON file must include:

```json
{
  "id": "unique-operation-id",
  "type": "operation-type",
  "sender": "/path/to/sender-wallet.json",
  "params": { ... }
}
```

**Important**: The `sender` field in CLI usage should be a **file path** to a wallet JSON file. The CLI will automatically convert this to a Keypair object.

### Operation Types

#### Token Transfer (`sol-transfer`)
```json
{
  "id": "transfer-1",
  "type": "sol-transfer",
  "sender": "/path/to/sender-wallet.json",
  "params": {
    "to": "recipient-public-key",
    "amount": 0.01
  }
}
```

#### Bonding Curve Buy (`buy-bonding-curve`)
```json
{
  "id": "buy-1",
  "type": "buy-bonding-curve",
  "sender": "/path/to/buyer-wallet.json",
  "params": {
    "amount": 0.01
  }
}
```

#### AMM Buy (`buy-amm`)
```json
{
  "id": "buy-amm-1",
  "type": "buy-amm",
  "sender": "/path/to/buyer-wallet.json",
  "params": {
    "amount": 0.01
  }
}
```

#### AMM Sell (`sell-amm`)
```json
{
  "id": "sell-1",
  "type": "sell-amm",
  "sender": "/path/to/seller-wallet.json",
  "params": {
    "amount": 100
  }
}
```

### Example CLI Usage

```bash
# Basic batch execution
npm run cli:batch-transactions -- --operations batch-ops.json

# With fee payer
npm run cli:batch-transactions -- --operations batch-ops.json --fee-payer treasury-wallet.json

# With dynamic batching
npm run cli:batch-transactions -- --operations batch-ops.json --dynamic-batching --max-parallel 10

# Dry run to see what would be executed
npm run cli:batch-transactions -- --operations batch-ops.json --dry-run
```

## Programmatic Usage

### Import

```typescript
import { batchTransactions, BatchOperation } from '@pump-fun/defikit';
```

### Basic Usage

```typescript
const operations: BatchOperation[] = [
  {
    id: 'transfer-1',
    type: 'sol-transfer',
    sender: senderKeypair, // Must be a Keypair object
    params: {
      to: recipientPublicKey,
      amount: 0.01
    }
  },
  {
    id: 'buy-1',
    type: 'buy-bonding-curve',
    sender: buyerKeypair, // Must be a Keypair object
    params: {
      amount: 0.01
    }
  }
];

const results = await batchTransactions(connection, operations, feePayer, {
  maxParallel: 3,
  dynamicBatching: true,
  retryFailed: true
});
```

### API Reference

#### `batchTransactions(connection, operations, feePayer?, options?)`

**Parameters:**
- `connection`: Solana Connection object
- `operations`: Array of BatchOperation objects
- `feePayer?`: Optional Keypair to use as fee payer for all operations
- `options?`: BatchExecutionOptions

**Returns:** Promise<BatchResult[]>

#### BatchOperation Interface

```typescript
interface BatchOperation {
  id: string;
  type: 'sol-transfer' | 'buy-bonding-curve' | 'buy-amm' | 'sell-amm';
  sender: Keypair; // Must be a Keypair object (not a string)
  params: {
    // Operation-specific parameters
  };
}
```

**Important**: In programmatic usage, `sender` must be a `Keypair` object directly. Do not pass file paths or JSON strings.

#### BatchExecutionOptions Interface

```typescript
interface BatchExecutionOptions {
  maxParallel?: number;           // Max operations per batch
  delayBetween?: number;          // Delay between batches (ms)
  retryFailed?: boolean;          // Retry failed operations
  disableFallbackRetry?: boolean; // Disable fallback retry
  dynamicBatching?: boolean;      // Enable dynamic batch sizing
  maxTransferInstructionsPerTx?: number; // Max transfer instructions per tx
}
```

## Examples

### Complete Example

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { batchTransactions } from '@pump-fun/defikit';

const connection = new Connection('https://api.devnet.solana.com');

// Create or load keypairs
const sender1 = Keypair.generate();
const sender2 = Keypair.generate();
const feePayer = Keypair.generate();

const operations = [
  {
    id: 'transfer-1',
    type: 'sol-transfer',
    sender: sender1,
    params: {
      to: sender2.publicKey,
      amount: 0.01
    }
  },
  {
    id: 'buy-1',
    type: 'buy-bonding-curve',
    sender: sender2,
    params: {
      amount: 0.02
    }
  }
];

try {
  const results = await batchTransactions(connection, operations, feePayer, {
    maxParallel: 3,
    dynamicBatching: true,
    retryFailed: true
  });
  
  console.log(`Executed ${results.length} operations successfully`);
} catch (error) {
  console.error('Batch execution failed:', error);
}
```

## Best Practices

1. **Use Dynamic Batching**: Enable `dynamicBatching: true` for optimal performance
2. **Provide Fee Payer**: Use a common fee payer when possible to reduce costs
3. **Group Related Operations**: Put related operations (buy + transfer) in the same batch
4. **Handle Errors**: Always wrap batch execution in try-catch blocks
5. **Monitor Limits**: Be aware of Solana transaction size and account limits

## Error Handling

The batch system provides detailed error information:

```typescript
const results = await batchTransactions(connection, operations);

// Check individual operation results
results.forEach(result => {
  if (result.success) {
    console.log(`✅ ${result.operationId}: ${result.signature}`);
  } else {
    console.error(`❌ ${result.operationId}: ${result.error}`);
  }
});
```

## Transaction Limits

- **Size Limit**: 1232 bytes per transaction
- **Account Limit**: 64 accounts per transaction
- **Compute Units**: 200K-1.4M per transaction

Dynamic batching automatically optimizes batch sizes to stay within these limits.