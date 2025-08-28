#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { sendToken, sendTokenWithAccountCreation, canReceiveTokens } from '../src/sendToken';
import { createConnection } from '../src/utils/connection';
import { getWallet } from '../src/utils/connection';
import { debugLog, logSuccess, logError } from '../src/utils/debug';

/**
 * CLI for sending tokens between addresses
 * Supports both bonding curve and AMM tokens
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
      console.log(`
Usage: tsx cli/send-token-cli.ts <recipient_address> <mint_address> <amount> [create_account]

Arguments:
  recipient_address  - Public key of the recipient
  mint_address      - Public key of the token mint
  amount            - Amount of tokens to send (in smallest unit)
  create_account    - Optional: 'true' to create recipient account if needed (default: true)

Examples:
  # Send 1000 tokens to an existing account
  tsx cli/send-token-cli.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000

  # Send tokens without creating recipient account
  tsx cli/send-token-cli.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000 false

  # Send tokens with explicit account creation
  tsx cli/send-token-cli.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000 true
      `);
      process.exit(1);
    }

    const [recipientAddress, mintAddress, amountStr, createAccountStr] = args;
    const amount = BigInt(amountStr);
    const createAccount = createAccountStr !== 'false';

    // Validate addresses
    let recipient: PublicKey;
    let mint: PublicKey;
    
    try {
      recipient = new PublicKey(recipientAddress);
      mint = new PublicKey(mintAddress);
    } catch (error) {
      logError('Invalid public key format:', error);
      process.exit(1);
    }

    // Get connection and wallet
    const connection = createConnection();
    const wallet = getWallet();

    if (!wallet) {
      logError('No wallet found. Please set WALLET_PRIVATE_KEY environment variable.');
      process.exit(1);
    }

    debugLog(`🔗 Connected to: ${connection.rpcEndpoint}`);
    debugLog(`👤 Sender: ${wallet.publicKey.toString()}`);
    debugLog(`👥 Recipient: ${recipient.toString()}`);
    debugLog(`🪙 Mint: ${mint.toString()}`);
    debugLog(`💰 Amount: ${amount}`);
    debugLog(`🏗️ Create account: ${createAccount}`);

    // Check if recipient can receive tokens
    debugLog(`🔍 Checking if recipient can receive tokens...`);
    const canReceive = await canReceiveTokens(connection, recipient, mint);
    
    if (canReceive.canReceive) {
      if (canReceive.hasAccount) {
        debugLog(`✅ Recipient already has a token account: ${canReceive.accountAddress?.toString()}`);
      } else {
        debugLog(`ℹ️ Recipient doesn't have a token account, will create one if createAccount is true`);
      }
    } else {
      logError('Recipient cannot receive tokens (invalid address or mint)');
      process.exit(1);
    }

    // Send tokens
    debugLog(`🚀 Starting token transfer...`);
    
    let result;
    if (createAccount) {
      result = await sendTokenWithAccountCreation(
        connection,
        wallet,
        recipient,
        mint,
        amount
      );
    } else {
      result = await sendToken(
        connection,
        wallet,
        recipient,
        mint,
        amount,
        false, // allowOwnerOffCurve
        false  // createRecipientAccount
      );
    }

    if (result.success) {
      logSuccess(`✅ Token transfer completed successfully!`);
      console.log(`📝 Transaction signature: ${result.signature}`);
      console.log(`👥 Recipient account: ${result.recipientAccount?.toString()}`);
      
      // Show explorer link
      const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
      console.log(`🔍 View transaction: ${explorerUrl}`);
    } else {
      logError(`❌ Token transfer failed: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    logError('CLI execution failed:', error);
    process.exit(1);
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    logError('Unhandled error:', error);
    process.exit(1);
  });
}
