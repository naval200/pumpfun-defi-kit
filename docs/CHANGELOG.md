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
- **Debug Scripts**: Comprehensive testing scripts for batch operations and wallet management
- **Batch Operations Testing**: End-to-end testing of token transfers, buys, and SOL transfers
- **Sell Operation Fee Payer Support**: Added fee payer parameter to `sellPumpFunToken` function
- **Enhanced Check Wallet Balances CLI**: Added timeout protection and `--input-token` parameter support
- **API Documentation**: Comprehensive API reference with bonding curve and AMM operations
- **Global CLI Commands**: Added `bin` section to package.json for global CLI access
- **Parent Repository Support**: CLI commands now work from parent repositories when installed as npm module
- **CLI Usage Guide**: Comprehensive documentation for using CLI commands in different environments
- **Bin Command System**: Individual CLI commands available as global bin commands (e.g., `npx pumpfun-bc-create-token`)
- **Main CLI Dispatcher**: `pumpfun-cli` command for unified CLI interface
- **CLI File Inclusion**: Added `cli` folder to npm package files for proper CLI distribution

### Changed
- **Directory Structure**: Renamed `wallets/` directory to `fixtures/` to better reflect its contents
- **Debug Scripts**: Updated all debug scripts to use the new `fixtures/` directory path
- **Documentation**: Updated documentation to reflect directory structure changes and current testing capabilities

### Enhanced
- **CLI Infrastructure**: Improved command-line argument parsing and validation
- **Error Handling**: Better error messages and validation for CLI commands
- **Documentation**: Updated CLI documentation with comprehensive examples and usage
- **Check Wallet Balances CLI**: Added timeout protection to prevent hanging on large token account queries
- **Sell CLI**: Fixed TypeScript error and properly implemented fee payer support
- **Parent Repository CLI**: Enhanced CLI commands to work seamlessly from parent repositories
- **CLI Accessibility**: Multiple ways to access CLI commands (bin commands, main CLI, npm scripts)
- **Documentation**: Updated README, CLI Usage Guide, and Getting Started with bin command examples

### Fixed
- **TypeScript Compilation**: Fixed parameter mismatch in `sellPumpFunToken` function call
- **CLI Hanging Issues**: Added timeout protection to prevent CLI from hanging on slow RPC calls
- **Fee Payer Implementation**: Properly implemented fee payer support for sell operations

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
