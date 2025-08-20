# Graduation Utilities Usage Guide

## Overview

The graduation utilities provide comprehensive tools to detect when a PumpFun token has "graduated" from bonding curve trading to AMM (Automated Market Maker) trading. This transition represents a significant milestone in a token's lifecycle, indicating increased liquidity and market maturity.

## What is Token Graduation?

Token graduation occurs when a token transitions from the initial bonding curve trading mechanism to AMM-based trading:

- **Bonding Curve Phase**: Direct token creation/destruction with mathematical pricing
- **AMM Phase**: Liquidity pool-based trading with market-driven pricing
- **Graduation**: The point when AMM becomes the primary trading mechanism

## Key Functions

### 1. `checkGraduationStatus(connection, tokenMint)`

Simple boolean check for graduation status.

```typescript
import { checkGraduationStatus } from '../src/utils/graduation-utils';

const isGraduated = await checkGraduationStatus(connection, tokenMint);
console.log(`Token graduated: ${isGraduated ? 'Yes' : 'No'}`);
```

**Returns**: `boolean` - `true` if graduated, `false` otherwise

### 2. `getGraduationAnalysis(connection, tokenMint)`

Comprehensive analysis with detailed status information.

```typescript
import { getGraduationAnalysis } from '../src/utils/graduation-utils';

const analysis = await getGraduationAnalysis(connection, tokenMint);
console.log('Graduation Analysis:', analysis);
```

**Returns**: Object with detailed graduation information:

```typescript
{
  isGraduated: boolean;
  hasAMMPools: boolean;
  hasSufficientLiquidity: boolean;
  bondingCurveActive: boolean;
  graduationReason: string;
}
```

## Graduation Criteria

A token is considered "graduated" when **ALL** of the following conditions are met:

1. ✅ **AMM Pools Exist**: Token has active AMM liquidity pools
2. ✅ **Sufficient Liquidity**: Pools have adequate liquidity for trading
3. ❌ **Bonding Curve Inactive**: Bonding curve is no longer the primary mechanism

## Graduation States

### 📈 Bonding Curve Only
- **Status**: Not graduated
- **Description**: Token exists only on bonding curve
- **Action**: Create AMM pool to enable graduation

### 🏊 AMM Pools Created
- **Status**: Not graduated (transitioning)
- **Description**: Token has AMM pools but bonding curve still active
- **Action**: Wait for bonding curve to become inactive

### 🎉 Fully Graduated
- **Status**: Graduated
- **Description**: Token primarily trades on AMM with inactive bonding curve
- **Action**: Monitor liquidity and consider adding more

### ❓ Unknown Status
- **Status**: Unclear
- **Description**: Unable to determine token status
- **Action**: Check network connection and program IDs

## Usage Examples

### Basic Graduation Check

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { checkGraduationStatus } from '../src/utils/graduation-utils';

async function checkTokenGraduation() {
  const connection = new Connection('https://api.devnet.solana.com');
  const tokenMint = new PublicKey('YourTokenMintAddress');
  
  const isGraduated = await checkGraduationStatus(connection, tokenMint);
  
  if (isGraduated) {
    console.log('🎉 Token has graduated to AMM trading!');
  } else {
    console.log('📈 Token is still using bonding curve trading');
  }
}
```

### Detailed Graduation Analysis

```typescript
import { getGraduationAnalysis } from '../src/utils/graduation-utils';

