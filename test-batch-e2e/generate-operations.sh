#!/bin/bash
# Utility script to generate operations JSON from templates

set -e
DEBUG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="$DEBUG_DIR/../fixtures"
USER_DIR="$DEBUG_DIR/../fixtures/user-wallets"

# Function to generate operations from template
generate_operations() {
  local template_file="$1"
  local output_file="$2"
  local mint="$3"
  
  if [ ! -f "$template_file" ]; then
    echo "❌ Template file not found: $template_file"
    return 1
  fi
  
  echo "📋 Generating operations from template: $template_file"
  
  # Read template
  local content=$(cat "$template_file")
  
  # Replace common placeholders
  content=$(echo "$content" | sed "s|{{MINT}}|$mint|g")
  content=$(echo "$content" | sed "s|{{AIRDROP_WALLET}}|$FIXTURES_DIR/treasury-wallet.json|g")
  
  # Replace user wallet paths and addresses
  for i in $(seq 1 20); do
    local wallet_path="$USER_DIR/user-wallet-$i.json"
    local user_address=""
    
    if [ -f "$wallet_path" ]; then
      user_address=$(solana-keygen pubkey "$wallet_path" 2>/dev/null || echo "INVALID_ADDRESS")
    else
      user_address="MISSING_WALLET_$i"
    fi
    
    content=$(echo "$content" | sed "s|{{USER_${i}_WALLET}}|$wallet_path|g")
    content=$(echo "$content" | sed "s|{{USER_${i}_ADDRESS}}|$user_address|g")
  done
  
  # Write output
  echo "$content" > "$output_file"
  echo "✅ Generated: $output_file"
}

# Main function
main() {
  local template_type="$1"
  local mint="$2"
  
  if [ -z "$template_type" ] || [ -z "$mint" ]; then
    echo "Usage: $0 <template_type> <mint>"
    echo "  template_type: airdrop | user-to-user | amm-airdrop | amm-user-to-user"
    echo "  mint: token mint address"
    exit 1
  fi
  
  case "$template_type" in
    "airdrop")
      generate_operations \
        "$DEBUG_DIR/templates/airdrop-operations-template.json" \
        "$DEBUG_DIR/airdrop-1-5-no-ata.json" \
        "$mint"
      ;;
    "user-to-user")
      generate_operations \
        "$DEBUG_DIR/templates/user-to-user-operations-template.json" \
        "$DEBUG_DIR/user-to-user-transfers.json" \
        "$mint"
      ;;
    "amm-airdrop")
      generate_operations \
        "$DEBUG_DIR/templates/amm-airdrop-operations-template.json" \
        "$DEBUG_DIR/amm-airdrop-1-5-no-ata.json" \
        "$mint"
      ;;
    "amm-user-to-user")
      generate_operations \
        "$DEBUG_DIR/templates/amm-user-to-user-operations-template.json" \
        "$DEBUG_DIR/amm-user-to-user-transfers.json" \
        "$mint"
      ;;
    *)
      echo "❌ Unknown template type: $template_type"
      echo "Available types: airdrop, user-to-user, amm-airdrop, amm-user-to-user"
      exit 1
      ;;
  esac
}

# Run if called directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
  main "$@"
fi
