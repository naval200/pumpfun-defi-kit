# Batch Operations Debug Scripts

This directory contains bash scripts for testing the batch transaction system with real PumpFun token operations.

## 🎯 Overview

The scripts create a complete test environment with:
- 20 user wallets (no SOL, just for testing)
- Initial token distribution to 10 wallets using batch transactions with automatic ATA creation
- Send and sell operations testing with transfers
- SOL transfer operations testing
- Buy and SOL transfer operations testing
- Comprehensive testing with mixed operation types
- **NEW**: CreateAccount feature testing with automatic ATA creation
- Detailed logging and reporting

## 📋 Prerequisites

Before running these scripts, ensure you have:

1. **Solana CLI** installed and configured
   ```bash
   # Check if installed
   solana --version
   
   # Install if needed: https://docs.solana.com/cli/install-solana-cli-tools
   ```

2. **Required wallets** in the `../wallets/` directory:
   - `creator-wallet.json` - Wallet with PumpFun tokens to distribute
   - `treasury-wallet.json` - Wallet with SOL for paying transaction fees
   - `token-info.json` - Token information including mint address

3. **jq** for JSON processing
   ```bash
   # macOS
   brew install jq
   
   # Ubuntu
   sudo apt-get install jq
   ```

4. **Node.js/npm** for running the CLI commands

## 🚀 Quick Start

### Option 1: Run Complete Test Suite (Recommended)
```bash
# Run the master script that orchestrates everything
./00-run-complete-test.sh
```

This will execute all phases automatically and generate a comprehensive report.

### Option 2: Run Individual Phases
```bash
# Phase 1: Setup wallets and distribute tokens (traditional approach)
./01-setup-user-wallets.sh

# Phase 1 (NEW): Setup wallets using batch transactions with createAccount
./01-setup-user-wallets-with-batch.sh

# Phase 2: Test send and sell operations (10 transfers)
./02-test-batch-send-and-sell.sh

# Phase 3: Test batched instructions (mixed operations)
./02-test-batch-send-and-buy.sh

# Phase 4: Test comprehensive batch operations (mixed types)
./09-test-comprehensive-batch.sh

# Phase 5 (NEW): Test createAccount feature specifically
./05-test-createaccount-feature.sh
```

## 📁 Script Details

### `00-run-complete-test.sh` - Master Script
- **Purpose**: Orchestrates the entire testing process
- **What it does**: Runs all phases sequentially with error handling
- **Output**: Comprehensive test report and all generated files

### `01-setup-user-wallets.sh` - Setup Phase (Traditional)
- **Purpose**: Creates test environment using traditional approach
- **What it does**:
  - Generates 20 user wallets using `solana-keygen new`
  - Manually creates ATAs using `create-ata` CLI command
  - Transfers PumpFun tokens to first 10 wallets
  - Uses creator wallet as source, treasury wallet as fee payer
- **Output**: 20 wallet files in `user-wallets/` directory

### `01-setup-user-wallets-with-batch.sh` - Setup Phase (NEW - Batch with CreateAccount)
- **Purpose**: Creates test environment using batch transactions with automatic ATA creation
- **What it does**:
  - Generates 20 user wallets using `solana-keygen new`
  - Creates batch operations with `createAccount: true` for automatic ATA creation
  - Executes batch transactions to distribute tokens with automatic ATA creation
  - Uses creator wallet as source and fee payer
- **Output**: 20 wallet files + batch operations JSON + execution logs
- **Benefits**: Demonstrates the new createAccount feature, atomic operations, single transaction

### `02-test-batch-send-and-sell.sh` - Batch Send Testing
- **Purpose**: Tests basic batch send operations
- **What it does**:
  - Creates 10 transfer operations between user wallets
  - Executes batch using treasury wallet as fee payer
  - Tests parallel execution and error handling
- **Output**: Batch operations JSON and execution logs

### `02-test-batch-send-and-buy.sh` - Batch Send and Buy Testing
- **Purpose**: Tests true batched instructions with mixed operations
- **What it does**:
  - Creates 10 mixed operations (buys and SOL transfers)
  - Combines all operations into single batched transaction
  - Tests atomic execution - all succeed or all fail together
  - Uses treasury wallet as fee payer
