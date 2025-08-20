# AMM Liquidity Pool Creation Guide

## Overview

This guide explains how to create Automated Market Maker (AMM) liquidity pools for PumpFun tokens using the `createPool` function. The pool creation process allows tokens to be traded against SOL or other tokens on the PumpFun platform.

## Key Concepts

### Pool Key vs Mint Address
- **Mint Address**: The unique identifier for your token (created during token creation)
- **Pool Key**: The unique identifier for the liquidity pool (created during pool creation)
- **Relationship**: One token can have multiple pools, but each pool has a unique key

### Trading Modes
- **Bonding Curve**: Direct token creation/destruction with mathematical pricing
- **AMM**: Liquidity pool-based trading with market-driven pricing

## Pool Creation Process

### 1. Prerequisites
- Token must be created and minted
- Wallet must have sufficient SOL for transaction fees
- Wallet must have sufficient tokens to provide liquidity

### 2. Pool Parameters
```typescript
const baseMint = new PublicKey(tokenMint); // Your token
const quoteMint = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL
const baseIn = 1000000; // Amount of your tokens (1M)
const quoteIn = 0.1; // Amount of SOL (0.1 SOL)
const poolIndex = 0; // Pool identifier
```

### 3. Execution
```bash
npm run test:create-pool
```

## Updated Token Information Structure

After pool creation, `token-info.json` will be updated with:

```json
{
  "mint": "FrSLPipNUawXMkq4RUpihd6AFJg2hSdyk7qEeudc91s8",
  "name": "TEST-CREATE-TOKEN",
  "symbol": "TCT",
  "createdAt": "2025-08-22T14:38:32.936Z",
  "poolKey": "PoolKeyAddressHere",
  "poolCreatedAt": "2025-08-22T15:00:00.000Z",
  "poolTransaction": "TransactionSignatureHere",
  "poolConfig": {
    "baseAmount": 1000000,
    "quoteAmount": 0.1,
    "poolIndex": 0
  },
  "tradingMode": "amm"
}
```

## Important Notes

### Pool Key Usage
- **Trading**: Use pool key for AMM buy/sell operations
- **Liquidity**: Use pool key for adding/removing liquidity
- **Information**: Use pool key to query pool state and pricing

### Multiple Pools
- A token can have multiple pools (different indices)
- Each pool can have different base/quote token pairs
- Pool index 0 is typically the primary pool

### Liquidity Requirements
- Initial liquidity determines the starting price
- More liquidity = lower price impact per trade
- Consider market conditions when setting initial amounts

## Error Handling

Common errors and solutions:

1. **Insufficient Balance**: Ensure wallet has enough tokens and SOL
2. **Account Not Initialized**: Check token and wallet setup
3. **SDK Type Mismatch**: Parameters are automatically converted to BigNumber
4. **Network Congestion**: Retry logic is built into the function

## Testing

### Manual Test
```bash
npm run test:create-pool
```

### Programmatic Test
```typescript
import { testCreatePool } from './cli/create-pool-test.js';

await testCreatePool();
```

## Next Steps

After creating a pool:

1. **Add Liquidity**: Increase pool depth for better trading
2. **Test Trading**: Use AMM buy/sell functions
3. **Monitor**: Track pool performance and liquidity
4. **Optimize**: Adjust parameters based on market conditions

## Files Modified

- `cli/create-pool-test.ts` - Main pool creation test
- `cli/run-create-pool-test.ts` - Runner script
- `token-info.json` - Updated structure with pool fields
- `package.json` - Added npm script
- `cli/index.ts` - Exported new functions
