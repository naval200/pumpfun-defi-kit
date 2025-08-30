#!/bin/bash

# Mixed Batch Scenarios Test: Testing different fee payer strategies
# This script tests two scenarios:
# 1. Batch SOL transfers from creator wallet (creator pays all fees)
# 2. Batch operations from multiple wallets (each pays their own fees)

set -e  # Exit on any error

echo "🔄 Starting Mixed Batch Scenarios Test: Different Fee Payer Strategies"
echo "===================================================================="

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
echo "✅ User wallets directory: $USER_WALLETS_DIR"
echo "✅ Token info found: $TOKEN_INFO"

# Get token mint
TOKEN_MINT=$(jq -r '.mint' "$TOKEN_INFO")
if [ "$TOKEN_MINT" = "null" ] || [ -z "$TOKEN_MINT" ]; then
    echo "❌ Error: Could not extract token mint from $TOKEN_INFO"
    exit 1
fi

echo "🎯 Token mint: $TOKEN_MINT"

# Check creator wallet SOL balance
echo ""
echo "🔍 Checking creator wallet SOL balance..."
CREATOR_ADDRESS=$(solana-keygen pubkey "$CREATOR_WALLET")
CREATOR_SOL_BALANCE=$(solana balance "$CREATOR_ADDRESS" --url devnet 2>/dev/null || echo "0 SOL")
echo "💰 Creator wallet ($CREATOR_ADDRESS) SOL balance: $CREATOR_SOL_BALANCE"

# Check if creator has sufficient SOL for funding
if [[ "$CREATOR_SOL_BALANCE" == "0 SOL" ]]; then
    echo "❌ Error: Creator wallet has no SOL. Please fund it first."
    exit 1
fi

echo ""
echo "📋 Test Scenarios:"
echo "=================="
echo "1. 🎯 Creator-funded batch: SOL transfers from creator to 10 user wallets"
echo "   - Creator wallet pays all transaction fees"
echo "   - Single batch transaction with multiple recipients"
echo ""
echo "2. 🎯 Self-funded batch: Mixed operations from user wallets"
echo "   - Each wallet executes its own operations using their own wallets"
echo "   - Treasury wallet provides fallback fee payment if needed"
echo "   - SOL transfers, token buys, and other operations"
echo ""

# Scenario 1: Creator-funded batch SOL transfers
echo "🚀 Scenario 1: Creator-funded Batch SOL Transfers"
echo "================================================="

# Create batch operations file for creator-funded transfers
CREATOR_FUNDED_FILE="$DEBUG_DIR/creator-funded-sol-transfers.json"

echo "📝 Creating creator-funded batch operations file..."

# Create 10 SOL transfer operations from creator to user wallets
CREATOR_BATCH_OPERATIONS='['

for i in $(seq 1 10); do
    TARGET_WALLET="$USER_WALLETS_DIR/user-wallet-$i.json"
    TARGET_ADDRESS=$(solana-keygen pubkey "$TARGET_WALLET")
    
    # Random SOL amount between 0.01-0.05 SOL
    SOL_AMOUNT=$((10000000 + RANDOM % 40000000))
    
    if [ $i -gt 1 ]; then
        CREATOR_BATCH_OPERATIONS="$CREATOR_BATCH_OPERATIONS,"
    fi
    
    CREATOR_BATCH_OPERATIONS="$CREATOR_BATCH_OPERATIONS
    {
      \"type\": \"sol-transfer\",
      \"id\": \"creator-sol-transfer-$i\",
      \"description\": \"Creator transferring $((SOL_AMOUNT / 1000000000)).$((SOL_AMOUNT % 1000000000 / 1000000)) SOL to user-$i\",
      \"params\": {
        \"recipient\": \"$TARGET_ADDRESS\",
        \"lamports\": $SOL_AMOUNT
      }
    }"
done

CREATOR_BATCH_OPERATIONS="$CREATOR_BATCH_OPERATIONS
]"

# Save to file
echo "$CREATOR_BATCH_OPERATIONS" > "$CREATOR_FUNDED_FILE"
echo "✅ Created creator-funded batch operations file: $CREATOR_FUNDED_FILE"

