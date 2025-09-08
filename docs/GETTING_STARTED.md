# Getting Started with PumpFun DeFi Kit

## Overview

This guide will walk you through setting up and using the PumpFun DeFi Kit to create tokens, manage liquidity pools, and execute trades on the Solana blockchain. Whether you're a developer building DeFi applications or an LLM implementing features, this guide provides everything you need to get started.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm or yarn** - Package manager
- **Solana CLI tools** - [Installation guide](https://docs.solana.com/cli/install-solana-cli-tools)
- **Git** - Version control system

## Installation

### Option 1: Install from GitHub (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/naval200/pumpfun-defi-kit.git
cd pumpfun-defi-kit

# Install dependencies
npm install

# Build the project
npm run build
```

### Option 2: Install as a Dependency

```bash
# Install from GitHub (will be built automatically)
npm install github:naval200/pumpfun-defi-kit#dist
```

### Option 3: Using CLI Commands from Parent Repository

When installed as an npm module in a parent project, you can use the CLI commands in several ways:

#### Method 1: Using npx with Main CLI (Recommended)
```bash
npx pumpfun-cli bond-create-token --help
npx pumpfun-cli bond-buy --amount 0.1 --input-token ./token-info.json
npx pumpfun-cli bond-sell --amount 1000 --input-token ./token-info.json
npx pumpfun-cli amm-buy --amount 0.1 --input-token ./token-info.json
npx pumpfun-cli amm-sell --amount 1000 --input-token ./token-info.json
npx pumpfun-cli check-balances --wallet ./wallet.json --input-token ./token-info.json
npx pumpfun-cli send-sol --from-wallet ./wallet.json --to-address <address> --amount 0.1
npx pumpfun-cli send-token --recipient <address> --mint <mint> --amount 1000
npx pumpfun-cli create-ata --wallet ./wallet.json --mint <mint> --owner <owner>
npx pumpfun-cli batch --operations ./batch-operations.json
```

#### Method 2: Installed Global CLI Dispatcher
```bash
# Use the main CLI dispatcher
pumpfun-cli --help
pumpfun-cli bond-create-token --help
pumpfun-cli amm-sell --help
pumpfun-cli check-balances --help
```

#### Method 3: Using npm scripts in parent package.json
```json
{
  "scripts": {
    "create-token": "pumpfun-cli bond-create-token",
    "buy-tokens": "pumpfun-cli bond-buy",
    "sell-tokens": "pumpfun-cli bond-sell",
    "check-balances": "pumpfun-cli check-balances",
    "amm-buy": "pumpfun-cli amm-buy",
    "amm-sell": "pumpfun-cli amm-sell",
    "send-sol": "pumpfun-cli send-sol",
    "send-token": "pumpfun-cli send-token"
  }
}
```

Then run:
```bash
npm run create-token -- --help
npm run buy-tokens -- --amount 0.1 --input-token ./token-info.json
npm run check-balances -- --wallet ./wallet.json
```

## Environment Setup

### 1. Solana Network Configuration

The library supports both devnet (for testing) and mainnet-beta (for production):

```bash
# Set to devnet for testing
solana config set --url devnet

# Or set to mainnet-beta for production
solana config set --url mainnet-beta
```

### 2. Environment Variables

Create a `.env` file in your project root:

```bash
# Enable debug logging
DEBUG_PUMPFUN_DEFI_SDK=true

# Custom RPC endpoint (optional)
SOLANA_RPC_URL=https://api.devnet.solana.com

# Custom commitment level (optional)
SOLANA_COMMITMENT=confirmed
```

### 3. Wallet Setup

You'll need at least one wallet for testing:

```bash
# Generate a new wallet
solana-keygen new --outfile ~/.config/solana/test-wallet.json

# Get the public key
solana-keygen pubkey ~/.config/solana/test-wallet.json

# Fund the wallet with devnet SOL
solana airdrop 2 <your-public-key> --url devnet
```

## Quick Start Examples

### 1. Basic Token Transfer

```typescript
import { sendToken } from 'pumpfun-defi-kit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

async function transferTokens() {
  // Create connection
  const connection = new Connection('https://api.devnet.solana.com');
  
  // Load your wallet
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('~/.config/solana/test-wallet.json', 'utf8')))
  );
  
  // Transfer tokens
  const result = await sendToken(
    connection,
    wallet,
    new PublicKey('recipient-public-key'),
    new PublicKey('token-mint-address'),
    BigInt(1000000), // 1 token with 6 decimals
    true,  // createRecipientAccount
    undefined // no fee payer
  );
  
  if (result.success) {
    console.log(`Transfer successful: ${result.signature}`);
  } else {
    console.error(`Transfer failed: ${result.error}`);
  }
}

