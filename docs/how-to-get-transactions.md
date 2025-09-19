# How to Get Transactions

This guide shows you how to fetch, analyze, and display Solana transactions using the PumpFun DeFi Kit transaction analysis APIs.

## Table of Contents

- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
- [Programmatic API Usage](#programmatic-api-usage)
- [Transaction Types](#transaction-types)
- [Chronological Listing](#chronological-listing)
- [Batch Transaction Analysis](#batch-transaction-analysis)
- [Advanced Examples](#advanced-examples)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Using CLI (Easiest)

```bash
# Get all transactions for a wallet
npm run cli:list-transactions -- \
  --address <your-wallet-address> \
  --limit 50 \
  --network devnet \
  --format table

# Get only batch transactions
npm run cli:list-transactions -- \
  --address <your-wallet-address> \
  --type batch \
  --batch-analysis \
  --format table
```

### Using Programmatic API

```typescript
import { getTransactions, getTransactionSummary } from '@pump-fun/defikit';

// Fetch transactions
const transactions = await getTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 50,
  includeBatchAnalysis: true
});

console.log(`Found ${transactions.length} transactions`);
```

## CLI Usage

### Basic Commands

```bash
# List all transactions
npm run cli:list-transactions -- --address <public-key> --limit 50

# List only SOL transactions
npm run cli:list-transactions -- --address <public-key> --type sol

# List only token transactions
npm run cli:list-transactions -- --address <public-key> --type token

# List only batch transactions
npm run cli:list-transactions -- --address <public-key> --type batch --batch-analysis

# Export to JSON file
npm run cli:list-transactions -- --address <public-key> --output transactions.json --format json

# Analyze specific transaction
npm run cli:analyze-batch -- --signature <tx-signature> --network devnet
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--address` | Wallet public key (required) | - |
| `--limit` | Number of transactions to fetch | 50 |
| `--network` | Network (devnet/mainnet) | devnet |
| `--type` | Transaction type (all/sol/token/batch) | all |
| `--format` | Output format (table/json) | table |
| `--batch-analysis` | Enable batch transaction analysis | false |
| `--mint` | Filter by specific token mint | - |
| `--output` | Save results to file | - |

## Programmatic API Usage

### Import the Functions

```typescript
import { 
  getTransactions,
  getSolTransactions,
  getTokenTransactions,
  getBatchTransactions,
  getTransactionBySignature,
  getTransactionSummary,
  TransactionData,
  GetTransactionsOptions
} from '@pump-fun/defikit';
```

### Basic Transaction Fetching

```typescript
// Get all transactions
const allTransactions = await getTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 50,
  includeBatchAnalysis: true
});

// Get only SOL transactions
const solTransactions = await getSolTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 20
});

// Get only token transactions
const tokenTransactions = await getTokenTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 20,
  mintFilter: 'So11111111111111111111111111111111111111112' // Filter by specific token
});

// Get only batch transactions
const batchTransactions = await getBatchTransactions('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh', {
  network: 'devnet',
  limit: 10
});
```

### Single Transaction Analysis

```typescript
// Get specific transaction by signature
const tx = await getTransactionBySignature('5J7X8...', {
  network: 'devnet',
  includeBatchAnalysis: true
});

if (tx) {
  console.log(`Transaction: ${tx.signature}`);
  console.log(`Success: ${tx.success}`);
  console.log(`Fee: ${tx.fee} lamports`);
  console.log(`Batch: ${tx.isBatchTransaction}`);
  console.log(`Instructions: ${tx.instructionCount}`);
  console.log(`Accounts: ${tx.accountCount}`);
}
```

## Transaction Types

### SOL Transfers
Transactions that only involve SOL transfers (no token transfers).

```typescript
const solTransactions = await getSolTransactions(address, {
  network: 'devnet',
  limit: 20
});

solTransactions.forEach(tx => {
  console.log(`SOL Transaction: ${tx.signature}`);
  tx.solTransfers.forEach(transfer => {
    console.log(`  Account ${transfer.accountIndex}: ${transfer.change > 0 ? '+' : ''}${transfer.change} SOL`);
  });
});
```

### SPL Token Transfers
Transactions that involve SPL token transfers.

```typescript
const tokenTransactions = await getTokenTransactions(address, {
  network: 'devnet',
  limit: 20
});

tokenTransactions.forEach(tx => {
  console.log(`Token Transaction: ${tx.signature}`);
  tx.tokenTransfers.forEach(transfer => {
    console.log(`  Token ${transfer.mint}: ${transfer.change > 0 ? '+' : ''}${transfer.change}`);
  });
});
```

### Batch Transactions
Transactions with multiple instructions (typically >5 instructions or >10 accounts).

```typescript
const batchTransactions = await getBatchTransactions(address, {
  network: 'devnet',
  limit: 10
});

batchTransactions.forEach(tx => {
  console.log(`Batch Transaction: ${tx.signature}`);
  console.log(`  Instructions: ${tx.instructionCount}`);
  console.log(`  Accounts: ${tx.accountCount}`);
  console.log(`  SOL Transfers: ${tx.solTransfers.length}`);
  console.log(`  Token Transfers: ${tx.tokenTransfers.length}`);
});
```

## Chronological Listing

### Sort Transactions by Time

```typescript
async function listTransactionsChronologically(address: string) {
  const transactions = await getTransactions(address, {
    network: 'devnet',
    limit: 100,
    includeBatchAnalysis: true
  });

  // Sort chronologically (oldest first)
  const chronologicalTransactions = transactions.sort((a, b) => {
    if (!a.blockTime || !b.blockTime) return 0;
    return a.blockTime - b.blockTime;
  });

  // Display in table format
  console.log('\n📊 TRANSACTION HISTORY (Chronological)');
  console.log('=====================================\n');

  chronologicalTransactions.forEach((tx, index) => {
    const date = tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown';
    
    console.log(`${index + 1}. ${tx.signature}`);
    console.log(`   📅 Time: ${date}`);
    console.log(`   💰 Fee: ${tx.fee} lamports`);
    console.log(`   ✅ Success: ${tx.success}`);
    console.log(`   🔄 Batch: ${tx.isBatchTransaction ? 'YES' : 'NO'}`);
    
    if (tx.isBatchTransaction) {
      console.log(`   📊 Instructions: ${tx.instructionCount}, Accounts: ${tx.accountCount}`);
    }

    // SOL Transfers
    if (tx.solTransfers.length > 0) {
      console.log(`   💎 SOL Transfers:`);
      tx.solTransfers.forEach(transfer => {
        console.log(`      Account ${transfer.accountIndex}: ${transfer.change > 0 ? '+' : ''}${transfer.change.toFixed(9)} SOL`);
      });
    }

    // Token Transfers
    if (tx.tokenTransfers.length > 0) {
      console.log(`   🪙 Token Transfers:`);
      tx.tokenTransfers.forEach(transfer => {
        console.log(`      ${transfer.mint}: ${transfer.change > 0 ? '+' : ''}${transfer.change.toFixed(6)} (${transfer.amount})`);
      });
    }

    console.log(`   🔗 Explorer: ${tx.explorerUrl}\n`);
  });
}
```

### Advanced Table Format

```typescript
function formatTransactionTable(transactions: TransactionData[]) {
  console.log('\n📊 TRANSACTION HISTORY');
  console.log('='.repeat(120));
  console.log('| #  | Signature (first 8) | Time                | Type      | SOL Changes | Token Changes | Success |');
  console.log('='.repeat(120));

  transactions.forEach((tx, index) => {
    const signature = tx.signature.substring(0, 8) + '...';
    const date = tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown';
    
    // Determine transaction type
    let type = 'Unknown';
    if (tx.solTransfers.length > 0 && tx.tokenTransfers.length === 0) {
      type = 'SOL Only';
    } else if (tx.tokenTransfers.length > 0 && tx.solTransfers.length === 0) {
      type = 'Token Only';
    } else if (tx.solTransfers.length > 0 && tx.tokenTransfers.length > 0) {
      type = 'Mixed';
    }

    const solChanges = tx.solTransfers.length;
    const tokenChanges = tx.tokenTransfers.length;
    const success = tx.success ? '✅' : '❌';

    console.log(`| ${(index + 1).toString().padStart(2)} | ${signature.padEnd(20)} | ${date.padEnd(19)} | ${type.padEnd(9)} | ${solChanges.toString().padStart(11)} | ${tokenChanges.toString().padStart(13)} | ${success.padEnd(7)} |`);
  });

  console.log('='.repeat(120));
}
```

## Batch Transaction Analysis

### Identify Batch Transactions

```typescript
async function analyzeBatchTransactions(address: string) {
  const transactions = await getTransactions(address, {
    network: 'devnet',
    limit: 50,
    includeBatchAnalysis: true
  });

  const batchTransactions = transactions.filter(tx => tx.isBatchTransaction);
  
  console.log(`Found ${batchTransactions.length} batch transactions out of ${transactions.length} total`);

  batchTransactions.forEach(tx => {
    console.log(`\n🔄 Batch Transaction: ${tx.signature}`);
    console.log(`   Instructions: ${tx.instructionCount}`);
    console.log(`   Accounts: ${tx.accountCount}`);
    console.log(`   SOL Operations: ${tx.solTransfers.length}`);
    console.log(`   Token Operations: ${tx.tokenTransfers.length}`);
    
    // Analyze participants
    const participants = new Set();
    tx.solTransfers.forEach(transfer => participants.add(`Account ${transfer.accountIndex}`));
    tx.tokenTransfers.forEach(transfer => participants.add(transfer.owner));
    
    console.log(`   Participants: ${participants.size}`);
  });
}
```

### Batch Transaction Classification

```typescript
function classifyBatchTransaction(tx: TransactionData): string {
  if (tx.solTransfers.length > 0 && tx.tokenTransfers.length === 0) {
    return 'SOL Batch Transfer';
  } else if (tx.tokenTransfers.length > 0 && tx.solTransfers.length === 0) {
    return 'Token Batch Transfer';
  } else if (tx.solTransfers.length > 0 && tx.tokenTransfers.length > 0) {
    return 'Mixed Batch Operation';
  } else {
    return 'Other Batch Operation';
  }
}
```

## Advanced Examples

### Export to JSON

```typescript
import * as fs from 'fs';

async function exportTransactionsToJSON(address: string) {
  const transactions = await getTransactions(address, {
    network: 'devnet',
    limit: 100,
    includeBatchAnalysis: true
  });

  const outputData = {
    address,
    network: 'devnet',
    totalTransactions: transactions.length,
    batchTransactions: transactions.filter(tx => tx.isBatchTransaction).length,
    transactions: transactions.sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0)),
    summary: getTransactionSummary(transactions),
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync('transactions.json', JSON.stringify(outputData, null, 2));
  console.log('✅ Transactions exported to transactions.json');
}
```

### Filter by Date Range

```typescript
function filterTransactionsByDateRange(
  transactions: TransactionData[], 
  startDate: Date, 
  endDate: Date
): TransactionData[] {
  return transactions.filter(tx => {
    if (!tx.blockTime) return false;
    const txDate = new Date(tx.blockTime * 1000);
    return txDate >= startDate && txDate <= endDate;
  });
}

// Usage
const transactions = await getTransactions(address, { limit: 100 });
const lastWeek = filterTransactionsByDateRange(
  transactions, 
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
  new Date()
);
```

### Transaction Statistics

```typescript
async function getTransactionStats(address: string) {
  const transactions = await getTransactions(address, {
    network: 'devnet',
    limit: 100,
    includeBatchAnalysis: true
  });

  const summary = getTransactionSummary(transactions);
  
  console.log('📈 TRANSACTION STATISTICS');
  console.log('========================');
  console.log(`Total Transactions: ${summary.totalTransactions}`);
  console.log(`Successful: ${summary.successfulTransactions}`);
  console.log(`Failed: ${summary.failedTransactions}`);
  console.log(`Success Rate: ${summary.successRate.toFixed(2)}%`);
  console.log(`Total Fees: ${summary.totalFeesInSol.toFixed(9)} SOL`);
  console.log(`SOL Transfers: ${summary.totalSolTransfers}`);
  console.log(`Token Transfers: ${summary.totalTokenTransfers}`);
  console.log(`Batch Transactions: ${summary.batchTransactions}`);
  console.log(`Unique Tokens: ${summary.uniqueTokens}`);
}
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

// Check network
const transactions = await getTransactions(address, {
  network: 'devnet', // Try 'mainnet' if no devnet transactions
  limit: 10
});
```

#### 2. Rate Limiting
```typescript
// Add delays between requests
const transactions = await getTransactions(address, {
  network: 'devnet',
  limit: 10 // Start with smaller limit
});
```

#### 3. Transaction Not Found
```typescript
// Check if transaction exists
const tx = await getTransactionBySignature(signature, {
  network: 'devnet'
});

if (!tx) {
  console.log('Transaction not found or may be too old');
}
```

### Performance Tips

1. **Use appropriate limits**: Start with small limits (10-20) for testing
2. **Filter by type**: Use `getSolTransactions` or `getTokenTransactions` for specific needs
3. **Enable batch analysis only when needed**: `includeBatchAnalysis: true` adds processing overhead
4. **Use network-appropriate endpoints**: Ensure you're querying the correct network

### Example Complete Workflow

```typescript
import { getTransactions, getTransactionSummary } from '@pump-fun/defikit';

async function completeTransactionAnalysis(address: string) {
  try {
    console.log(`🔍 Analyzing transactions for: ${address}`);
    
    // Fetch all transactions
    const transactions = await getTransactions(address, {
      network: 'devnet',
      limit: 50,
      includeBatchAnalysis: true
    });

    if (transactions.length === 0) {
      console.log('No transactions found for this address');
      return;
    }

    // Sort chronologically
    const sortedTransactions = transactions.sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0));

    // Display summary
    const summary = getTransactionSummary(transactions);
    console.log(`\n📊 Found ${summary.totalTransactions} transactions`);
    console.log(`Success Rate: ${summary.successRate.toFixed(2)}%`);
    console.log(`Batch Transactions: ${summary.batchTransactions}`);

    // Display each transaction
    sortedTransactions.forEach((tx, index) => {
      const date = tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown';
      console.log(`\n${index + 1}. ${tx.signature}`);
      console.log(`   Time: ${date}`);
      console.log(`   Success: ${tx.success}`);
      console.log(`   Batch: ${tx.isBatchTransaction ? 'YES' : 'NO'}`);
      console.log(`   SOL Transfers: ${tx.solTransfers.length}`);
      console.log(`   Token Transfers: ${tx.tokenTransfers.length}`);
    });

  } catch (error) {
    console.error('Error analyzing transactions:', error);
  }
}

// Usage
completeTransactionAnalysis('FgP6nvgumNYkoVFuqXZBe2Xc5Tj69ef5YnQKSzyKaarh');
```

This guide provides everything you need to effectively fetch, analyze, and display Solana transactions using the PumpFun DeFi Kit! 🚀
