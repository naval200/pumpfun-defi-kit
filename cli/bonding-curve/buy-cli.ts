#!/usr/bin/env tsx

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { buyPumpFunToken } from '../../src/bonding-curve/buy';
import { parseArgs, loadWallet, loadTokenInfo, loadFeePayerWallet, printUsage } from '../cli-args';

/**
 * Buy PumpFun tokens via bonding curve with configurable parameters
 */
export async function buyToken() {
  const args = parseArgs();

  if (args.help) {
    printUsage('cli:bc-buy', [
      '  --amount <number>           Amount of SOL to spend (required)',
      '  --slippage <number>         Slippage tolerance in basis points (default: 1000)',
      '  --input-token <path>        Path to token info JSON file',
      '  --wallet <path>             Path to wallet JSON file',
      '  --fee-payer <path>          Path to fee payer wallet JSON file (optional)',
    ]);
    return;
  }

  // Validate required arguments
  if (!args.amount || args.amount <= 0) {
    console.error('❌ Error: --amount is required and must be greater than 0');
    printUsage('cli:bc-buy');
    return;
  }

  console.log('🛒 Buying PumpFun Tokens via Bonding Curve');
  console.log('============================================');
  console.log(`Amount: ${args.amount} SOL`);
  console.log(
    `Slippage: ${args.slippage || 1000} basis points (${(args.slippage || 1000) / 100}%)`
  );

  try {
    // Load token information
    const tokenInfo = loadTokenInfo(args.inputToken);
    console.log(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
    console.log(`📍 Mint: ${tokenInfo.mint}`);

    // Setup connection and wallet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const wallet = loadWallet(args.wallet);
    const feePayer = loadFeePayerWallet(args.feePayer);

    console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);
    if (feePayer) {
      console.log(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
    }

    // Check wallet balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (balance < args.amount * LAMPORTS_PER_SOL) {
      console.log(`❌ Insufficient balance. Need at least ${args.amount} SOL`);
      return;
    }

    // Execute buy
    console.log(`\n🔄 Executing buy of ${args.amount} SOL worth of tokens...`);
    const result = await buyPumpFunToken(
      connection,
      wallet,
      new PublicKey(tokenInfo.mint),
      args.amount,
      args.slippage || 1000,
      feePayer || undefined
    );

    if (result) {
      console.log(`✅ Buy successful! Signature: ${result}`);
    } else {
      console.log(`❌ Buy failed: ${result}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    return;
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  buyToken().catch(console.error);
}
