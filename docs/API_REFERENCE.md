# API Reference

This document provides a comprehensive reference for the PumpFun DeFi Kit API.

## Table of Contents

- [Core Functions](#core-functions)
- [Batch Transactions](#batch-transactions)
- [Bonding Curve Operations](#bonding-curve-operations)
- [AMM Operations](#amm-operations)
- [Utility Functions](#utility-functions)
- [Types and Interfaces](#types-and-interfaces)

## Core Functions

### `batchTransactions`

Executes multiple operations in optimized batches with support for multi-sender transactions.

```typescript
function batchTransactions(
  connection: Connection,
  operations: BatchOperation[],
  feePayer?: Keypair,
  options?: BatchExecutionOptions
): Promise<BatchResult[]>
```

**Parameters:**
- `connection`: Solana Connection object
- `operations`: Array of operations to execute
- `feePayer?`: Optional Keypair to use as fee payer for all operations
- `options?`: Batch execution options

**Returns:** Promise<BatchResult[]>

**Example:**
```typescript
import { batchTransactions } from '@pump-fun/defikit';

const operations = [
  {
    id: 'transfer-1',
    type: 'sol-transfer',
    sender: senderKeypair, // Must be a Keypair object
    params: {
      to: recipientPublicKey,
      amount: 0.01
    }
  }
];

const results = await batchTransactions(connection, operations, feePayer, {
  maxParallel: 3,
  dynamicBatching: true
});
```

### `sendSol`

Transfers SOL between wallets.

```typescript
function sendSol(
  connection: Connection,
  from: Keypair,
  to: PublicKey,
  amount: number,
  feePayer?: Keypair
): Promise<TransactionResult>
```

### `sendToken`

Transfers tokens between wallets.

```typescript
function sendToken(
  connection: Connection,
  from: Keypair,
  to: PublicKey,
  mint: PublicKey,
  amount: number,
  feePayer?: Keypair
): Promise<TransactionResult>
```

## Batch Transactions

### Types

#### `BatchOperation`

```typescript
interface BatchOperation {
  id: string;
  type: 'sol-transfer' | 'buy-bonding-curve' | 'buy-amm' | 'sell-amm';
  sender: Keypair; // Must be a Keypair object (not a string)
  params: {
    // Operation-specific parameters
    to?: PublicKey;        // For sol-transfer
    amount?: number;       // For all operations
    mint?: PublicKey;      // For token operations
    poolKey?: PublicKey;   // For AMM operations
    slippage?: number;     // For AMM operations
  };
}
```

**Important**: In programmatic usage, `sender` must be a `Keypair` object directly. Do not pass file paths or JSON strings.

#### `BatchExecutionOptions`

```typescript
interface BatchExecutionOptions {
  maxParallel?: number;           // Max operations per batch (default: 3)
  delayBetween?: number;          // Delay between batches in ms (default: 1000)
  retryFailed?: boolean;          // Retry failed operations (default: false)
  disableFallbackRetry?: boolean; // Disable fallback retry (default: false)
  dynamicBatching?: boolean;      // Enable dynamic batch sizing (default: false)
  maxTransferInstructionsPerTx?: number; // Max transfer instructions per tx
}
```

#### `BatchResult`

```typescript
interface BatchResult {
  operationId: string;
  type: string;
  success: boolean;
  signature?: string;
  error?: string;
}
```

### Operation Types

#### SOL Transfer (`sol-transfer`)

```typescript
{
  id: 'transfer-1',
  type: 'sol-transfer',
  sender: senderKeypair,
  params: {
    to: recipientPublicKey,
    amount: 0.01 // SOL amount
  }
}
```

#### Bonding Curve Buy (`buy-bonding-curve`)

```typescript
{
  id: 'buy-1',
  type: 'buy-bonding-curve',
  sender: buyerKeypair,
  params: {
    amount: 0.01 // SOL amount to spend
  }
}
```

#### AMM Buy (`buy-amm`)

```typescript
{
  id: 'buy-amm-1',
  type: 'buy-amm',
  sender: buyerKeypair,
  params: {
    amount: 0.01 // SOL amount to spend
  }
}
```

#### AMM Sell (`sell-amm`)

```typescript
{
  id: 'sell-1',
  type: 'sell-amm',
  sender: sellerKeypair,
  params: {
    amount: 100 // Token amount to sell
  }
}
```

## Bonding Curve Operations

### `createToken`

Creates a new token with bonding curve pricing.

```typescript
function createToken(
  connection: Connection,
  creator: Keypair,
  params: CreateTokenParams
): Promise<TransactionResult>
```

### `buy`

Buys tokens via bonding curve.

```typescript
function buy(
  connection: Connection,
  buyer: Keypair,
  params: BuyParams
): Promise<TransactionResult>
```

### `sell`

Sells tokens via bonding curve.

```typescript
function sell(
  connection: Connection,
  seller: Keypair,
  params: SellParams
): Promise<TransactionResult>
```

## AMM Operations

### `createPool`

Creates a new AMM pool.

```typescript
function createPool(
  connection: Connection,
  creator: Keypair,
  params: CreatePoolParams
): Promise<TransactionResult>
```

### `buy`

Buys tokens from AMM pool.

```typescript
function buy(
  connection: Connection,
  buyer: Keypair,
  params: BuyParams
): Promise<TransactionResult>
```

### `sell`

Sells tokens to AMM pool.

```typescript
function sell(
  connection: Connection,
  seller: Keypair,
  params: SellParams
): Promise<TransactionResult>
```

### `addLiquidity`

Adds liquidity to AMM pool.

```typescript
function addLiquidity(
  connection: Connection,
  provider: Keypair,
  params: AddLiquidityParams
): Promise<TransactionResult>
```

### `removeLiquidity`

Removes liquidity from AMM pool.

```typescript
function removeLiquidity(
  connection: Connection,
  provider: Keypair,
  params: RemoveLiquidityParams
): Promise<TransactionResult>
```

## Utility Functions

### `getOrCreateAssociatedTokenAccount`

Gets or creates an Associated Token Account.

```typescript
function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
): Promise<Account>
```

### `createAccount`

Creates a new account.

```typescript
function createAccount(
  connection: Connection,
  payer: Keypair,
  space: number,
  programId: PublicKey
): Promise<Keypair>
```

## Types and Interfaces

### `TransactionResult`

```typescript
interface TransactionResult {
  success: boolean;
  signature: string;
  error?: string;
}
```

### `CreateTokenParams`

```typescript
interface CreateTokenParams {
  name: string;
  symbol: string;
  uri?: string;
  decimals?: number;
  initialSupply?: number;
  bondingCurveParams?: BondingCurveParams;
}
```

### `BuyParams`

```typescript
interface BuyParams {
  amount: number; // SOL amount for bonding curve, token amount for AMM
  slippage?: number; // For AMM operations
}
```

### `SellParams`

```typescript
interface SellParams {
  amount: number; // Token amount
  slippage?: number; // For AMM operations
}
```

### `CreatePoolParams`

```typescript
interface CreatePoolParams {
  tokenMint: PublicKey;
  initialLiquidity: number;
  feeRate?: number;
}
```

### `AddLiquidityParams`

```typescript
interface AddLiquidityParams {
  poolKey: PublicKey;
  tokenAmount: number;
  solAmount: number;
}
```

### `RemoveLiquidityParams`

```typescript
interface RemoveLiquidityParams {
  poolKey: PublicKey;
  lpTokenAmount: number;
}
```

## Error Handling

All functions return consistent error information:

```typescript
interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}
```

For batch operations, each result includes the operation ID:

```typescript
interface BatchResult {
  operationId: string;
  type: string;
  success: boolean;
  signature?: string;
  error?: string;
}
```

## Bonding Curve Operations

### `createPumpFunToken`

Creates a new PumpFun token with bonding curve functionality.

```typescript
function createPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  tokenConfig: TokenConfig,
  isMainnet?: boolean
): Promise<CreateTokenResult>
```

**Parameters:**
- `connection`: Solana Connection object
- `wallet`: Keypair for the creator wallet
- `tokenConfig`: Token configuration object
- `isMainnet`: Whether to use mainnet (default: false for devnet)

**Returns:** Promise<CreateTokenResult>

**Example:**
```typescript
import { createPumpFunToken } from '@pump-fun/defikit';

const tokenConfig = {
  name: "My Token",
  symbol: "MTK",
  description: "A test token",
  imagePath: "path/to/image.png",
  initialBuyAmount: 1000000 // 0.001 SOL in lamports
};

const result = await createPumpFunToken(connection, wallet, tokenConfig);
if (result.success) {
  console.log(`Token created: ${result.mint}`);
}
```

### `buyPumpFunToken`

Buys tokens from the PumpFun bonding curve.

```typescript
function buyPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  solAmount: number,
  slippageBasisPoints?: number,
  feePayer?: Keypair
): Promise<string>
```

**Parameters:**
- `connection`: Solana Connection object
- `wallet`: Keypair for the buyer wallet
- `mint`: Token mint address
- `solAmount`: Amount of SOL to spend (in lamports)
- `slippageBasisPoints`: Slippage tolerance (default: 1000 = 10%)
- `feePayer`: Optional fee payer keypair

**Returns:** Promise<string> (transaction signature)

**Example:**
```typescript
import { buyPumpFunToken } from '@pump-fun/defikit';

const signature = await buyPumpFunToken(
  connection,
  wallet,
  mintPublicKey,
  100000000, // 0.1 SOL in lamports
  1000, // 10% slippage
  feePayer // Optional
);
```

### `sellPumpFunToken`

Sells tokens back to the PumpFun bonding curve.

```typescript
function sellPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  tokenAmount: number,
  feePayer?: Keypair
): Promise<{ success: boolean; signature?: string; error?: string }>
```

**Parameters:**
- `connection`: Solana Connection object
- `wallet`: Keypair for the seller wallet (token owner)
- `mint`: Token mint address
- `tokenAmount`: Number of tokens to sell
- `feePayer`: Optional fee payer keypair (can be different from wallet)

**Returns:** Promise<{ success: boolean; signature?: string; error?: string }>

**Example:**
```typescript
import { sellPumpFunToken } from '@pump-fun/defikit';

const result = await sellPumpFunToken(
  connection,
  wallet,
  mintPublicKey,
  1000, // 1000 tokens
  feePayer // Optional - can be different from wallet
);

if (result.success) {
  console.log(`Sell successful: ${result.signature}`);
} else {
  console.error(`Sell failed: ${result.error}`);
}
```

### `TokenConfig`

```typescript
interface TokenConfig {
  name: string;
  symbol: string;
  description: string;
  imagePath?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  initialBuyAmount?: number; // in lamports
}
```

### `CreateTokenResult`

```typescript
interface CreateTokenResult {
  success: boolean;
  mint?: string;
  mintKeypair?: Keypair;
  signature?: string;
  error?: string;
}
```

## AMM Operations

### `createPool`

Creates a new AMM liquidity pool.

```typescript
function createPool(
  connection: Connection,
  wallet: Keypair,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  baseAmount: number,
  quoteAmount: number,
  poolIndex?: number
): Promise<{ success: boolean; poolKey?: string; signature?: string; error?: string }>
```

### `addLiquidity`

Adds liquidity to an existing AMM pool.

```typescript
function addLiquidity(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  baseAmount: number,
  quoteAmount: number,
  slippageBasisPoints?: number
): Promise<{ success: boolean; signature?: string; error?: string }>
```

### `removeLiquidity`

Removes liquidity from an AMM pool.

```typescript
function removeLiquidity(
  connection: Connection,
  wallet: Keypair,
  poolKey: PublicKey,
  lpAmount: number,
  slippageBasisPoints?: number
): Promise<{ success: boolean; signature?: string; error?: string }>
```

## Best Practices

1. **Always handle errors**: Wrap function calls in try-catch blocks
2. **Use dynamic batching**: Enable `dynamicBatching: true` for optimal performance
3. **Provide fee payers**: Use common fee payers when possible to reduce costs
4. **Group related operations**: Put related operations in the same batch
5. **Monitor transaction limits**: Be aware of Solana's transaction size and account limits

## Transaction Limits

- **Size Limit**: 1232 bytes per transaction
- **Account Limit**: 64 accounts per transaction  
- **Compute Units**: 200K-1.4M per transaction

The batch system automatically optimizes batch sizes to stay within these limits when dynamic batching is enabled.
