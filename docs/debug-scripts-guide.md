# Debug Scripts Guide

This guide explains how to use the comprehensive debug scripts for testing PumpFun token operations, batch transactions, and wallet management.

## 🚀 Quick Start

### Prerequisites

1. **Solana CLI Tools**: Must be installed and accessible
2. **Node.js & npm**: Required for running CLI commands
3. **Required Files**: Ensure all wallet files exist in `fixtures/` directory

### Required Files in `fixtures/` Directory

```
fixtures/
├── creator-wallet.json           # Wallet with SOL and tokens for funding
├── treasury-wallet.json          # Wallet for paying transaction fees
├── trading-wallet.json           # Additional trading wallet
├── token-info-*.json            # Token metadata (e.g., token-info-1756564695373.json)
└── wallet-keys.txt              # Wallet public keys for reference
```

### Running the Master Test Script

```bash
cd debug
chmod +x *.sh  # Make scripts executable
./00-run-complete-test.sh
```

## 📋 Debug Scripts Overview

### 1. Master Test Script (`00-run-complete-test.sh`)

**Purpose**: Orchestrates the entire testing process from setup to comprehensive testing.

**What it does**:
1. ✅ Creates 20 user wallets
2. ✅ Transfers PumpFun tokens to 10 wallets
3. 🧪 Tests basic batch operations (10 transfers)
4. 🧪 Tests comprehensive batch operations (mixed types)
5. 🧪 Tests buy and SOL transfer operations together
6. 📊 Generates detailed logs and reports

**Usage**:
```bash
./00-run-complete-test.sh
```

### 2. Setup Script (`01-setup-user-wallets.sh`)

**Purpose**: Creates test user wallets and funds them with initial tokens.

**What it does**:
- Generates 20 new Solana keypairs
- Transfers 1000 tokens to the first 10 wallets
- Validates wallet creation and funding
- Provides detailed summary of all wallets

**Usage**:
```bash
./01-setup-user-wallets.sh
```

**Output Example**:
```
📋 Summary of Setup Phase:
==========================
✅ Created 20 user wallets in /path/to/debug/user-wallets
💰 Successfully funded 10 out of 10 wallets with 1000 tokens each
✅ All funded wallets are ready for batch operations
```

### 3. Batch Transfer Test (`02-test-batch-send-and-sell.sh`)

**Purpose**: Tests batch token transfer operations between user wallets.

**What it does**:
- Creates batch operations JSON file with 10 transfer operations
- Executes transfers between funded wallets
- Verifies wallet balances after operations
- Generates detailed logs and reports

**Usage**:
```bash
./02-test-batch-send-and-sell.sh
```

**Generated Files**:
- `batch-operations-test.json`: Contains transfer operation definitions
- `send-sell-test-YYYYMMDD-HHMMSS.log`: Detailed execution logs

### 4. Batch Buy and SOL Transfer Test (`02-test-batch-send-and-buy.sh`)

**Purpose**: Tests combined token buying and SOL transfer operations.

**What it does**:
- Loads predefined buy and SOL transfer operations
- Executes operations in single batched transaction
- Tests mixed operation types in one transaction
- Validates results and provides feedback

**Usage**:
```bash
./02-test-batch-send-and-buy.sh
```

**Required Files**:
- `buy-and-sol-transfer-test.json`: Predefined test operations

### 5. Comprehensive Batch Test (`09-test-comprehensive-batch.sh`)

**Purpose**: Tests the full range of batch operations with mixed types.

**What it does**:
- Creates 16 mixed operations (transfers, SOL transfers, sells, buys)
- Tests bonding curve and AMM operations together
- Executes complex batch scenarios
- Provides comprehensive validation and reporting

**Usage**:
```bash
./09-test-comprehensive-batch.sh
```

**Generated Files**:
- `comprehensive-batch-test.json`: Mixed operation definitions
- `comprehensive-test-YYYYMMDD-HHMMSS.log`: Detailed execution logs

## 🔧 Configuration

### Environment Variables

```bash
# Enable debug logging
export DEBUG_PUMPFUN_DEFI_SDK=true

# Solana network configuration
export SOLANA_NETWORK=devnet
export SOLANA_RPC_URL=https://api.devnet.solana.com

# Optional: Custom RPC endpoint
export SOLANA_RPC_URL=https://your-custom-rpc.com
```

### Script Parameters

All scripts use the following configuration:

