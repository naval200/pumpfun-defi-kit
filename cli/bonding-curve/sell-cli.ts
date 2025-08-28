#!/usr/bin/env tsx

import { Connection, PublicKey } from '@solana/web3.js';
import { sellPumpFunToken } from '../../src/bonding-curve/sell';
import { parseArgs, loadWallet, loadTokenInfo, loadFeePayerWallet, printUsage } from '../cli-args';

/**
 * Sell PumpFun tokens via bonding curve with configurable parameters
 */
export async function sellToken() {
  const args = parseArgs();

  if (args.help) {
    printUsage('cli:bc-sell', [
      '  --amount <number>           Amount of tokens to sell (required)',
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
    printUsage('cli:bc-sell');
    return;
  }

  console.log('💸 Selling PumpFun Tokens via Bonding Curve');
  console.log('============================================');
  console.log(`Amount: ${args.amount} tokens`);
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

    // Execute sell
    console.log(`\n🔄 Executing sell of ${args.amount} tokens...`);
    const result = await sellPumpFunToken(
      connection,
      wallet,
      new PublicKey(tokenInfo.mint),
      args.amount,
      feePayer || undefined
    );

    if (result) {
      console.log(`✅ Sell successful! Signature: ${result}`);
    } else {
      console.log(`❌ Sell failed: ${result}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    return;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sellToken().catch(console.error);
}
