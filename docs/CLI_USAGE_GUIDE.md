# CLI Usage Guide

This guide explains how to use the PumpFun DeFi Kit CLI commands in different environments.

## Table of Contents

- [Local Development Usage](#local-development-usage)
- [Parent Repository Usage](#parent-repository-usage)
- [Available Commands](#available-commands)
- [Command Examples](#command-examples)
- [Troubleshooting](#troubleshooting)

## Local Development Usage

When working with the source code directly:

### Using npm scripts (Recommended)
```bash
# Bonding Curve Operations
npm run cli:bond-create-token -- --help
npm run cli:bond-buy -- --amount 0.1 --input-token ./token-info.json
npm run cli:bond-sell -- --amount 1000 --input-token ./token-info.json

# AMM Operations
npm run cli:amm-buy -- --amount 0.1 --input-token ./token-info.json
npm run cli:amm-sell -- --amount 1000 --input-token ./token-info.json
npm run cli:amm-create-pool -- --base-amount 1000000 --quote-amount 0.1

# Utilities
npm run cli:check-balances -- --wallet ./wallet.json --input-token ./token-info.json
npm run cli:send-sol -- --from-wallet ./wallet.json --to-address <address> --amount 0.1
npm run cli:send-token -- --recipient <address> --mint <mint> --amount 1000
```

### Using tsx directly
```bash
npx tsx cli/bonding-curve/create-token-cli.ts --help
npx tsx cli/amm/sell-cli.ts --help
npx tsx cli/check-wallet-balances.ts --help
```

## Parent Repository Usage

When the package is installed as a dependency in another project:

### Method 1: Global CLI Commands (Recommended)

After installing the package, the CLI commands are available globally:

```bash
# Main CLI with help
pumpfun-cli --help

# Bonding Curve Operations
pumpfun-cli bond-create-token --help
pumpfun-cli bond-buy --amount 0.1 --input-token ./token-info.json
pumpfun-cli bond-sell --amount 1000 --input-token ./token-info.json

# AMM Operations
pumpfun-cli amm-buy --amount 0.1 --input-token ./token-info.json
pumpfun-cli amm-sell --amount 1000 --input-token ./token-info.json
pumpfun-cli amm-create-pool --base-amount 1000000 --quote-amount 0.1

# Utilities
pumpfun-cli check-balances --wallet ./wallet.json --input-token ./token-info.json
pumpfun-cli send-sol --from-wallet ./wallet.json --to-address <address> --amount 0.1
pumpfun-cli send-token --recipient <address> --mint <mint> --amount 1000
```

### Method 2: Using npx (Recommended)

```bash
# Use the main CLI via npx
npx pumpfun-cli bond-create-token --help
npx pumpfun-cli bond-buy --amount 0.1 --input-token ./token-info.json
npx pumpfun-cli bond-sell --amount 1000 --input-token ./token-info.json

npx pumpfun-cli amm-buy --amount 0.1 --input-token ./token-info.json
npx pumpfun-cli amm-sell --amount 1000 --input-token ./token-info.json
npx pumpfun-cli amm-create-pool --base-amount 1000000 --quote-amount 0.1

npx pumpfun-cli check-balances --wallet ./wallet.json --input-token ./token-info.json
npx pumpfun-cli send-sol --from-wallet ./wallet.json --to-address <address> --amount 0.1
npx pumpfun-cli send-token --recipient <address> --mint <mint> --amount 1000
npx pumpfun-cli create-ata --wallet ./wallet.json --mint <mint> --owner <owner>
npx pumpfun-cli batch --operations ./batch-operations.json
```

### Method 3: Custom npm Scripts

Add to your parent project's `package.json`:

```json
{
  "scripts": {
    "create-token": "pumpfun-cli bond-create-token",
    "buy-tokens": "pumpfun-cli bond-buy",
    "sell-tokens": "pumpfun-cli bond-sell",
    "check-balances": "pumpfun-cli check-balances",
    "send-sol": "pumpfun-cli send-sol",
    "send-token": "pumpfun-cli send-token",
    "amm-buy": "pumpfun-cli amm-buy",
    "amm-sell": "pumpfun-cli amm-sell",
    "amm-create-pool": "pumpfun-cli amm-create-pool"
  }
}
```

Then run:
```bash
npm run create-token -- --help
npm run buy-tokens -- --amount 0.1 --input-token ./token-info.json
npm run check-balances -- --wallet ./wallet.json
```

## Available Commands

### Global CLI (when installed as npm module)

These commands are available globally when the package is installed:

#### Main CLI
- `pumpfun-cli` - Main command dispatcher with help system

#### Use subcommands with the main CLI
- `pumpfun-cli bond-create-token` - Create new PumpFun tokens
- `pumpfun-cli bond-buy` - Buy tokens from bonding curve
- `pumpfun-cli bond-sell` - Sell tokens back to bonding curve
- `pumpfun-cli amm-buy` - Buy tokens from AMM pool
- `pumpfun-cli amm-sell` - Sell tokens to AMM pool
- `pumpfun-cli amm-create-pool` - Create new AMM liquidity pool
- `pumpfun-cli amm-info` - Get AMM pool information
- `pumpfun-cli amm-liquidity` - Add/remove liquidity from pool
- `pumpfun-cli send-sol` - Send SOL between wallets
- `pumpfun-cli send-token` - Send tokens between wallets
- `pumpfun-cli check-balances` - Check wallet balances
- `pumpfun-cli create-ata` - Create Associated Token Account
- `pumpfun-cli batch` - Execute batch transactions

### Local Development Commands

When working with the source code directly:

#### Bonding Curve Operations
- `bond-create-token` - Create new PumpFun tokens
- `bond-buy` - Buy tokens from bonding curve
- `bond-sell` - Sell tokens back to bonding curve
- `bond-check-accounts` - Check bonding curve accounts
- `bond-create-account` - Create bonding curve account

#### AMM Operations
- `amm-buy` - Buy tokens from AMM pool
- `amm-sell` - Sell tokens to AMM pool
- `amm-create-pool` - Create new AMM liquidity pool
- `amm-info` - Get AMM pool information
- `amm-liquidity` - Add/remove liquidity from pool

#### Utilities
- `send-sol` - Send SOL between wallets
- `send-token` - Send tokens between wallets
- `check-balances` - Check wallet balances
- `create-ata` - Create Associated Token Account

#### Batch Operations
- `batch` - Execute batch transactions

## Command Examples

### Create a Token
```bash
# Local development
npm run cli:bond-create-token -- \
  --wallet ./fixtures/creator-wallet.json \
  --token-name "My Token" \
  --token-symbol "MTK" \
  --token-description "A test token" \
  --initial-buy 0.001

# From parent repository - Method 1: Main CLI
pumpfun-cli bond-create-token \
  --wallet ./fixtures/creator-wallet.json \
  --token-name "My Token" \
  --token-symbol "MTK" \
  --token-description "A test token" \
  --initial-buy 0.001

# From parent repository - Method 2: Using npx with main CLI (Recommended)
npx pumpfun-cli bond-create-token \
  --wallet ./fixtures/creator-wallet.json \
  --token-name "My Token" \
  --token-symbol "MTK" \
  --token-description "A test token" \
  --initial-buy 0.001
```

### Buy Tokens
```bash
# Local development
npm run cli:bond-buy -- \
  --amount 0.1 \
  --input-token ./token-info.json \
  --wallet ./user-wallet.json

# From parent repository - Method 1: Main CLI
pumpfun-cli bond-buy \
  --amount 0.1 \
  --input-token ./token-info.json \
  --wallet ./user-wallet.json

# From parent repository - Method 2: Using npx with main CLI (Recommended)
npx pumpfun-cli bond-buy \
  --amount 0.1 \
  --input-token ./token-info.json \
  --wallet ./user-wallet.json
```

### Check Balances
```bash
# Local development
npm run cli:check-balances -- \
  --wallet ./user-wallet.json \
  --input-token ./token-info.json

# From parent repository - Method 1: Main CLI
pumpfun-cli check-balances \
  --wallet ./user-wallet.json \
  --input-token ./token-info.json

# From parent repository - Method 2: Using npx with main CLI (Recommended)
npx pumpfun-cli check-balances \
  --wallet ./user-wallet.json \
  --input-token ./token-info.json
```

### Create AMM Pool
```bash
# Local development
npm run cli:amm-create-pool -- \
  --wallet ./creator-wallet.json \
  --base-amount 1000000 \
  --quote-amount 0.1

# From parent repository - Method 1: Main CLI
pumpfun-cli amm-create-pool \
  --wallet ./creator-wallet.json \
  --base-amount 1000000 \
  --quote-amount 0.1

# From parent repository - Method 2: Using npx with main CLI (Recommended)
npx pumpfun-cli amm-create-pool \
  --wallet ./creator-wallet.json \
  --base-amount 1000000 \
  --quote-amount 0.1
```

## Troubleshooting

### Common Issues

#### 1. Command Not Found
```bash
# Error: pumpfun-cli: command not found
# Solution: Make sure the package is installed globally or use npx
npx pumpfun-cli --help
```

#### 2. TypeScript Compilation Errors
```bash
# Error: Cannot find module './sell-cli.ts'
# Solution: Use the correct path - don't run from node_modules
# Wrong: npx ts-node node_modules/@pump-fun/defikit/cli/amm/sell-cli.ts
# Right: pumpfun-cli amm-sell --help
```

#### 3. Permission Issues
```bash
# Error: Permission denied
# Solution: Make sure the CLI files are executable
chmod +x cli/index.js
```

#### 4. Missing Dependencies
```bash
# Error: tsx not found
# Solution: Install tsx globally or use npx
npm install -g tsx
# or
npx tsx cli/check-wallet-balances.ts --help
```

### Getting Help

For any command, use the `--help` flag:
```bash
pumpfun-cli --help
pumpfun-cli bond-create-token --help
pumpfun-cli amm-sell --help
```

### Debug Mode

For detailed logging, set the `DEBUG` environment variable:
```bash
DEBUG=true pumpfun-cli bond-create-token --help
```

## Best Practices

1. **Always use `--help`** to see available options for any command
2. **Test on devnet first** before using mainnet
3. **Use absolute paths** for wallet and token files
4. **Check balances** before executing transactions
5. **Use fee payers** for batch operations to reduce costs
6. **Keep wallet files secure** and never commit them to version control
