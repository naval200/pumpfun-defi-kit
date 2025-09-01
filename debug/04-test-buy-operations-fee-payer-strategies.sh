#!/bin/bash

# Buy Operations Fee Payer Strategy Test
# This script tests buy operations with different fee payer strategies to see if failures are consistent

set -e  # Exit on any error

echo "🧪 Buy Operations Fee Payer Strategy Test"
echo "========================================="

# Configuration
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WALLETS_DIR="$DEBUG_DIR/../fixtures"
USER_WALLETS_DIR="$DEBUG_DIR/user-wallets"
CREATOR_WALLET="$WALLETS_DIR/creator-wallet.json"
TREASURY_WALLET="$WALLETS_DIR/treasury-wallet.json"
TOKEN_INFO="$WALLETS_DIR/token-info-1756564695373.json"

# Check prerequisites
if [ ! -d "$USER_WALLETS_DIR" ]; then
    echo "❌ Error: User wallets directory not found. Please run 01-setup-user-wallets.sh first."
    exit 1
fi

if [ ! -f "$CREATOR_WALLET" ]; then
    echo "❌ Error: Creator wallet not found at $CREATOR_WALLET"
    exit 1
fi

if [ ! -f "$TOKEN_INFO" ]; then
    echo "❌ Error: Token info not found at $TOKEN_INFO"
    exit 1
fi

echo "✅ Creator wallet found: $CREATOR_WALLET"
echo "✅ Treasury wallet found: $TREASURY_WALLET"
echo "✅ User wallets directory: $USER_WALLETS_DIR"

# Get token mint
TOKEN_MINT=$(jq -r '.mint' "$TOKEN_INFO")
if [ "$TOKEN_MINT" = "null" ] || [ -z "$TOKEN_MINT" ]; then
    echo "❌ Error: Could not extract token mint from $TOKEN_INFO"
    exit 1
fi

echo "🎯 Token mint: $TOKEN_MINT"

echo ""
echo "📋 Test Strategy:"
echo "================="
echo "1. 🎯 Creator-funded buy operations (creator pays all fees)"
echo "2. 🎯 Treasury-funded buy operations (treasury pays all fees)"
echo "3. 🎯 Self-funded buy operations (each wallet pays own fees)"
echo "4. 🎯 No fee payer buy operations (default behavior)"
echo ""

# Test 1: Creator-funded buy operations
echo "🚀 Test 1: Creator-funded Buy Operations"
echo "========================================="

CREATOR_FUNDED_BUY_FILE="$DEBUG_DIR/creator-funded-buy-operations.json"

# Create buy operations with creator as fee payer
CREATOR_BUY_OPERATIONS='[
  {
    "type": "buy-bonding-curve",
    "id": "creator-funded-bonding-curve-buy",
    "description": "Creator-funded bonding curve buy with 0.01 SOL",
    "sender": "'$USER_WALLETS_DIR'/user-wallet-1.json",
    "params": {
      "mint": "'$TOKEN_MINT'",
      "solAmount": 10000000,
      "slippage": 1000,
      "assumeAccountsExist": true
    }
  },
  {
    "type": "buy-amm",
    "id": "creator-funded-amm-buy",
    "description": "Creator-funded AMM buy with 0.01 SOL",
    "sender": "'$USER_WALLETS_DIR'/user-wallet-2.json",
    "params": {
      "poolKey": "9JYxo26nokdUPi41Enrq3QXhTDwW1U8F466saNhDJFtw",
      "quoteAmount": 10000000,
      "slippage": 1,
      "assumeAccountsExist": true
    }
  }
]'

echo "$CREATOR_BUY_OPERATIONS" > "$CREATOR_FUNDED_BUY_FILE"
echo "✅ Created creator-funded buy operations file: $CREATOR_FUNDED_BUY_FILE"

echo "🔄 Executing creator-funded buy operations..."
echo "💸 Creator wallet will pay all transaction fees"

npm run cli:batch-transactions \
    -- --operations "$CREATOR_FUNDED_BUY_FILE" \
    --fee-payer "$CREATOR_WALLET" \
    --max-parallel 2 \
    --retry-failed

if [ $? -eq 0 ]; then
    echo "✅ Creator-funded buy operations completed successfully!"
else
    echo "❌ Creator-funded buy operations failed"
fi

echo ""
echo "⏳ Waiting for transactions to confirm..."
sleep 5

# Test 2: Treasury-funded buy operations
echo ""
echo "🚀 Test 2: Treasury-funded Buy Operations"
echo "========================================="

TREASURY_FUNDED_BUY_FILE="$DEBUG_DIR/treasury-funded-buy-operations.json"

# Create buy operations with treasury as fee payer
TREASURY_BUY_OPERATIONS='[
  {
    "type": "buy-bonding-curve",
    "id": "treasury-funded-bonding-curve-buy",
    "description": "Treasury-funded bonding curve buy with 0.01 SOL",
    "sender": "'$USER_WALLETS_DIR'/user-wallet-3.json",
    "params": {
      "mint": "'$TOKEN_MINT'",
      "solAmount": 10000000,
      "slippage": 1000,
      "assumeAccountsExist": true
    }
  },
  {
    "type": "buy-amm",
    "id": "treasury-funded-amm-buy",
    "description": "Treasury-funded AMM buy with 0.01 SOL",
    "sender": "'$USER_WALLETS_DIR'/user-wallet-4.json",
    "params": {
      "poolKey": "9JYxo26nokdUPi41Enrq3QXhTDwW1U8F466saNhDJFtw",
      "quoteAmount": 10000000,
      "slippage": 1,
      "assumeAccountsExist": true
    }
  }
]'

