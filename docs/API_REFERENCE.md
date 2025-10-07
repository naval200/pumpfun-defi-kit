# API Reference

This document provides a comprehensive reference for the PumpFun DeFi Kit API.

## Table of Contents

- [Core Functions](#core-functions)
- [Transaction Analysis](#transaction-analysis)
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

## Transaction Analysis

The transaction analysis module provides comprehensive tools for fetching, processing, and analyzing Solana transactions, including SPL token transfers, SOL transfers, and batch transaction detection.

### Core Functions

#### `getTransactions`

Fetches and processes all transactions for a given wallet address.

```typescript
function getTransactions(
  address: string,
  options?: GetTransactionsOptions
): Promise<TransactionData[]>
```

**Parameters:**
- `address`: Wallet public key as string
- `options?`: Optional configuration object

**Returns:** Promise<TransactionData[]>

**Example:**
```typescript
import { getTransactions } from '@pump-fun/defikit';

// Get all transactions for a wallet
const transactions = await getTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 50,
  includeBatchAnalysis: true
});

console.log(`Found ${transactions.length} transactions`);
```

#### `getSolTransactions`

Fetches only SOL transfer transactions (no token transfers).

```typescript
function getSolTransactions(
  address: string,
  options?: Omit<GetTransactionsOptions, 'mintFilter'>
): Promise<TransactionData[]>
```

**Example:**
```typescript
// Get only SOL transactions
const solTransactions = await getSolTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 20
});
```

#### `getTokenTransactions`

Fetches only SPL token transfer transactions.

```typescript
function getTokenTransactions(
  address: string,
  options?: GetTransactionsOptions
): Promise<TransactionData[]>
```

**Example:**
```typescript
// Get only token transactions
const tokenTransactions = await getTokenTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 20,
  mintFilter: 'So11111111111111111111111111111111111111112' // Filter by specific token
});
```

#### `getBatchTransactions`

Fetches only batch transactions (transactions with multiple instructions).

```typescript
function getBatchTransactions(
  address: string,
  options?: Omit<GetTransactionsOptions, 'includeBatchAnalysis'>
): Promise<TransactionData[]>
```

**Example:**
```typescript
// Get only batch transactions
const batchTransactions = await getBatchTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 10
});
```

#### `getTransactionBySignature`

Fetches a single transaction by its signature.

```typescript
function getTransactionBySignature(
  signature: string,
  options?: Omit<GetTransactionsOptions, 'limit' | 'mintFilter'>
): Promise<TransactionData | null>
```

**Example:**
```typescript
// Get specific transaction
const tx = await getTransactionBySignature('5J7X8...', {
  network: 'devnet',
  includeBatchAnalysis: true
});

if (tx) {
  console.log(`Transaction fee: ${tx.fee} lamports`);
  console.log(`Success: ${tx.success}`);
}
```

#### `getTransactionSummary`

Generates summary statistics for a collection of transactions.

```typescript
function getTransactionSummary(transactions: TransactionData[]): TransactionSummary
```

**Example:**
```typescript
const transactions = await getTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh');
const summary = getTransactionSummary(transactions);

console.log(`Total transactions: ${summary.totalTransactions}`);
console.log(`Success rate: ${summary.successRate.toFixed(2)}%`);
console.log(`Total fees: ${summary.totalFeesInSol.toFixed(9)} SOL`);
```

### Utility Functions

#### `extractTokenTransfers`

Extracts SPL token transfers from raw transaction data.

```typescript
function extractTokenTransfers(tx: any): TokenTransfer[]
```

#### `extractSolTransfers`

Extracts SOL transfers from raw transaction data.

```typescript
function extractSolTransfers(tx: any): SolTransfer[]
```

#### `isBatchTransaction`

Determines if a transaction is a batch transaction based on heuristics.

```typescript
function isBatchTransaction(tx: any): boolean
```

### Types and Interfaces

#### `GetTransactionsOptions`

Configuration options for fetching transactions.

```typescript
interface GetTransactionsOptions {
  network?: 'devnet' | 'mainnet';
  limit?: number;
  mintFilter?: string;
  includeBatchAnalysis?: boolean;
}
```

**Properties:**
- `network`: Solana network to query (default: 'devnet')
- `limit`: Maximum number of transactions to fetch (default: 50)
- `mintFilter`: Filter transactions by specific token mint address
- `includeBatchAnalysis`: Enable batch transaction detection (default: false)

#### `TransactionData`

Complete transaction information.

```typescript
interface TransactionData {
  signature: string;
  slot: number;
  blockTime: number | null;
  fee: number;
  success: boolean;
  error: any;
  tokenTransfers: TokenTransfer[];
  solTransfers: SolTransfer[];
  explorerUrl: string;
  isBatchTransaction: boolean;
  instructionCount: number;
  accountCount: number;
}
```

**Properties:**
- `signature`: Transaction signature
- `slot`: Solana slot number
- `blockTime`: Unix timestamp of block time
- `fee`: Transaction fee in lamports
- `success`: Whether transaction succeeded
- `error`: Error details if transaction failed
- `tokenTransfers`: Array of SPL token transfers
- `solTransfers`: Array of SOL transfers
- `explorerUrl`: Solana Explorer URL
- `isBatchTransaction`: Whether this is a batch transaction
- `instructionCount`: Number of instructions in transaction
- `accountCount`: Number of accounts involved

#### `TokenTransfer`

SPL token transfer information.

```typescript
interface TokenTransfer {
  mint: string;
  owner: string;
  change: number;
  decimals: number;
  amount: string;
  uiAmount: number;
}
```

**Properties:**
- `mint`: Token mint address
- `owner`: Token account owner
- `change`: Balance change (positive for received, negative for sent)
- `decimals`: Token decimals
- `amount`: Raw amount as string
- `uiAmount`: User-friendly amount

#### `SolTransfer`

SOL transfer information.

```typescript
interface SolTransfer {
  accountIndex: number;
  change: number;
  postBalance: number;
  preBalance: number;
}
```

**Properties:**
- `accountIndex`: Account index in transaction
- `change`: SOL balance change
- `postBalance`: Balance after transaction
- `preBalance`: Balance before transaction

#### `TransactionSummary`

Summary statistics for transaction collection.

```typescript
interface TransactionSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  totalFees: number;
  totalFeesInSol: number;
  totalSolTransfers: number;
  totalTokenTransfers: number;
  batchTransactions: number;
  uniqueTokens: number;
  uniqueTokenMints: string[];
}
```

### Usage Examples

#### Basic Transaction Fetching

```typescript
import { getTransactions, getTransactionSummary } from '@pump-fun/defikit';

// Fetch recent transactions
const transactions = await getTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 20,
  includeBatchAnalysis: true
});

// Get summary statistics
const summary = getTransactionSummary(transactions);
console.log(`Success rate: ${summary.successRate.toFixed(2)}%`);
```

#### Filtering by Token

```typescript
// Get transactions for a specific token
const tokenTransactions = await getTokenTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  mintFilter: 'So11111111111111111111111111111111111111112', // SOL
  limit: 10
});
```

#### Batch Transaction Analysis

```typescript
// Get only batch transactions
const batchTransactions = await getBatchTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 5
});

// Analyze each batch transaction
batchTransactions.forEach(tx => {
  console.log(`Batch transaction: ${tx.signature}`);
  console.log(`Instructions: ${tx.instructionCount}`);
  console.log(`Accounts: ${tx.accountCount}`);
  console.log(`Token transfers: ${tx.tokenTransfers.length}`);
  console.log(`SOL transfers: ${tx.solTransfers.length}`);
});
```

#### Single Transaction Analysis

```typescript
// Get specific transaction
const tx = await getTransactionBySignature('5J7X8...', {
  network: 'devnet',
  includeBatchAnalysis: true
});

if (tx) {
  console.log(`Transaction: ${tx.signature}`);
  console.log(`Success: ${tx.success}`);
  console.log(`Fee: ${tx.fee} lamports`);
  
  // Display token transfers
  tx.tokenTransfers.forEach(transfer => {
    console.log(`Token ${transfer.mint}: ${transfer.change > 0 ? '+' : ''}${transfer.change}`);
  });
  
  // Display SOL transfers
  tx.solTransfers.forEach(transfer => {
    console.log(`Account ${transfer.accountIndex}: ${transfer.change > 0 ? '+' : ''}${transfer.change} SOL`);
  });
}
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

### `createPumpFunTokenInstruction`

Creates a transaction instruction for creating a new PumpFun token. This function returns just the transaction, enabling batching and custom transaction handling.

```typescript
function createPumpFunTokenInstruction(
  connection: Connection,
  wallet: Keypair,
  tokenConfig: TokenConfig,
  mint: Keypair
): Promise<Transaction>
```

**Parameters:**
- `connection`: Solana Connection object
- `wallet`: Keypair for the creator wallet
- `tokenConfig`: Token configuration object
- `mint`: Keypair for the token mint (must be generated beforehand)

**Returns:** Promise<Transaction>

**Example:**
```typescript
import { createPumpFunTokenInstruction } from '@pump-fun/defikit';

const mint = Keypair.generate();
const tokenConfig = {
  name: "My Token",
  symbol: "MTK",
  description: "A test token",
  imagePath: "path/to/image.png"
};

const transaction = await createPumpFunTokenInstruction(
  connection, 
  wallet, 
  tokenConfig, 
  mint
);

// Add to batch transaction or handle custom logic
const batchTransaction = new Transaction();
batchTransaction.add(...transaction.instructions);
```

**Use Cases:**
- Batch token creation with multiple tokens
- Custom transaction handling and signing
- Integration with other transaction operations
- Advanced transaction composition

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
