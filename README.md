# PumpFun DeFi Kit

A comprehensive DeFi toolkit for PumpFun tokens with bonding curve and AMM support. This library provides a clean, type-safe interface for creating tokens, managing liquidity pools, and executing trades on the Solana blockchain.

**🚧 Beta Version - Currently in Testing**

## Features

- 🚀 **Token Creation**: Create new PumpFun tokens with custom metadata
- 📈 **Bonding Curve Trading**: Execute trades using mathematical bonding curves
- 🏊 **AMM Support**: Automated Market Maker functionality for liquidity pools
- 💰 **Liquidity Management**: Add/remove liquidity from trading pools
- 🔐 **Wallet Integration**: Seamless integration with Solana wallets
- 📱 **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- 🧪 **Devnet Ready**: Test on Solana devnet before mainnet deployment
- 📤 **Token Transfer**: Send tokens between wallets with automatic account creation
- 🎯 **Graduation Support**: Check token graduation status and requirements
- 🔧 **CLI Tools**: Comprehensive command-line interface for all operations
- 💸 **Fee Payer Support**: Optional separate fee payer wallets for treasury operations and batch transactions

## Project Structure

```
pumpfun-defikit/
├── src/                    # Source code
│   ├── amm/               # AMM trading functionality
│   ├── bonding-curve/     # Bonding curve trading
│   ├── utils/             # Utility functions
│   └── types.ts           # TypeScript definitions
├── cli/                   # Command-line tools
│   ├── amm/               # AMM CLI commands
│   ├── bonding-curve/     # Bonding curve CLI commands
│   └── graduation-check-cli.ts
├── tests/                 # Test suite
├── debug/                 # Debug scripts for testing
├── docs/                  # Documentation
└── fixtures/              # Test wallet configurations and token info
```

## Installation

**⚠️ Beta Version**: This library is currently in beta testing and not yet available on npm.

### From GitHub Repository (Recommended)

```bash
npm install github:naval200/pumpfun-defi-kit#dist
```

**Note**: When installing from GitHub, the package will be built automatically. If you encounter any issues, you can build manually:

```bash
npm install
npm run build
```

### From Source (Development)

```bash
git clone https://github.com/naval200/pumpfun-defi-kit.git
cd pumpfun-defi-kit
npm install
npm run build
```

## Quick Start

**Note**: Since this is a beta version, you'll need to clone the repository and build it locally before running the examples.

### Testing with Debug Scripts

For comprehensive testing and debugging, use the included debug scripts:

```bash
cd debug
chmod +x *.sh
./00-run-complete-test.sh
```

This will:
- Create 20 test user wallets
- Fund 10 wallets with PumpFun tokens
- Test batch operations and transfers
- Generate detailed logs and reports

See [Debug Scripts Guide](./docs/debug-scripts-guide.md) for detailed usage information.

### Creating a Token

```typescript
import { createToken } from './src';
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
import { buyToken } from './src';

const buyResult = await buyToken({
  connection,
  wallet,
  tokenMint: result.tokenMint,
  amount: 1000000, // 1 SOL in lamports
  network: 'devnet',
});

console.log('Tokens purchased:', buyResult.tokensReceived);
```

### Selling Tokens (Bonding Curve)

```typescript
import { sellToken } from './src';

const sellResult = await sellToken({
  connection,
  wallet,
  tokenMint,
  amount: 1000,
  network: 'devnet',
});

console.log('Sale successful:', sellResult.signature);
```

### Fee Payer Support

The library now supports optional fee payer wallets, allowing you to separate the wallet that pays transaction fees from the wallet that owns the tokens:

```typescript
import { buyToken, sendToken } from './src';

// Treasury wallet pays fees for user operations
const treasuryWallet = loadWallet('./fixtures/treasury.json');
const userWallet = loadWallet('./fixtures/user.json');

// Buy tokens with treasury covering fees
const buyResult = await buyToken({
  connection,
  wallet: userWallet,        // User owns the tokens
  tokenMint,
  amount: 0.1,
  network: 'devnet',
  feePayer: treasuryWallet  // Treasury pays the fees
});

// Send tokens with treasury covering fees
const sendResult = await sendToken({
  connection,
  sender: userWallet,        // User owns the tokens
  recipient: recipientAddress,
  mint: tokenMint,
  amount: 1000,
  feePayer: treasuryWallet  // Treasury pays the fees
});
```

**CLI Usage:**

