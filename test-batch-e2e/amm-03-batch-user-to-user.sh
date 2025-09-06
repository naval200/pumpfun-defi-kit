#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
FEE_PAYER_WALLET="$FIXTURES_DIR/treasury-wallet.json"
TOKEN_INFO_JSON="$DEBUG_DIR/amm-token-info.json"
OPS_JSON="$DEBUG_DIR/amm-user-to-user-transfers.json"

echo "🚀 Script 3: AMM User-to-User transfers (1-5 → 6-10) with automatic ATA creation"
MINT=$(jq -r '.mint' "$TOKEN_INFO_JSON")

# Change to project root for CLI commands
cd "$PROJECT_ROOT"

# Generate transfer operations from template (ATAs will be created automatically)
echo "📦 Generating AMM user-to-user transfer operations from template..."
"$DEBUG_DIR/generate-operations.sh" amm-user-to-user "$MINT"

echo "📋 Operations file: $OPS_JSON"
echo "🚀 Executing AMM user-to-user transfers..."

npm run cli:batch-transactions -- \
  --operations "$OPS_JSON" \
  --fee-payer "$FEE_PAYER_WALLET" \
  --max-parallel 3 \
  --retry-failed

echo "✅ Script 3 complete - AMM User-to-user transfers executed!"
echo "💰 Each user 1-5 sent 50 tokens to users 6-10 respectively"