transferTokens().catch(console.error);
```

### 2. Bonding Curve Trading

```typescript
import { buyPumpFunToken, sellPumpFunToken } from 'pumpfun-defi-kit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

async function bondingCurveTrading() {
  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = Keypair.fromSecretKey(/* your wallet */);
  const tokenMint = new PublicKey('your-token-mint-address');
  
  try {
    // Buy tokens on bonding curve
    const buySignature = await buyPumpFunToken(
      connection,
      wallet,
      tokenMint,
      0.1, // 0.1 SOL
      1000  // 10% slippage tolerance
    );
    console.log(`Bought tokens: ${buySignature}`);
    
    // Sell tokens back to bonding curve
    const sellResult = await sellPumpFunToken(
      connection,
      wallet,
      tokenMint,
      1000 // 1000 tokens
    );
    
    if (sellResult.success) {
      console.log(`Sold tokens: ${sellResult.signature}`);
    }
  } catch (error) {
    console.error('Trading failed:', error);
  }
}
```

### 3. AMM Trading

```typescript
import { buyAmmTokens, sellAmmTokens } from 'pumpfun-defi-kit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

async function ammTrading() {
  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = Keypair.fromSecretKey(/* your wallet */);
  const poolKey = new PublicKey('amm-pool-address');
  
  try {
    // Buy tokens from AMM
    const buyResult = await buyAmmTokens(
      connection,
      wallet,
      poolKey,
      0.05, // 0.05 SOL
      2,     // 2% slippage
      undefined // no fee payer
    );
    
    if (buyResult.success) {
      console.log(`Bought ${buyResult.baseAmount} tokens`);
    }
    
    // Sell tokens to AMM
    const sellResult = await sellAmmTokens(
      connection,
      wallet,
      poolKey,
      500,  // 500 tokens
      1,    // 1% slippage
      undefined // no fee payer
    );
    
    if (sellResult.success) {
      console.log(`Received ${sellResult.quoteAmount} SOL`);
    }
  } catch (error) {
    console.error('AMM trading failed:', error);
  }
}
```

### 4. Batch Operations

```typescript
import { batchTransactions } from 'pumpfun-defi-kit';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

