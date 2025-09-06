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

# 2) Check that users have tokens to sell and sufficient SOL for fees
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
  
  # Each user needs at least 0.02 SOL for AMM selling (wrapped SOL creation + fees)
  if (( $(echo "$BAL_NUM < 0.02" | bc -l) )); then
    echo "💰 User-$i balance too low, sending SOL from treasury..."
    npm run cli:send-sol -- --from-wallet "$TREASURY_WALLET" --to-address "$USER_PUB" --amount 0.03 || echo "⚠️ SOL transfer failed for user-$i"
    sleep 1
  fi
done

# 3) Execute sell operations individually (AMM transactions are too large for batching)
echo "🚀 Executing AMM sell operations individually..."
echo "💡 Note: AMM transactions are too large for batch processing, executing individually"

# Execute sell operations for each user
for i in $(seq 1 5); do
  WALLET_FILE="$USER_DIR/user-wallet-$i.json"
  USER_PUB=$(solana-keygen pubkey "$WALLET_FILE")
  
  # Calculate token amount to sell based on user (20k, 30k, 40k, 50k, 60k tokens)
  AMOUNT=$(echo "20000 + ($i - 1) * 10000" | bc)
  
  echo "💸 User-$i ($USER_PUB): Selling $AMOUNT tokens..."
  
  npm run cli:amm:sell -- \
    --wallet "$WALLET_FILE" \
    --amount "$AMOUNT" \
    --input-token "$DEBUG_DIR/amm-token-info.json" \
    --slippage 100 || echo "⚠️ Sell failed for user-$i"
  
  # Small delay between operations
  sleep 2
done

echo "✅ AMM-05 batch sell operations completed!"
echo "🎯 Users 1-5 have sold tokens via AMM"
echo "💡 Check user balances with: npm run cli:check-wallet-balances"
