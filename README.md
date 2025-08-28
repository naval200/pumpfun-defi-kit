# @pumpfun/defi-kit

A comprehensive DeFi toolkit for PumpFun tokens with bonding curve and AMM support. This library provides a clean, type-safe interface for creating tokens, managing liquidity pools, and executing trades on the Solana blockchain.

## Features

- 🚀 **Token Creation**: Create new PumpFun tokens with custom metadata
- 📈 **Bonding Curve Trading**: Execute trades using mathematical bonding curves
- 🏊 **AMM Support**: Automated Market Maker functionality for liquidity pools
- 💰 **Liquidity Management**: Add/remove liquidity from trading pools
- 🔐 **Wallet Integration**: Seamless integration with Solana wallets
- 📱 **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- 🧪 **Devnet Ready**: Test on Solana devnet before mainnet deployment
- 📤 **Token Transfer**: Send tokens between wallets with automatic account creation

## Installation

### From NPM Registry

```bash
npm install @pumpfun/defi-kit
```

### From GitHub Repository

```bash
npm install github:naval200/pumpfun-defi-kit
```

**Note**: When installing from GitHub, the package will be built automatically. If you encounter any issues, you can build manually:

```bash
npm install
npm run build
```

## Quick Start

### Creating a Token

```typescript
import { createToken } from '@pumpfun/defi-kit';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.generate();

const tokenData = {
  name: 'My Token',
  symbol: 'MTK',
  description: 'A sample token',
  image: 'https://example.com/image.png',
};

const result = await createToken({
  connection,
  wallet,
  tokenData,
  network: 'devnet',
});

console.log('Token created:', result.tokenMint);
```

### Buying Tokens (Bonding Curve)

```typescript
import { buyToken } from '@pumpfun/defi-kit';

const buyResult = await buyToken({
  connection,
  wallet,
  tokenMint: result.tokenMint,
  amount: 1000000, // 1 SOL in lamports
  network: 'devnet',
});

console.log('Tokens purchased:', buyResult.tokensReceived);
```

### AMM Trading

```typescript
import { createPool, buyFromPool } from '@pumpfun/defi-kit';

// Create a liquidity pool
const pool = await createPool({
  connection,
  wallet,
  tokenMint: result.tokenMint,
  initialLiquidity: 1000000,
  network: 'devnet',
});

// Buy from the pool
const ammBuyResult = await buyFromPool({
  connection,
  wallet,
  poolAddress: pool.poolAddress,
  amount: 500000,
  network: 'devnet',
});
```

### Sending Tokens

```typescript
import { sendTokenWithAccountCreation } from '@pumpfun/defi-kit';

// Send tokens to another wallet
const transferResult = await sendTokenWithAccountCreation(
  connection,
  senderWallet,
  recipientAddress,
  tokenMint,
  BigInt(1000) // 1000 tokens
);

if (transferResult.success) {
  console.log('Transfer successful:', transferResult.signature);
  console.log('Recipient account:', transferResult.recipientAccount);
}
```

## Testing

The library has been thoroughly tested on Solana devnet with real transactions:

### ✅ Send Functionality Tested

- **Token Transfer**: Successfully sent 1000 TCT tokens between wallets
- **Account Creation**: Automatically created recipient token accounts
- **Transaction Confirmation**: All transactions confirmed on Solana devnet
- **Balance Verification**: Transfer amounts verified and balances updated

