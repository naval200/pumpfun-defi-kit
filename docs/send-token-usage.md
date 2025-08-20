# SendToken Function Usage Guide

The `sendToken` function allows you to transfer tokens between addresses on Solana, with support for both bonding curve and AMM tokens. It automatically handles recipient account creation when needed.

## Overview

Since both bonding curve and AMM tokens are standard SPL tokens, the `sendToken` function works seamlessly with both trading modes. The function provides:

- **Automatic account creation**: Creates recipient token accounts if they don't exist
- **Balance validation**: Checks sender has sufficient tokens before transfer
- **Transaction handling**: Uses the existing transaction utilities for reliable execution
- **Error handling**: Comprehensive error reporting and validation

## Core Functions

### 1. `sendToken(connection, sender, recipient, mint, amount, allowOwnerOffCurve?, createRecipientAccount?)`

The main function that handles token transfers with configurable options.

```typescript
async function sendToken(
  connection: Connection,
  sender: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: bigint,
  allowOwnerOffCurve?: boolean,
  createRecipientAccount?: boolean
): Promise<{ success: boolean; signature?: string; error?: string; recipientAccount?: PublicKey }>
```

**Parameters:**
- `connection`: Solana connection instance
- `sender`: Keypair of the sender (must own the tokens)
- `recipient`: Public key of the recipient
- `mint`: Public key of the token mint
- `amount`: Amount of tokens to send (in smallest unit)
- `allowOwnerOffCurve`: Whether to allow off-curve owners (default: false)
- `createRecipientAccount`: Whether to create recipient account if needed (default: true)

**Returns:**
```typescript
{
  success: boolean;
  signature?: string;
  error?: string;
  recipientAccount?: PublicKey;
}
```

### 2. `sendTokenWithAccountCreation(connection, sender, recipient, mint, amount, allowOwnerOffCurve?)`

Convenience function that always creates recipient accounts when needed.

```typescript
const result = await sendTokenWithAccountCreation(
  connection,
  senderWallet,
  recipientAddress,
  tokenMint,
  amount
);
```

### 3. `sendTokenToExistingAccount(connection, sender, recipient, mint, amount, allowOwnerOffCurve?)`

