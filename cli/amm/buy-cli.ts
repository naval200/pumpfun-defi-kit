#!/usr/bin/env tsx

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { buyTokens, findPoolsForToken } from '../../src/amm';
import { parseArgs, loadWallet, loadTokenInfo, loadFeePayerWallet, printUsage } from '../cli-args';

/**
 * Buy tokens via AMM with configurable parameters
 */
export async function buyTokensAMM() {
  const args = parseArgs();

  if (args.help) {
    printUsage('cli:amm-buy', [
      '  --amount <number>           Amount of SOL to spend (required)',
      '  --slippage <number>         Slippage tolerance in basis points (default: 100)',
      '  --input-token <path>        Path to token info JSON file',
      '  --wallet <path>             Path to wallet JSON file',
      '  --pool-key <string>         Specific pool key to use (optional)',
      '  --fee-payer <path>          Path to fee payer wallet JSON file (optional)',
    ]);
    return;
  }

  // Validate required arguments
  if (!args.amount || args.amount <= 0) {
    console.error('❌ Error: --amount is required and must be greater than 0');
    printUsage('cli:amm-buy');
    return;
  }

  console.log('🛒 Buying Tokens via AMM');
  console.log('==========================');
  console.log(`Amount: ${args.amount} SOL`);
  console.log(`Slippage: ${args.slippage || 100} basis points (${(args.slippage || 100) / 100}%)`);

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

    let poolKey: PublicKey;

    // If pool key is provided, use it directly
    if (args.poolKey) {
      poolKey = new PublicKey(args.poolKey);
      console.log(`🏊 Using specified pool: ${poolKey.toString()}`);
    } else {
      // Search for pools
      console.log('🔍 Searching for AMM pools for this token...');
      const tokenMint = new PublicKey(tokenInfo.mint);
      const pools = await findPoolsForToken(connection, tokenMint);

      if (pools.length === 0) {
        console.log('❌ No AMM pools found for this token');
        console.log('💡 The token may not have been migrated to AMM yet');
        return;
      }

      console.log(`✅ Found ${pools.length} AMM pool(s) for this token`);
      poolKey = pools[0];
      console.log(`🏊 Using pool: ${poolKey.toString()}`);
    }

    // Execute buy
    console.log(`\n🔄 Executing AMM buy of ${args.amount} SOL worth of tokens...`);
    const buyResult = await buyTokens(
      connection,
      wallet,
      poolKey,
      args.amount,
      args.slippage || 100,
      feePayer || undefined
    );

    if (buyResult.success) {
      console.log('✅ AMM buy successful!');
      console.log(`📊 Transaction signature: ${buyResult.signature}`);
      console.log(`🪙 Tokens received: ${buyResult.baseAmount}`);
    } else {
      console.log(`❌ AMM buy failed: ${buyResult.error}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);

    // Provide helpful debugging information
    if (error.message?.includes('AccountNotFound')) {
      console.log('💡 The pool account may not exist or be accessible');
    } else if (error.message?.includes('InvalidAccountData')) {
      console.log('💡 The pool account data may be corrupted or in wrong format');
    } else if (error.message?.includes('InsufficientFunds')) {
      console.log('💡 Check wallet balance and pool liquidity');
    }
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buyTokensAMM().catch(console.error);
}
