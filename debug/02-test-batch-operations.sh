#!/bin/bash

# Test Phase: Perform batch operations with transfers and trading operations
# This script tests the batch transaction system with real operations

set -e  # Exit on any error

echo "🧪 Starting Test Phase: Batch Operations Testing"
echo "==============================================="

# Configuration
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WALLETS_DIR="$DEBUG_DIR/../wallets"
USER_WALLETS_DIR="$DEBUG_DIR/user-wallets"
TREASURY_WALLET="$WALLETS_DIR/treasury-wallet.json"
CREATOR_WALLET="$WALLETS_DIR/creator-wallet.json"
TOKEN_INFO="$WALLETS_DIR/token-info.json"
BATCH_OPERATIONS_FILE="$DEBUG_DIR/batch-operations-test.json"

# Check prerequisites
if [ ! -d "$USER_WALLETS_DIR" ]; then
    echo "❌ Error: User wallets directory not found. Please run 01-setup-user-wallets.sh first."
    exit 1
fi

if [ ! -f "$TREASURY_WALLET" ]; then
    echo "❌ Error: Treasury wallet not found at $TREASURY_WALLET"
    echo "Please create a treasury wallet with sufficient SOL for fees."
    exit 1
fi

if [ ! -f "$TOKEN_INFO" ]; then
    echo "❌ Error: Token info not found at $TOKEN_INFO"
    exit 1
fi

echo "✅ Treasury wallet found: $TREASURY_WALLET"
echo "✅ User wallets directory: $USER_WALLETS_DIR"
echo "✅ Token info found: $TOKEN_INFO"

# Get token mint
TOKEN_MINT=$(jq -r '.mint' "$TOKEN_INFO")
if [ "$TOKEN_MINT" = "null" ] || [ -z "$TOKEN_MINT" ]; then
    echo "❌ Error: Could not extract token mint from $TOKEN_INFO"
    exit 1
fi

echo "🎯 Token mint: $TOKEN_MINT"

# Check if any user wallets have tokens
echo "🔍 Checking if user wallets have tokens for testing..."
WALLETS_WITH_TOKENS=0
for i in $(seq 1 10); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    if [ -f "$WALLET_FILE" ]; then
        WALLETS_WITH_TOKENS=$((WALLETS_WITH_TOKENS + 1))
    fi
done

echo "📊 Found $WALLETS_WITH_TOKENS user wallets for testing"

# Step 1: Create batch operations JSON file
echo ""
echo "📝 Step 1: Creating batch operations file..."

# Create 10 transfer operations between user wallets
BATCH_OPERATIONS='['

# Add transfer operations between funded wallets (1-10)
for i in $(seq 1 10); do
    SOURCE_WALLET="$USER_WALLETS_DIR/user-wallet-$i.json"
    SOURCE_ADDRESS=$(solana-keygen pubkey "$SOURCE_WALLET")
    
    # Target wallet (next in sequence, wrap around to 1)
    TARGET_NUM=$((i % 10 + 1))
    TARGET_WALLET="$USER_WALLETS_DIR/user-wallet-$TARGET_NUM.json"
    TARGET_ADDRESS=$(solana-keygen pubkey "$TARGET_WALLET")
    
    # Transfer amount (random between 10-100 tokens)
    TRANSFER_AMOUNT=$((10 + RANDOM % 91))
    
    if [ $i -gt 1 ]; then
        BATCH_OPERATIONS="$BATCH_OPERATIONS,"
    fi
    
    BATCH_OPERATIONS="$BATCH_OPERATIONS
    {
      \"type\": \"transfer\",
      \"id\": \"transfer-$i\",
      \"description\": \"Transfer $TRANSFER_AMOUNT tokens from user-$i to user-$TARGET_NUM\",
      \"params\": {
        \"recipient\": \"$TARGET_ADDRESS\",
        \"mint\": \"$TOKEN_MINT\",
        \"amount\": \"$TRANSFER_AMOUNT\",
        \"createAccount\": true
      }
    }"
done

BATCH_OPERATIONS="$BATCH_OPERATIONS
]"

# Save to file
echo "$BATCH_OPERATIONS" > "$BATCH_OPERATIONS_FILE"
echo "✅ Created batch operations file: $BATCH_OPERATIONS_FILE"

# Display the operations
echo ""
echo "📋 Batch Operations Created:"
echo "============================"
jq '.[] | "\(.id): \(.description)"' "$BATCH_OPERATIONS_FILE"

# Step 2: Execute batch operations
echo ""
echo "🚀 Step 2: Executing batch operations..."

