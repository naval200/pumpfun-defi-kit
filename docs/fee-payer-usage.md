# Fee Payer Functionality Guide

This guide explains how to use the optional fee payer functionality in the PumpFun DefiKit, which allows you to separate the wallet that pays transaction fees from the wallet that owns the tokens or performs the operation.

## Overview

The fee payer functionality enables scenarios where:
- A **treasury wallet** pays transaction fees for multiple users
- A **relayer service** covers costs for user transactions
- **Batch operations** where one wallet covers fees for multiple operations
- **Gasless transactions** where users don't need SOL for fees

## Supported Operations

The following operations now support fee payers:

### 1. Bonding Curve Operations
- **Buy tokens**: `--fee-payer <path>` option
- **Sell tokens**: `--fee-payer <path>` option

### 2. AMM Operations
- **Buy tokens**: `--fee-payer <path>` option
- **Sell tokens**: `--fee-payer <path>` option

### 3. Token Transfer
- **Send tokens**: `--fee-payer <path>` option

## CLI Usage Examples

### Basic Fee Payer Usage

```bash
# Buy tokens with separate fee payer
npm run cli:bc-buy \
  --amount 0.1 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/user-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json

# Sell tokens with separate fee payer
npm run cli:bc-sell \
  --amount 1000 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/user-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json

# Send tokens with separate fee payer
npm run cli:send-token \
  --recipient 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --amount 1000 \
  --wallet ./fixtures/sender-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json

# AMM operations with fee payer
npm run cli:amm-buy \
  --amount 0.1 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/user-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json

npm run cli:amm-sell \
  --amount 1000 \
  --input-token ./fixtures/token-info.json \
  --wallet ./fixtures/user-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json
```

### Advanced Scenarios

#### Treasury Wallet Setup
```bash
# Create a treasury wallet for fee payments
solana-keygen new -o ./fixtures/treasury-wallet.json

# Fund the treasury wallet with SOL for fees
solana transfer --from ~/.config/solana/id.json \
  --to $(solana-keygen pubkey ./fixtures/treasury-wallet.json) \
  --amount 1 \
  --url devnet
```

#### Batch Operations
```bash
# Multiple users can use the same treasury for fees
npm run cli:bc-buy \
  --amount 0.05 \
  --wallet ./fixtures/user1-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json

npm run cli:bc-buy \
  --amount 0.03 \
  --wallet ./fixtures/user2-wallet.json \
  --fee-payer ./fixtures/treasury-wallet.json
```

## Programmatic Usage

### Core Functions

All core functions now accept an optional `feePayer` parameter:

```typescript
import { buyPumpFunToken } from './src/bonding-curve/buy';
import { sellPumpFunToken } from './src/bonding-curve/sell';
import { sendToken } from './src/sendToken';
import { buyTokens } from './src/amm/buy';
import { sellTokens } from './src/amm/sell';

// Bonding curve operations
const signature = await buyPumpFunToken(
  connection,
  userWallet,      // User's wallet (owns tokens)
  mint,
  amountLamports,
  slippage,
  treasuryWallet   // Treasury wallet (pays fees)
);

const signature = await sellPumpFunToken(
  connection,
  userWallet,      // User's wallet (owns tokens)
  mint,
  tokenAmount,
  treasuryWallet   // Treasury wallet (pays fees)
);

// Token transfer
const result = await sendToken(
  connection,
  senderWallet,    // Sender's wallet (owns tokens)
  recipient,
  mint,
  amount,
  false,           // allowOwnerOffCurve
  true,            // createRecipientAccount
  treasuryWallet   // Treasury wallet (pays fees)
);

// AMM operations
const buyResult = await buyTokens(
  connection,
  userWallet,      // User's wallet (owns tokens)
  poolKey,
  quoteAmount,
  slippage,
  treasuryWallet   // Treasury wallet (pays fees)
);

const sellResult = await sellTokens(
  connection,
  userWallet,      // User's wallet (owns tokens)
  poolKey,
  baseAmount,
  slippage,
  treasuryWallet   // Treasury wallet (pays fees)
);
```

### Transaction Utilities

The transaction utilities now support fee payers:

