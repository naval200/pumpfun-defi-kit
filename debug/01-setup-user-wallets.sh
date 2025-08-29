#!/bin/bash

# Setup Phase: Create 20 user wallets and transfer initial tokens
# This script creates user wallets and funds them with PumpFun tokens

set -e  # Exit on any error

echo "🚀 Starting Setup Phase: Creating User Wallets and Initial Token Distribution"
echo "========================================================================"

# Configuration
WALLET_COUNT=20
FUNDED_COUNT=10
TOKENS_PER_WALLET=1000  # Amount of tokens to send to each funded wallet
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WALLETS_DIR="$DEBUG_DIR/../wallets"
USER_WALLETS_DIR="$DEBUG_DIR/user-wallets"

# Create directories
mkdir -p "$USER_WALLETS_DIR"
mkdir -p "$WALLETS_DIR"

echo "📁 Working directory: $DEBUG_DIR"
echo "📁 Wallets directory: $WALLETS_DIR"
echo "📁 User wallets directory: $USER_WALLETS_DIR"

# Check if Solana CLI is available
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found. Please install it first."
    exit 1
fi

# Check if creator wallet exists
CREATOR_WALLET="$WALLETS_DIR/creator-wallet.json"
if [ ! -f "$CREATOR_WALLET" ]; then
    echo "❌ Error: Creator wallet not found at $CREATOR_WALLET"
    echo "Please create a creator wallet first with sufficient SOL and PumpFun tokens."
    exit 1
fi

# Use the token info with bonding curve info
TOKEN_INFO="$WALLETS_DIR/token-info.json"
if [ ! -f "$TOKEN_INFO" ]; then
    echo "❌ Error: Token info not found at $TOKEN_INFO"
    echo "Please ensure token info exists."
    exit 1
fi

echo "✅ Creator wallet found: $CREATOR_WALLET"
echo "✅ Token info found: $TOKEN_INFO"

# Get token mint
TOKEN_MINT=$(jq -r '.mint' "$TOKEN_INFO")
if [ "$TOKEN_MINT" = "null" ] || [ -z "$TOKEN_MINT" ]; then
    echo "❌ Error: Could not extract token mint from $TOKEN_INFO"
    exit 1
fi

echo "🎯 Token mint: $TOKEN_MINT"

# Step 1: Generate 20 user wallets
echo ""
echo "🔑 Step 1: Generating $WALLET_COUNT user wallets..."
for i in $(seq 1 $WALLET_COUNT); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    if [ ! -f "$WALLET_FILE" ]; then
        echo "  Creating wallet $i/$WALLET_COUNT..."
        solana-keygen new --no-bip39-passphrase --outfile "$WALLET_FILE" --silent
        echo "    ✅ Created: user-wallet-$i.json"
    else
        echo "    ⏭️  Skipped: user-wallet-$i.json (already exists)"
    fi
done

echo "✅ All $WALLET_COUNT user wallets created/verified"

# Step 2: Transfer PumpFun tokens to first 10 wallets
echo ""
echo "💰 Step 2: Transferring $TOKENS_PER_WALLET tokens to first $FUNDED_COUNT wallets..."
echo "💸 Amount per wallet: $TOKENS_PER_WALLET tokens"

# Check if creator wallet has tokens first
echo "🔍 Checking creator wallet token balance..."
CREATOR_ADDRESS=$(solana-keygen pubkey "$CREATOR_WALLET")
echo "  Creator wallet address: $CREATOR_ADDRESS"

# Transfer tokens to first 10 wallets
SUCCESS_COUNT=0
for i in $(seq 1 $FUNDED_COUNT); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
    
    echo "  Transferring to wallet $i/$FUNDED_COUNT: $WALLET_ADDRESS"
    
    # Use the send-token CLI to transfer tokens
    if npm run cli:send-token \
        -- --wallet "$CREATOR_WALLET" \
        --recipient "$WALLET_ADDRESS" \
        --mint "$TOKEN_MINT" \
        --amount "$TOKENS_PER_WALLET" \
        --create-account > /dev/null 2>&1; then
        echo "    ✅ Transfer successful"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "    ❌ Transfer failed"
        echo "    ⚠️  Continuing with next wallet..."
    fi
done

echo ""
echo "📋 Summary of Setup Phase:"
echo "=========================="
echo "✅ Created $WALLET_COUNT user wallets in $USER_WALLETS_DIR"
echo "💰 Successfully funded $SUCCESS_COUNT out of $FUNDED_COUNT wallets with $TOKENS_PER_WALLET tokens each"

if [ $SUCCESS_COUNT -eq 0 ]; then
    echo "⚠️  Warning: No wallets were funded. This might be due to:"
    echo "   - Creator wallet has insufficient tokens"
    echo "   - Token mint address is incorrect"
    echo "   - Network connectivity issues"
    echo ""
    echo "💡 You can still test batch operations with the created wallets,"
    echo "   but they won't have tokens to transfer between each other."
else
    echo "✅ All funded wallets are ready for batch operations"
fi

echo ""
echo "📁 User wallet files:"
for i in $(seq 1 $WALLET_COUNT); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
    STATUS=""
    if [ $i -le $FUNDED_COUNT ]; then
        if [ $i -le $SUCCESS_COUNT ]; then
            STATUS=" (funded)"
        else
            STATUS=" (funding failed)"
        fi
    fi
    echo "  user-wallet-$i.json: $WALLET_ADDRESS$STATUS"
done

echo ""
if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "🎉 Setup Phase Complete! Ready for batch operations."
    echo "💡 Next: Run 02-test-batch-operations.sh to test batch transfers"
else
    echo "⚠️  Setup Phase Complete with warnings."
    echo "💡 You can still test batch operations, but wallets have no tokens to transfer."
    echo "   Consider funding some wallets manually or using a different token."
fi
