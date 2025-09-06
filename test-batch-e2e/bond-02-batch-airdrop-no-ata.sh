#!/bin/bash
set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$DEBUG_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
USER_DIR="$FIXTURES_DIR/user-wallets"
AIRDROP_WALLET="$FIXTURES_DIR/treasury-wallet.json"
TOKEN_INFO_JSON="$DEBUG_DIR/bond-token-info.json"
OPS_JSON="$DEBUG_DIR/airdrop-1-5-no-ata.json"

echo "🚀 Script 2: Batch airdrops to users 1-5 without ATA creation"
MINT=$(jq -r '.mint' "$TOKEN_INFO_JSON")

# Generate operations from template
echo "📋 Generating operations from template..."
"$DEBUG_DIR/generate-operations.sh" airdrop "$MINT"

echo "📦 Operations file: $OPS_JSON"
npm run cli:batch-transactions -- --operations "$OPS_JSON" --fee-payer "$AIRDROP_WALLET" --max-parallel 3 --retry-failed

echo "✅ Script 2 complete"