echo "$TREASURY_BUY_OPERATIONS" > "$TREASURY_FUNDED_BUY_FILE"
echo "✅ Created treasury-funded buy operations file: $TREASURY_FUNDED_BUY_FILE"

echo "🔄 Executing treasury-funded buy operations..."
echo "💸 Treasury wallet will pay all transaction fees"

npm run cli:batch-transactions \
    -- --operations "$TREASURY_FUNDED_BUY_FILE" \
    --fee-payer "$TREASURY_WALLET" \
    --max-parallel 2 \
    --retry-failed

if [ $? -eq 0 ]; then
    echo "✅ Treasury-funded buy operations completed successfully!"
else
    echo "❌ Treasury-funded buy operations failed"
fi

echo ""
echo "⏳ Waiting for transactions to confirm..."
sleep 5

# Test 3: Self-funded buy operations (no fee payer specified)
echo ""
echo "🚀 Test 3: Self-funded Buy Operations (No Fee Payer)"
echo "====================================================="

SELF_FUNDED_BUY_FILE="$DEBUG_DIR/self-funded-buy-operations.json"

# Create buy operations with no fee payer (each wallet pays own fees)
SELF_BUY_OPERATIONS='[
  {
    "type": "buy-bonding-curve",
    "id": "self-funded-bonding-curve-buy",
    "description": "Self-funded bonding curve buy with 0.01 SOL",
    "sender": "'$USER_WALLETS_DIR'/user-wallet-5.json",
    "params": {
      "mint": "'$TOKEN_MINT'",
      "solAmount": 10000000,
      "slippage": 1000,
      "assumeAccountsExist": true
    }
  },
  {
    "type": "buy-amm",
    "id": "self-funded-amm-buy",
    "description": "Self-funded AMM buy with 0.01 SOL",
    "sender": "'$USER_WALLETS_DIR'/user-wallet-6.json",
    "params": {
      "poolKey": "9JYxo26nokdUPi41Enrq3QXhTDwW1U8F466saNhDJFtw",
      "quoteAmount": 10000000,
      "slippage": 1,
      "assumeAccountsExist": true
    }
  }
]'

echo "$SELF_BUY_OPERATIONS" > "$SELF_FUNDED_BUY_FILE"
echo "✅ Created self-funded buy operations file: $SELF_FUNDED_BUY_FILE"

echo "🔄 Executing self-funded buy operations..."
echo "💸 Each wallet will pay its own transaction fees"

# Note: CLI requires fee-payer, so we'll use a dummy one but operations will use their own wallets
npm run cli:batch-transactions \
    -- --operations "$SELF_FUNDED_BUY_FILE" \
    --fee-payer "$TREASURY_WALLET" \
    --max-parallel 2 \
    --retry-failed

if [ $? -eq 0 ]; then
    echo "✅ Self-funded buy operations completed successfully!"
else
    echo "❌ Self-funded buy operations failed"
fi

echo ""
echo "⏳ Waiting for transactions to confirm..."
sleep 5

# Test 4: Individual buy operations (not in batch)
echo ""
echo "🚀 Test 4: Individual Buy Operations (Not Batched)"
echo "=================================================="

echo "🔄 Testing individual bonding curve buy operation..."
echo "💸 Using user wallet 7 directly (not in batch)"

# Test individual bonding curve buy
npm run cli:curve:buy \
    -- --wallet "$USER_WALLETS_DIR/user-wallet-7.json" \
    --mint "$TOKEN_MINT" \
    --amount 0.01 \
    --slippage 1000

if [ $? -eq 0 ]; then
    echo "✅ Individual bonding curve buy operation completed successfully!"
else
    echo "❌ Individual bonding curve buy operation failed"
fi

echo ""
echo "🔄 Testing individual AMM buy operation..."
echo "💸 Using user wallet 8 directly (not in batch)"

# Test individual AMM buy
npm run cli:amm:buy \
    -- --wallet "$USER_WALLETS_DIR/user-wallet-8.json" \
    --pool-key "9JYxo26nokdUPi41Enrq3QXhTDwW1U8F466saNhDJFtw" \
    --amount 0.01 \
    --slippage 1

if [ $? -eq 0 ]; then
    echo "✅ Individual AMM buy operation completed successfully!"
else
    echo "❌ Individual AMM buy operation failed"
fi

# Summary
echo ""
echo "🎉 Buy Operations Fee Payer Strategy Test Complete!"
echo "=================================================="
echo ""
echo "📊 Test Results Summary:"
echo "  • Test 1 (Creator-funded): Check results above"
echo "  • Test 2 (Treasury-funded): Check results above"
echo "  • Test 3 (Self-funded): Check results above"
echo "  • Test 4 (Individual): Check results above"
echo ""
echo "📁 Generated Files:"
echo "  • $CREATOR_FUNDED_BUY_FILE"
echo "  • $TREASURY_FUNDED_BUY_FILE"
echo "  • $SELF_FUNDED_BUY_FILE"
echo ""
echo "🔍 Analysis:"
echo "  • If all batch tests fail with same errors: Batch system issue"
echo "  • If individual tests work but batch fails: Batch integration issue"
echo "  • If some fee payer strategies work: Fee payer configuration issue"
echo "  • If all fail: SDK-level issue with buy operations"