# Display the operations
echo ""
echo "📋 Creator-funded SOL Transfer Operations:"
echo "=========================================="
jq '.[] | "\(.id): \(.description)"' "$CREATOR_FUNDED_FILE"

# Execute creator-funded batch operations
echo ""
echo "🔄 Executing creator-funded batch SOL transfers..."
echo "💸 Creator wallet will pay all transaction fees"
echo "📊 Total operations: $(jq '. | length' "$CREATOR_FUNDED_FILE")"

npm run cli:batch-transactions \
    -- --operations "$CREATOR_FUNDED_FILE" \
    --fee-payer "$CREATOR_WALLET" \
    --max-parallel 1 \
    --retry-failed

if [ $? -eq 0 ]; then
    echo "✅ Creator-funded batch SOL transfers completed successfully!"
else
    echo "❌ Creator-funded batch SOL transfers failed"
    exit 1
fi

# Wait a moment for transactions to confirm
echo "⏳ Waiting for transactions to confirm..."
sleep 5

# Verify SOL balances after creator funding
echo ""
echo "🔍 Verifying SOL balances after creator funding..."
for i in $(seq 1 10); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
    SOL_BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet 2>/dev/null || echo "0 SOL")
    echo "  User wallet $i ($WALLET_ADDRESS): $SOL_BALANCE"
done

# Scenario 2: Self-funded batch operations from user wallets
echo ""
echo "🚀 Scenario 2: Self-funded Batch Operations from User Wallets"
echo "============================================================="

# Create batch operations file for self-funded operations
SELF_FUNDED_FILE="$DEBUG_DIR/self-funded-operations.json"

echo "📝 Creating self-funded batch operations file..."

# Create mixed operations: SOL transfers, token buys, etc.
SELF_BATCH_OPERATIONS='['

# Add SOL transfer operations between user wallets (1-5)
for i in $(seq 1 5); do
    SOURCE_WALLET="$USER_WALLETS_DIR/user-wallet-$i.json"
    SOURCE_ADDRESS=$(solana-keygen pubkey "$SOURCE_WALLET")
    
    # Target wallet (next in sequence, wrap around to 1)
    TARGET_NUM=$((i % 5 + 1))
    TARGET_WALLET="$USER_WALLETS_DIR/user-wallet-$TARGET_NUM.json"
    TARGET_ADDRESS=$(solana-keygen pubkey "$TARGET_WALLET")
    
    # Random SOL amount between 0.005-0.02 SOL
    SOL_AMOUNT=$((5000000 + RANDOM % 15000000))
    
    if [ $i -gt 1 ]; then
        SELF_BATCH_OPERATIONS="$SELF_BATCH_OPERATIONS,"
    fi
    
    SELF_BATCH_OPERATIONS="$SELF_BATCH_OPERATIONS
    {
      \"type\": \"sol-transfer\",
      \"id\": \"user-sol-transfer-$i\",
      \"description\": \"User $i transferring $((SOL_AMOUNT / 1000000000)).$((SOL_AMOUNT % 1000000000 / 1000000)) SOL to user $TARGET_NUM\",
      \"sender\": \"$SOURCE_WALLET\",
      \"params\": {
        \"recipient\": \"$TARGET_ADDRESS\",
        \"lamports\": $SOL_AMOUNT
      }
    }"
done

