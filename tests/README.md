# PumpFun Test Suite

This comprehensive test suite covers all the functionality tested in the CLI scripts, plus extensive edge cases and integration scenarios. The tests are designed to validate the PumpFun token creation and trading system thoroughly.

## 🏗️ Test Structure

```
tests/
├── setup.ts                           # Jest configuration and global setup
├── utils/
│   └── test-helpers.ts               # Common test utilities and mock helpers
├── bonding-curve/
│   ├── createToken.test.ts           # Token creation tests
│   ├── buy.test.ts                   # Bonding curve buy tests
│   └── sell.test.ts                  # Bonding curve sell tests
├── amm/
│   ├── buy.test.ts                   # AMM buy tests
│   ├── createPool.test.ts            # Pool creation tests
│   └── liquidity.test.ts             # Liquidity management tests
└── integration/
    └── comprehensive.test.ts         # End-to-end integration tests
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Jest testing framework
- TypeScript support

### Installation

The test dependencies are already included in the package.json:

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test files
npm test -- tests/bonding-curve/createToken.test.ts
npm test -- tests/amm/buy.test.ts
```

## 📋 Test Coverage

### 1. Token Creation Tests (`createToken.test.ts`)

**Success Scenarios:**
- ✅ Basic token creation with valid configuration
- ✅ Token creation with initial buy amount
- ✅ Custom metadata handling
- ✅ Different token configurations

**Error Scenarios:**
- ❌ Insufficient wallet balance
- ❌ Invalid token configuration
- ❌ Network connection errors
- ❌ RPC rate limiting

**Edge Cases:**
- 🔍 Very long token names
- 🔍 Special characters in names
- 🔍 Zero and very small initial buy amounts
- 🔍 Concurrent token creation attempts

**Parameter Validation:**
- ✅ Required field validation
- ✅ Token symbol length validation
- ✅ Initial buy amount validation

### 2. Bonding Curve Buy Tests (`buy.test.ts`)

**Success Scenarios:**
- ✅ Successful token purchases
- ✅ Different buy amounts
- ✅ Various priority fees
- ✅ Expected creator vault handling

**Error Scenarios:**
- ❌ Insufficient wallet balance
- ❌ Invalid mint addresses
- ❌ Non-existent tokens
- ❌ Network and RPC errors
- ❌ Creator vault derivation errors

**Edge Cases:**
- 🔍 Very small and large buy amounts
- 🔍 Zero and negative amounts
- 🔍 High priority fees
- 🔍 Multiple consecutive operations

**Integration Scenarios:**
- 🔄 Multiple consecutive buy operations
- 🔄 Different token types
- 🔄 Dynamic priority fee adjustment

### 3. Bonding Curve Sell Tests (`sell.test.ts`)

**Success Scenarios:**
- ✅ Sell all tokens (default behavior)
- ✅ Sell specific amounts
- ✅ Custom slippage tolerance
- ✅ Combined amount and slippage

**Error Scenarios:**
- ❌ Insufficient token balance
- ❌ Invalid mint addresses
- ❌ Non-existent tokens
- ❌ Slippage tolerance exceeded

**Edge Cases:**
- 🔍 Very small and large amounts
- 🔍 Zero and negative amounts
- 🔍 Extreme slippage values
- 🔍 Partial sells followed by sell all

**Error Recovery:**
- 🔄 Retry with increased slippage
- 🔄 Network issue handling
- 🔄 Balance recovery strategies

### 4. AMM Buy Tests (`amm-buy.test.ts`)

**Success Scenarios:**
- ✅ Successful AMM token purchases
- ✅ Different buy amounts
- ✅ Various slippage tolerances
- ✅ Pool discovery and selection

**Error Scenarios:**
- ❌ No AMM pools found
- ❌ Insufficient balance
- ❌ Invalid pool keys
- ❌ Slippage tolerance exceeded

**Edge Cases:**
- 🔍 Very small and large amounts
- 🔍 Extreme slippage values
- 🔍 Pool discovery failures