Function that only sends to existing recipient accounts (fails if account doesn't exist).

```typescript
const result = await sendTokenToExistingAccount(
  connection,
  senderWallet,
  recipientAddress,
  tokenMint,
  amount
);
```

### 4. `canReceiveTokens(connection, recipient, mint, allowOwnerOffCurve?)`

Utility function to check if a recipient can receive tokens.

```typescript
const canReceive = await canReceiveTokens(
  connection,
  recipientAddress,
  tokenMint
);

if (canReceive.canReceive) {
  if (canReceive.hasAccount) {
    console.log('Recipient has existing account');
  } else {
    console.log('Recipient can receive but needs account creation');
  }
}
```

## Usage Examples

### Basic Token Transfer

```typescript
import { sendToken } from '@pump-fun/defikit';
import { getConnection } from '@pump-fun/defikit/utils/connection';
import { getWalletFromEnv } from '@pump-fun/defikit/utils/wallet';

async function transferTokens() {
  const connection = getConnection();
  const wallet = getWalletFromEnv();
  const recipient = new PublicKey('recipient-address-here');
  const mint = new PublicKey('token-mint-address-here');
  const amount = BigInt(1000); // 1000 tokens

  const result = await sendToken(
    connection,
    wallet,
    recipient,
    mint,
    amount,
    false, // allowOwnerOffCurve
    true   // createRecipientAccount
  );

  if (result.success) {
    console.log(`Transfer successful! Signature: ${result.signature}`);
    console.log(`Recipient account: ${result.recipientAccount}`);
  } else {
    console.error(`Transfer failed: ${result.error}`);
  }
}
```

### Transfer to Existing Account Only

```typescript
async function transferToExistingAccount() {
  const result = await sendToken(
    connection,
    wallet,
    recipient,
    mint,
    amount,
    false, // allowOwnerOffCurve
    false  // createRecipientAccount - Will fail if account doesn't exist
  );

  if (!result.success) {
    console.error(`Transfer failed: ${result.error}`);
  }
}
```

### Transfer with Off-Curve Owner Support

```typescript
async function transferToProgramAccount() {
  const result = await sendToken(
    connection,
    wallet,
    recipient,
    mint,
    amount,
    true,  // allowOwnerOffCurve - For program-owned accounts
    true   // createRecipientAccount
  );
}
```

## Working with Different Token Types

### Bonding Curve Tokens

```typescript
// After creating a bonding curve token
import { createToken } from '@pump-fun/defikit';

const createResult = await createToken({
  // ... token creation params
});

if (createResult.success && createResult.mint) {
  const mint = new PublicKey(createResult.mint);
  
  // Send some tokens to another address
  const transferResult = await sendToken(
    connection,
    wallet,
    anotherWallet.publicKey,
    mint,
    BigInt(1000)
  );
}
```

### AMM Tokens

```typescript
// After creating an AMM pool
import { createPool } from '@pump-fun/defikit';

const poolResult = await createPool({
  // ... pool creation params
});

if (poolResult.success && poolResult.mint) {
  const mint = new PublicKey(poolResult.mint);
  
  // Send tokens to liquidity provider
  const transferResult = await sendToken(
    connection,
    wallet,
    liquidityProvider.publicKey,
    mint,
    BigInt(500)
  );
}
```

## CLI Usage

The package includes a CLI script for easy token transfers:

```bash
# Send 1000 tokens to an existing account
tsx cli/send-token-cli.ts <recipient_address> <mint_address> 1000

# Send tokens without creating recipient account
tsx cli/send-token-cli.ts <recipient_address> <mint_address> 1000 false

# Send tokens with explicit account creation
tsx cli/send-token-cli.ts <recipient_address> <mint_address> 1000 true
```

### Working CLI Examples

#### 1. Check Wallet Balances
```bash
# Check what tokens are available in a wallet
tsx cli/check-wallet-balances.ts
```

#### 2. Buy Tokens from Bonding Curve
```bash
# Buy tokens using SOL
tsx cli/bonding-curve/buy-cli.ts --amount 0.01 --input-token wallets/token-info-2.json --wallet wallets/creator-wallet.json
```

#### 3. Send Tokens Between Wallets
```bash
# Set wallet environment variable
export WALLET_PRIVATE_KEY=$(cat wallets/creator-wallet.json)

# Send tokens using the working test script
tsx cli/test-send-working.ts
```

### Test Results

The send functionality has been successfully tested with real transactions on Solana devnet:

- **From**: Creator wallet (`4m3zWwvK9dgtfdz3teFeAFQTzjpsyuFdu2uaDZk8qBP8`)
- **To**: Trading wallet (`2wVYga9kfYsmKn3WJfSTfQP5ZjSSzMLJZVUc5n7QTZiQ`)
- **Token**: TCT (TEST-CREATE-TOKEN)
- **Amount**: 1000 tokens
- **Transaction**: [View on Solana Explorer](https://explorer.solana.com/tx/tbVkBnQyM2MRZic9VVoBJwXtTW6U9LRYMEPfJ1QWcaMt214tKESjY5hEEg1xXoQ4ee3ZoQKmJcENBX7U5hdVVJZ?cluster=devnet)
- **Status**: ✅ Successfully confirmed

## Error Handling

The function provides comprehensive error handling:

```typescript
const result = await sendToken(
  connection,
  sender,
  recipient,
  mint,
  amount
);

if (!result.success) {
  switch (true) {
    case result.error?.includes('Insufficient balance'):
      console.error('Sender does not have enough tokens');
      break;
    case result.error?.includes('Sender token account not found'):
      console.error('Sender does not have a token account for this mint');
      break;
    case result.error?.includes('Recipient token account does not exist'):
      console.error('Recipient account does not exist and creation is disabled');
      break;
    default:
      console.error('Transfer failed:', result.error);
  }
}
```

## Best Practices

1. **Always check the result**: Verify `result.success` before proceeding
2. **Handle insufficient balance**: Check sender balance before attempting transfer
3. **Use appropriate account creation**: Enable `createRecipientAccount` for user wallets, disable for program accounts
4. **Consider off-curve owners**: Use `allowOwnerOffCurve: true` for program-owned accounts
5. **Monitor transaction status**: Use the returned signature to track transaction progress

## Network Considerations

- **Devnet**: All operations target Solana devnet by default
- **Transaction fees**: Uses dynamic priority fees based on network conditions
- **Confirmation**: Transactions are confirmed with 'confirmed' commitment level
- **Retry logic**: Built-in retry mechanism for failed transactions

## Testing

Run the test suite to verify functionality:

```bash
npm test -- tests/sendToken.test.ts
```

The tests cover:
- Successful transfers
- Account creation scenarios
- Error conditions
- Balance validation
- Different parameter combinations
