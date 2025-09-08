#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
TREASURY_WALLET="$FIXTURES_DIR/treasury-wallet.json"

echo "🏊 Script 5: AMM Batch Sell Operations (Tokens for SOL)"

# Change to project root for CLI commands
cd "$PROJECT_ROOT"

# 1) Check if AMM token info exists
AMM_TOKEN_INFO="$DEBUG_DIR/amm-token-info.json"
if [ ! -f "$AMM_TOKEN_INFO" ]; then
  echo "❌ AMM token info not found at $AMM_TOKEN_INFO"
  echo "💡 Please run amm-01-setup.sh first to create AMM pool"
  exit 1
fi

MINT=$(jq -r '.mint' "$AMM_TOKEN_INFO")
POOL_KEY=$(jq -r '.poolKey' "$AMM_TOKEN_INFO")

if [ "$POOL_KEY" = "null" ] || [ -z "$POOL_KEY" ]; then
  echo "❌ Pool key not found in AMM token info"
  echo "💡 Please ensure AMM pool has been created first"
  exit 1
fi

echo "🎯 AMM Token Mint: $MINT"
echo "🏊 AMM Pool Key: $POOL_KEY"

# 2) Empty user wallets of SOL to test fee payer functionality
echo "🔍 Checking user token balances and emptying SOL wallets..."
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
  
  # Empty user wallets of SOL to test fee payer functionality
  if (( $(echo "$BAL_NUM > 0.001" | bc -l) )); then
    echo "💸 Emptying User-$i SOL wallet to test fee payer..."
    # Send all SOL back to treasury (keeping tiny amount for rent exemption)
    AMOUNT_TO_SEND=$(echo "scale=9; $BAL_NUM - 0.0001" | bc)
    if (( $(echo "$AMOUNT_TO_SEND > 0" | bc -l) )); then
      npm run cli:send-sol -- --from-wallet "$WALLET_FILE" --to-address "$(solana-keygen pubkey "$TREASURY_WALLET")" --amount "$AMOUNT_TO_SEND" || echo "⚠️ SOL transfer failed for user-$i"
      sleep 1
    fi
  fi
done

echo "🧪 Testing fee payer functionality with users having minimal SOL..."

# 3) Generate batch sell operations JSON from template
TEMPLATE_FILE="$DEBUG_DIR/templates/amm-sell-operations-template.json"
OPERATIONS_FILE="$DEBUG_DIR/amm-sell-operations.json"

echo "🔧 Generating batch sell operations from template..."

# Read template and replace placeholders
OPERATIONS_JSON=$(cat "$TEMPLATE_FILE")

# Replace wallet placeholders with actual wallet paths
for i in $(seq 1 5); do
  WALLET_FILE="$USER_DIR/user-wallet-$i.json"
  OPERATIONS_JSON=$(echo "$OPERATIONS_JSON" | sed "s|{{USER_${i}_WALLET}}|$WALLET_FILE|g")
done

# Replace pool key placeholder
OPERATIONS_JSON=$(echo "$OPERATIONS_JSON" | sed "s|{{POOL_KEY}}|$POOL_KEY|g")

# Write final operations file
echo "$OPERATIONS_JSON" > "$OPERATIONS_FILE"
echo "📝 Generated operations file: $OPERATIONS_FILE"

# 4) Execute batch sell operations
echo "🚀 Executing AMM batch sell operations..."
npm run cli:batch-transactions -- \
  --operations "$OPERATIONS_FILE" \
  --fee-payer "$TREASURY_WALLET" \
  --max-parallel 1 \
  --delay-between 2000 \
  --retry-failed

echo "✅ AMM-05 batch sell operations completed!"
echo "🎯 Users 1-5 have sold tokens via AMM"
echo "💡 Check user balances with: npm run cli:check-wallet-balances"
