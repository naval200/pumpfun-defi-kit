# PumpFun Token Testing Guide

This guide explains how to run comprehensive tests for the PumpFun token creation and trading system, demonstrating the complete lifecycle from bonding curve to AMM migration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Solana CLI tools installed
- Test wallet with some SOL balance

### 1. Setup Test Wallet

First, ensure your test wallet has sufficient SOL for testing:

```bash
# Airdrop SOL to test wallet (devnet)
npm run airdrop

# Or manually using Solana CLI
solana airdrop 2 <wallet-address> --url devnet
```

### 2. Run Comprehensive Test

```bash
# Run the complete test suite
npm run test:comprehensive
```

## 📋 Test Phases

The comprehensive test runs through 5 main phases:

### Phase 1: Token Creation on Bonding Curve

- Creates a new token with bonding curve pricing
- Sets initial parameters (name, symbol, description)
- Performs initial buy to establish price
- Records bonding curve address

### Phase 2: Bonding Curve Trading

- Buys additional tokens to observe price changes
- Sells tokens to observe reverse price changes
- Monitors bonding curve state changes
- Demonstrates mathematical pricing model

### Phase 3: AMM Pool Creation

- Creates liquidity pool for the token
- Migrates token from bonding curve to AMM
- Sets initial pool parameters
- Establishes trading pair (TOKEN/SOL)

### Phase 4: AMM Trading

- Adds additional liquidity to the pool
- Buys tokens using AMM (constant product formula)
- Sells tokens using AMM
- Demonstrates AMM vs bonding curve differences

### Phase 5: Final State Comparison

- Compares final bonding curve state
- Shows wallet balance changes
- Provides transaction links and explorer URLs

## 🛠️ Available Scripts

### Main Test Scripts

```bash
# Comprehensive end-to-end test
npm run test:comprehensive

# Individual test components
npm run test:creation      # Token creation only
npm run test:trading       # Trading operations only
npm run test:amm           # AMM operations only
```

### Utility Scripts

```bash
# Airdrop SOL to test wallet
npm run airdrop

# Check wallet balance
npm run balance

# View test results
npm run test:results
```

## 📊 Expected Test Results

### Token Creation

- **Token Mint Address**: Generated and displayed
- **Bonding Curve Address**: Created and recorded
- **Initial Price**: Set based on bonding curve formula
- **Transaction Signature**: Provided for verification

### Trading Results

- **Buy Operations**: Shows tokens received and price impact
- **Sell Operations**: Shows SOL received and price impact
- **Price Changes**: Demonstrates bonding curve mathematics
- **State Updates**: Real-time bonding curve state monitoring

### AMM Migration

- **Pool Creation**: New liquidity pool established
- **Token Migration**: Tokens moved from bonding curve to AMM
- **Liquidity Addition**: Initial liquidity provided
- **Trading Pairs**: TOKEN/SOL pair available for trading

## 🔧 Test Configuration

### Environment Variables

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
NETWORK=devnet
COMMITMENT=confirmed

# Wallet Configuration
WALLET_PRIVATE_KEY=your_private_key_here

# Priority Fee Configuration
BASE_PRIORITY_FEE=5000
MAX_PRIORITY_FEE=50000
PRIORITY_FEE_MULTIPLIER=1.5
```

### Test Parameters

- **Initial Buy Amount**: 0.01 SOL (configurable)
- **Additional Buy Amount**: 0.02 SOL (configurable)
- **Sell Amount**: 1000 tokens (configurable)
- **Liquidity Amount**: 0.01 SOL worth (configurable)
- **Slippage Tolerance**: 1% (configurable)

## 🚨 Troubleshooting

### Common Issues

1. **Insufficient Balance**: Ensure wallet has at least 0.1 SOL
2. **Network Congestion**: Increase priority fees for faster execution
3. **RPC Rate Limits**: Use dedicated RPC endpoint for testing
4. **Transaction Failures**: Check Solana network status

### Error Recovery

- **Automatic Retries**: Built-in retry mechanism for failed transactions
- **State Validation**: Verifies transaction success before proceeding
- **Rollback Support**: Can restart from any phase if needed
- **Logging**: Comprehensive logging for debugging

## 📈 Performance Metrics

### Test Execution Time

- **Complete Suite**: ~2-3 minutes (depending on network)
- **Individual Phases**: 30-60 seconds each
- **Transaction Confirmation**: 2-5 seconds per transaction
- **State Updates**: Real-time monitoring

### Resource Usage

- **Memory**: Minimal (< 100MB)
- **Network**: Optimized for devnet usage
- **Storage**: No persistent storage required
- **CPU**: Low usage during execution

## 🔄 Continuous Testing

### Integration with CI/CD

- **Automated Testing**: Runs on every commit
- **Environment Validation**: Ensures proper setup
- **Performance Monitoring**: Tracks execution times
- **Failure Reporting**: Immediate notification of issues

### Test Maintenance

- **Regular Updates**: Keeps pace with SDK changes
- **Dependency Management**: Monitors package updates
- **Network Adaptation**: Adjusts to Solana network changes
- **Documentation Sync**: Maintains alignment with code

---

For detailed test results and coverage information, see [Test Suite Summary](./TEST_SUITE_SUMMARY.md).
