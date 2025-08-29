#!/bin/bash

# Comprehensive Test Phase: Batch operations with transfers, buys, and sells
# This script tests the full range of batch operations

set -e  # Exit on any error

echo "🧪 Starting Comprehensive Test Phase: Full Batch Operations Testing"
echo "================================================================="

# Configuration
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WALLETS_DIR="$DEBUG_DIR/../wallets"
USER_WALLETS_DIR="$DEBUG_DIR/user-wallets"
TREASURY_WALLET="$WALLETS_DIR/treasury-wallet.json"
CREATOR_WALLET="$WALLETS_DIR/creator-wallet.json"
TOKEN_INFO="$WALLETS_DIR/token-info.json"
COMPREHENSIVE_BATCH_FILE="$DEBUG_DIR/comprehensive-batch-test.json"

# Check prerequisites
if [ ! -d "$USER_WALLETS_DIR" ]; then
    echo "❌ Error: User wallets directory not found. Please run 01-setup-user-wallets.sh first."
    exit 1
fi

if [ ! -f "$TREASURY_WALLET" ]; then
    echo "❌ Error: Treasury wallet not found at $TREASURY_WALLET"
    exit 1
fi

if [ ! -f "$TOKEN_INFO" ]; then
    echo "❌ Error: Token info not found at $TOKEN_INFO"
    exit 1
fi

echo "✅ Treasury wallet found: $TREASURY_WALLET"
echo "✅ Creator wallet found: $CREATOR_WALLET"
echo "✅ User wallets directory: $USER_WALLETS_DIR"

# Get token mint
TOKEN_MINT=$(jq -r '.mint' "$TOKEN_INFO")
if [ "$TOKEN_MINT" = "null" ] || [ -z "$TOKEN_MINT" ]; then
    echo "❌ Error: Could not extract token mint from $TOKEN_INFO"
    exit 1
fi

echo "🎯 Token mint: $TOKEN_MINT"

# Create comprehensive batch operations JSON file
echo ""
echo "📝 Step 1: Creating comprehensive batch operations file..."

# Create 10 operations: 5 transfers + 3 bonding curve sells + 2 AMM sells
BATCH_OPERATIONS='['

# Add transfer operations between funded wallets (1-5)
for i in $(seq 1 5); do
    SOURCE_WALLET="$USER_WALLETS_DIR/user-wallet-$i.json"
    SOURCE_ADDRESS=$(solana-keygen pubkey "$SOURCE_WALLET")
    
    # Target wallet (next in sequence, wrap around to 1)
    TARGET_NUM=$((i % 5 + 1))
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

# Add bonding curve sell operations (users 6-8)
for i in $(seq 6 8); do
    # Add comma before each bonding curve sell operation
    BATCH_OPERATIONS="$BATCH_OPERATIONS,"
    
    # Random sell amount between 50-200 tokens
    SELL_AMOUNT=$((50 + RANDOM % 151))
    
    BATCH_OPERATIONS="$BATCH_OPERATIONS
    {
      \"type\": \"sell-bonding-curve\",
      \"id\": \"sell-bonding-curve-$i\",
      \"description\": \"User $i selling $SELL_AMOUNT tokens via bonding curve\",
      \"params\": {
        \"mint\": \"$TOKEN_MINT\",
        \"amount\": $SELL_AMOUNT,
        \"slippage\": 1000
      }
    }"
done

# Add AMM sell operations (users 9-10)
for i in $(seq 9 10); do
    # Add comma before each AMM sell operation
    BATCH_OPERATIONS="$BATCH_OPERATIONS,"
    
    # Random sell amount between 30-100 tokens
    SELL_AMOUNT=$((30 + RANDOM % 71))
    
    BATCH_OPERATIONS="$BATCH_OPERATIONS
    {
      \"type\": \"sell-amm\",
      \"id\": \"sell-amm-$i\",
      \"description\": \"User $i selling $SELL_AMOUNT tokens via AMM\",
      \"params\": {
        \"poolKey\": \"9JYxo26nokdUPi41Enrq3QXhTDwW1U8F466saNhDJFtw\",
        \"amount\": $SELL_AMOUNT,
        \"slippage\": 1
      }
    }"
done

BATCH_OPERATIONS="$BATCH_OPERATIONS
]"

# Save to file
echo "$BATCH_OPERATIONS" > "$COMPREHENSIVE_BATCH_FILE"
echo "✅ Created comprehensive batch operations file: $COMPREHENSIVE_BATCH_FILE"

# Display the operations
echo ""
echo "📋 Comprehensive Batch Operations Created:"
echo "========================================="
jq '.[] | "\(.id): \(.description)"' "$COMPREHENSIVE_BATCH_FILE"

