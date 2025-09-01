# PumpFun DeFi Kit API Reference

## Overview

This document provides a comprehensive reference for all public APIs in the PumpFun DeFi Kit. It includes function signatures, parameters, return types, and usage examples for LLMs and developers to implement features effectively.

## Table of Contents

- [Core Types](#core-types)
- [Bonding Curve API](#bonding-curve-api)
- [AMM API](#amm-api)
- [Token Transfer API](#token-transfer-api)
- [Batch Operations API](#batch-operations-api)
- [Utility Functions](#utility-functions)
- [Error Handling](#error-handling)

## Core Types

### BatchOperation
```typescript
interface BatchOperation {
  type: 'transfer' | 'sell-bonding-curve' | 'sell-amm' | 'buy-bonding-curve' | 'buy-amm' | 'sol-transfer';
  id: string;
  description: string;
  params: any;
  sender?: string; // optional per-op sender for transfers
}
```

### BatchResult
```typescript
interface BatchResult {
  operationId: string;
  type: string;
  success: boolean;
  signature?: string;
  error?: string;
}
```

### BatchExecutionOptions
```typescript
interface BatchExecutionOptions {
  maxParallel?: number;        // default: 3
  delayBetween?: number;       // default: 1000ms
  retryFailed?: boolean;       // default: false
  combinePerBatch?: boolean;   // default: false
}
```

### TransactionResult
```typescript
interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  slot?: number;
}
```

### OperationResult
```typescript
interface OperationResult extends TransactionResult {
  amount?: number;
  mint?: string;
}
```

## Bonding Curve API

### buyPumpFunToken
Creates and executes a buy transaction for PumpFun tokens using bonding curve pricing.

```typescript
function buyPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  amountLamports: bigint,
  maxSlippageBasisPoints?: number
): Promise<string>
```

**Parameters:**
- `connection`: Solana connection instance
- `wallet`: Keypair for the buyer
- `mint`: Token mint address
- `amountLamports`: Amount of SOL to spend
- `maxSlippageBasisPoints`: Maximum slippage tolerance (default: 1000 = 10%)

**Returns:** Transaction signature string

**Example:**
```typescript
import { buyPumpFunToken } from './src/bonding-curve/buy';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.generate();
const mint = new PublicKey('YourTokenMintAddress');

const signature = await buyPumpFunToken(connection, wallet, mint, 100_000_000n);
```

### sellPumpFunToken
Sells PumpFun tokens back to the bonding curve.

```typescript
function sellPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  tokenAmount: bigint
): Promise<{ success: boolean; signature?: string; error?: string }>
```

**Parameters:**
- `connection`: Solana connection instance
- `wallet`: Keypair for the seller
- `mint`: Token mint address
- `tokenAmount`: Number of tokens to sell

**Returns:** Object with success status and transaction signature

**Example:**
```typescript
import { sellPumpFunToken } from './src/bonding-curve/sell';

const result = await sellPumpFunToken(connection, wallet, mint, 1000);
if (result.success) {
  console.log(`Sold tokens successfully: ${result.signature}`);
} else {
  console.error(`Sell failed: ${result.error}`);
}
```

## AMM API

### buyAmmTokens
Buys tokens from an AMM pool using SOL.

```typescript
function buyAmmTokens(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  quoteAmountLamports: bigint,
  slippage?: number,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; baseAmount?: bigint; error?: string }>
```

**Parameters:**
- `connection`: Solana connection instance
- `wallet`: Keypair for the buyer
- `poolKey`: AMM pool public key
- `quoteAmount`: Amount of SOL to spend
- `slippage`: Slippage tolerance percentage (default: 1%)
- `feePayer`: Optional separate fee payer wallet

**Returns:** Object with success status, signature, and amount received

**Example:**
```typescript
import { buyAmmTokens } from './src/amm';

const result = await buyAmmTokens(connection, wallet, poolKey, 100_000_000n, 200);
if (result.success) {
  console.log(`Bought ${result.baseAmount?.toString()} tokens`);
} else {
  console.error(`Buy failed: ${result.error}`);
}
```

### sellAmmTokens
Sells tokens to an AMM pool for SOL.

```typescript
function sellAmmTokens(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  baseAmount: bigint,
  slippage?: number,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; quoteAmount?: bigint; error?: string }>
```

**Parameters:**
- `connection`: Solana connection instance
- `wallet`: Keypair for the seller
- `poolKey`: AMM pool public key
- `baseAmount`: Number of tokens to sell
- `slippage`: Slippage tolerance percentage (default: 1%)
- `feePayer`: Optional separate fee payer wallet

**Returns:** Object with success status, signature, and SOL received

**Example:**
```typescript
import { sellAmmTokens } from './src/amm';

const result = await sellAmmTokens(connection, wallet, poolKey, 1_000_000n, 100);
if (result.success) {
  console.log(`Received ${formatLamportsAsSol(result.quoteAmount || 0)} SOL`);
} else {
  console.error(`Sell failed: ${result.error}`);
}
```

## Token Transfer API

### sendToken
Transfers tokens between wallets with optional account creation.

```typescript
function sendToken(
  connection: Connection,
  sender: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: bigint,
  allowOwnerOffCurve?: boolean,
  createRecipientAccount?: boolean,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; error?: string; recipientAccount?: PublicKey }>
```

**Parameters:**
- `connection`: Solana connection instance
- `sender`: Keypair of the sender
- `recipient`: Public key of the recipient
- `mint`: Token mint address
- `amount`: Amount in smallest token units
- `allowOwnerOffCurve`: Allow off-curve owners (default: false)
- `createRecipientAccount`: Create recipient account if needed (default: true)
- `feePayer`: Optional separate fee payer wallet

**Returns:** Object with success status, signature, and recipient account

**Example:**
```typescript
import { sendToken } from './src/sendToken';

const result = await sendToken(
  connection,
  senderWallet,
  recipientAddress,
  tokenMint,
  BigInt(1000000), // 1 token with 6 decimals
  false,
  true,
  feePayerWallet
);

if (result.success) {
  console.log(`Transfer successful: ${result.signature}`);
} else {
  console.error(`Transfer failed: ${result.error}`);
}
```

### sendTokenWithAccountCreation
Convenience function that always creates recipient accounts.

```typescript
function sendTokenWithAccountCreation(
  connection: Connection,
  sender: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: bigint,
  allowOwnerOffCurve?: boolean,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; error?: string; recipientAccount?: PublicKey }>
```

## Batch Operations API

### batchTransactions
Executes multiple operations in parallel batches.

```typescript
function batchTransactions(
  connection: Connection,
  wallet: Keypair,
  operations: BatchOperation[],
  feePayer?: Keypair,
  options: Partial<BatchExecutionOptions> = {}
): Promise<BatchResult[]>
```

**Parameters:**
- `connection`: Solana connection instance
- `wallet`: Default wallet for operations
- `operations`: Array of batch operations
- `feePayer`: Optional fee payer wallet
- `options`: Batch execution configuration

**Returns:** Array of operation results

**Example:**
```typescript
import { batchTransactions } from './src/batch/pumpfun-batch';

const operations = [
  {
    type: 'transfer',
    id: 'transfer-1',
    description: 'Send tokens to user A',
    params: {
      recipient: 'UserAPublicKey',
      mint: 'TokenMintAddress',
      amount: '1000000',
      createAccount: true
    }
  },
  {
    type: 'sell-amm',
    id: 'sell-1',
    description: 'Sell tokens to AMM',
    params: {
      poolKey: 'PoolPublicKey',
      amount: 500,
      slippage: 1
    }
  }
];

const results = await batchTransactions(
  connection,
  wallet,
  operations,
  feePayer,
  { maxParallel: 5, delayBetween: 2000 }
);

results.forEach(result => {
  if (result.success) {
    console.log(`Operation ${result.operationId} succeeded: ${result.signature}`);
  } else {
    console.error(`Operation ${result.operationId} failed: ${result.error}`);
  }
});
```

## Utility Functions

### createConnection
Creates a configured Solana connection.

```typescript
function createConnection(): Connection
```

**Returns:** Configured Solana connection instance

**Example:**
```typescript
import { createConnection } from './src/utils/connection';

const connection = createConnection();
```

### debugLog
Logs debug information when debug mode is enabled.

```typescript
function debugLog(message: string, ...args: any[]): void
```

**Parameters:**
- `message`: Debug message
- `args`: Additional arguments to log

**Example:**
```typescript
import { debugLog } from './src/utils/debug';

debugLog('Processing transaction:', { amount: 1000, recipient: 'address' });
```

## Error Handling

### Common Error Patterns

All functions in the library follow consistent error handling patterns:

1. **Success Case**: Functions return objects with `success: true` and relevant data
2. **Failure Case**: Functions return objects with `success: false` and `error` message
3. **Exceptions**: Critical errors throw exceptions that should be caught

### Error Handling Example

```typescript
try {
  const result = await buyPumpFunToken(connection, wallet, mint, 0.1);
  console.log(`Transaction successful: ${result}`);
} catch (error) {
  if (error.message.includes('ConstraintSeeds')) {
    console.error('Seed constraint error - check PDA derivation');
  } else if (error.message.includes('InsufficientFunds')) {
    console.error('Insufficient SOL balance');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Error Types

- **ConstraintSeeds**: PDA derivation issues
- **InsufficientFunds**: Insufficient balance for operation
- **AccountNotFound**: Required account doesn't exist
- **InvalidInstructionData**: Malformed instruction data
- **NetworkError**: RPC connection issues

## Configuration

### Environment Variables

```bash
# Enable debug logging
DEBUG_PUMPFUN_DEFI_SDK=true

# Custom RPC endpoint
SOLANA_RPC_URL=https://api.devnet.solana.com

# Custom commitment level
SOLANA_COMMITMENT=confirmed
```

### Network Configuration

The library supports both devnet and mainnet-beta:

```typescript
// Devnet (default for testing)
const connection = new Connection('https://api.devnet.solana.com');

// Mainnet-beta (production)
const connection = new Connection('https://api.mainnet-beta.solana.com');
```

## Best Practices

### 1. Error Handling
Always check the `success` field in return objects and handle errors appropriately.

### 2. Fee Payer Usage
Use separate fee payer wallets for batch operations and treasury management.

### 3. Slippage Protection
Set appropriate slippage tolerance based on market conditions and token volatility.

### 4. Transaction Confirmation
Wait for transaction confirmation before proceeding with dependent operations.

### 5. Debug Mode
Enable debug mode during development for detailed logging and troubleshooting.

## Integration Examples

### Complete Token Lifecycle

```typescript
import { 
  buyPumpFunToken, 
  sellPumpFunToken,
  buyAmmTokens,
  sendToken 
} from './src';

async function completeTokenLifecycle() {
  // 1. Buy tokens on bonding curve
  const buySignature = await buyPumpFunToken(connection, wallet, mint, 100_000_000n);
  
  // 2. Transfer tokens to another wallet
  const transferResult = await sendToken(
    connection, wallet, recipient, mint, BigInt(1000000)
  );
  
  // 3. Sell tokens on bonding curve
  const sellResult = await sellPumpFunToken(connection, wallet, mint, 500);
  
  // 4. Buy tokens from AMM (if pool exists)
  const ammBuyResult = await buyAmmTokens(connection, wallet, poolKey, 50_000_000n);
  
  console.log('Token lifecycle completed successfully');
}
```

### Treasury Management

```typescript
import { batchTransactions } from './src/batch/pumpfun-batch';

async function treasuryOperations() {
  const operations = [
    // Multiple user operations using treasury for fees
    {
      type: 'transfer',
      id: 'user1-transfer',
      description: 'Send tokens to user 1',
      params: { recipient: 'user1', mint: 'token', amount: '1000000' }
    },
    {
      type: 'transfer',
      id: 'user2-transfer',
      description: 'Send tokens to user 2',
      params: { recipient: 'user2', mint: 'token', amount: '2000000' }
    }
  ];
  
  const results = await batchTransactions(
    connection,
    userWallet,
    operations,
    treasuryWallet // Treasury pays all fees
  );
  
  console.log('Treasury operations completed');
}
```

This API reference provides comprehensive information for LLMs and developers to effectively implement features using the PumpFun DeFi Kit library.
