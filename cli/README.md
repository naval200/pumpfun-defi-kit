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
npm run cli:bc-create-token -- \
  --token-name "MyToken" \
  --token-symbol "MTK" \
  --token-description "My awesome token" \
  --wallet ./wallets/my-wallet.json \
  --output-token ./wallets/my-token.json
```

### 2. Buy Tokens via Bonding Curve
```bash
npm run cli:bc-buy -- \
  --amount 0.1 \
  --slippage 1000 \
  --input-token ./wallets/my-token.json \
  --wallet ./wallets/my-wallet.json
```

### 3. Buy Tokens via AMM
```bash
npm run cli:amm-buy -- \
  --amount 0.05 \
  --slippage 100 \
  --input-token ./wallets/my-token.json \
  --wallet ./wallets/my-wallet.json
```

### 4. Create AMM Pool
```bash
npm run cli:amm-create-pool -- \
  --input-token ./wallets/my-token.json \
  --wallet ./wallets/my-wallet.json \
  --output-token ./wallets/my-token-with-pool.json
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
| `--wallet` | `-w` | Path to wallet JSON file | `./wallets/creator-wallet.json` |
| `--input-token` | `-i` | Path to input token JSON file | `./wallets/token-info.json` |
| `--output-token` | `-o` | Path to save token info | `./wallets/token-info.json` |
| `--help` | `-h` | Show help message | - |

## Command-Specific Options

### Bonding Curve Create Token (`cli:bc-create-token`)
| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--token-name` | `-n` | Token name | ✅ |
| `--token-symbol` | `-y` | Token symbol | ✅ |
| `--token-description` | `-d` | Token description | ❌ |
| `--image-path` | `-p` | Path to token image | ❌ |
| `--initial-buy` | `-b` | Initial buy amount in SOL | ❌ |

### Buy Operations (`cli:bc-buy`, `cli:amm-buy`)
| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--amount` | `-a` | Amount of SOL to spend | ✅ |
| `--slippage` | `-s` | Slippage tolerance in basis points | ❌ |

### AMM Operations
| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--pool-key` | `-k` | Specific pool key to use | ❌ |
| `--lp-amount` | `-l` | LP token amount for liquidity operations | ❌ |

### Send Token (`send-token-cli.ts`)
| Argument | Description | Required |
|----------|-------------|----------|
| `recipient_address` | Public key of the recipient | ✅ |
| `mint_address` | Public key of the token mint | ✅ |
| `amount` | Amount of tokens to send (in smallest unit) | ✅ |
| `create_account` | Whether to create recipient account if needed | ❌ (default: true) |

## Examples

### Create and Trade a Token
```bash
# 1. Create token
npm run cli:bc-create-token -- \
  --token-name "TestToken" \
  --token-symbol "TST" \
  --wallet ./wallets/creator-wallet.json \
  --output-token ./wallets/test-token.json

# 2. Buy tokens via bonding curve
npm run cli:bc-buy -- \
  --amount 0.1 \
  --input-token ./wallets/test-token.json \
  --wallet ./wallets/creator-wallet.json

# 3. Create AMM pool
npm run cli:amm-create-pool -- \
  --input-token ./wallets/test-token.json \
  --wallet ./wallets/creator-wallet.json \
  --output-token ./wallets/test-token-with-pool.json

# 4. Buy tokens via AMM
npm run cli:amm-buy -- \
  --amount 0.05 \
  --input-token ./wallets/test-token-with-pool.json \
  --wallet ./wallets/creator-wallet.json
```

### Send Tokens Between Addresses
```bash
# Send 1000 tokens to an existing account
tsx cli/send-token-cli.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000

# Send tokens without creating recipient account
tsx cli/send-token-cli.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000 false

# Send tokens with explicit account creation
tsx cli/send-token-cli.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000 true
```

### Using Different Wallets and Token Files
```bash
# Use custom wallet
npm run cli:bc-buy -- \
  --amount 0.1 \
  --wallet ./wallets/my-custom-wallet.json \
  --input-token ./wallets/different-token.json

# Save to custom location
npm run cli:bc-create-token -- \
  --token-name "CustomToken" \
  --token-symbol "CST" \
  --output-token ./wallets/custom-token.json
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
npm run cli:bc-create-token -- --help
npm run cli:amm-buy -- --help
npm run cli:bc-buy -- --help
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
