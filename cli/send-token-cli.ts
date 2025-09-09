#!/usr/bin/env tsx

import { Connection, PublicKey } from '@solana/web3.js';
import { sendToken, sendTokenWithAccountCreation } from '../src/sendToken';
import { parseArgs, loadWallet, loadFeePayerWallet, printUsage } from './cli-args';
import { debugLog, logError } from '../src/utils/debug';

/**
 * CLI for sending tokens between addresses
 * Supports both bonding curve and AMM tokens
 */
async function sendTokenCli() {
  const args = parseArgs();

  if (args.help) {
    printUsage('cli:send-token', [
      '  --recipient <address>       Recipient wallet address (required)',
      '  --mint <address>            Token mint address (required)',
      '  --amount <number>           Amount of tokens to send (required)',
      '  --wallet <path>             Path to wallet JSON file',
      '  --fee-payer <path>          Path to fee payer wallet JSON file (optional)',
      "  --create-account            Create recipient account if it doesn't exist (default: true)",
    ]);
    return;
  }

  // Validate required arguments
  if (!args.recipient || !args.mint || !args.amount) {
    logError('❌ Error: --recipient, --mint, and --amount are required');
    printUsage('cli:send-token');
    return;
  }

  try {
    debugLog('🚀 Sending Tokens');
    debugLog('==================');
    debugLog(`Recipient: ${args.recipient}`);
    debugLog(`Mint: ${args.mint}`);
    debugLog(`Amount: ${args.amount} tokens`);
    debugLog(`Create Account: ${args.createAccount !== false}`);

    // Validate public key format
    let recipientAddress: PublicKey;
    try {
      recipientAddress = new PublicKey(args.recipient);
    } catch (error) {
      logError('❌ Error: Invalid public key format');
      return;
    }

    let mintAddress: PublicKey;
    try {
      mintAddress = new PublicKey(args.mint);
    } catch (error) {
      logError('❌ Error: Invalid mint address format');
      return;
    }

    // Load wallet and fee payer
    const wallet = loadWallet(args.wallet);
    const feePayer = loadFeePayerWallet(args.feePayer);

    debugLog(`👛 Using wallet: ${wallet.publicKey.toString()}`);
    if (feePayer) {
      debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
    }

    // Check if recipient can receive tokens
    debugLog(`🔍 Checking if recipient can receive tokens...`);
    const canReceive = await sendTokenWithAccountCreation(
      new Connection('https://api.devnet.solana.com', 'confirmed'),
      wallet,
      recipientAddress,
      mintAddress,
      args.amount,
      feePayer || wallet
    );

    if (canReceive.success && canReceive.recipientAccount) {
      debugLog(
        `✅ Recipient already has a token account: ${canReceive.recipientAccount.toString()}`
      );
    } else if (args.createAccount !== false) {
      debugLog(
        `ℹ️ Recipient doesn't have a token account, will create one if createAccount is true`
      );
    } else {
      logError('❌ Error: Recipient cannot receive tokens (invalid address or mint)');
      return;
    }

    // Execute token transfer
    debugLog(`\n🔄 Executing token transfer...`);
    const result = await sendToken(
      new Connection('https://api.devnet.solana.com', 'confirmed'),
      wallet,
      recipientAddress,
      mintAddress,
      args.amount,
      args.createAccount, // createRecipientAccount
      feePayer || wallet
    );

    if (result.success) {
      debugLog(`✅ Token transfer completed successfully!`);
      debugLog(`📝 Transaction signature: ${result.signature}`);
      debugLog(`👥 Recipient account: ${result.recipientAccount?.toString()}`);

      // Show explorer link
      const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
      debugLog(`🔍 View transaction: ${explorerUrl}`);
    } else {
      logError(`❌ Token transfer failed: ${result.error}`);
    }
  } catch (error) {
    logError(`❌ Error: ${error}`);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  sendTokenCli().catch(logError);
}