```bash
# Buy tokens with separate fee payer
npm run cli:bc-buy \
  --amount 0.1 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/user-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json

# Send tokens with separate fee payer
npm run cli:send-token \
  --recipient <RECIPIENT_ADDRESS> \
  --mint <TOKEN_MINT> \
  --amount 1000 \
  --wallet ./fixtures/sender-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json
```

**Use Cases:**
- **Treasury Operations**: Central wallet covers fees for multiple users
- **Batch Transactions**: Efficient bulk operations with single fee payer
- **Relayer Services**: Service covers costs for user transactions
- **Gasless UX**: Users don't need SOL for transaction fees

For detailed fee payer documentation, see [docs/fee-payer-usage.md](docs/fee-payer-usage.md).

### AMM Trading

```typescript
import { createPool, buyFromPool } from './src';

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
import { sendTokenWithAccountCreation } from './src';

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

### Test Coverage

The library includes comprehensive tests covering:
- ✅ Token creation and metadata
- ✅ Bonding curve trading (buy/sell)
- ✅ AMM pool operations
- ✅ Liquidity management
- ✅ Token transfers with account creation
- ✅ Error handling and edge cases
- ✅ CLI command functionality

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

## Technologies

- **@pump-fun/pump-swap-sdk**: Core PumpFun trading functionality
- **@solana/web3.js**: Solana blockchain interaction
- **@solana/spl-token**: SPL token operations
- **@coral-xyz/anchor**: Solana program interaction
- **TypeScript**: Full type safety and modern ES6+ features

## Configuration

The library supports configuration through environment variables:

```bash
# Solana RPC endpoint
SOLANA_RPC_URL=https://api.devnet.solana.com

# Network selection
SOLANA_NETWORK=devnet

# Default priority fee (in lamports)
DEFAULT_PRIORITY_FEE=1000

# Environment file
cp env.example .env
```

## Error Handling

The library provides comprehensive error handling with specific error types:

```typescript
import { PumpFunError, InsufficientFundsError } from './src';

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

### Available Scripts

```bash
npm run help                    # Show all available CLI commands
npm run build                   # Build the project
npm run build:clean            # Clean build with dist removal
npm run test                   # Run tests
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Run tests with coverage
npm run format                # Format code with Prettier
npm run check-format          # Check code formatting
npm run deploy:dist           # Deploy distribution files
```

## CLI Tools

The library includes comprehensive command-line tools for testing and development:

```bash
# Bonding Curve (BC) Operations
npm run cli:curve:create-token -- --help    # Create new tokens
npm run cli:curve:buy -- --help             # Buy tokens via bonding curve
npm run cli:curve:sell -- --help            # Sell tokens via bonding curve
npm run cli:curve:sdk-buy -- --help         # SDK-based token buying

# AMM Operations
npm run cli:amm:buy -- --help               # Buy tokens from AMM pool
npm run cli:amm:create-pool -- --help       # Create new AMM pool
npm run cli:amm:create-pool-or-use -- --help # Create pool or use existing
npm run cli:amm:info -- --help              # Get pool information
npm run cli:amm:liquidity -- --help         # Manage pool liquidity
npm run cli:amm:add-only -- --help          # Add liquidity only

# Utility Commands
npm run cli:graduation-check                # Check token graduation status
npm run cli:send-token -- --help           # Send tokens between wallets
npm run help                                # Show all available CLI commands
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

## Support & Feedback

Since this is a beta version, your feedback is crucial:

- 📖 [Documentation](https://github.com/naval200/pumpfun-defi-kit#readme)
- 🐛 [Report Issues](https://github.com/naval200/pumpfun-defi-kit/issues) - Please report any bugs you find
- 💬 [Discussions](https://github.com/naval200/pumpfun-defi-kit/discussions) - Share your experience and suggestions
- ⭐ [Star the Repo](https://github.com/naval200/pumpfun-defi-kit) - Show your support for the project

## Beta Status

This library is currently in **beta testing** and should be used with caution:

- 🧪 **Testing Phase**: All functionality is being tested on Solana devnet
- 🚧 **API Changes**: The API may change between beta releases
- 🐛 **Bug Reports**: Please report any issues you encounter
- 📝 **Feedback Welcome**: We welcome feedback and suggestions for improvements

## Disclaimer

This library is for educational and development purposes. Always test thoroughly on devnet before using on mainnet. The authors are not responsible for any financial losses incurred through the use of this software.
