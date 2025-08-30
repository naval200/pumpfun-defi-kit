# Debug System

This repository now uses a simple debug flag system to control logging verbosity, along with comprehensive debug scripts for testing batch operations.

## Directory Structure

**Note**: The `wallets/` directory has been renamed to `fixtures/` to better reflect its contents.

```
pumpfun-defikit/
├── fixtures/               # Test wallets and token configurations
│   ├── creator-wallet.json
│   ├── treasury-wallet.json
│   ├── trading-wallet.json
│   ├── token-info-*.json  # Token metadata and mint addresses
│   └── wallet-keys.txt
├── debug/                  # Debug and testing scripts
│   ├── 00-run-complete-test.sh      # Master test script
│   ├── 01-setup-user-wallets.sh     # Create and fund test wallets
│   ├── 02-test-batch-send-and-sell.sh  # Test batch transfers
│   ├── 02-test-batch-send-and-buy.sh   # Test batch buys and SOL transfers
│   ├── 09-test-comprehensive-batch.sh  # Test mixed operations
│   └── user-wallets/       # Generated test user wallets
└── docs/                   # Documentation
```

## Debug Scripts

### Master Test Script

The `00-run-complete-test.sh` script orchestrates the entire testing process:

```bash
cd debug
./00-run-complete-test.sh
```

This script will:
1. ✅ Create 20 user wallets
2. ✅ Transfer PumpFun tokens to 10 wallets
3. 🧪 Test basic batch operations (10 transfers)
4. 🧪 Test comprehensive batch operations (mixed types)
5. 🧪 Test buy and SOL transfer operations together
6. 📊 Generate detailed logs and reports

### Individual Test Scripts

```bash
# Setup phase only
./01-setup-user-wallets.sh

# Test batch transfers
./02-test-batch-send-and-sell.sh

# Test batch buys and SOL transfers
./02-test-batch-send-and-buy.sh

# Test comprehensive operations
./09-test-comprehensive-batch.sh
```

## Current Status

### ✅ Working Components
- User wallet creation and funding
- Token transfers between wallets
- Batch operation file generation
- CLI parameter validation

### ⚠️ Known Issues
- Batch transactions CLI has import error: `executeBatch is not a function`
- Need to investigate the batch transactions module exports

### 🔧 Prerequisites
- Solana CLI tools installed
- Node.js and npm available
- Creator wallet with sufficient SOL and tokens
- Treasury wallet for fee payments

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

## Troubleshooting

### Common Issues

1. **Missing wallet files**: Ensure all required files exist in `fixtures/` directory
2. **Import errors**: Check that batch transactions module exports are correct
3. **Permission denied**: Make debug scripts executable with `chmod +x debug/*.sh`
4. **Solana CLI not found**: Install Solana CLI tools first

### Getting Help

- Check the debug script logs for detailed error information
- Verify all prerequisites are met
- Ensure wallet files have correct permissions and format
- Review the test output for specific failure points

This makes the repository much cleaner and easier to use in production while still providing detailed debugging information when needed.
