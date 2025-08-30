# PumpFun AMM Usage Guide

## Overview

The PumpFun AMM (Automated Market Maker) implementation provides a complete solution for creating and managing token trading pools on Solana. It supports pool creation, token buying/selling, and liquidity management.

## Features

- **Pool Creation**: Create new trading pools for any token
- **Token Trading**: Buy and sell tokens using SOL
- **Liquidity Management**: Add and remove liquidity from pools
- **Pool Information**: Get detailed information about pools
- **Slippage Protection**: Configurable slippage tolerance for trades

## Installation

The AMM functionality is included in the main package. Make sure you have the required dependencies:

```bash
npm install @pump-fun/pump-swap-sdk @solana/web3.js @solana/spl-token
```

## Quick Start

### 1. Initialize AMM

```typescript
import { PumpAMM } from './src/amm/pump-amm.js';
import { createConnection } from './src/utils/connection.js';
import { SimpleWallet } from './src/utils/wallet.js';

const connection = createConnection();
const wallet = new SimpleWallet();
const amm = new PumpAMM(connection, wallet);
```

### 2. Create a Pool

```typescript
const poolResult = await amm.createPool(
  tokenMint, // Your token's mint address
  wrappedSolMint, // Wrapped SOL mint (So11111111111111111111111111111111111111112)
  1000000, // Initial token amount
  0.1, // Initial SOL amount
  0 // Pool index
);

if (poolResult.success) {
  console.log(`Pool created: ${poolResult.poolKey?.toString()}`);
}
```

### 3. Buy Tokens

```typescript
const buyResult = await amm.buyTokens(
  poolKey, // Pool key from pool creation
  0.05, // SOL amount to spend
  1 // 1% slippage tolerance
);

if (buyResult.success) {
  console.log(`Bought ${buyResult.baseAmount} tokens`);
}
```

### 4. Sell Tokens

```typescript
const sellResult = await amm.sellTokens(
  poolKey, // Pool key
  500000, // Token amount to sell
  1 // 1% slippage tolerance
);

if (sellResult.success) {
  console.log(`Received ${sellResult.quoteAmount} SOL`);
}
```

## CLI Usage

### AMM Liquidity CLI

The AMM liquidity CLI allows you to add and remove liquidity from trading pools:

```bash
# Add liquidity to a pool
npm run cli:amm:liquidity -- --action add --input-token ./wallets/token-info.json --wallet ./wallets/creator-wallet.json --amount 1000

# Remove liquidity from a pool
npm run cli:amm:liquidity -- --action remove --input-token ./wallets/token-info.json --wallet ./wallets/creator-wallet.json --amount 500

# With custom slippage (100 basis points = 1%)
npm run cli:amm:liquidity -- --action add --input-token ./wallets/token-info.json --wallet ./wallets/creator-wallet.json --amount 1000 --slippage 100

# With specific pool key
npm run cli:amm:liquidity -- --action add --input-token ./wallets/token-info.json --wallet ./wallets/creator-wallet.json --amount 1000 --pool-key <pool-address>
```

### AMM Buy/Sell CLI

```bash
# Buy tokens from AMM pool
npm run cli:amm:buy -- --amount 0.1 --input-token ./wallets/token-info.json --wallet ./wallets/creator-wallet.json

# Sell tokens to AMM pool
npm run cli:amm:sell -- --amount 1000 --input-token ./wallets/token-info.json --wallet ./wallets/creator-wallet.json
```

### AMM Pool Creation CLI

```bash
# Create a new AMM pool
npm run cli:amm:create-pool -- --input-token ./wallets/token-info.json --wallet ./wallets/creator-wallet.json --amount 1000000 --sol-amount 0.1
```

### AMM Info CLI

```bash
# Get pool information
npm run cli:amm:info -- --input-token ./wallets/token-info.json
```

## Testing AMM Functionality

### Available Test Scripts

```bash
# Pool Information Test
npm run test:amm:info

# Liquidity Test (Full Cycle)
npm run test:amm:liquidity

# Add Liquidity Only
npm run test:amm:add-only

# Run All AMM Tests
npm run test:amm:all

# Interactive Test Runner
npm run test:amm:runner
```

### Test Prerequisites

#### Configuration Setup

- Ensure `token-info.json` exists in the project root
- File should contain token mint address and optional pool key
- Example structure:
  ```json
  {
    "mint": "CzUJmMSucov47sFqAyv1Pw2uLqAWrTDjHk41GFn2M3HA",
    "name": "TEST-FLOW-TOKEN",
    "symbol": "TFT",
    "poolKey": "Bev3AwCrNdZXF5WmLwxG3oipDcgxqQ6s8LTMNCs8i5k6"
  }
  ```

#### Wallet Setup

- **Required**: All AMM CLI commands now require the `--wallet` parameter
- Ensure you have a test wallet in `wallets/creator-wallet.json`
- Wallet should have at least 0.2 SOL for comprehensive testing
- Minimum 0.1 SOL for basic functionality
- **Important**: The `--wallet` parameter specifies the wallet file, not the token info file

#### Token Requirements

- The scripts automatically load token information from `token-info.json`
- Token should have an existing AMM pool on Solana devnet
- If `poolKey` is specified in `token-info.json`, it will be used directly
- Otherwise, the scripts will search for available pools
- Pool should have sufficient liquidity for testing

## Advanced Features

### Liquidity Management

#### Adding Liquidity

