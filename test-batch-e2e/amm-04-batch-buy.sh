#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
TREASURY_WALLET="$FIXTURES_DIR/treasury-wallet.json"

echo "🏊 Script 4: AMM Batch Buy Operations (HUE for SOL)"

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

# 2) Ensure all user wallets have sufficient SOL for buying
echo "💰 Checking user wallet balances and airdropping SOL if needed..."
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
  
  # Each user needs at least 0.05 SOL for AMM buying (includes wrapped SOL creation + swap amount + fees)
  if (( $(echo "$BAL_NUM < 0.05" | bc -l) )); then
    echo "💰 User-$i balance too low, sending SOL from treasury..."
    npm run cli:send-sol -- --from-wallet "$TREASURY_WALLET" --to-address "$USER_PUB" --amount 0.05 || echo "⚠️ SOL transfer failed for user-$i"
    sleep 1
  fi
done

# 3) Pre-create ATAs for all users to avoid transaction size issues
echo "🏗️ Pre-creating ATAs for all users..."
for i in $(seq 1 5); do
  WALLET_FILE="$USER_DIR/user-wallet-$i.json"
  USER_PUB=$(solana-keygen pubkey "$WALLET_FILE")
  echo "🏗️ Creating ATA for user-$i ($USER_PUB)"
  npm run cli:create-ata -- \
    --wallet "$TREASURY_WALLET" \
    --mint "$MINT" \
    --owner "$USER_PUB" \
    --force || echo "⚠️ ATA creation failed for user-$i (may already exist)"
  sleep 1
done

# 4) Generate batch buy operations JSON from template
TEMPLATE_FILE="$DEBUG_DIR/templates/amm-buy-operations-template.json"
OPERATIONS_FILE="$DEBUG_DIR/amm-buy-operations.json"

echo "🔧 Generating batch buy operations from template..."

# Read template and replace placeholders
OPERATIONS_JSON=$(cat "$TEMPLATE_FILE")

# Replace wallet placeholders with actual wallet paths
for i in $(seq 1 5); do
  WALLET_FILE="$USER_DIR/user-wallet-$i.json"
  OPERATIONS_JSON=$(echo "$OPERATIONS_JSON" | sed "s|{{USER_${i}_WALLET}}|$WALLET_FILE|g")
done

# Replace mint and pool key placeholders
OPERATIONS_JSON=$(echo "$OPERATIONS_JSON" | sed "s|{{MINT}}|$MINT|g")
OPERATIONS_JSON=$(echo "$OPERATIONS_JSON" | sed "s|{{POOL_KEY}}|$POOL_KEY|g")

# Write final operations file
echo "$OPERATIONS_JSON" > "$OPERATIONS_FILE"
echo "📝 Generated operations file: $OPERATIONS_FILE"

# 5) Execute batch buy operations
echo "🚀 Executing AMM batch buy operations..."
npm run cli:batch-transactions -- \
  --operations "$OPERATIONS_FILE" \
  --fee-payer "$TREASURY_WALLET" \
  --max-parallel 1 \
  --delay-between 2000 \
  --retry-failed

echo "✅ AMM-04 batch buy operations completed!"
echo "🎯 Users 1-5 have purchased tokens via AMM"
echo "💡 Check user token balances with: npm run cli:check-wallet-balances"