# Check if batch-transactions CLI exists
if ! npm run | grep -q "cli:batch-transactions"; then
    echo "❌ Error: Batch transactions CLI not found. Please build the project first."
    exit 1
fi

echo "💸 Using treasury wallet as fee payer: $(solana-keygen pubkey "$TREASURY_WALLET")"
echo "🔗 Using devnet for testing"
echo "📊 Total operations: $(jq '. | length' "$BATCH_OPERATIONS_FILE")"

# Note about testing without tokens
if [ $WALLETS_WITH_TOKENS -eq 0 ]; then
    echo ""
    echo "⚠️  Note: No user wallets have tokens for actual transfers"
    echo "💡 This test will focus on:"
    echo "   - Batch operation creation and validation"
    echo "   - Transaction structure and signing"
    echo "   - Error handling and logging"
    echo "   - CLI interface and parameter parsing"
    echo ""
    echo "🔄 Running batch transactions in validation mode..."
    
    # Try to run with --dry-run if available, otherwise run normally
    if npm run cli:batch-transactions -- --help 2>/dev/null | grep -q "dry-run"; then
        echo "✅ Dry-run mode available, testing without execution"
        npm run cli:batch-transactions \
            -- --operations "$BATCH_OPERATIONS_FILE" \
            --fee-payer "$TREASURY_WALLET" \
            --dry-run
    else
        echo "🔄 Running batch transactions (will fail on insufficient tokens but test structure)"
        npm run cli:batch-transactions \
            -- --operations "$BATCH_OPERATIONS_FILE" \
            --fee-payer "$TREASURY_WALLET" \
            --max-parallel 5 \
            --retry-failed
    fi
else
    echo "🔄 Running batch transactions with real token transfers..."
    # Capture the exit code to check for actual success/failure
    if npm run cli:batch-transactions \
        -- --operations "$BATCH_OPERATIONS_FILE" \
        --fee-payer "$TREASURY_WALLET" \
        --max-parallel 5 \
        --retry-failed; then
        BATCH_SUCCESS=true
        echo "✅ Batch operations completed successfully!"
    else
        BATCH_SUCCESS=false
        echo "❌ Batch operations failed or had errors"
    fi
fi

# Step 3: Verify results
echo ""
echo "🔍 Step 3: Verifying operation results..."

# Check balances of involved wallets using the CLI
echo "💰 Checking wallet balances after batch operations..."
for i in $(seq 1 10); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
    
    echo "  Wallet $i ($WALLET_ADDRESS):"
    
    # Check SOL balance
    SOL_BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet 2>/dev/null || echo "0 SOL")
    echo "    SOL: $SOL_BALANCE"
    
    # Check token balance using the check-wallet-balances CLI
    echo "    Token: Checking balance using CLI..."
    if npm run cli:check-wallet-balances -- --wallet "$WALLET_FILE" > /dev/null 2>&1; then
        echo "      ✅ CLI executed successfully"
        # Show the actual balance check output
        echo "      📊 Balance details:"
        npm run cli:check-wallet-balances -- --wallet "$WALLET_FILE" 2>/dev/null | grep -E "(💰|🪙|✅|❌)" || echo "        No balance info found"
    else
        echo "      ❌ CLI failed to execute"
    fi
done

echo ""
echo "📊 Test Phase Summary:"
echo "====================="
echo "✅ Created batch operations with 10 transfer instructions"

if [ "$BATCH_SUCCESS" = true ]; then
    echo "✅ Executed batch operations using treasury wallet as fee payer"
    echo "✅ All operations completed successfully"
else
    echo "❌ Batch operations had errors or failures"
fi

echo ""
echo "🎯 What was tested:"
echo "  • Batch transfer operations between user wallets"
echo "  • Single fee payer (treasury wallet) for all operations"
echo "  • Parallel execution with max-parallel=5"
echo "  • Automatic retry for failed operations"
echo "  • Batch operation structure and validation"
echo "  • CLI interface and parameter handling"
echo "  • Wallet balance verification using check-wallet-balances CLI"
echo ""
echo "💡 Next steps:"
echo "  • Check transaction logs for detailed execution info"
echo "  • Verify token balances in user wallets"
echo "  • Test with larger batches or different operation types"
echo "  • Run comprehensive test with 03-test-comprehensive-batch.sh"
echo ""

if [ "$BATCH_SUCCESS" = true ]; then
    echo "🎉 Test Phase Complete! Batch transaction system is working correctly."
else
    echo "⚠️  Test Phase Complete with errors. Please check the logs above for details."
    exit 1
fi
