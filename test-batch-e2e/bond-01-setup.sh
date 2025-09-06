#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
CREATOR_WALLET="fixtures/creator-wallet.json"
AIRDROP_WALLET="fixtures/treasury-wallet.json"
TOKEN_INFO="$FIXTURES_DIR/token-info-$(date +%s).json"

echo "🚀 Script 1: Bonding Curve setup (token, ATAs 1-5, buy to airdrop)"

# Change to project root for CLI commands
cd "$PROJECT_ROOT"

# 1) Ensure creator has SOL (airdrop if low)
CREATOR_PUB=$(solana-keygen pubkey "$CREATOR_WALLET")
BAL=$(solana balance "$CREATOR_PUB" --url devnet 2>/dev/null || echo "0")
echo "👛 Creator: $CREATOR_PUB | Balance: $BAL"

# 2) Create token if token-info missing
DEBUG_TOKEN_INFO="$DEBUG_DIR/bond-token-info.json"
if [ -f "$DEBUG_TOKEN_INFO" ]; then
  echo "🔄 Using existing token from debug/token-info.json"
  TOKEN_INFO="$DEBUG_TOKEN_INFO"
elif [ ! -f "$TOKEN_INFO" ]; then
  echo "🪙 Creating token via bonding curve..."
  npm run cli:bond-create-token -- \
    --wallet "$CREATOR_WALLET" \
    --token-name "AutoToken$(date +%H%M%S)" \
    --token-symbol "ATK" \
    --initial-buy 0.001 \
    --output-token "$TOKEN_INFO"
  # Copy to debug directory for reuse
  cp "$TOKEN_INFO" "$DEBUG_TOKEN_INFO"
else
  echo "🔄 Using existing token from fixtures"
fi

MINT=$(jq -r '.mint' "$TOKEN_INFO")
echo "🎯 Mint: $MINT"

# 3) Create ATAs for user wallets 1-5
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

# 4) Buy tokens into airdrop wallet (1,000,000 lamports = 0.001 SOL)
echo "🛒 Buying 0.001 SOL worth of tokens into airdrop wallet"
AIRDROP_PUB=$(solana-keygen pubkey "$AIRDROP_WALLET")

# First create ATA for airdrop wallet with the correct mint
echo "🏗️ Creating ATA for airdrop wallet ($AIRDROP_PUB)"
npm run cli:create-ata -- \
  --wallet "$AIRDROP_WALLET" \
  --mint "$MINT" \
  --owner "$AIRDROP_PUB" \
  --force || true

# Copy token info and buy tokens
npm run cli:bond-buy -- \
  --wallet "$AIRDROP_WALLET" \
  --amount 0.001 \
  --input-token "$TOKEN_INFO" 

# Ensure token-info.json is in debug directory
if [ "$TOKEN_INFO" != "$DEBUG_TOKEN_INFO" ]; then
  cp "$TOKEN_INFO" "$DEBUG_TOKEN_INFO"
fi
echo "✅ Script 1 complete. Token: $MINT"