async function analyzeTokenGraduation() {
  const analysis = await getGraduationAnalysis(connection, tokenMint);
  
  console.log('📊 Graduation Analysis:');
  console.log(`   Graduated: ${analysis.isGraduated ? '✅ Yes' : '❌ No'}`);
  console.log(`   Has AMM Pools: ${analysis.hasAMMPools ? '✅ Yes' : '❌ No'}`);
  console.log(`   Sufficient Liquidity: ${analysis.hasSufficientLiquidity ? '✅ Yes' : '❌ No'}`);
  console.log(`   Bonding Curve Active: ${analysis.bondingCurveActive ? '✅ Yes' : '❌ No'}`);
  console.log(`   Reason: ${analysis.graduationReason}`);
  
  // Provide recommendations based on analysis
  if (analysis.isGraduated) {
    console.log('💡 Consider adding more liquidity to improve trading experience');
  } else if (analysis.hasAMMPools && !analysis.hasSufficientLiquidity) {
    console.log('💡 Add more liquidity to complete graduation');
  } else if (!analysis.hasAMMPools) {
    console.log('💡 Create AMM pool to enable graduation');
  }
}
```

### CLI Usage

Use the built-in CLI script to check graduation status:

```bash
# Check graduation status for your token
npm run cli:graduation-check
```

This will:
1. Load token information from `token-info.json`
2. Check AMM pool existence and liquidity
3. Verify bonding curve status
4. Provide comprehensive analysis and recommendations

## Implementation Details

### AMM Pool Detection

The utilities use multiple strategies to detect AMM pools:

1. **Canonical Pool**: Check for the primary pool (index 0)
2. **Common Indices**: Search common pool indices (0-5)
3. **Program Accounts**: Scan program accounts for pool data

### Bonding Curve Status

Bonding curve status is determined by:

1. **Account Existence**: Check if bonding curve PDA exists
2. **Program Ownership**: Verify account is owned by PumpFun program
3. **Data Validation**: Ensure account contains initialized data

### Liquidity Assessment

Liquidity is assessed by:

1. **Pool Accessibility**: Verify pool can be fetched via SDK
2. **Data Availability**: Check if liquidity data is accessible
3. **Minimum Thresholds**: Apply liquidity requirements (configurable)

## Error Handling

The utilities handle various error scenarios gracefully:

- **Network Errors**: Connection failures, timeouts
- **Program Errors**: Invalid program IDs, missing accounts
- **SDK Errors**: Version mismatches, unsupported operations
- **Data Errors**: Corrupted account data, invalid formats

All errors are logged and the utilities return safe defaults (assuming not graduated).

## Performance Considerations

### Caching

Consider implementing caching for:

- **Pool Data**: AMM pool information doesn't change frequently
- **Account Info**: Bonding curve status changes infrequently
- **Network State**: Connection and program state

### Rate Limiting

- **RPC Calls**: Limit concurrent requests to avoid rate limiting
- **Batch Operations**: Group related queries when possible
- **Retry Logic**: Implement exponential backoff for failed requests

## Testing

Run the graduation utilities tests:

```bash
npm test -- --testPathPattern=graduation-utils
```

Tests cover:
- ✅ Graduation detection logic
- ✅ AMM pool existence checks
- ✅ Bonding curve status verification
- ✅ Error handling scenarios
- ✅ Edge cases and boundary conditions

## Troubleshooting

### Common Issues

1. **"No AMM pools found"**
   - Verify token mint address is correct
   - Check if AMM pool was created
   - Ensure network connection is stable

2. **"Bonding curve account not found"**
   - Verify token was created on PumpFun
   - Check program ID configuration
   - Ensure account derivation is correct

3. **"Insufficient liquidity"**
   - Add more liquidity to AMM pools
   - Check pool configuration
   - Verify liquidity thresholds

### Debug Mode

Enable debug logging for detailed information:

```typescript
import { debugLog } from '../src/utils/debug';

// Set debug level
process.env.DEBUG = 'graduation:*';
```

## Integration Examples

### With Trading Mode Detection

```typescript
import { determineTradingMode } from '../src/utils/trading-mode';
import { checkGraduationStatus } from '../src/utils/graduation-utils';

async function getOptimalTradingMode(tokenMint: PublicKey) {
  const tradingMode = await determineTradingMode(connection, tokenMint);
  const isGraduated = await checkGraduationStatus(connection, tokenMint);
  
  if (isGraduated && tradingMode === 'amm') {
    return 'amm'; // Use AMM for graduated tokens
  } else if (tradingMode === 'bonding-curve') {
    return 'bonding-curve'; // Use bonding curve for non-graduated tokens
  } else {
    return 'hybrid'; // Both mechanisms available
  }
}
```

### With Liquidity Management

```typescript
import { getGraduationAnalysis } from '../src/utils/graduation-utils';

async function manageLiquidity(tokenMint: PublicKey) {
  const analysis = await getGraduationAnalysis(connection, tokenMint);
  
  if (analysis.hasAMMPools && !analysis.hasSufficientLiquidity) {
    // Add liquidity to complete graduation
    await addLiquidityToPool(tokenMint, liquidityAmount);
  } else if (analysis.isGraduated) {
    // Monitor and maintain liquidity
    await monitorPoolHealth(tokenMint);
  }
}
```

## Best Practices

1. **Regular Monitoring**: Check graduation status periodically
2. **Liquidity Management**: Maintain adequate pool liquidity
3. **Error Handling**: Implement proper error handling and logging
4. **Performance**: Cache results when appropriate
5. **Testing**: Test with various token states and network conditions

## Future Enhancements

Planned improvements include:

- **Graduation Metrics**: Track graduation progress over time
- **Liquidity Analytics**: Advanced liquidity analysis and recommendations
- **Multi-Chain Support**: Extend to other Solana programs
- **Real-time Updates**: WebSocket-based status updates
- **Graduation History**: Track token evolution and milestones

---

For more information, see the [main documentation](./README.md) or run `npm run help` for available CLI commands.