async function batchOperations() {
  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = Keypair.fromSecretKey(/* your wallet */);
  const feePayer = Keypair.fromSecretKey(/* fee payer wallet */);
  
  const operations = [
    // Explicitly create ATA for recipient before transfer
    {
      type: 'create-account',
      id: 'create-ata-user-a',
      description: 'Create recipient ATA',
      params: {
        mint: 'TokenMintAddress',
        owner: 'UserAPublicKey'
      }
    },
    {
      type: 'transfer',
      id: 'transfer-1',
      description: 'Send tokens to user A',
      params: {
        recipient: 'UserAPublicKey',
        mint: 'TokenMintAddress',
        amount: '1000000'
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
}
```

## CLI Usage

The library provides comprehensive CLI tools for all operations:

### Local Development CLI

When working with the source code directly:

```bash
# Token Transfer
npm run cli:send-token -- \
  --recipient <recipient-address> \
  --mint <token-mint-address> \
  --amount 1000 \
  --wallet ./fixtures/wallet.json

# Bonding Curve Operations
npm run cli:bond-buy -- \
  --amount 0.1 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/wallet.json

# AMM Operations
npm run cli:amm:buy -- \
  --amount 0.1 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/wallet.json

# Batch Operations
npm run cli:batch-transactions -- \
  --operations ./fixtures/batch-operations.json \
  --fee-payer ./fixtures/treasury-wallet.json \
  --max-parallel 5
```

### Parent Repository CLI (Recommended)

When installed as an npm module, use the global bin commands:

```bash
# Token Transfer
npx pumpfun-send-token \
  --recipient <recipient-address> \
  --mint <token-mint-address> \
  --amount 1000 \
  --wallet ./fixtures/wallet.json

# Bonding Curve Operations
npx pumpfun-bond-buy \
  --amount 0.1 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/wallet.json

npx pumpfun-bond-sell \
  --amount 1000 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/wallet.json

# AMM Operations
npx pumpfun-amm-buy \
  --amount 0.1 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/wallet.json

npx pumpfun-amm-sell \
  --amount 1000 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/wallet.json

# Utilities
npx pumpfun-check-balances \
  --wallet ./fixtures/wallet.json \
  --input-token ./fixtures/token-info.json

npx pumpfun-send-sol \
  --from-wallet ./fixtures/wallet.json \
  --to-address <recipient-address> \
  --amount 0.1

# Batch Operations
npx pumpfun-batch \
  --operations ./fixtures/batch-operations.json \
  --fee-payer ./fixtures/treasury-wallet.json \
  --max-parallel 5
```

### Main CLI Dispatcher

Use the main CLI for a unified interface:

```bash
# Show all available commands
pumpfun-cli --help

# Use specific commands
pumpfun-cli bond-buy --amount 0.1 --input-token ./token-info.json --wallet ./wallet.json
pumpfun-cli amm-sell --amount 1000 --input-token ./token-info.json --wallet ./wallet.json
pumpfun-cli check-balances --wallet ./wallet.json --input-token ./token-info.json
```

## Testing and Debugging

### 1. Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:amm
npm run test:bonding-curve
npm run test:batch
```

### 2. Debug Scripts

The library includes comprehensive debug scripts for testing:

```bash
cd debug

# Make scripts executable
chmod +x *.sh

# Run complete test suite
./00-run-complete-test.sh

# Setup user wallets
./01-setup-user-wallets.sh

# Test batch operations
./02-test-batch-send-and-sell.sh
```

### 3. Enable Debug Logging

```bash
# Set environment variable
export DEBUG_PUMPFUN_DEFI_SDK=true

# Or run with debug flag
DEBUG_PUMPFUN_DEFI_SDK=true npm run cli:bond-buy -- --amount 0.1
```

## Common Patterns and Best Practices

### 1. Error Handling

Always implement proper error handling:

```typescript
try {
  const result = await someOperation(params);
  if (result.success) {
    // Handle success
    console.log('Operation successful:', result.signature);
  } else {
    // Handle failure
    console.error('Operation failed:', result.error);
  }
} catch (error) {
  // Handle exceptions
  console.error('Unexpected error:', error);
}
```

### 2. Fee Payer Usage

Use separate fee payer wallets for batch operations:

```typescript
// Treasury wallet pays fees for multiple operations
const results = await batchTransactions(
  connection,
  userWallet,
  operations,
  treasuryWallet // Treasury pays all fees
);
```

### 3. Slippage Protection

Set appropriate slippage tolerance:

```typescript
// Conservative slippage for volatile tokens
const result = await buyAmmTokens(connection, wallet, poolKey, 0.1, 0.5);

// Higher slippage for stable tokens
const result = await buyAmmTokens(connection, wallet, poolKey, 0.1, 2);
```

### 4. Transaction Confirmation

Wait for transaction confirmation:

```typescript
const signature = await buyPumpFunToken(connection, wallet, mint, 0.1);

// Wait for confirmation
const confirmation = await connection.confirmTransaction(signature, 'confirmed');
if (confirmation.value.err) {
  console.error('Transaction failed:', confirmation.value.err);
} else {
  console.log('Transaction confirmed');
}
```

## Troubleshooting

### Common Issues

1. **Insufficient SOL Balance**
   - Ensure wallet has enough SOL for fees
   - Use fee payer wallet for batch operations

2. **Token Account Not Found**
   - Set `createRecipientAccount: true` in transfer operations
   - Check if token mint address is correct

3. **Network Connection Issues**
   - Verify RPC endpoint is accessible
   - Check network configuration (devnet vs mainnet)

4. **Transaction Failures**
   - Check slippage tolerance settings
   - Verify wallet has sufficient token balance
   - Check transaction logs for specific errors

### Getting Help

- **Documentation**: Check the [API Reference](./API_REFERENCE.md) and [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/naval200/pumpfun-defi-kit/issues)
- **Discussions**: Ask questions on [GitHub Discussions](https://github.com/naval200/pumpfun-defi-kit/discussions)

## Next Steps

Now that you're set up, explore these areas:

1. **Read the API Reference** - Understand all available functions
2. **Study the Architecture** - Learn how components interact
3. **Experiment with CLI** - Test different operations
4. **Build Your Application** - Integrate the library into your project
5. **Contribute** - Help improve the library

## Support

For additional support:

- 📧 **Email**: navalsaini81@gmail.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/naval200/pumpfun-defi-kit/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/naval200/pumpfun-defi-kit/discussions)
- 📚 **Documentation**: [Full Documentation](./README.md)

Happy building with PumpFun DeFi Kit! 🚀
