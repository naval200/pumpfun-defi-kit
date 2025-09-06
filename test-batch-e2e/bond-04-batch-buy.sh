#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
TREASURY_WALLET="$FIXTURES_DIR/treasury-wallet.json"

echo "🛒 Script 4: Bonding Curve Batch Buy Operations (HUE for SOL)"

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
  
  # Each user needs at least 0.02 SOL for buying (amounts range from 0.005 to 0.015 SOL)
  if (( $(echo "$BAL_NUM < 0.02" | bc -l) )); then
    echo "💰 User-$i balance too low, requesting airdrop..."
    solana airdrop 0.05 "$USER_PUB" --url devnet || echo "⚠️ Airdrop failed for user-$i"
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
TEMPLATE_FILE="$DEBUG_DIR/templates/bond-buy-operations-template.json"
OPERATIONS_FILE="$DEBUG_DIR/bond-buy-operations.json"

echo "🔧 Generating batch buy operations from template..."

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

# 5) Execute batch buy operations
echo "🚀 Executing batch buy operations via bonding curve..."
npm run cli:batch-transactions -- \
  --operations "$OPERATIONS_FILE" \
  --fee-payer "$TREASURY_WALLET" \
  --max-parallel 1 \
  --delay-between 2000 \
  --retry-failed

echo "✅ Bond-04 batch buy operations completed!"
echo "🎯 Users 1-5 have purchased HUE tokens via bonding curve"
echo "💡 Check user token balances with: npm run cli:check-wallet-balances"