**Test Transaction**: [View on Solana Explorer](https://explorer.solana.com/tx/tbVkBnQyM2MRZic9VVoBJwXtTW6U9LRYMEPfJ1QWcaMt214tKESjY5hEEg1xXoQ4ee3ZoQKmJcENBX7U5hdVVJZ?cluster=devnet)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/sendToken.test.ts

# Run CLI tests
tsx cli/check-wallet-balances.ts
tsx cli/bonding-curve/buy-cli.ts --amount 0.01 --input-token wallets/token-info-2.json --wallet wallets/creator-wallet.json
```

## API Reference

### Core Functions

#### `createToken(options)`

Creates a new PumpFun token.

**Parameters:**

- `connection`: Solana connection instance
- `wallet`: Wallet keypair or adapter
- `tokenData`: Token metadata (name, symbol, description, image)
- `network`: Network to deploy to ('devnet' | 'mainnet-beta')

**Returns:** Promise with token creation result

#### `buyToken(options)`

Buys tokens using bonding curve pricing.

**Parameters:**

- `connection`: Solana connection instance
- `wallet`: Wallet keypair or adapter
- `tokenMint`: Token mint address
- `amount`: Amount in lamports to spend
- `network`: Network to trade on

**Returns:** Promise with purchase result

#### `sellToken(options)`

Sells tokens using bonding curve pricing.

**Parameters:**

- `connection`: Solana connection instance
- `wallet`: Wallet keypair or adapter
- `tokenMint`: Token mint address
- `amount`: Amount of tokens to sell
- `network`: Network to trade on

**Returns:** Promise with sale result

### AMM Functions

#### `createPool(options)`

Creates a new AMM liquidity pool.

#### `buyFromPool(options)`

Buys tokens from an AMM pool.

#### `sellToPool(options)`

Sells tokens to an AMM pool.

#### `addLiquidity(options)`

Adds liquidity to an existing pool.

#### `removeLiquidity(options)`

Removes liquidity from a pool.

## Configuration

The library supports configuration through environment variables:

```bash
# Solana RPC endpoint
SOLANA_RPC_URL=https://api.devnet.solana.com

# Network selection
SOLANA_NETWORK=devnet

# Default priority fee (in lamports)
DEFAULT_PRIORITY_FEE=1000
```

## Error Handling

The library provides comprehensive error handling with specific error types:

```typescript
import { PumpFunError, InsufficientFundsError } from '@pumpfun/defi-kit';

try {
  await buyToken(options);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    console.log('Insufficient funds for transaction');
  } else if (error instanceof PumpFunError) {
    console.log('PumpFun error:', error.message);
  }
}
```

## Development

### Prerequisites

- Node.js 18+
- Solana CLI tools
- Devnet SOL for testing

### Setup

```bash
git clone https://github.com/naval200/pumpfun-defi-kit.git
cd pumpfun-defi-kit
npm install
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## CLI Tools

The library includes command-line tools for testing and development:

```bash
# Create a token
npm run cli:bc:create-token -- --name "Test Token" --symbol "TEST"

# Buy tokens
npm run cli:bc:buy -- --token <TOKEN_MINT> --amount 1000000

# Create AMM pool
npm run cli:amm:create-pool -- --token <TOKEN_MINT> --liquidity 1000000
```

## Documentation

For comprehensive documentation, see the [docs](./docs/) folder:

- 📚 [API Reference](./docs/)
- 🔧 [Testing Guide](./docs/TESTING_GUIDE.md)
- 🏊 [AMM Usage Guide](./docs/amm-usage.md)
- 🎯 [Pool Creation Guide](./docs/pool-creation-guide.md)
- 📊 [Test Suite Summary](./docs/TEST_SUITE_SUMMARY.md)
- 🚀 [Publishing Checklist](./docs/PUBLISHING_CHECKLIST.md)
- 🤝 [Contributing Guidelines](./docs/CONTRIBUTING.md)
- 🔒 [Security Policy](./docs/SECURITY.md)
- 📝 [Changelog](./docs/CHANGELOG.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for detailed guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/naval200/pumpfun-defi-kit#readme)
- 🐛 [Issue Tracker](https://github.com/naval200/pumpfun-defi-kit/issues)
- 💬 [Discussions](https://github.com/naval200/pumpfun-defi-kit/discussions)

## Disclaimer

This library is for educational and development purposes. Always test thoroughly on devnet before using on mainnet. The authors are not responsible for any financial losses incurred through the use of this software.