# Step 2: Execute comprehensive batch operations
echo ""
echo "🚀 Step 2: Executing comprehensive batch operations..."

echo "💸 Using treasury wallet as fee payer: $(solana-keygen pubkey "$TREASURY_WALLET")"
echo "🔗 Using devnet for testing"
echo "📊 Total operations: $(jq '. | length' "$COMPREHENSIVE_BATCH_FILE")"

# Execute batch operations
echo "🔄 Running comprehensive batch transactions..."
npm run cli:batch-transactions \
    -- --operations "$COMPREHENSIVE_BATCH_FILE" \
    --fee-payer "$TREASURY_WALLET" \
    --max-parallel 3 \
    --retry-failed \
    --delay-between 2000

if [ $? -eq 0 ]; then
    echo "✅ Comprehensive batch operations completed successfully!"
else
    echo "❌ Comprehensive batch operations failed"
    exit 1
fi

# Step 3: Detailed verification and logging
echo ""
echo "🔍 Step 3: Detailed verification and logging..."

# Create detailed log file
LOG_FILE="$DEBUG_DIR/batch-test-$(date +%Y%m%d-%H%M%S).log"
echo "📝 Creating detailed log file: $LOG_FILE"

# Log header
cat > "$LOG_FILE" << EOF
Batch Operations Test Log
========================
Date: $(date)
Token Mint: $TOKEN_MINT
Treasury Wallet: $(solana-keygen pubkey "$TREASURY_WALLET")
Creator Wallet: $(solana-keygen pubkey "$CREATOR_WALLET")
Total Operations: $(jq '. | length' "$COMPREHENSIVE_BATCH_FILE")

Operations Executed:
EOF

# Log each operation
jq -r '.[] | "\(.id): \(.description)"' "$COMPREHENSIVE_BATCH_FILE" >> "$LOG_FILE"

# Log wallet balances before and after
echo "" >> "$LOG_FILE"
echo "Wallet Balances After Operations:" >> "$LOG_FILE"
echo "================================" >> "$LOG_FILE"

for i in $(seq 1 10); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
    
    echo "Wallet $i ($WALLET_ADDRESS):" >> "$LOG_FILE"
    
    # Check SOL balance
    SOL_BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet 2>/dev/null || echo "0 SOL")
    echo "  SOL: $SOL_BALANCE" >> "$LOG_FILE"
    
    # Check token balance using the CLI
    echo "  Token: Checking balance using CLI..." >> "$LOG_FILE"
    if npm run cli:check-wallet-balances -- --wallet "$WALLET_FILE" > /dev/null 2>&1; then
        echo "    ✅ CLI executed successfully" >> "$LOG_FILE"
        # Capture the balance check output
        npm run cli:check-wallet-balances -- --wallet "$WALLET_FILE" 2>/dev/null | grep -E "(💰|🪙|✅|❌)" >> "$LOG_FILE" || echo "    No balance info found" >> "$LOG_FILE"
    else
        echo "    ❌ CLI failed to execute" >> "$LOG_FILE"
    fi
done

echo "" >> "$LOG_FILE"
echo "Test completed at: $(date)" >> "$LOG_FILE"

echo "✅ Detailed log saved to: $LOG_FILE"

# Step 4: Summary and next steps
echo ""
echo "📊 Comprehensive Test Phase Summary:"
echo "==================================="
echo "✅ Created batch operations with multiple operation types:"
echo "  • 5 transfer operations between user wallets"
echo "  • 3 bonding curve sell operations"
echo "  • 2 AMM sell operations"
echo "✅ Executed all operations using treasury wallet as fee payer"
echo "✅ Created detailed log file for analysis"
echo ""
echo "🎯 What was tested:"
echo "  • Mixed operation types in single batch"
echo "  • Transfer operations between user wallets"
echo "  • Sell operations via bonding curve"
echo "  • Sell operations via AMM"
echo "  • Single fee payer for all operations"
echo "  • Parallel execution with max-parallel=3"
echo "  • Automatic retry and delay between batches"
echo ""
echo "📁 Generated Files:"
echo "  • $COMPREHENSIVE_BATCH_FILE - Batch operations JSON"
echo "  • $LOG_FILE - Detailed execution log"
echo ""
echo "💡 Next steps:"
echo "  • Review the log file for detailed execution info"
echo "  • Check Solana explorer for transaction details"
echo "  • Verify token balances in user wallets"
echo "  • Test with different operation combinations"
echo ""
echo "🎉 Comprehensive Test Phase Complete!"
echo "The batch transaction system successfully handled mixed operation types."