```typescript
import { 
  sendAndConfirmTransactionWithFeePayer,
  sendTransactionWithFeePayer 
} from './src/utils/transaction';

// Send transaction with separate fee payer
const result = await sendAndConfirmTransactionWithFeePayer(
  connection,
  transaction,
  [userWallet],        // Signers (users)
  treasuryWallet,      // Fee payer
  { preflightCommitment: 'confirmed' }
);

// Send transaction with instructions and fee payer
const signature = await sendTransactionWithFeePayer(
  connection,
  userWallet,          // User wallet
  instructions,        // Transaction instructions
  treasuryWallet       // Fee payer
);
```

## Wallet File Format

Fee payer wallets use the same format as regular wallets:

```json
[
  123, 45, 67, 89, 12, 34, 56, 78, 90, 12, 34, 56, 78, 90, 12, 34,
  56, 78, 90, 12, 34, 56, 78, 90, 12, 34, 56, 78, 90, 12, 34, 56,
  78, 90, 12, 34, 56, 78, 90, 12, 34, 56, 78, 90, 12, 34, 56, 78,
  90, 12, 34, 56, 78, 90, 12, 34, 56, 78, 90, 12, 34, 56, 78, 90
]
```

## Security Considerations

### Fee Payer Responsibilities
- **Fee payer must have sufficient SOL** for transaction fees
- **Fee payer signs the transaction** and pays the fees
- **Fee payer does not own the tokens** being transferred/traded

### Best Practices
1. **Use dedicated treasury wallets** for fee payments
2. **Monitor treasury balances** to ensure sufficient funds
3. **Limit treasury wallet permissions** to fee payment only
4. **Regularly rotate treasury keys** for security
5. **Audit fee payment logs** for transparency

### Risk Mitigation
- **Set spending limits** on treasury wallets
- **Use multi-signature wallets** for large treasuries
- **Implement rate limiting** to prevent abuse
- **Monitor for unusual fee patterns**

## Error Handling

### Common Fee Payer Errors

```typescript
// Insufficient fee payer balance
if (error.message.includes('InsufficientFunds')) {
  console.log('💡 Fee payer wallet has insufficient SOL for fees');
}

// Fee payer not found
if (error.message.includes('AccountNotFound')) {
  console.log('💡 Fee payer wallet file not found or invalid');
}

// Transaction signature mismatch
if (error.message.includes('Transaction signature verification failed')) {
  console.log('💡 Fee payer wallet signature verification failed');
}
```

### Debugging Tips

1. **Check fee payer balance**:
   ```bash
   solana balance --url devnet ./fixtures/treasury-wallet.json
   ```

2. **Verify wallet file format**:
   ```bash
   solana-keygen verify ./fixtures/treasury-wallet.json
   ```

3. **Test with small amounts** first to validate setup

4. **Check transaction logs** for detailed error information

## Performance Considerations

### Fee Calculation
- **Base fee**: ~0.000005 SOL per transaction
- **Priority fee**: Variable based on network congestion
- **Compute units**: Depends on transaction complexity

### Batch Operations
- **Single fee payer** can handle multiple transactions
- **Efficient for bulk operations** (e.g., airdrops, rewards)
- **Cost savings** compared to individual fee payments

## Migration Guide

### From Previous Versions

If you're upgrading from a previous version:

1. **No breaking changes** - existing code continues to work
2. **Fee payer parameter is optional** - defaults to user wallet
3. **Backward compatibility** maintained for all functions

### Code Updates

```typescript
// Old way (still works)
const result = await buyPumpFunToken(connection, wallet, mint, amount, slippage);

// New way with fee payer
const result = await buyPumpFunToken(connection, wallet, mint, amount, slippage, feePayer);

// Both work identically when feePayer is undefined
```

## Troubleshooting

### Common Issues

1. **"Fee payer wallet not found"**
   - Check file path and permissions
   - Verify wallet file format

2. **"Insufficient fee payer balance"**
   - Fund the fee payer wallet with SOL
   - Check current balance

3. **"Transaction signature verification failed"**
   - Ensure fee payer wallet is valid
   - Check for file corruption

4. **"Permission denied"**
   - Verify wallet file ownership
   - Check file permissions

### Support

For additional support:
- Check the main [README.md](../README.md)
- Review [TESTING_GUIDE.md](TESTING_GUIDE.md)
- Open an issue on the repository

## Conclusion

The fee payer functionality provides flexibility for various use cases while maintaining security and performance. Whether you're building a treasury system, relayer service, or batch operation tool, this feature enables efficient transaction management without compromising user experience.
