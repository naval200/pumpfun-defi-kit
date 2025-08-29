import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { addLiquidity, removeLiquidity } from '../../src/amm/liquidity';
import { findPoolsForToken } from '../../src/amm/amm';
import { loadWallet, loadTokenInfo } from '../cli-args';

function showHelp() {
  console.log(`
Usage: npm run cli:amm:liquidity -- [options]

Options:
  --help                    Show this help message
  --wallet <path>          Path to wallet JSON file (default: wallets/creator-wallet.json)
  --input-token <path>     Path to token info JSON file (default: wallets/token-info.json)
  --pool-key <address>     Specific pool key to use (optional)
  --action <add|remove>    Action to perform: add or remove liquidity (default: add)
  --amount <number>        Amount for liquidity operation (default: 0.01 SOL for add, 50% for remove)
  --slippage <number>      Slippage tolerance in basis points (default: 100)

Examples:
  npm run cli:amm:liquidity -- --help
  npm run cli:amm:liquidity -- --action add --amount 0.05
  npm run cli:amm:liquidity -- --action remove --amount 1000
  npm run cli:amm:liquidity -- --pool-key <pool-address> --action add
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
      case '--wallet':
        args.wallet = argv[++i];
        break;
      case '--input-token':
        args.inputToken = argv[++i];
        break;
      case '--pool-key':
        args.poolKey = argv[++i];
        break;
      case '--action':
        args.action = argv[++i];
        break;
      case '--amount':
        args.amount = parseFloat(argv[++i]);
        break;
      case '--slippage':
        args.slippage = parseInt(argv[++i]);
        break;
    }
  }
  
  return args;
}

/**
 * CLI for AMM liquidity operations
 */
async function main() {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    return;
  }

  try {
    console.log('💧 AMM Liquidity Operations');
    console.log('============================');

    // Load token information
    const tokenInfo = loadTokenInfo(args.inputToken);
    console.log(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
    console.log(`📍 Token Mint: ${tokenInfo.mint}`);
    if (tokenInfo.poolKey) {
      console.log(`🏊 Pool Key from config: ${tokenInfo.poolKey}`);
    }

    // Setup connection and wallet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const wallet = loadWallet(args.wallet);
    console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);

    // Check wallet balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (balance < 0.2 * LAMPORTS_PER_SOL) {
      console.log('⚠️ Wallet balance is low. Need at least 0.2 SOL for liquidity operations.');
      return;
    }

    let poolKey: PublicKey;

    // If pool key is provided via args, use it
    if (args.poolKey) {
      poolKey = new PublicKey(args.poolKey);
      console.log(`🏊 Using provided pool key: ${poolKey.toString()}`);
    }
    // If pool key is in token info, use it
    else if (tokenInfo.poolKey) {
      poolKey = new PublicKey(tokenInfo.poolKey);
      console.log(`🏊 Using pool key from config: ${poolKey.toString()}`);
    }
    // Otherwise search for pools
    else {
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
      console.log(`🏊 Using first pool: ${poolKey.toString()}`);
    }

    const action = args.action || 'add';
    const amount = args.amount || (action === 'add' ? 0.01 : undefined);
    const slippage = args.slippage || 100;

    if (action === 'add') {
      console.log('\n💧 Adding Liquidity...');
      console.log(`📊 Amount: ${amount} SOL`);
      console.log(`📊 Slippage tolerance: ${slippage} basis points (${slippage / 100}%)`);

      const addResult = await addLiquidity(connection, wallet, poolKey, amount, slippage);

      if (addResult.success) {
        console.log('✅ Add liquidity successful!');
        console.log(`📊 Transaction signature: ${addResult.signature}`);
        console.log(`🪙 LP tokens received: ${addResult.lpTokenAmount}`);
      } else {
        console.log(`❌ Add liquidity failed: ${addResult.error}`);
      }
    } else if (action === 'remove') {
      console.log('\n💸 Removing Liquidity...');
      console.log(`📊 LP Token Amount: ${amount}`);
      console.log(`📊 Slippage tolerance: ${slippage} basis points (${slippage / 100}%)`);

      const removeResult = await removeLiquidity(connection, wallet, poolKey, amount, slippage);

      if (removeResult.success) {
        console.log('✅ Remove liquidity successful!');
        console.log(`📊 Transaction signature: ${removeResult.signature}`);
        console.log(`💰 Base tokens received: ${removeResult.baseAmount}`);
        console.log(`💰 Quote tokens received: ${removeResult.quoteAmount}`);
      } else {
        console.log(`❌ Remove liquidity failed: ${removeResult.error}`);
      }
    } else {
      console.log(`❌ Invalid action: ${action}. Use 'add' or 'remove'`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