- **Output**: Buy and SOL transfer operations JSON and execution logs

### `09-test-comprehensive-batch.sh` - Advanced Testing
- **Purpose**: Tests mixed operation types comprehensively
- **What it does**:
  - Creates 16 mixed operations (transfers, SOL transfers, buys, sells, AMM)
  - Tests complex batch scenarios with all operation types
  - Generates detailed execution logs
- **Output**: Comprehensive operations JSON and detailed logs

### `05-test-createaccount-feature.sh` - CreateAccount Feature Testing (NEW)
- **Purpose**: Demonstrates the new createAccount functionality
- **What it does**:
  - Creates test operations with mixed createAccount settings
  - Tests transfer operations with and without automatic ATA creation
  - Tests buy operations with and without automatic ATA creation
  - Includes SOL transfers (no ATA creation needed)
  - Verifies ATA creation results
- **Output**: Test operations JSON, execution logs, and verification results
- **Benefits**: Shows how createAccount simplifies batch operations

## 🔧 Configuration

### Wallet Configuration
- **Creator Wallet**: Must have sufficient PumpFun tokens for distribution
- **Treasury Wallet**: Must have sufficient SOL for transaction fees
- **User Wallets**: Created automatically, no SOL required

### Token Configuration
- **Amount per wallet**: 1000 tokens (configurable in setup script)
- **Transfer amounts**: Random between 10-100 tokens
- **Sell amounts**: Random between 30-200 tokens
- **Buy amounts**: Random between 0.01-0.05 SOL
- **SOL transfer amounts**: Random between 0.001-0.05 SOL

### Batch Configuration
- **Max parallel**: 2-5 operations (configurable per test type)
- **Retry logic**: Automatic retry for failed operations
- **Delay between**: 1-3 seconds between batches (configurable per test type)

## 📊 Output Files

After running the scripts, you'll find:

```
debug/
├── user-wallets/                    # 20 generated wallet files
│   ├── user-wallet-1.json
│   ├── user-wallet-2.json
│   └── ...
├── batch-operations-test.json       # Basic send and sell operations
├── buy-and-sol-transfer-test.json   # Buy and SOL transfer operations
├── comprehensive-batch-test.json    # Mixed operations
├── batch-test-*.log                # Detailed execution logs
├── buy-sol-transfer-test-*.log     # Buy and SOL transfer logs
└── test-report-*.md                # Final test report
```

## 🧪 Testing Scenarios

### CreateAccount Feature Test (NEW)
- **Operations**: 5 mixed operations demonstrating createAccount functionality
- **Types**: 
  - Transfer with createAccount: true (automatic ATA creation)
  - Transfer with createAccount: false (assumes ATA exists)
  - Buy bonding curve with createAccount: true (automatic ATA creation)
  - Buy bonding curve with createAccount: false (assumes ATA exists)
  - SOL transfer (no ATA creation needed)
- **Fee Payer**: Treasury wallet or individual wallets
- **Max Parallel**: 3 operations
- **Expected**: Demonstrates automatic ATA creation and mixed scenarios

### Batch Send Test
- **Operations**: 10 transfer operations
- **Types**: All transfers between user wallets
- **Fee Payer**: Treasury wallet
- **Max Parallel**: 5 operations
- **Expected**: All operations succeed, single transaction

### Batch Send and Buy Test
- **Operations**: 10 mixed operations
- **Types**: 5 buy operations (3 bonding curve + 2 AMM) + 5 SOL transfers
- **Fee Payer**: Treasury wallet
- **Execution**: Single batched transaction (--combine-per-batch)
- **Expected**: All operations succeed or fail together atomically

### Comprehensive Test
- **Operations**: 16 mixed operations
- **Types**: 5 transfers + 4 SOL transfers + 2 buys + 3 bonding curve sells + 2 AMM sells
- **Fee Payer**: Treasury wallet
- **Max Parallel**: 3 operations
- **Expected**: All operation types handled correctly

## 🔍 Monitoring and Debugging

### Real-time Monitoring
```bash
# Watch Solana logs
solana logs --url devnet

# Check wallet balances
solana balance <wallet-address> --url devnet
```

