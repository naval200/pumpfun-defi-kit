#!/usr/bin/env tsx

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { sendSol, createSendSolInstruction, validateSendSolParams } from '../src/sendSol';
import { parseArgs, loadWallet, printUsage } from './cli-args';

function showHelp() {
  console.log(`
Usage: npm run cli:send-sol -- [options]

Options:
  --help                    Show this help message
  --from-wallet <path>     Path to source wallet JSON file (required)
  --to-address <address>   Destination wallet public key (required)
  --amount <number>         Amount of SOL to send (required)
  --fee-payer <path>       Path to fee payer wallet JSON file (optional)
  --dry-run                Show what would be executed without sending

Examples:
  npm run cli:send-sol -- --help
  npm run cli:send-sol -- --from-wallet ./wallet.json --to-address <address> --amount 0.1
  npm run cli:send-sol -- --from-wallet ./wallet.json --to-address <address> --amount 0.5 --fee-payer ./fee-payer.json
`);
}

function parseArgs() {
  const args: any = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--from-wallet':
        args.fromWallet = argv[++i];
        break;
      case '--to-address':
        args.toAddress = argv[++i];
        break;
      case '--amount':
        args.amount = parseFloat(argv[++i]);
        break;
      case '--fee-payer':
        args.feePayer = argv[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
    }
  }

  return args;
}

/**
 * CLI for sending SOL between wallets
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  // Validate required arguments
  if (!args.fromWallet || !args.toAddress || !args.amount) {
    console.error('❌ Error: --from-wallet, --to-address, and --amount are required');
    printUsage('cli:send-sol');
    return;
  }

  if (args.amount <= 0) {
    console.error('❌ Error: Amount must be greater than 0');
    return;
  }

  try {
    console.log('💸 SOL Transfer CLI');
    console.log('===================');
    console.log(`Amount: ${args.amount} SOL`);
    console.log(`From Wallet: ${args.fromWallet}`);
    console.log(`To Address: ${args.toAddress}`);
    if (args.feePayer) {
      console.log(`Fee Payer: ${args.feePayer}`);
    }
    if (args.dryRun) {
      console.log('🔍 DRY RUN MODE - No transactions will be sent');
    }

    // Setup connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('✅ Connected to Solana devnet');

    // Load wallets
    const fromWallet = loadWallet(args.fromWallet);
    console.log(`👛 Source wallet: ${fromWallet.publicKey.toString()}`);

    let feePayer: any = undefined;
    if (args.feePayer) {
      feePayer = loadWallet(args.feePayer);
      console.log(`💸 Fee payer: ${feePayer.publicKey.toString()}`);
    }

    // Validate destination address
    let toAddress: PublicKey;
    try {
      toAddress = new PublicKey(args.toAddress);
      console.log(`🎯 Destination: ${toAddress.toString()}`);
    } catch (error) {
      console.error('❌ Error: Invalid destination address format');
      return;
    }

    // Validate parameters
    const validation = validateSendSolParams(fromWallet, toAddress, args.amount);
    if (!validation.isValid) {
      console.error('❌ Validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      return;
    }

    // Check source wallet balance
    const balance = await connection.getBalance(fromWallet.publicKey);
    const amountLamports = Math.floor(args.amount * LAMPORTS_PER_SOL);

    console.log(`💰 Source wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`📊 Transfer amount: ${args.amount} SOL (${amountLamports} lamports)`);

    if (balance < amountLamports) {
      console.error(
        `❌ Insufficient balance. Available: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL, Required: ${args.amount} SOL`
      );
      return;
    }

    if (args.dryRun) {
      console.log('\n🔍 DRY RUN - Would execute the following:');
      console.log(`  • Send ${args.amount} SOL from ${fromWallet.publicKey.toString()}`);
      console.log(`  • To: ${toAddress.toString()}`);
      console.log(
        `  • Fee payer: ${feePayer ? feePayer.publicKey.toString() : fromWallet.publicKey.toString()}`
      );
      console.log('✅ Dry run completed - no transactions sent');
      return;
    }

    // Execute SOL transfer
    console.log('\n🚀 Executing SOL transfer...');
    const result = await sendSol(
      connection,
      fromWallet,
      toAddress,
      args.amount,
      feePayer
    );

    if (result.success) {
      console.log('✅ SOL transfer successful!');
      console.log(`📝 Transaction signature: ${result.signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
    } else {
      console.log(`❌ SOL transfer failed: ${result.error}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
