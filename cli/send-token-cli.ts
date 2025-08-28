#!/usr/bin/env tsx

import { Connection, PublicKey } from '@solana/web3.js';
import { sendToken, sendTokenWithAccountCreation, canReceiveTokens } from '../src/sendToken';
import { parseArgs, loadWallet, loadFeePayerWallet, printUsage } from './cli-args';

/**
 * CLI for sending tokens between addresses
 * Supports both bonding curve and AMM tokens
 */
export async function sendTokenCli() {
  const args = parseArgs();

  if (args.help) {
    printUsage('cli:send-token', [
      '  --recipient <address>        Recipient public key (required)',
      '  --mint <address>             Token mint public key (required)',
      '  --amount <number>            Amount of tokens to send (required)',
      '  --wallet <path>              Path to wallet JSON file',
      '  --fee-payer <path>           Path to fee payer wallet JSON file (optional)',
      '  --create-account <boolean>   Whether to create recipient account (default: true)',
    ]);
    return;
  }

  // Validate required arguments
  if (!args.recipient || !args.mint || !args.amount) {
    console.error('❌ Error: --recipient, --mint, and --amount are required');
    printUsage('cli:send-token');
    return;
  }

  console.log('🚀 Sending Tokens');
  console.log('==================');
  console.log(`Recipient: ${args.recipient}`);
  console.log(`Mint: ${args.mint}`);
  console.log(`Amount: ${args.amount} tokens`);

  try {
    // Validate addresses
    let recipient: PublicKey;
    let mint: PublicKey;
    
    try {
      recipient = new PublicKey(args.recipient);
      mint = new PublicKey(args.mint);
    } catch (error) {
      console.error('❌ Error: Invalid public key format');
      return;
    }

    // Setup connection and wallet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const wallet = loadWallet(args.wallet);
    const feePayer = loadFeePayerWallet(args.feePayer);

    console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);
    if (feePayer) {
      console.log(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
    }

    // Check if recipient can receive tokens
    console.log(`🔍 Checking if recipient can receive tokens...`);
    const canReceive = await canReceiveTokens(connection, recipient, mint);
    
    if (canReceive.canReceive) {
      if (canReceive.hasAccount) {
        console.log(`✅ Recipient already has a token account: ${canReceive.accountAddress?.toString()}`);
      } else {
        console.log(`ℹ️ Recipient doesn't have a token account, will create one if createAccount is true`);
      }
    } else {
      console.error('❌ Error: Recipient cannot receive tokens (invalid address or mint)');
      return;
    }

    // Send tokens
    console.log(`\n🔄 Executing token transfer...`);
    
    const createAccount = args.createAccount !== false; // Default to true
    let result;
    
    if (createAccount) {
      result = await sendTokenWithAccountCreation(
        connection,
        wallet,
        recipient,
        mint,
        BigInt(args.amount),
        false, // allowOwnerOffCurve
        feePayer || undefined
      );
    } else {
      result = await sendToken(
        connection,
        wallet,
        recipient,
        mint,
        BigInt(args.amount),
        false, // allowOwnerOffCurve
        false, // createRecipientAccount
        feePayer || undefined
      );
    }

    if (result.success) {
      console.log(`✅ Token transfer completed successfully!`);
      console.log(`📝 Transaction signature: ${result.signature}`);
      console.log(`👥 Recipient account: ${result.recipientAccount?.toString()}`);
      
      // Show explorer link
      const explorerUrl = `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`;
      console.log(`🔍 View transaction: ${explorerUrl}`);
    } else {
      console.error(`❌ Token transfer failed: ${result.error}`);
      return;
    }

  } catch (error) {
    console.error(`❌ Error: ${error}`);
    return;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendTokenCli().catch(console.error);
}