**Integration Scenarios:**
- 🔄 Multiple consecutive operations
- 🔄 Different pools
- 🔄 Dynamic slippage adjustment

### 5. AMM Liquidity Tests (`liquidity.test.ts`)

**Success Scenarios:**
- ✅ Add liquidity successfully
- ✅ Remove liquidity successfully
- ✅ Different amounts and slippage
- ✅ Pool from token info usage

**Error Scenarios:**
- ❌ Insufficient balance
- ❌ Insufficient LP tokens
- ❌ No pools found
- ❌ Invalid pool keys

**Edge Cases:**
- 🔍 Very small and large amounts
- 🔍 Zero and negative amounts
- 🔍 Extreme slippage values

**Integration Scenarios:**
- 🔄 Complete liquidity lifecycle
- 🔄 Multiple consecutive operations
- 🔄 Different pools
- 🔄 Pool discovery and usage

### 6. AMM Pool Creation Tests (`createPool.test.ts`)

**Success Scenarios:**
- ✅ Successful pool creation
- ✅ Different token amounts
- ✅ Various pool indices
- ✅ SOL as quote token
- ✅ Custom token pairs

**Error Scenarios:**
- ❌ Insufficient balance
- ❌ Invalid mint addresses
- ❌ Network errors
- ❌ Pool already exists

**Edge Cases:**
- 🔍 Very small and large amounts
- 🔍 Zero and negative amounts
- 🔍 High pool indices
- 🔍 Same base and quote mint

**Integration Scenarios:**
- 🔄 Multiple consecutive creations
- 🔄 Different token pairs
- 🔄 Dynamic amount scaling
- 🔄 Token info updates

### 7. Comprehensive Integration Tests (`comprehensive.test.ts`)

**Complete Lifecycle:**
- 🔄 Token creation → Buy → Sell → Pool creation → AMM trading → Liquidity

**Error Recovery:**
- 🔄 Network failures and retries
- 🔄 Insufficient balance handling
- 🔄 Parameter adjustment strategies

**Concurrent Operations:**
- 🔄 Multiple token operations
- 🔄 AMM operations
- 🔄 State consistency

**Performance & Scalability:**
- 🔄 High-volume operations
- 🔄 Multiple token types
- 🔄 Efficient handling

**Edge Case Handling:**
- 🔄 Extreme parameter values
- 🔄 Rapid state changes
- 🔄 Graceful degradation

## 🛠️ Test Utilities

### TestHelpers Class

The `TestHelpers` class provides common utilities for all tests:

```typescript
// Get Solana connection
const connection = TestHelpers.getConnection();

// Load test wallet
const wallet = TestHelpers.loadTestWallet();

// Check wallet balance
const balance = await TestHelpers.checkWalletBalance(0.1);

// Create mock token config
const config = TestHelpers.createMockTokenConfig('PREFIX');

// Generate random PublicKey
const mint = TestHelpers.generateRandomPublicKey();

// Wait utility
await TestHelpers.wait(1000);

// Mock file system
const mockFs = TestHelpers.mockFileSystem();

// Create mock token info
const tokenInfo = TestHelpers.createMockTokenInfo();

// Validate transaction results
const isValid = TestHelpers.validateTransactionResult(result);

// Cleanup resources
TestHelpers.cleanup();
```

## 🧪 Mocking Strategy

All external dependencies are mocked to ensure:
- **Isolation**: Tests don't depend on external services
- **Predictability**: Consistent test results
- **Speed**: Fast test execution
- **Reliability**: No network dependencies

### Mocking Examples