# Add token buy operations (users 6-8)
for i in $(seq 6 8); do
    # Add comma before each buy operation
    SELF_BATCH_OPERATIONS="$SELF_BATCH_OPERATIONS,"
    
    # Get source wallet for sender
    SOURCE_WALLET="$USER_WALLETS_DIR/user-wallet-$i.json"
    
    # Random buy amount between 0.01-0.03 SOL
    BUY_AMOUNT=$((10000000 + RANDOM % 20000000))
    
    # Alternate between bonding curve and AMM
    if [ $((i % 2)) -eq 0 ]; then
        SELF_BATCH_OPERATIONS="$SELF_BATCH_OPERATIONS
    {
      \"type\": \"buy-bonding-curve\",
      \"id\": \"user-buy-bonding-curve-$i\",
      \"description\": \"User $i buying tokens via bonding curve with $((BUY_AMOUNT / 1000000000)).$((BUY_AMOUNT % 1000000000 / 1000000)) SOL\",
      \"sender\": \"$SOURCE_WALLET\",
      \"params\": {
        \"mint\": \"$TOKEN_MINT\",
        \"solAmount\": $BUY_AMOUNT,
        \"slippage\": 1000,
        \"assumeAccountsExist\": true
      }
    }"
    else
        SELF_BATCH_OPERATIONS="$SELF_BATCH_OPERATIONS
    {
              \"type\": \"buy-amm\",
        \"id\": \"user-buy-amm-$i\",
        \"description\": \"User $i buying tokens via AMM with $((BUY_AMOUNT / 1000000000)).$((BUY_AMOUNT % 1000000000 / 1000000)) SOL\",
        \"sender\": \"$SOURCE_WALLET\",
        \"params\": {
          \"poolKey\": \"9JYxo26nokdUPi41Enrq3QXhTDwW1U8F466saNhDJFtw\",
          \"quoteAmount\": $BUY_AMOUNT,
          \"slippage\": 1,
          \"assumeAccountsExist\": true
        }
    }"
    fi
done

# Add token transfer operations (users 9-10)
for i in $(seq 9 10); do
    # Add comma before each transfer operation
    SELF_BATCH_OPERATIONS="$SELF_BATCH_OPERATIONS,"
    
    # Get source wallet for sender
    SOURCE_WALLET="$USER_WALLETS_DIR/user-wallet-$i.json"
    
    # Target wallet (next in sequence, wrap around to 1)
    TARGET_NUM=$((i % 10 + 1))
    TARGET_WALLET="$USER_WALLETS_DIR/user-wallet-$TARGET_NUM.json"
    TARGET_ADDRESS=$(solana-keygen pubkey "$TARGET_WALLET")
    
    # Random transfer amount between 50-200 tokens
    TRANSFER_AMOUNT=$((50 + RANDOM % 151))
    
    SELF_BATCH_OPERATIONS="$SELF_BATCH_OPERATIONS
    {
      \"type\": \"transfer\",
      \"id\": \"user-token-transfer-$i\",
      \"description\": \"User $i transferring $TRANSFER_AMOUNT tokens to user $TARGET_NUM\",
      \"sender\": \"$SOURCE_WALLET\",
      \"params\": {
        \"recipient\": \"$TARGET_ADDRESS\",
        \"mint\": \"$TOKEN_MINT\",
        \"amount\": \"$TRANSFER_AMOUNT\",
        \"createAccount\": true
      }
    }"
done

SELF_BATCH_OPERATIONS="$SELF_BATCH_OPERATIONS
]"

# Save to file
echo "$SELF_BATCH_OPERATIONS" > "$SELF_FUNDED_FILE"
echo "✅ Created self-funded batch operations file: $SELF_FUNDED_FILE"

# Display the operations
echo ""
echo "📋 Self-funded Mixed Operations:"
echo "================================"
jq '.[] | "\(.id): \(.description)"' "$SELF_FUNDED_FILE"

# Execute self-funded batch operations
echo ""
echo "🔄 Executing self-funded batch operations..."
echo "💸 Each wallet executes from their own wallet, treasury provides fallback fees"
echo "📊 Total operations: $(jq '. | length' "$SELF_FUNDED_FILE")"

npm run cli:batch-transactions \
    -- --operations "$SELF_FUNDED_FILE" \
    --fee-payer "$TREASURY_WALLET" \
    --max-parallel 3 \
    --retry-failed \
    --delay-between 2000

if [ $? -eq 0 ]; then
    echo "✅ Self-funded batch operations completed successfully!"
else
    echo "❌ Self-funded batch operations failed"
    exit 1
fi

# Wait for transactions to confirm
echo "⏳ Waiting for transactions to confirm..."
sleep 5

# Final verification
echo ""
echo "🔍 Final Verification: Wallet Balances After All Operations"
echo "=========================================================="

# Check creator wallet balance
echo ""
echo "👑 Creator Wallet:"
CREATOR_FINAL_BALANCE=$(solana balance "$CREATOR_ADDRESS" --url devnet 2>/dev/null || echo "0 SOL")
echo "  SOL Balance: $CREATOR_FINAL_BALANCE"

