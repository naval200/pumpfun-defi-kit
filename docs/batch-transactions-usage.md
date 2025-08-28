# Batch Transactions CLI

The Batch Transactions CLI allows you to execute multiple PumpFun operations in parallel, including token transfers, buys, and sells across both bonding curve and AMM modes. This is particularly useful for bulk operations, testing scenarios, or managing multiple positions simultaneously.

## Features

- **Multiple Operation Types**: Support for transfers, bonding curve buys/sells, and AMM buys/sells
- **Parallel Execution**: Execute multiple transactions simultaneously for improved performance
- **Mandatory Fee Payer**: All operations use a dedicated fee payer wallet to ensure consistent fee handling
- **Batch Processing**: Group operations into configurable batch sizes
- **Retry Logic**: Automatic retry of failed transactions
- **Dry Run Mode**: Preview operations without executing them
- **Comprehensive Reporting**: Detailed success/failure reporting with transaction signatures

## Prerequisites

- A fee payer wallet with sufficient SOL for transaction fees
- The main wallet with tokens/balances for the operations
- Valid operation parameters (addresses, amounts, etc.)

## Usage

### Basic Command Structure

```bash
npm run cli:batch-transactions --operations <path> --fee-payer <path> [options]
```

### Required Parameters

- `--operations <path>`: Path to JSON file containing batch operations
- `--fee-payer <path>`: Path to fee payer wallet JSON file

### Optional Parameters

- `--wallet <path>`: Path to main wallet JSON file (uses default if not specified)
- `--max-parallel <number>`: Maximum parallel transactions (default: 3)
- `--retry-failed`: Retry failed transactions once
- `--delay-between <ms>`: Delay between transaction batches in milliseconds (default: 1000)
- `--dry-run`: Show what would be executed without actually running

## Operations JSON Format

The operations file should contain an array of operation objects. Each operation has the following structure:

```json
{
  "type": "operation-type",
  "id": "unique-identifier",
  "description": "Human-readable description",
  "params": {
    // Operation-specific parameters
  }
}
```

### Supported Operation Types

#### 1. Token Transfer (`transfer`)

Transfers tokens between wallets.

```json
{
  "type": "transfer",
  "id": "transfer-1",
  "description": "Send 100 tokens to user A",
  "params": {
    "recipient": "11111111111111111111111111111111",
    "mint": "22222222222222222222222222222222",
    "amount": "100000000",
    "createAccount": true
  }
}
```

**Parameters:**
- `recipient`: Recipient's public key
- `mint`: Token mint address
- `amount`: Amount in smallest token units (e.g., lamports for SOL)
- `createAccount`: Whether to create recipient account if it doesn't exist

#### 2. AMM Buy (`buy-amm`)

Buy tokens from an AMM pool.

```json
{
  "type": "buy-amm",
  "id": "buy-amm-1",
  "description": "Buy tokens from AMM pool 1",
  "params": {
    "poolKey": "44444444444444444444444444444444",
    "amount": 0.1,
    "slippage": 1
  }
}
```

**Parameters:**
- `poolKey`: AMM pool public key
- `amount`: SOL amount to spend
- `slippage`: Slippage tolerance in percentage

#### 3. AMM Sell (`sell-amm`)

Sell tokens to an AMM pool.

```json
{
  "type": "sell-amm",
  "id": "sell-amm-1",
  "description": "Sell tokens to AMM pool 1",
  "params": {
    "poolKey": "44444444444444444444444444444444",
    "amount": 1000,
    "slippage": 1
  }
}
```

**Parameters:**
- `poolKey`: AMM pool public key
- `amount`: Token amount to sell
- `slippage`: Slippage tolerance in percentage

#### 4. Bonding Curve Buy (`buy-bonding-curve`)

Buy tokens via bonding curve.

```json
{
  "type": "buy-bonding-curve",
  "id": "buy-bc-1",
  "description": "Buy tokens via bonding curve",
  "params": {
    "mint": "66666666666666666666666666666666",
    "amount": 0.1,
    "slippage": 1000
  }
}
```

**Parameters:**
- `mint`: Token mint address
- `amount`: SOL amount to spend
- `slippage`: Slippage tolerance in basis points