```typescript
// Mock function calls
jest.mock('../../src/bonding-curve/createToken.js');
const mockCreatePumpFunToken = createPumpFunToken as jest.MockedFunction<typeof createPumpFunToken>;

// Mock return values
mockCreatePumpFunToken.mockResolvedValue({
  success: true,
  mint: 'MockMintAddress',
  signature: 'MockSignature'
});

// Mock errors
mockCreatePumpFunToken.mockRejectedValue(new Error('Mock error'));

// Verify calls
expect(mockCreatePumpFunToken).toHaveBeenCalledWith(expectedArgs);
expect(mockCreatePumpFunToken).toHaveBeenCalledTimes(expectedCount);
```

## 📊 Test Categories

### Unit Tests
- Individual function testing
- Parameter validation
- Error handling
- Edge cases

### Integration Tests
- Function interaction testing
- State consistency
- Error propagation
- Recovery mechanisms

### Performance Tests
- High-volume operations
- Concurrent operations
- Resource utilization
- Scalability validation

### Edge Case Tests
- Boundary conditions
- Invalid inputs
- Extreme values
- Error scenarios

## 🔍 Test Patterns

### Success Path Testing
```typescript
it('should complete operation successfully', async () => {
  // Arrange
  const mockResult = { success: true, data: 'expected' };
  mockFunction.mockResolvedValue(mockResult);
  
  // Act
  const result = await functionUnderTest();
  
  // Assert
  expect(result.success).toBe(true);
  expect(result.data).toBe('expected');
});
```

### Error Path Testing
```typescript
it('should handle errors gracefully', async () => {
  // Arrange
  const mockError = new Error('Expected error');
  mockFunction.mockRejectedValue(mockError);
  
  // Act & Assert
  await expect(functionUnderTest()).rejects.toThrow('Expected error');
});
```

### Edge Case Testing
```typescript
it('should handle edge cases', async () => {
  const edgeCases = [0, -1, 1000000, 'invalid'];
  
  for (const edgeCase of edgeCases) {
    // Test each edge case
    const result = await functionUnderTest(edgeCase);
    expect(result).toBeDefined();
  }
});
```

### Integration Testing
```typescript
it('should maintain state consistency', async () => {
  // Phase 1: Create
  const createResult = await createFunction();
  
  // Phase 2: Use created resource
  const useResult = await useFunction(createResult.id);
  
  // Verify consistency
  expect(useResult.resourceId).toBe(createResult.id);
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Mock Not Working**
   - Ensure function is properly mocked
   - Check import/export paths
   - Verify mock setup in beforeEach

2. **Test Timeouts**
   - Increase timeout in Jest config
   - Check for infinite loops
   - Verify async/await usage

3. **Type Errors**
   - Check TypeScript configuration
   - Verify import statements
   - Ensure proper type annotations

4. **Test Isolation**
   - Use beforeEach/afterEach properly
   - Clear mocks between tests
   - Avoid shared state

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* npm test
```

## 📈 Coverage Goals

- **Line Coverage**: >90%
- **Branch Coverage**: >85%
- **Function Coverage**: >95%
- **Statement Coverage**: >90%

## 🔄 Continuous Integration

The test suite is designed to run in CI/CD environments:
- Fast execution (<30 seconds)
- No external dependencies
- Consistent results
- Clear failure reporting

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)
- [Solana Testing Best Practices](https://docs.solana.com/developing/testing)
- [PumpFun Documentation](../docs/)

## 🤝 Contributing

To add new tests:

1. **Follow the existing pattern** for similar functionality
2. **Include edge cases** and error scenarios
3. **Add integration tests** for new features
4. **Update this README** with new test descriptions
5. **Ensure proper mocking** of external dependencies
6. **Test thoroughly** before submitting

## 📝 Test Naming Conventions

- **Describe blocks**: Use clear, descriptive names
- **Test cases**: Use "should" statements
- **File names**: Use descriptive names with `.test.ts` extension
- **Mock names**: Use descriptive names with "mock" prefix

Example:
```typescript
describe('PumpFun Token Creation', () => {
  it('should create a token successfully with valid configuration', async () => {
    // Test implementation
  });
});
```

---

**Note**: This test suite is designed for development and testing purposes. Always test on devnet before mainnet deployment.
