# Batch Transactions CLI

The Batch Transactions CLI allows you to execute multiple PumpFun operations in parallel, including token transfers and sells across both bonding curve and AMM modes. This is particularly useful for bulk operations, testing scenarios, or managing multiple positions simultaneously.

## Features

- **Multiple Operation Types**: Support for transfers, bonding curve sells, and AMM sells
- **Parallel Execution**: Execute multiple transactions simultaneously for improved performance
- **Mandatory Fee Payer**: All operations use a dedicated fee payer wallet to ensure consistent fee handling
- **Batch Processing**: Group operations into configurable batch sizes
- **Retry Logic**: Automatic retry of failed transactions
- **Dry Run Mode**: Preview operations without executing them
- **Comprehensive Reporting**: Detailed success/failure reporting with transaction signatures

## Prerequisites

- A fee payer wallet with sufficient SOL for transaction fees
- The main wallet with tokens/balances for the operations
- Valid operation parameters (addresses, amounts, etc.)

## Usage

### Basic Command Structure

```bash
npm run cli:batch-transactions --operations <path> --fee-payer <path> [options]
```

### Required Parameters

- `--operations <path>`: Path to JSON file containing batch operations
- `--fee-payer <path>`: Path to fee payer wallet JSON file

### Optional Parameters

- `--max-parallel <number>`: Maximum parallel transactions (default: 3)
- `--retry-failed`: Retry failed transactions once
- `--delay-between <ms>`: Delay between transaction batches in milliseconds (default: 1000)
- `--dry-run`: Show what would be executed without actually running

## Operations JSON Format

The operations file should contain an array of operation objects. Each operation has the following structure:

```json
{
  "type": "operation-type",
  "id": "unique-identifier",
  "description": "Human-readable description",
  "params": {
    // Operation-specific parameters
  }
}
```

### Supported Operation Types

#### 1. Token Transfer (`transfer`)

Transfers tokens between wallets.

```json
{
  "type": "transfer",
  "id": "transfer-1",
  "description": "Send 100 tokens to user A",
  "params": {
    "recipient": "11111111111111111111111111111111",
    "mint": "22222222222222222222222222222222",
    "amount": "100000000",
    "createAccount": true
  }
}
```

**Parameters:**
- `recipient`: Recipient's public key
- `mint`: Token mint address
- `amount`: Amount in smallest token units (e.g., lamports for SOL)
- `createAccount`: Whether to create recipient account if it doesn't exist

#### 2. AMM Sell (`sell-amm`)

Sell tokens to an AMM pool.

```json
{
  "type": "sell-amm",
  "id": "sell-amm-1",
  "description": "Sell tokens to AMM pool 1",
  "params": {
    "poolKey": "44444444444444444444444444444444",
    "amount": 1000,
    "slippage": 1
  }
}
```

**Parameters:**
- `poolKey`: AMM pool public key
- `amount`: Amount of tokens to sell
- `slippage`: Slippage tolerance in basis points (1 = 0.01%)

#### 3. Bonding Curve Sell (`sell-bonding-curve`)

Sell tokens via the bonding curve mechanism.

```json
{
  "type": "sell-bonding-curve",
  "id": "sell-bc-1",
  "description": "Sell tokens via bonding curve",
  "params": {
    "mint": "66666666666666666666666666666666",
    "amount": 500,
    "slippage": 1000
  }
}
```

**Parameters:**
- `mint`: Token mint address
- `amount`: Amount of tokens to sell
- `slippage`: Slippage tolerance in basis points (1000 = 10%)

## Programmatic API

The batch transactions functionality is also available as a programmatic API for integration into your own applications:

```typescript
import { executeBatch as batchTransactions, BatchOperation } from '../src/batch';

const operations: BatchOperation[] = [
  // ... your operations
];

const results = await batchTransactions(
  connection,
  wallet,
  operations,
  feePayer,
  {
    maxParallel: 3,
    delayBetween: 1000,
    retryFailed: true
  }
);
```

### Function Signature

```typescript
export async function executeBatch(
  connection: Connection,
  wallet: Keypair,
  operations: BatchOperation[],
  feePayer: Keypair,
  options: Partial<BatchExecutionOptions> = {}
): Promise<BatchResult[]>
```