#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
FEE_PAYER_WALLET="$FIXTURES_DIR/treasury-wallet.json"
TOKEN_INFO_JSON="$DEBUG_DIR/bond-token-info.json"
OPS_JSON="$DEBUG_DIR/user-to-user-transfers.json"

echo "🚀 Script 3: User-to-User transfers (1-5 → 6-10) with ATA creation"
MINT=$(jq -r '.mint' "$TOKEN_INFO_JSON")

# Change to project root for CLI commands
cd "$PROJECT_ROOT"

# First, create ATAs for users 6-10
echo "🏗️ Creating ATAs for users 6-10..."
for i in $(seq 6 10); do
  WALLET_FILE="$USER_DIR/user-wallet-$i.json"
  OWNER=$(solana-keygen pubkey "$WALLET_FILE")
  echo "🏗️  Creating ATA for user-$i ($OWNER)"
  npm run cli:create-ata -- \
    --wallet "$FEE_PAYER_WALLET" \
    --mint "$MINT" \
    --owner "$OWNER" \
    --force || true
done

# Generate transfer operations from template
echo "📦 Generating transfer operations from template..."
"$DEBUG_DIR/generate-operations.sh" user-to-user "$MINT"

echo "📋 Operations file: $OPS_JSON"
echo "🚀 Executing user-to-user transfers..."

npm run cli:batch-transactions -- \
  --operations "$OPS_JSON" \
  --fee-payer "$FEE_PAYER_WALLET" \
  --max-parallel 3 \
  --retry-failed

echo "✅ Script 3 complete - User-to-user transfers executed!"
echo "💰 Each user 1-5 sent 50 tokens to users 6-10 respectively"
