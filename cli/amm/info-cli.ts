import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { getPoolInfo } from '../../src/amm/info';
import { findPoolsForToken } from '../../src/amm/amm';
import { loadWallet, loadTokenInfo } from '../cli-args';

function showHelp() {
  console.log(`
Usage: npm run cli:amm:info -- [options]

Options:
  --help                    Show this help message
  --wallet <path>          Path to wallet JSON file (default: wallets/creator-wallet.json)
  --input-token <path>     Path to token info JSON file (default: wallets/token-info.json)
  --pool-key <address>     Specific pool key to use (optional)

Examples:
  npm run cli:amm:info -- --help
  npm run cli:amm:info -- --pool-key <pool-address>
  npm run cli:amm:info -- --wallet ./my-wallet.json
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
    }
  }
  
  return args;
}

/**
 * CLI for getting AMM pool information
 */
async function main() {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    return;
  }

  try {
    console.log('🏊 AMM Pool Information');
    console.log('========================');

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
    console.log(`💰 Wallet balance: ${(balance / 1e9).toFixed(4)} SOL`);

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

    // Get pool information
    console.log('\n📊 Getting pool information...');
    try {
      const poolInfo = await getPoolInfo(connection, poolKey, wallet);

      if (poolInfo) {
        console.log('\n📊 Pool Information:');
        console.log(`   Pool Key: ${poolKey.toString()}`);
        console.log(`   Pool Data: ${JSON.stringify(poolInfo, null, 2)}`);
      } else {
        console.log('❌ No pool information returned');
      }
    } catch (error) {
      console.error(`❌ Error getting pool info:`, error);

      // Provide helpful debugging information
      if (error.message?.includes('AccountNotFound')) {
        console.log('💡 The pool account may not exist or be accessible');
      } else if (error.message?.includes('InvalidAccountData')) {
        console.log('💡 The pool account data may be corrupted or in wrong format');
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