- **Wallet Count**: 20 user wallets created
- **Funded Count**: 10 wallets receive initial tokens
- **Tokens Per Wallet**: 1000 tokens for testing
- **Network**: Solana devnet
- **Fee Payer**: Treasury wallet from fixtures

## 📊 Test Results and Logging

### Generated Files

Each test script generates:

1. **Operation Files**: JSON files defining batch operations
2. **Log Files**: Detailed execution logs with timestamps
3. **User Wallets**: Generated test wallets in `user-wallets/` directory
4. **Test Reports**: Summary reports with success/failure counts

### Log File Locations

```
debug/
├── batch-operations-test.json
├── comprehensive-batch-test.json
├── buy-and-sol-transfer-test.json
├── user-wallets/                    # Generated test wallets
├── *-test-YYYYMMDD-HHMMSS.log      # Execution logs
└── test-report-YYYYMMDD-HHMMSS.md  # Final test reports
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Missing Required Files

**Error**: `Required file not found: fixtures/creator-wallet.json`

**Solution**: Ensure all required files exist in the `fixtures/` directory:
```bash
ls -la ../fixtures/
# Should show: creator-wallet.json, treasury-wallet.json, token-info-*.json
```

#### 2. Permission Denied

**Error**: `Permission denied: ./00-run-complete-test.sh`

**Solution**: Make scripts executable:
```bash
chmod +x *.sh
```

#### 3. Solana CLI Not Found

**Error**: `Solana CLI not found. Please install it first.`

**Solution**: Install Solana CLI tools:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

#### 4. Batch Transactions Import Error

**Error**: `executeBatch is not a function`

**Status**: Known issue - investigating batch transactions module exports

**Workaround**: Setup and individual operations work, but batch execution may fail

#### 5. Insufficient SOL Balance

**Error**: Transaction fails due to insufficient SOL

**Solution**: Ensure creator wallet has sufficient SOL for funding:
```bash
solana balance <creator-wallet-address> --url devnet
# Should show at least 0.1 SOL
```

### Debug Mode

Enable verbose logging to troubleshoot issues:

```bash
export DEBUG_PUMPFUN_DEFI_SDK=true
./00-run-complete-test.sh
```

## 📈 Performance and Monitoring

### Expected Execution Times

- **Setup Phase**: 2-3 minutes (wallet creation + token funding)
- **Batch Transfer Test**: 1-2 minutes (10 transfer operations)
- **Comprehensive Test**: 3-5 minutes (16 mixed operations)
- **Total Master Test**: 8-12 minutes (all phases)

### Resource Usage

- **Memory**: < 100MB during execution
- **Storage**: ~1MB for generated wallets and logs
- **Network**: Optimized for devnet usage
- **CPU**: Low usage, mostly I/O operations

## 🔄 Continuous Testing

### Running Individual Tests

```bash
# Test only setup
./01-setup-user-wallets.sh

# Test only batch transfers
./02-test-batch-send-and-sell.sh

# Test only comprehensive operations
./09-test-comprehensive-batch.sh
```

### Custom Test Scenarios

1. **Modify Operation Files**: Edit JSON files to test different scenarios
2. **Adjust Wallet Counts**: Change `WALLET_COUNT` and `FUNDED_COUNT` in scripts
3. **Custom Token Amounts**: Modify `TOKENS_PER_WALLET` for different funding levels
4. **Network Changes**: Update RPC endpoints for different networks

### Integration with CI/CD

The debug scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Debug Tests
  run: |
    cd debug
    chmod +x *.sh
    ./00-run-complete-test.sh
```

## 📚 Additional Resources

- [Main Testing Guide](./TESTING_GUIDE.md): Comprehensive testing information
- [CLI Usage Guide](./batch-transactions-usage.md): Batch operations CLI details
- [Debug System](./DEBUG_README.md): Debug logging and troubleshooting
- [Test Suite Summary](./TEST_SUITE_SUMMARY.md): Overall test coverage

## 🤝 Contributing

When adding new debug scripts or modifying existing ones:

1. **Follow Naming Convention**: Use descriptive names with phase numbers
2. **Include Error Handling**: Always check prerequisites and handle failures gracefully
3. **Generate Logs**: Provide detailed logging for troubleshooting
4. **Update Documentation**: Keep this guide and related docs up to date
5. **Test Thoroughly**: Ensure scripts work in different environments

---

For questions or issues with the debug scripts, check the troubleshooting section above or review the generated log files for detailed error information.
