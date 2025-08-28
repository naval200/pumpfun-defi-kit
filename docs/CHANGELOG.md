# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Enhanced Send Token CLI**: Added comprehensive token transfer functionality with fee payer support
- **Fee Payer Integration**: Support for separate fee payer wallets in token transfers
- **Automatic Account Creation**: CLI automatically creates recipient token accounts when needed
- **Transaction Confirmation**: Enhanced transaction handling with explorer links and balance verification

### Enhanced
- **CLI Infrastructure**: Improved command-line argument parsing and validation
- **Error Handling**: Better error messages and validation for CLI commands
- **Documentation**: Updated CLI documentation with comprehensive examples and usage

### Removed
- `getGlobalAccount` function from `src/bonding-curve/helper.ts` - was unused placeholder implementation

- Initial release of @pumpfun/defi-kit library
- Comprehensive PumpFun token creation and trading functionality
- AMM (Automated Market Maker) support with liquidity pool management
- Bonding curve trading implementation
- Full TypeScript support with comprehensive type definitions
- CLI tools for testing and development
- Comprehensive error handling and retry logic
- Devnet and mainnet-beta support

### Features

- **Token Creation**: Create new PumpFun tokens with custom metadata
- **Bonding Curve Trading**: Execute trades using mathematical bonding curves
- **AMM Support**: Automated Market Maker functionality for liquidity pools
- **Liquidity Management**: Add/remove liquidity from trading pools
- **Wallet Integration**: Seamless integration with Solana wallets
- **Pool Discovery**: Advanced pool search with fallback strategies
- **Transaction Management**: Robust transaction handling with priority fees

### Technical

- Built with @pump-fun/pump-swap-sdk and @solana/web3.js
- Modern ES2022+ JavaScript features
- Comprehensive test suite with Jest
- ESLint and Prettier for code quality
- Husky git hooks for pre-commit checks
- Proper NPM package structure and exports

## [1.0.0] - 2024-01-XX

### Added

- Initial public release
- Core trading functionality
- AMM and bonding curve support
- CLI tools and utilities