### Log Analysis
- **Execution logs**: Detailed operation-by-operation results
- **Error logs**: Failed operations and retry attempts
- **Performance logs**: Timing and parallel execution details

### Explorer Links
All successful transactions include Solana explorer links for verification.

## 🚨 Troubleshooting

### Common Issues

1. **Solana CLI not found**
   ```bash
   # Install Solana CLI
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Insufficient SOL in treasury wallet**
   ```bash
   # Airdrop SOL to treasury wallet
   solana airdrop 2 <treasury-address> --url devnet
   ```

3. **Insufficient tokens in creator wallet**
   - Ensure creator wallet has enough PumpFun tokens
   - Check token balance using Solana CLI

4. **Network issues**
   - Verify devnet connectivity
   - Check RPC endpoint status

### Debug Mode
Enable debug logging:
```bash
export DEBUG_PUMPFUN_DEFI_SDK=true
```

## 📈 Scaling Up

### Larger Batches
- Modify `max-parallel` parameter in scripts
- Increase operation counts in batch files
- Test with different operation combinations

### Different Networks
- Change RPC endpoints from devnet to mainnet
- Adjust fee calculations for mainnet
- Test with real SOL instead of devnet airdrops

### Custom Operations
- Modify operation types in batch files
- Add new operation parameters
- Test edge cases and error conditions

## 🎯 Test Progression

The test suite is designed with a logical progression:

1. **Setup** - Create wallets and distribute tokens
2. **Basic Operations** - Test simple send and sell operations
3. **Batched Instructions** - Test true instruction batching with mixed operations
4. **Comprehensive** - Test all operation types together
5. **CreateAccount Feature** - Test automatic ATA creation functionality

This progression allows for:
- **Incremental testing** - Each phase builds on the previous
- **Isolated debugging** - Issues can be identified at specific levels
- **Performance analysis** - Compare different operation types
- **Scalability testing** - Test with increasing complexity
- **Feature validation** - Test new createAccount functionality

## 🏗️ CreateAccount Feature Benefits

The new createAccount feature provides significant advantages:

### Traditional Approach vs. CreateAccount Approach

**Traditional Approach:**
```bash
# Step 1: Manually create ATAs
npm run cli:create-ata -- --wallet creator --mint TOKEN_MINT --owner RECIPIENT

# Step 2: Transfer tokens
npm run cli:send-token -- --wallet creator --recipient RECIPIENT --mint TOKEN_MINT --amount 1000
```

**CreateAccount Approach:**
```bash
# Single batch operation with automatic ATA creation
npm run cli:batch-transactions -- --operations batch.json
# Where batch.json contains: { "createAccount": true }
```

### Key Benefits

1. **Simplified Workflow**: No need to manually create ATAs before transfers
2. **Atomic Operations**: ATA creation and transfer happen in single transaction
3. **Error Reduction**: Eliminates manual ATA creation steps that can fail
4. **Better UX**: Users don't need to know about ATA creation details
5. **Batch Efficiency**: Multiple operations with ATA creation in single transaction
6. **Flexible Control**: Can still use createAccount: false when ATAs already exist

### Use Cases

- **New User Onboarding**: Send tokens to users who don't have token accounts yet
- **Batch Distributions**: Distribute tokens to multiple new users efficiently
- **Trading Operations**: Buy tokens for users who don't have token accounts yet
- **Mixed Scenarios**: Handle both new and existing users in same batch

## 🤝 Contributing

To add new test scenarios:
1. Create new script following naming convention (XX-test-description.sh)
2. Add comprehensive error handling
3. Include detailed logging
4. Update master script if needed
5. Test thoroughly before committing

## 📝 Notes

- **Devnet Only**: These scripts are configured for Solana devnet
- **Test Tokens**: Use test tokens, not real assets
- **Fee Payer**: Treasury wallet must have sufficient SOL
- **Cleanup**: User wallets can be deleted after testing
- **Logs**: All logs are timestamped for easy tracking
- **Numbering**: Scripts use XX prefix to allow for easy insertion of new tests

---

For questions or issues, check the generated logs and test reports first.
