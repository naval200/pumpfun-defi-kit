# How to Get Transactions

This guide shows you how to fetch, analyze, and display Solana transactions using the PumpFun DeFi Kit's simplified transaction analysis APIs.

## Table of Contents

- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
- [Programmatic API Usage](#programmatic-api-usage)
- [Parallel Execution](#parallel-execution)
- [Transaction Types](#transaction-types)
- [Advanced Examples](#advanced-examples)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Using CLI (Easiest)

```bash
# Get all transactions for a wallet
npm run cli:list-transactions -- \
  --address 6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc \
  --limit 50 \
  --network devnet

# Get only SOL transactions
npm run cli:list-transactions -- \
  --address 6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc \
  --type sol \
  --limit 20

# Get token transactions for specific mint
npm run cli:list-transactions -- \
  --address 6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc \
  --mint 7JbsbKusEG4XRtg6XipzvpT4j7pLQEHmwHkF5Rooj4A8 \
  --type token \
  --limit 20

# Export to JSON
npm run cli:list-transactions -- \
  --address 6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc \
  --format json \
  --output transactions.json
```

### Using Programmatic API

```typescript
import { 
  getTransactions,
  getSolanaTransactions,
  getSplTokenTransactions,
  getTransactionBySignature
} from '@pump-fun/defikit';
import { createConnection } from '@pump-fun/defikit';
import { PublicKey } from '@solana/web3.js';

// Create connection
const connection = createConnection({ 
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  wsUrl: 'wss://api.devnet.solana.com'
});

const walletAddress = new PublicKey('6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc');

// Fetch all transactions
const allTransactions = await getTransactions(connection, walletAddress, 50);
console.log(`Found ${allTransactions.length} transactions`);
```

## CLI Usage

### Basic Commands

```bash
# List all transactions (SOL + Token)
npm run cli:list-transactions -- --address <public-key> --limit 50

# List only SOL transactions
npm run cli:list-transactions -- --address <public-key> --type sol --limit 20

# List only token transactions for specific mint
npm run cli:list-transactions -- --address <public-key> --mint <mint-address> --type token --limit 20

# Export to JSON file
npm run cli:list-transactions -- --address <public-key> --format json --output transactions.json

# Use mainnet
npm run cli:list-transactions -- --address <public-key> --network mainnet --limit 50
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--address` | Wallet public key (required) | - |
| `--type` | Transaction type: `all`, `sol`, or `token` | all |
| `--mint` | Filter by specific token mint (required for token type) | - |
| `--limit` | Number of transactions to fetch | 50 |
| `--network` | Network: `devnet` or `mainnet` | devnet |
| `--format` | Output format: `table` or `json` | table |
| `--output` | Save results to JSON file | - |

## Programmatic API Usage

### Import the Functions

```typescript
import { 
  getTransactions,
  getSolanaTransactions,
  getSplTokenTransactions,
  getTransactionBySignature
} from '@pump-fun/defikit';
import { 
  SolTransaction, 
  SplTokenTransaction 
} from '@pump-fun/defikit';
import { createConnection } from '@pump-fun/defikit';
import { PublicKey } from '@solana/web3.js';
```

### Basic Transaction Fetching

```typescript
// Create connection
const connection = createConnection({ 
  network: 'devnet',
  rpcUrl: 'https://api.devnet.solana.com',
  wsUrl: 'wss://api.devnet.solana.com'
});

const walletAddress = new PublicKey('6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc');

// Get all transactions
const allTransactions = await getTransactions(connection, walletAddress, 50);

// Get only SOL transactions
const solTransactions = await getSolanaTransactions(connection, walletAddress, 20);

// Get token transactions for specific mint
const mintAddress = new PublicKey('7JbsbKusEG4XRtg6XipzvpT4j7pLQEHmwHkF5Rooj4A8');
const tokenTransactions = await getSplTokenTransactions(connection, walletAddress, mintAddress, 20);

// Get specific transaction by signature
const tx = await getTransactionBySignature(connection, 'AX7b5gyYBQ1krK2XTVydHZyg5i3fVnChzA8hurrNzGk1rtfr5FRd6sxJHiboMyunsHMKXTVk8BgWo1Gy2Xbfw2X');
```

## Parallel Execution

### Execute Multiple Queries in Parallel

The new API is designed for efficient parallel execution. You can fetch SOL and token transactions simultaneously:

```typescript
async function getWalletActivity(walletAddress: PublicKey, tokenMints: PublicKey[]) {
  const connection = createConnection({ 
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com'
  });

  // Execute all queries in parallel
  const [
    allTransactions,
    solTransactions,
    ...tokenTransactionResults
  ] = await Promise.all([
    // Get all transactions
    getTransactions(connection, walletAddress, 50),
    
    // Get SOL transactions
    getSolanaTransactions(connection, walletAddress, 50),
    
    // Get token transactions for each mint in parallel
    ...tokenMints.map(mint => 
      getSplTokenTransactions(connection, walletAddress, mint, 50)
    )
  ]);

  return {
    allTransactions,
    solTransactions,
    tokenTransactions: tokenTransactionResults.flat()
  };
}

// Usage
const walletAddress = new PublicKey('6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc');
const tokenMints = [
  new PublicKey('7JbsbKusEG4XRtg6XipzvpT4j7pLQEHmwHkF5Rooj4A8'),
  new PublicKey('So11111111111111111111111111111111111111112') // SOL mint
];

const activity = await getWalletActivity(walletAddress, tokenMints);
console.log(`Found ${activity.solTransactions.length} SOL transactions`);
console.log(`Found ${activity.tokenTransactions.length} token transactions`);
```

### Batch Analysis for Multiple Wallets

```typescript
async function analyzeMultipleWallets(walletAddresses: string[], tokenMints: string[]) {
  const connection = createConnection({ 
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com'
  });

  // Create all queries for parallel execution
  const queries = walletAddresses.flatMap(walletAddress => {
    const walletPubkey = new PublicKey(walletAddress);
    
    return [
      // SOL transactions for each wallet
      getSolanaTransactions(connection, walletPubkey, 20).then(txs => ({
        wallet: walletAddress,
        type: 'sol',
        transactions: txs
      })),
      
      // Token transactions for each wallet and mint combination
      ...tokenMints.map(mintAddress => 
        getSplTokenTransactions(connection, walletPubkey, new PublicKey(mintAddress), 20)
          .then(txs => ({
            wallet: walletAddress,
            type: 'token',
            mint: mintAddress,
            transactions: txs
          }))
      )
    ];
  });

  // Execute all queries in parallel
  const results = await Promise.all(queries);
  
  // Group results by wallet
  const walletResults = results.reduce((acc, result) => {
    if (!acc[result.wallet]) {
      acc[result.wallet] = { sol: [], tokens: {} };
    }
    
    if (result.type === 'sol') {
      acc[result.wallet].sol = result.transactions;
    } else {
      acc[result.wallet].tokens[result.mint] = result.transactions;
    }
    
    return acc;
  }, {} as Record<string, { sol: SolTransaction[], tokens: Record<string, SplTokenTransaction[]> }>);

  return walletResults;
}

// Usage
const wallets = [
  '6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc',
  'FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh'
];

const mints = [
  '7JbsbKusEG4XRtg6XipzvpT4j7pLQEHmwHkF5Rooj4A8',
  'So11111111111111111111111111111111111111112'
];

const analysis = await analyzeMultipleWallets(wallets, mints);
console.log('Analysis complete for all wallets');
```

## Transaction Types

### SOL Transactions

```typescript
const solTransactions = await getSolanaTransactions(connection, walletAddress, 20);

solTransactions.forEach(tx => {
  console.log(`SOL Transaction: ${tx.tx.transaction.signatures[0]}`);
  console.log(`  Type: ${tx.type}`); // 'debit' or 'credit'
  console.log(`  Change: ${tx.change > 0 ? '+' : ''}${(tx.change / 1e9).toFixed(9)} SOL`);
  console.log(`  Balance: ${(tx.preBalance / 1e9).toFixed(9)} → ${(tx.postBalance / 1e9).toFixed(9)} SOL`);
  console.log(`  Success: ${!tx.tx.meta?.err}`);
});
```

### SPL Token Transactions

```typescript
const mintAddress = new PublicKey('7JbsbKusEG4XRtg6XipzvpT4j7pLQEHmwHkF5Rooj4A8');
const tokenTransactions = await getSplTokenTransactions(connection, walletAddress, mintAddress, 20);

tokenTransactions.forEach(tx => {
  console.log(`Token Transaction: ${tx.tx.transaction.signatures[0]}`);
  console.log(`  Type: ${tx.type}`); // 'debit' or 'credit'
  console.log(`  Mint: ${tx.mint}`);
  console.log(`  Owner: ${tx.owner}`);
  console.log(`  Change: ${tx.change > 0 ? '+' : ''}${tx.change.toFixed(6)} tokens`);
  console.log(`  Balance: ${tx.preBalance.toFixed(6)} → ${tx.postBalance.toFixed(6)} tokens`);
  console.log(`  Success: ${!tx.tx.meta?.err}`);
});
```

## Advanced Examples

### Complete Wallet Analysis

```typescript
async function completeWalletAnalysis(walletAddress: string, tokenMints: string[]) {
  const connection = createConnection({ 
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com'
  });

  const walletPubkey = new PublicKey(walletAddress);
  
  console.log(`🔍 Analyzing wallet: ${walletAddress}\n`);

  // Execute all queries in parallel
  const [
    allTransactions,
    solTransactions,
    ...tokenResults
  ] = await Promise.all([
    getTransactions(connection, walletPubkey, 100),
    getSolanaTransactions(connection, walletPubkey, 100),
    ...tokenMints.map(mint => 
      getSplTokenTransactions(connection, walletPubkey, new PublicKey(mint), 100)
    )
  ]);

  // Display summary
  console.log('📊 WALLET ANALYSIS SUMMARY');
  console.log('==========================');
  console.log(`Total Transactions: ${allTransactions.length}`);
  console.log(`SOL Transactions: ${solTransactions.length}`);
  console.log(`Token Transactions: ${tokenResults.flat().length}`);
  console.log(`Unique Token Mints: ${tokenMints.length}\n`);

  // Display SOL transactions
  if (solTransactions.length > 0) {
    console.log('💎 SOL TRANSACTIONS:');
    console.log('====================');
    solTransactions.forEach((tx, index) => {
      const date = tx.tx.blockTime ? new Date(tx.tx.blockTime * 1000).toLocaleString() : 'Unknown';
      console.log(`${index + 1}. ${tx.tx.transaction.signatures[0]}`);
      console.log(`   Time: ${date}`);
      console.log(`   Type: ${tx.type.toUpperCase()}`);
      console.log(`   Change: ${tx.change > 0 ? '+' : ''}${(tx.change / 1e9).toFixed(9)} SOL`);
      console.log(`   Success: ${!tx.tx.meta?.err}\n`);
    });
  }

  // Display token transactions
  tokenResults.forEach((tokenTxs, mintIndex) => {
    if (tokenTxs.length > 0) {
      console.log(`🪙 TOKEN TRANSACTIONS (${tokenMints[mintIndex]}):`);
      console.log('==========================================');
      tokenTxs.forEach((tx, index) => {
        const date = tx.tx.blockTime ? new Date(tx.tx.blockTime * 1000).toLocaleString() : 'Unknown';
        console.log(`${index + 1}. ${tx.tx.transaction.signatures[0]}`);
        console.log(`   Time: ${date}`);
        console.log(`   Type: ${tx.type.toUpperCase()}`);
        console.log(`   Change: ${tx.change > 0 ? '+' : ''}${tx.change.toFixed(6)} tokens`);
        console.log(`   Success: ${!tx.tx.meta?.err}\n`);
      });
    }
  });
}

// Usage
const walletAddress = '6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc';
const tokenMints = [
  '7JbsbKusEG4XRtg6XipzvpT4j7pLQEHmwHkF5Rooj4A8',
  'So11111111111111111111111111111111111111112'
];

await completeWalletAnalysis(walletAddress, tokenMints);
```

### Export to JSON with Parallel Processing

```typescript
import * as fs from 'fs';

async function exportWalletData(walletAddress: string, tokenMints: string[], outputFile: string) {
  const connection = createConnection({ 
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com'
  });

  const walletPubkey = new PublicKey(walletAddress);
  
  console.log(`📊 Exporting data for wallet: ${walletAddress}`);

  // Execute all queries in parallel
  const [
    allTransactions,
    solTransactions,
    ...tokenResults
  ] = await Promise.all([
    getTransactions(connection, walletPubkey, 100),
    getSolanaTransactions(connection, walletPubkey, 100),
    ...tokenMints.map(mint => 
      getSplTokenTransactions(connection, walletPubkey, new PublicKey(mint), 100)
    )
  ]);

  // Prepare export data
  const exportData = {
    wallet: walletAddress,
    network: 'devnet',
    generatedAt: new Date().toISOString(),
    summary: {
      totalTransactions: allTransactions.length,
      solTransactions: solTransactions.length,
      tokenTransactions: tokenResults.flat().length,
      uniqueTokenMints: tokenMints.length
    },
    data: {
      allTransactions,
      solTransactions,
      tokenTransactions: tokenMints.reduce((acc, mint, index) => {
        acc[mint] = tokenResults[index];
        return acc;
      }, {} as Record<string, SplTokenTransaction[]>)
    }
  };

  // Write to file
  fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
  console.log(`✅ Data exported to: ${outputFile}`);
}

// Usage
const walletAddress = '6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc';
const tokenMints = [
  '7JbsbKusEG4XRtg6XipzvpT4j7pLQEHmwHkF5Rooj4A8',
  'So11111111111111111111111111111111111111112'
];

await exportWalletData(walletAddress, tokenMints, 'wallet-analysis.json');
```

## Troubleshooting

### Common Issues

#### 1. No Transactions Found
```typescript
// Check if address is valid
try {
  new PublicKey(address);
} catch (error) {
  console.error('Invalid public key:', error);
}

// Try different network
const connection = createConnection({ 
  network: 'mainnet', // Try mainnet if no devnet transactions
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  wsUrl: 'wss://api.mainnet-beta.solana.com'
});
```

#### 2. Rate Limiting
```typescript
// Add delays between parallel requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithDelay() {
  const results = await Promise.all([
    getSolanaTransactions(connection, walletAddress, 10),
    delay(100), // 100ms delay
    getSplTokenTransactions(connection, walletAddress, mintAddress, 10)
  ]);
}
```

#### 3. Transaction Not Found
```typescript
// Check if transaction exists
const tx = await getTransactionBySignature(connection, signature);

if (!tx) {
  console.log('Transaction not found or may be too old');
}
```

### Performance Tips

1. **Use parallel execution**: Always use `Promise.all()` for multiple queries
2. **Start with small limits**: Use limits of 10-20 for testing
3. **Filter by type**: Use specific functions (`getSolanaTransactions`, `getSplTokenTransactions`) instead of filtering all transactions
4. **Use appropriate network**: Ensure you're querying the correct network
5. **Handle errors gracefully**: Wrap parallel operations in try-catch blocks

### Example Complete Workflow

```typescript
import { 
  getTransactions,
  getSolanaTransactions,
  getSplTokenTransactions,
  createConnection
} from '@pump-fun/defikit';
import { PublicKey } from '@solana/web3.js';

async function analyzeWalletComprehensive(walletAddress: string, tokenMints: string[]) {
  try {
    console.log(`🔍 Comprehensive analysis for: ${walletAddress}`);
    
    const connection = createConnection({ 
      network: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      wsUrl: 'wss://api.devnet.solana.com'
    });

    const walletPubkey = new PublicKey(walletAddress);
    
    // Execute all queries in parallel for maximum efficiency
    const [
      allTransactions,
      solTransactions,
      ...tokenResults
    ] = await Promise.all([
      getTransactions(connection, walletPubkey, 50),
      getSolanaTransactions(connection, walletPubkey, 50),
      ...tokenMints.map(mint => 
        getSplTokenTransactions(connection, walletPubkey, new PublicKey(mint), 50)
      )
    ]);

    // Process results
    const tokenTransactions = tokenResults.flat();
    
    console.log(`\n📊 ANALYSIS RESULTS`);
    console.log(`==================`);
    console.log(`All Transactions: ${allTransactions.length}`);
    console.log(`SOL Transactions: ${solTransactions.length}`);
    console.log(`Token Transactions: ${tokenTransactions.length}`);
    console.log(`Unique Token Mints: ${tokenMints.length}`);

    // Display recent activity
    const recentSol = solTransactions.slice(0, 5);
    const recentTokens = tokenTransactions.slice(0, 5);

    if (recentSol.length > 0) {
      console.log(`\n💎 Recent SOL Activity:`);
      recentSol.forEach(tx => {
        const date = tx.tx.blockTime ? new Date(tx.tx.blockTime * 1000).toLocaleString() : 'Unknown';
        console.log(`  ${tx.type.toUpperCase()}: ${(tx.change / 1e9).toFixed(9)} SOL (${date})`);
      });
    }

    if (recentTokens.length > 0) {
      console.log(`\n🪙 Recent Token Activity:`);
      recentTokens.forEach(tx => {
        const date = tx.tx.blockTime ? new Date(tx.tx.blockTime * 1000).toLocaleString() : 'Unknown';
        console.log(`  ${tx.type.toUpperCase()}: ${tx.change.toFixed(6)} ${tx.mint.substring(0, 8)}... (${date})`);
      });
    }

  } catch (error) {
    console.error('Error in comprehensive analysis:', error);
  }
}

// Usage
const walletAddress = '6fmnkBBMCZMubMWFwTk9upCoL1iHJzt7xoq2YfxCETbc';
const tokenMints = [
  '7JbsbKusEG4XRtg6XipzvpT4j7pLQEHmwHkF5Rooj4A8',
  'So11111111111111111111111111111111111111112'
];

analyzeWalletComprehensive(walletAddress, tokenMints);
```

This updated guide now covers the new simplified API with proper parallel execution examples! 🚀