# Check user wallet balances
echo ""
echo "👥 User Wallets:"
for i in $(seq 1 10); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE")
    
    echo "  User wallet $i ($WALLET_ADDRESS):"
    
    # Check SOL balance
    SOL_BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet 2>/dev/null || echo "0 SOL")
    echo "    SOL: $SOL_BALANCE"
    
    # Check token balance using CLI
    echo "    Token: Checking balance using CLI..."
    if npm run cli:check-wallet-balances -- --wallet "$WALLET_FILE" --mint "$TOKEN_MINT" > /dev/null 2>&1; then
        echo "      ✅ CLI executed successfully"
        # Capture the balance check output
        TOKEN_BALANCE=$(npm run cli:check-wallet-balances -- --wallet "$WALLET_FILE" --mint "$TOKEN_MINT" 2>/dev/null | grep -E "💰 Balance:" | tail -1 | sed 's/.*💰 Balance: //' || echo "Unknown")
        echo "      🪙 Token Balance: $TOKEN_BALANCE"
    else
        echo "      ❌ CLI failed to execute"
    fi
done

# Create detailed log file
echo ""
echo "📝 Creating detailed test log..."
LOG_FILE="$DEBUG_DIR/mixed-batch-scenarios-$(date +%Y%m%d-%H%M%S).log"

cat > "$LOG_FILE" << EOF
Mixed Batch Scenarios Test Log
=============================
Date: $(date)
Token Mint: $TOKEN_MINT
Creator Wallet: $CREATOR_ADDRESS
Creator Initial SOL: $CREATOR_SOL_BALANCE
Creator Final SOL: $CREATOR_FINAL_BALANCE

Test Scenarios:
==============

1. Creator-funded Batch SOL Transfers
====================================
- File: $CREATOR_FUNDED_FILE
- Operations: $(jq '. | length' "$CREATOR_FUNDED_FILE")
- Fee Payer: Creator wallet
- Status: ✅ COMPLETED

2. Self-funded Batch Operations
===============================
- File: $SELF_FUNDED_FILE
- Operations: $(jq '. | length' "$SELF_FUNDED_FILE")
- Fee Payer: Each wallet pays its own fees
- Status: ✅ COMPLETED

Operations Executed:
===================

Creator-funded Operations:
$(jq -r '.[] | "  \(.id): \(.description)"' "$CREATOR_FUNDED_FILE")

Self-funded Operations:
$(jq -r '.[] | "  \(.id): \(.description)"' "$SELF_FUNDED_FILE")

Final Wallet Balances:
=====================
$(for i in $(seq 1 10); do
    WALLET_FILE="$USER_WALLETS_DIR/user-wallet-$i.json"
    WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_FILE" 2>/dev/null || echo "Unknown")
    SOL_BALANCE=$(solana balance "$WALLET_ADDRESS" --url devnet 2>/dev/null || echo "0 SOL")
    echo "User $i ($WALLET_ADDRESS): SOL $SOL_BALANCE"
done)

Test completed at: $(date)
EOF

echo "✅ Detailed log created: $LOG_FILE"

echo ""
echo "🎉 Mixed Batch Scenarios Test Complete!"
echo "======================================="
echo ""
echo "📊 Test Summary:"
echo "  ✅ Creator-funded batch SOL transfers: $(jq '. | length' "$CREATOR_FUNDED_FILE") operations"
echo "  ✅ Self-funded batch operations: $(jq '. | length' "$SELF_FUNDED_FILE") operations"
echo "  💰 Creator wallet funded 10 user wallets with SOL"
echo "  🔄 User wallets executed mixed operations (SOL transfers, token buys, token transfers)"
echo "  💸 Different fee payer strategies tested successfully"
echo ""
echo "📁 Generated Files:"
echo "  • $CREATOR_FUNDED_FILE"
echo "  • $SELF_FUNDED_FILE"
echo "  • $LOG_FILE"
echo ""
echo "🔗 Next Steps:"
echo "  • Check individual transaction signatures in the logs"
echo "  • Verify wallet balances on Solana Explorer"
echo "  • Run comprehensive batch test with 09-test-comprehensive-batch.sh"
