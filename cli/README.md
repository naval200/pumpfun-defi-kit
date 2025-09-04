# PumpFun CLI Commands

This directory contains command-line interface scripts for PumpFun token operations on Solana devnet.

## Directory Structure

```
cli/
├── amm/                    # Automated Market Maker operations
│   ├── buy-cli.ts         # Buy tokens via AMM
│   ├── create-pool-cli.ts # Create AMM pool
│   ├── create-pool-or-use-existing-cli.ts # Create or use existing pool
│   ├── info-cli.ts        # Get AMM pool information
│   └── liquidity-cli.ts   # Add/remove liquidity
├── bonding-curve/          # Bonding Curve operations
│   ├── buy-cli.ts         # Buy tokens via bonding curve
│   ├── create-token-cli.ts # Create new token
│   └── sell-cli.ts        # Sell tokens via bonding curve
├── send-token-cli.ts       # Send tokens between addresses
└── cli-args.ts            # Command-line argument utilities
```

## Quick Start

### 1. Create a Token
```bash
npm run cli:bond-create-token -- \
  --token-name "MyToken" \
  --token-symbol "MTK" \
  --token-description "My awesome token" \
  --wallet ./fixtures/my-wallet.json \
  --output-token ./fixtures/my-token.json
```

### 2. Buy Tokens via Bonding Curve
```bash
npm run cli:bond-buy -- \
  --amount 0.1 \
  --slippage 1000 \
  --input-token ./fixtures/my-token.json \
  --wallet ./fixtures/my-wallet.json
```

### 3. Buy Tokens via AMM
```bash
npm run cli:amm-buy -- \
  --amount 0.05 \
  --slippage 100 \
  --input-token ./fixtures/my-token.json \
  --wallet ./fixtures/my-wallet.json
```

### 4. Create AMM Pool
```bash
npm run cli:amm-create-pool -- \
  --input-token ./fixtures/my-token.json \
  --wallet ./fixtures/my-wallet.json \
  --output-token ./fixtures/my-token-with-pool.json
```

### 5. Send Tokens
```bash
# Send tokens to another address (creates recipient account if needed)
tsx cli/send-token-cli.ts <recipient_address> <mint_address> 1000

# Send tokens without creating recipient account
tsx cli/send-token-cli.ts <recipient_address> <mint_address> 1000 false
```

## Common Options

All CLI commands support these common options:

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--wallet` | `-w` | Path to wallet JSON file | `./fixtures/creator-wallet.json` |
| `--input-token` | `-i` | Path to input token JSON file | `./fixtures/token-info.json` |
| `--output-token` | `-o` | Path to save token info | `./fixtures/token-info.json` |
| `--help` | `-h` | Show help message | - |

## Command-Specific Options

### Bonding Curve Create Token (`cli:bond-create-token`)
| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--token-name` | `-n` | Token name | ✅ |
| `--token-symbol` | `-y` | Token symbol | ✅ |
| `--token-description` | `-d` | Token description | ❌ |
| `--image-path` | `-p` | Path to token image | ❌ |
| `--initial-buy` | `-b` | Initial buy amount in SOL | ❌ |

### Buy Operations (`cli:bond-buy`, `cli:amm-buy`)
| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--amount` | `-a` | Amount of SOL to spend | ✅ |
| `--slippage` | `-s` | Slippage tolerance in basis points | ❌ |

### AMM Operations
| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--pool-key` | `-k` | Specific pool key to use | ❌ |
| `--lp-amount` | `-l` | LP token amount for liquidity operations | ❌ |

### Send Token (`cli:send-token`)
| Argument | Description | Required |
|----------|-------------|----------|
| `--recipient` | Public key of the recipient | ✅ |
| `--mint` | Public key of the token mint | ✅ |
| `--amount` | Amount of tokens to send (in smallest unit) | ✅ |
| `--wallet` | Path to source wallet JSON file | ❌ (default: creator-wallet.json) |
| `--fee-payer` | Path to fee payer wallet JSON file | ❌ (optional) |
| `--create-account` | Whether to create recipient account if needed | ❌ (default: true) |

## Examples

### Create and Trade a Token
```bash
# 1. Create token
npm run cli:bond-create-token -- \
  --token-name "TestToken" \
  --token-symbol "TST" \
  --wallet ./fixtures/creator-wallet.json \
  --output-token ./fixtures/test-token.json

# 2. Buy tokens via bonding curve
npm run cli:bond-buy -- \
  --amount 0.1 \
  --input-token ./fixtures/test-token.json \
  --wallet ./fixtures/creator-wallet.json

# 3. Create AMM pool
npm run cli:amm-create-pool -- \
  --input-token ./fixtures/test-token.json \
  --wallet ./fixtures/creator-wallet.json \
  --output-token ./fixtures/test-token-with-pool.json

# 4. Buy tokens via AMM
npm run cli:amm-buy -- \
  --amount 0.05 \
  --input-token ./fixtures/test-token-with-pool.json \
  --wallet ./fixtures/creator-wallet.json
```

### Send Tokens Between Addresses
```bash
# Send 1000 tokens to an existing account
npm run cli:send-token -- --recipient 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --amount 1000

# Send with specific wallet and fee payer
npm run cli:send-token -- --recipient 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --amount 1000 --wallet wallets/trading-wallet.json --fee-payer wallets/treasury-wallet.json

# Send tokens without creating recipient account
npm run cli:send-token -- --recipient 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --amount 1000 --create-account false

# Send tokens with explicit account creation
npm run cli:send-token -- --recipient 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU --amount 1000 --create-account true
```

### Using Different Wallets and Token Files
```bash
# Use custom wallet
npm run cli:bond-buy -- \
  --amount 0.1 \
  --wallet ./fixtures/my-custom-wallet.json \
  --input-token ./fixtures/different-token.json

# Save to custom location
npm run cli:bond-create-token -- \
  --token-name "CustomToken" \
  --token-symbol "CST" \
  --output-token ./fixtures/custom-token.json
```

## File Formats

### Wallet JSON
```json
[123, 45, 67, ...]  // Array of numbers representing private key bytes
```

### Token Info JSON
```json
{
  "mint": "TokenMintAddress...",
  "name": "Token Name",
  "symbol": "SYMBOL",
  "description": "Token description",
  "bondingCurve": "BondingCurveAddress...",
  "poolKey": "AMMPoolAddress...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

All CLI commands include comprehensive error handling:
- Validates required arguments
- Checks wallet balance before operations
- Provides helpful error messages
- Suggests solutions for common issues

## Help and Support

Get help for any command:
```bash
npm run cli:bond-create-token -- --help
npm run cli:amm-buy -- --help
npm run cli:bond-buy -- --help
npm run cli:send-token -- --help
```

View all available commands:
```bash
npm run help
```

## Notes

- All operations target Solana devnet
- Default slippage is 1000 basis points (10%) for bonding curve, 100 basis points (1%) for AMM
- Wallet files should contain the private key as an array of numbers
- Token info files are automatically created and updated by the CLI commands
- The send-token CLI works with both bonding curve and AMM tokens since they are standard SPL tokens