```typescript
const addLiquidityResult = await amm.addLiquidity(
  poolKey, // Pool key
  1000000, // Token amount
  0.1, // SOL amount
  1 // Slippage tolerance
);

if (addLiquidityResult.success) {
  console.log(`Added liquidity: ${addLiquidityResult.lpTokens} LP tokens`);
}
```

#### Removing Liquidity

```typescript
const removeLiquidityResult = await amm.removeLiquidity(
  poolKey, // Pool key
  500000, // LP token amount
  1 // Slippage tolerance
);

if (removeLiquidityResult.success) {
  console.log(
    `Removed liquidity: ${removeLiquidityResult.baseAmount} tokens, ${removeLiquidityResult.quoteAmount} SOL`
  );
}
```

### Pool Information

```typescript
const poolInfo = await amm.getPoolInfo(poolKey);

console.log('Pool Information:');
console.log(`- Base Token: ${poolInfo.baseTokenMint}`);
console.log(`- Quote Token: ${poolInfo.quoteTokenMint}`);
console.log(`- Base Reserves: ${poolInfo.baseReserves}`);
console.log(`- Quote Reserves: ${poolInfo.quoteReserves}`);
console.log(`- LP Supply: ${poolInfo.lpSupply}`);
```

## Configuration

### Environment Variables

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
NETWORK=devnet
COMMITMENT=confirmed

# Priority Fee Configuration
BASE_PRIORITY_FEE=5000
MAX_PRIORITY_FEE=50000
PRIORITY_FEE_MULTIPLIER=1.5
```

### AMM Parameters

```typescript
const ammConfig = {
  slippageTolerance: 1, // 1% slippage
  maxRetries: 3, // Maximum retry attempts
  retryDelay: 1000, // Delay between retries (ms)
  priorityFeeMultiplier: 1.5, // Priority fee multiplier
};
```

## Error Handling

### Common Errors

1. **Insufficient Balance**: Ensure wallet has sufficient SOL and tokens
2. **Pool Not Found**: Verify pool exists and is accessible
3. **Slippage Exceeded**: Adjust slippage tolerance or reduce trade size
4. **Network Issues**: Check Solana network status and RPC endpoint

### Error Recovery

```typescript
try {
  const result = await amm.buyTokens(poolKey, 0.1, 1);
  if (!result.success) {
    console.error('Buy failed:', result.error);
    // Implement retry logic or fallback
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Handle unexpected errors
}
```

## Performance Optimization

### Transaction Batching

```typescript
// Batch multiple operations for efficiency
const batchResult = await amm.batchOperations([
  { type: 'addLiquidity', params: [poolKey, 1000000, 0.1, 1] },
  { type: 'buyTokens', params: [poolKey, 0.05, 1] },
]);
```

### Priority Fee Management

```typescript
// Dynamic priority fee calculation
const priorityFee = await amm.calculateOptimalPriorityFee();
const result = await amm.buyTokens(poolKey, 0.1, 1, priorityFee);
```

## Monitoring and Analytics

### Pool Metrics

```typescript
const metrics = await amm.getPoolMetrics(poolKey);

console.log('Pool Metrics:');
console.log(`- Volume 24h: ${metrics.volume24h} SOL`);
console.log(`- Price Change 24h: ${metrics.priceChange24h}%`);
console.log(`- Liquidity: ${metrics.totalLiquidity} SOL`);
console.log(`- Fee Revenue: ${metrics.feeRevenue} SOL`);
```

### Transaction History

```typescript
const history = await amm.getTransactionHistory(poolKey, 100);

history.forEach(tx => {
  console.log(`${tx.type}: ${tx.amount} at ${tx.timestamp}`);
});
```

## Security Considerations

### Slippage Protection

- Always set appropriate slippage tolerance
- Monitor large trades for price impact
- Use limit orders for critical transactions

### Pool Verification

- Verify pool addresses before transactions
- Check pool liquidity and health
- Monitor for suspicious activity

### Wallet Security

- Use dedicated test wallets for development
- Never share private keys
- Implement proper key management

## Troubleshooting

### Common Issues

1. **Wallet Parameter Errors**
   - **Error**: `"bad secret key size"` or `"Failed to load wallet from token-info.json"`
   - **Solution**: Always use `--wallet` parameter to specify wallet file, not `--input-token`
   - **Example**: `--wallet ./wallets/creator-wallet.json` (not `--input-token ./wallets/creator-wallet.json`)

2. **Transaction Failures**
   - Check wallet balance
   - Verify pool exists and is healthy
   - Increase priority fees for network congestion

3. **Pool Not Found**
   - Verify token mint address
   - Check if pool has been created
   - Ensure pool is on the correct network

4. **Insufficient Liquidity**
   - Check pool reserves
   - Reduce trade size
   - Wait for more liquidity to be added

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
DEBUG=amm:* npm run test:amm:info
```

## Integration Examples

### With Bonding Curve

```typescript
// Create token on bonding curve first
const tokenResult = await bondingCurve.createToken(tokenConfig);

// Then create AMM pool
const poolResult = await amm.createPool(tokenResult.mint, wrappedSolMint, 1000000, 0.1, 0);
```

### With Other DeFi Protocols

```typescript
// Integrate with other Solana DeFi protocols
const swapResult = await amm.buyTokens(poolKey, 0.1, 1);

// Use tokens in other protocols
const stakeResult = await stakingProtocol.stake(swapResult.baseAmount);
```

---

For more detailed testing information, see the [Pool Creation Guide](./pool-creation-guide.md).
