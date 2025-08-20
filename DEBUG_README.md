# Debug System

This repository now uses a simple debug flag system to control logging verbosity.

## Usage

### Enable Debug Mode (Verbose Logging)

```bash
# Set environment variable
export DEBUG_PUMPFUN_DEFI_SDK=true

# Or run with DEBUG_PUMPFUN_DEFI_SDK flag
DEBUG_PUMPFUN_DEFI_SDK=true npm run cli:bc:sell -- --amount 1000000

# Or set to 1
DEBUG_PUMPFUN_DEFI_SDK=1 npm run cli:bc:sell -- --amount 1000000

# Or enable from client code
process.env.DEBUG_PUMPFUN_DEFI_SDK = 'true';
```

### Disable Debug Mode (Minimal Logging)

```bash
# Unset environment variable
unset DEBUG_PUMPFUN_DEFI_SDK

# Or explicitly set to false
DEBUG_PUMPFUN_DEFI_SDK=false npm run cli:bc:sell -- --amount 1000000

# Or just run normally
npm run cli:bc:sell -- --amount 1000000
```

## What Gets Logged

### Always Logged (Important Information)
- ✅ Success messages
- ❌ Error messages
- ⚠️ Warning messages
- 📝 Transaction signatures
- 💰 Token balances
- 🔄 Operation status

### Debug Only (Verbose Information)
- 🔧 Account details and PDA derivations
- 👤 Wallet setup details
- 📡 Transaction creation steps
- 💡 Technical notes and explanations
- ⏳ Retry attempts and waiting

## Example Output

### Debug Mode OFF (Default)
```
🧪 Testing Sell Function
=========================
🎯 Testing with token: 2BUGjDJ5wumDrTCvD2KUokHpuBZzpFimuhR74Wezkhap

🔄 Testing sell all tokens...
💰 Selling all 0 tokens...
💸 Setting up sell transaction...
💰 User token balance: 0 tokens
Sell all failed: Error: Cannot sell: User has no tokens to sell
```

### Debug Mode ON
```
🧪 Testing Sell Function
=========================
🎯 Testing with token: 2BUGjDJ5wumDrTCvD2KUokHpuBZzpFimuhR74Wezkhap
👛 Using test wallet: 4m3zWwvK9dgtfdz3teFeAFQTzjpsyuFdu2uaDZk8qBP8
💰 Wallet SOL balance: 4.9600 SOL

🔄 Testing sell all tokens...
💰 Selling all 0 tokens...
💸 Setting up sell transaction...
🔧 Creating complete sell instruction with correct SELL account order:
   0. Global: 4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf
   1. FeeRecipient: 68yFSZxzLWJXkxxRGydZ63C6mHx1NLEDWmwN9Lb5yySg
   ...
💰 User token balance: 0 tokens
Sell all failed: Error: Cannot sell: User has no tokens to sell
```

## Environment File

You can also create a `.env` file in the project root:

```bash
# .env
DEBUG_PUMPFUN_DEFI_SDK=true
SOLANA_NETWORK=devnet
RPC_ENDPOINT=https://api.devnet.solana.com
```

This makes the repository much cleaner and easier to use in production while still providing detailed debugging information when needed.
