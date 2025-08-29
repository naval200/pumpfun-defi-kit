#!/bin/bash

# Master Test Script: Complete end-to-end testing of batch operations
# This script orchestrates the entire testing process

set -e  # Exit on any error

echo "🎯 Master Test Script: Complete Batch Operations Testing"
echo "======================================================"
echo "This script will:"
echo "1. Create 20 user wallets"
echo "2. Transfer PumpFun tokens to 10 wallets"
echo "3. Test basic batch operations (10 transfers)"
echo "4. Test comprehensive batch operations (mixed types)"
echo "5. Generate detailed logs and reports"
echo ""

# Configuration
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_TIME=$(date +%s)

echo "📁 Working directory: $DEBUG_DIR"
echo "⏰ Start time: $(date)"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if Solana CLI is available
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found. Please install it first."
    echo "   Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq not found. Please install it first."
    echo "   macOS: brew install jq"
    echo "   Ubuntu: sudo apt-get install jq"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found. Please install Node.js first."
    exit 1
fi

# Check if required wallets exist
WALLETS_DIR="$DEBUG_DIR/../wallets"
REQUIRED_FILES=(
    "creator-wallet.json"
    "treasury-wallet.json"
    "token-info.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$WALLETS_DIR/$file" ]; then
        echo "❌ Error: Required file not found: $WALLETS_DIR/$file"
        echo "   Please ensure all required wallets and token info are created."
        exit 1
    fi
done

echo "✅ All prerequisites met"
echo ""

# Phase 1: Setup
echo "🚀 Phase 1: Setting up user wallets and initial token distribution"
echo "=================================================================="
echo "Running setup script..."
bash "$DEBUG_DIR/01-setup-user-wallets.sh"

if [ $? -ne 0 ]; then
    echo "❌ Setup phase failed. Exiting."
    exit 1
fi

echo "✅ Setup phase completed successfully"
echo ""

# Phase 2: Basic batch testing
echo "🧪 Phase 2: Testing basic batch operations (10 transfers)"
echo "========================================================"
echo "Running basic batch test..."
bash "$DEBUG_DIR/02-test-batch-operations.sh"

if [ $? -ne 0 ]; then
    echo "❌ Basic batch test failed. Exiting."
    exit 1
fi

echo "✅ Basic batch test completed successfully"
echo ""

# Phase 3: Comprehensive testing
echo "🧪 Phase 3: Testing comprehensive batch operations (mixed types)"
echo "==============================================================="
echo "Running comprehensive batch test..."
bash "$DEBUG_DIR/03-test-comprehensive-batch.sh"

if [ $? -ne 0 ]; then
    echo "❌ Comprehensive batch test failed. Exiting."
    exit 1
fi

echo "✅ Comprehensive batch test completed successfully"
echo ""

# Phase 4: Generate final report
echo "📊 Phase 4: Generating final test report"
echo "======================================="

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Create final report
REPORT_FILE="$DEBUG_DIR/test-report-$(date +%Y%m%d-%H%M%S).md"
cat > "$REPORT_FILE" << EOF
# Batch Operations Test Report

## Test Summary
- **Date**: $(date)
- **Duration**: ${DURATION} seconds
- **Status**: ✅ COMPLETED SUCCESSFULLY

## Test Phases
1. ✅ **Setup Phase**: Created 20 user wallets, funded 10 with tokens
2. ✅ **Basic Batch Test**: 10 transfer operations between wallets
3. ✅ **Comprehensive Test**: Mixed operations (transfers, sells, AMM)

## Configuration
- **Token Mint**: $(jq -r '.mint' "$WALLETS_DIR/token-info.json")
- **Treasury Wallet**: $(solana-keygen pubkey "$WALLETS_DIR/treasury-wallet.json")
- **Creator Wallet**: $(solana-keygen pubkey "$WALLETS_DIR/creator-wallet.json")
- **User Wallets**: 20 created, 10 funded

## Generated Files
- User wallets: \`debug/user-wallets/\`
- Batch operations: \`debug/batch-operations-test.json\`
- Comprehensive operations: \`debug/comprehensive-batch-test.json\`
- Detailed logs: \`debug/batch-test-*.log\`

## Test Results
- **Basic Batch**: 10 transfer operations ✅
- **Comprehensive Batch**: 10 mixed operations ✅
- **Fee Payer**: Treasury wallet used for all operations ✅
- **Parallel Execution**: max-parallel=3 ✅
- **Retry Logic**: Automatic retry for failed operations ✅

## What Was Tested
- Wallet creation and token distribution
- Batch transfer operations between user wallets
- Mixed operation types in single batch
- Single fee payer for all operations
- Parallel execution and error handling
- Comprehensive logging and reporting

## Next Steps
- Review generated log files for detailed execution info
- Check Solana explorer for transaction details
- Verify token balances in user wallets
- Test with different operation combinations
- Scale up to larger batch sizes

---
*Report generated automatically by batch operations test suite*
EOF

echo "✅ Final test report generated: $REPORT_FILE"
echo ""

# Final summary
echo "🎉 COMPLETE TEST SUITE EXECUTED SUCCESSFULLY!"
echo "============================================="
echo "⏰ Total duration: ${DURATION} seconds"
echo "📁 All test files generated in: $DEBUG_DIR"
echo "📊 Final report: $REPORT_FILE"
echo ""
echo "📋 Summary of what was accomplished:"
echo "  ✅ Created 20 user wallets with Solana CLI"
echo "  ✅ Distributed PumpFun tokens to 10 wallets"
echo "  ✅ Tested basic batch operations (10 transfers)"
echo "  ✅ Tested comprehensive batch operations (mixed types)"
echo "  ✅ Used treasury wallet as fee payer for all operations"
echo "  ✅ Generated detailed logs and reports"
echo ""
echo "💡 The batch transaction system is working correctly!"
echo "   You can now use this setup for further testing and development."
echo ""
echo "🔍 To review results:"
echo "   - Check the generated log files for execution details"
echo "   - Review the final test report"
echo "   - Verify wallet balances on Solana explorer"
echo "   - Test with different operation combinations"
