# PumpFun Sell Testing Guide

This guide covers how to test the sell functionality for PumpFun tokens on Solana devnet.

## Overview

The sell testing suite provides comprehensive testing for the `sellPumpFunToken` function, including:
- Basic sell functionality
- Specific amount selling
- Custom slippage handling
- Error handling scenarios
- Comprehensive test runs

## Prerequisites

Before running sell tests, ensure you have:

1. **Test Wallet**: A wallet with some SOL balance (at least 0.1 SOL)
2. **Token Balance**: The wallet must have tokens to sell (buy tokens first using the buy tests)
3. **Token Info**: Valid `token-info.json` file with mint and bonding curve addresses
4. **Environment**: Solana devnet connection

## Test Files

### 1. `cli/test-sell.ts`
Main test file containing all test functions:
- `testSell()` - Basic sell functionality
- `testSellSpecificAmount()` - Sell specific token amount
- `testSellWithCustomSlippage()` - Custom slippage handling
- `testErrorHandling()` - Error scenario testing
- `runComprehensiveSellTests()` - Run all tests

### 2. `cli/run-sell-test.ts`
Simple test runner with command-line interface for easy testing.

## Running Tests

### Using NPM Scripts

```bash
# Basic sell test
npm run test:sell

# Test specific amount selling
npm run test:sell:specific

# Test custom slippage
npm run test:sell:slippage

# Test error handling
npm run test:sell:errors

# Run all tests
npm run test:sell:all

# Use the test runner
npm run test:sell:runner
```

### Using the Test Runner

```bash
# Run specific test
npm run test:sell:runner sell
npm run test:sell:runner specific
npm run test:sell:runner slippage
npm run test:sell:runner errors

# Run all tests
npm run test:sell:runner all

# Show help
npm run test:sell:runner help
```

### Direct Execution

```bash
# Run specific test type
npx tsx cli/test-sell.ts
npx tsx cli/test-sell.ts all
npx tsx cli/test-sell.ts specific
npx tsx cli/test-sell.ts slippage
npx tsx cli/test-sell.ts errors

# Use test runner
npx tsx cli/run-sell-test.ts all
```

## Test Scenarios

### 1. Basic Sell Test
- Tests selling all available tokens
- Uses default 10% slippage
- Validates transaction success

### 2. Specific Amount Test
- Tests selling a specific number of tokens (e.g., 1000)
- Useful for partial position management
- Validates amount constraints

### 3. Custom Slippage Test
- Tests with 5% slippage (500 basis points)
- Demonstrates slippage parameter handling
- Useful for different market conditions

### 4. Error Handling Test
- Tests with invalid mint addresses
- Tests with non-existent tokens
- Validates proper error responses

## Expected Behavior

### Successful Sells
- Transaction signature returned
- Success status: `true`
- Proper logging of operations

### Failed Sells
- Error message returned
- Success status: `false`
- Detailed error information

## Common Error Scenarios

1. **Insufficient Token Balance**
   - Error: "User has no tokens to sell"
   - Solution: Buy tokens first using buy tests

2. **Token Account Not Found**
   - Error: "User token account not found - must buy tokens first"
   - Solution: Ensure token account exists

3. **Bonding Curve Validation Failed**
   - Error: "Bonding curve account not properly initialized"
   - Solution: Check token configuration

4. **Network Issues**
   - Error: Transaction confirmation failures
   - Solution: Check devnet status and retry

## Debugging

### Enable Verbose Logging
The tests include comprehensive logging with emojis for easy identification:
- 🔍 Validation steps
- 💰 Balance checks
- 🔄 Transaction execution
- ✅ Success confirmations
- ❌ Error details

### Check Wallet Balance
```bash
# Check SOL balance
solana balance <wallet-address> --url devnet

# Check token balance
spl-token balance <mint-address> --url devnet
```

### Verify Token Info
Ensure `token-info.json` contains valid addresses:
```json
{
  "mint": "valid-mint-address",
  "bondingCurve": "valid-bonding-curve-address"
}
```

## Best Practices

1. **Test Order**: Run buy tests before sell tests
2. **Balance Check**: Ensure sufficient SOL for transaction fees
3. **Token Balance**: Verify wallet has tokens to sell
4. **Network**: Use devnet for testing
5. **Error Handling**: Review error messages for debugging

## Troubleshooting

### Test Fails Immediately
- Check wallet file exists in `wallets/creator-wallet.json`
- Verify `token-info.json` is valid
- Ensure sufficient SOL balance

### Transaction Fails
- Check devnet status
- Verify token account exists
- Review bonding curve validation
- Check slippage settings

### Network Issues
- Retry with exponential backoff
- Check RPC endpoint status
- Verify commitment level settings

## Integration with Other Tests

The sell tests are designed to work with the existing test suite:
- **Buy Tests**: Must run first to provide tokens
- **Create Tests**: Provide token information
- **AMM Tests**: Alternative trading mechanism

## Contributing

When adding new sell test scenarios:
1. Follow existing naming conventions
2. Include comprehensive error handling
3. Add proper logging and validation
4. Update this documentation
5. Add corresponding npm scripts

## Support

For issues with sell testing:
1. Check error logs and messages
2. Verify prerequisites are met
3. Review network and wallet status
4. Consult the main project documentation
