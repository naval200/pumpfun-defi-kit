#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
TREASURY_WALLET="$FIXTURES_DIR/treasury-wallet.json"

echo "💸 Script 5: Bonding Curve Batch Sell Operations (HUE for SOL)"

# Change to project root for CLI commands
cd "$PROJECT_ROOT"

# 1) Check if HUE token info exists
HUE_TOKEN_INFO="$FIXTURES_DIR/hue_token.info"
if [ ! -f "$HUE_TOKEN_INFO" ]; then
  echo "❌ HUE token info not found at $HUE_TOKEN_INFO"
  echo "💡 Please ensure HUE token has been created first"
  exit 1
fi

MINT=$(jq -r '.mint' "$HUE_TOKEN_INFO")
echo "🎯 HUE Token Mint: $MINT"

# 2) Check that users have tokens to sell (from previous buy operations)
echo "🔍 Checking user token balances and SOL for fees..."
for i in $(seq 1 5); do
  WALLET_FILE="$USER_DIR/user-wallet-$i.json"
  if [ ! -f "$WALLET_FILE" ]; then
    echo "❌ User wallet $i not found at $WALLET_FILE"
    exit 1
  fi
  
  USER_PUB=$(solana-keygen pubkey "$WALLET_FILE")
  BAL=$(solana balance "$USER_PUB" --url devnet 2>/dev/null || echo "0")
  BAL_NUM=$(echo "$BAL" | sed 's/ SOL//')
  
  echo "👛 User-$i: $USER_PUB | Balance: $BAL"
  
  # Check if user has sufficient SOL for transaction fees
  if (( $(echo "$BAL_NUM < 0.01" | bc -l) )); then
    echo "💰 User-$i needs SOL for transaction fees, sending from treasury..."
    npm run cli:send-sol -- --from-wallet "$TREASURY_WALLET" --to-address "$USER_PUB" --amount 0.02 || echo "⚠️ SOL transfer failed for user-$i"
    sleep 1
  fi
done

# 3) Generate batch sell operations JSON from template
TEMPLATE_FILE="$DEBUG_DIR/templates/bond-sell-operations-template.json"
OPERATIONS_FILE="$DEBUG_DIR/bond-sell-operations.json"

echo "🔧 Generating batch sell operations from template..."

# Read template and replace placeholders
OPERATIONS_JSON=$(cat "$TEMPLATE_FILE")

# Replace wallet placeholders with actual wallet paths
for i in $(seq 1 5); do
  WALLET_FILE="$USER_DIR/user-wallet-$i.json"
  OPERATIONS_JSON=$(echo "$OPERATIONS_JSON" | sed "s|{{USER_${i}_WALLET}}|$WALLET_FILE|g")
done

# Replace mint placeholder
OPERATIONS_JSON=$(echo "$OPERATIONS_JSON" | sed "s|{{MINT}}|$MINT|g")

# Write final operations file
echo "$OPERATIONS_JSON" > "$OPERATIONS_FILE"
echo "📝 Generated operations file: $OPERATIONS_FILE"

# 4) Execute batch sell operations
echo "🚀 Executing batch sell operations via bonding curve..."
npm run cli:batch-transactions -- \
  --operations "$OPERATIONS_FILE" \
  --fee-payer "$TREASURY_WALLET" \
  --max-parallel 1 \
  --delay-between 2000 \
  --retry-failed \
  --dynamic-batching

echo "✅ Bond-05 batch sell operations completed!"
echo "🎯 Users 1-5 have sold HUE tokens via bonding curve"
echo "💡 Check user balances with: npm run cli:check-wallet-balances"
