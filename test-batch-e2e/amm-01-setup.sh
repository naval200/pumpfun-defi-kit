#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
CREATOR_WALLET="$FIXTURES_DIR/creator-wallet.json"
AIRDROP_WALLET="$FIXTURES_DIR/treasury-wallet.json"
TOKEN_INFO="$FIXTURES_DIR/token-info-$(date +%s).json"

echo "🏊 Script 1: AMM setup (token, pool, ATAs 1-5, liquidity)"

# Change to project root for CLI commands
cd "$PROJECT_ROOT"

# 1) Ensure creator has SOL (airdrop if low)
CREATOR_PUB=$(solana-keygen pubkey "$CREATOR_WALLET")
BAL=$(solana balance "$CREATOR_PUB" --url devnet 2>/dev/null || echo "0")
echo "👛 Creator: $CREATOR_PUB | Balance: $BAL"

# Check if creator needs more SOL for liquidity pool (needs at least 1.5 SOL)
BAL_NUM=$(echo "$BAL" | sed 's/ SOL//')
if (( $(echo "$BAL_NUM < 1.5" | bc -l) )); then
  echo "💰 Creator balance too low for liquidity pool, requesting airdrop..."
  solana airdrop 2 "$CREATOR_PUB" --url devnet || echo "⚠️ Airdrop failed, continuing with current balance"
  sleep 2
  NEW_BAL=$(solana balance "$CREATOR_PUB" --url devnet 2>/dev/null || echo "0")
  echo "👛 Creator: $CREATOR_PUB | New Balance: $NEW_BAL"
fi

# 2) Create token if token-info missing
DEBUG_TOKEN_INFO="$DEBUG_DIR/amm-token-info.json"
if [ -f "$DEBUG_TOKEN_INFO" ]; then
  echo "🔄 Using existing token from debug/token-info.json"
  TOKEN_INFO="$DEBUG_TOKEN_INFO"
elif [ ! -f "$TOKEN_INFO" ]; then
  echo "🪙 Creating token via bonding curve..."
  npm run cli:bond-create-token -- \
    --wallet "$CREATOR_WALLET" \
    --token-name "AMMToken$(date +%H%M%S)" \
    --token-symbol "AMM" \
    --initial-buy 0.005 \
    --output-token "$TOKEN_INFO"
  # Copy to debug directory for reuse
  cp "$TOKEN_INFO" "$DEBUG_TOKEN_INFO"
else
  echo "🔄 Using existing token from fixtures"
fi

MINT=$(jq -r '.mint' "$TOKEN_INFO")
echo "🎯 Mint: $MINT"

# 3) Create AMM pool with substantial liquidity
echo "🏊 Creating AMM pool with 1 SOL liquidity..."
npm run cli:amm:create-pool -- \
  --wallet "$CREATOR_WALLET" \
  --base-mint "$MINT" \
  --base-amount 10000000 \
  --quote-amount 1.0

# 4) Create ATAs for user wallets 1-5
for i in $(seq 1 5); do
  WALLET_FILE="$USER_DIR/user-wallet-$i.json"
  OWNER=$(solana-keygen pubkey "$WALLET_FILE")
  echo "🏗️  Creating ATA for user-$i ($OWNER)"
  npm run cli:create-ata -- \
    --wallet "$AIRDROP_WALLET" \
    --mint "$MINT" \
    --owner "$OWNER" \
    --force || true
done

# 5) Buy tokens into airdrop wallet via AMM
echo "🛒 Buying tokens via AMM into airdrop wallet"
AIRDROP_PUB=$(solana-keygen pubkey "$AIRDROP_WALLET")

# First create ATA for airdrop wallet
echo "🏗️ Creating ATA for airdrop wallet ($AIRDROP_PUB)"
npm run cli:create-ata -- \
  --wallet "$AIRDROP_WALLET" \
  --mint "$MINT" \
  --owner "$AIRDROP_PUB" \
  --force || true

# Ensure token-info.json is in debug directory for AMM buy command
if [ "$TOKEN_INFO" != "$DEBUG_TOKEN_INFO" ]; then
  cp "$TOKEN_INFO" "$DEBUG_TOKEN_INFO"
fi

# Buy tokens via AMM
npm run cli:amm:buy -- \
  --wallet "$AIRDROP_WALLET" \
  --amount 0.01 \
  --input-token "$DEBUG_DIR/token-info.json"
echo "✅ Script 1 complete. Token: $MINT, AMM pool created with liquidity"