#### 5. Bonding Curve Sell (`sell-bonding-curve`)

Sell tokens via bonding curve.

```json
{
  "type": "sell-bonding-curve",
  "id": "sell-bc-1",
  "description": "Sell tokens via bonding curve",
  "params": {
    "mint": "66666666666666666666666666666666",
    "amount": 500,
    "slippage": 1000
  }
}
```

**Parameters:**
- `mint`: Token mint address
- `amount`: Token amount to sell
- `slippage`: Slippage tolerance in basis points

## Examples

### Example 1: Basic Batch Execution

```bash
npm run cli:batch-transactions \
  --operations examples/batch-operations-example.json \
  --fee-payer wallets/fee-payer.json
```

### Example 2: Custom Parallelization and Retry

```bash
npm run cli:batch-transactions \
  --operations examples/batch-operations-example.json \
  --fee-payer wallets/fee-payer.json \
  --max-parallel 5 \
  --retry-failed \
  --delay-between 2000
```

### Example 3: Dry Run Mode

```bash
npm run cli:batch-transactions \
  --operations examples/batch-operations-example.json \
  --fee-payer wallets/fee-payer.json \
  --dry-run
```

### Example 4: Custom Wallet

```bash
npm run cli:batch-transactions \
  --operations examples/batch-operations-example.json \
  --fee-payer wallets/fee-payer.json \
  --wallet wallets/custom-wallet.json
```

## Operation Execution Flow

1. **Load Operations**: Parse the JSON file and validate operation structure
2. **Batch Creation**: Group operations into batches based on `max-parallel` setting
3. **Parallel Execution**: Execute operations within each batch simultaneously
4. **Batch Delays**: Wait between batches to avoid network congestion
5. **Retry Logic**: Optionally retry failed operations
6. **Result Reporting**: Provide comprehensive success/failure reporting

## Performance Considerations

- **Parallel Limits**: Higher parallel limits increase throughput but may hit rate limits
- **Batch Delays**: Longer delays reduce network congestion but increase total execution time
- **Network Conditions**: Adjust parameters based on current Solana network conditions
- **Fee Payer Balance**: Ensure fee payer has sufficient SOL for all operations

## Error Handling

- **Individual Failures**: Failed operations don't stop the batch; they're reported separately
- **Retry Mechanism**: Failed operations can be automatically retried once
- **Detailed Logging**: Each operation's success/failure is logged with specific error messages
- **Transaction Signatures**: Successful operations include transaction signatures for verification

## Best Practices

1. **Test with Dry Run**: Always use `--dry-run` first to verify operation parameters
2. **Start Small**: Begin with small batches and increase parallelization gradually
3. **Monitor Network**: Check Solana network status before running large batches
4. **Validate Addresses**: Ensure all addresses in the operations file are valid
5. **Sufficient Balances**: Verify wallets have sufficient tokens and SOL before execution
6. **Backup Operations**: Keep backup copies of operation files

## Troubleshooting

### Common Issues

1. **Invalid JSON Format**: Ensure the operations file is valid JSON
2. **Missing Fee Payer**: Fee payer wallet is mandatory and must have sufficient SOL
3. **Invalid Addresses**: Check that all public keys are valid Solana addresses
4. **Insufficient Balances**: Verify wallets have sufficient tokens for transfers/sells
5. **Network Congestion**: Increase delays between batches during high network usage

### Debug Mode

For detailed debugging, the CLI provides comprehensive logging:
- Operation execution details
- Transaction signatures
- Error messages with context
- Batch progress information

## Security Considerations

- **Fee Payer Security**: The fee payer wallet should be separate from main operation wallets
- **Private Key Protection**: Ensure wallet files are stored securely and not committed to version control
- **Operation Validation**: Always review operations before execution, especially in production
- **Network Selection**: Verify you're operating on the intended network (devnet/mainnet)

## Future Enhancements

- **Conditional Operations**: Support for operations that depend on previous results
- **Dynamic Parameters**: Runtime parameter adjustment based on market conditions
- **Scheduled Execution**: Time-based operation scheduling
- **Advanced Retry Logic**: Configurable retry strategies with exponential backoff
- **Operation Templates**: Reusable operation patterns for common scenarios
