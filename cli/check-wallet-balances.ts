#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getMint, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { parseArgs } from './cli-args';
import { debugLog, log, logError } from '../src/utils/debug';
import fs from 'fs';
import path from 'path';
import { formatLamportsAsSol } from '../src/utils/amounts';

/**
 * Check wallet balances for all known tokens
 */
async function checkWalletBalances() {
  console.log('🚀 Starting checkWalletBalances function...');
  try {
    const args = parseArgs();
    console.log('📋 Parsed args:', args);

    if (args.help) {
      console.log(
        'Usage: npm run cli:check-wallet-balances -- --wallet <wallet-path> [--mint <token-mint>] [--input-token <token-info-file>]'
      );
      console.log('  --wallet <path>        Path to wallet JSON file (required)');
      console.log('  --mint <mint>          Specific token mint to check (optional)');
      console.log('  --input-token <file>   Path to token info JSON file (optional)');
      console.log('  --help                 Show this help message');
      return;
    }

    if (!args.wallet) {
      logError('❌ Error: --wallet parameter is required');
      console.log('Usage: npm run cli:check-wallet-balances -- --wallet <wallet-path>');
      return;
    }

    // Load wallet from CLI args
    let walletKeypair: Keypair;
    try {
      const walletData = fs.readFileSync(args.wallet, 'utf8');
      walletKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(walletData)));
    } catch (error) {
      logError('❌ Failed to load wallet:', error);
      return;
    }

    console.log('🔍 Checking Wallet Balances...\n');

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    console.log(`👤 Wallet: ${walletKeypair.publicKey.toString()}`);
    console.log(`🔗 Network: ${connection.rpcEndpoint}\n`);

    // Check SOL balance
    console.log('🔍 Getting SOL balance...');
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log(`💰 SOL Balance: ${formatLamportsAsSol(balance)} SOL\n`);

    // Check token from input file if provided
    if (args.inputToken) {
      console.log(`📄 Loading token info from: ${args.inputToken}`);
      try {
        const tokenInfoPath = path.resolve(args.inputToken);
        if (!fs.existsSync(tokenInfoPath)) {
          console.log(`❌ Token info file not found: ${tokenInfoPath}`);
          return;
        }
        
        const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf8'));
        console.log(`🪙 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
        console.log(`📍 Mint: ${tokenInfo.mint}`);
        
        const mintPublicKey = new PublicKey(tokenInfo.mint);
        const tokenAccount = await getAssociatedTokenAddress(
          mintPublicKey,
          walletKeypair.publicKey
        );
        
        try {
          const accountInfo = await getAccount(connection, tokenAccount);
          const mintInfo = await getMint(connection, mintPublicKey);
          const actualBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
          
          console.log(`💰 Token Balance: ${accountInfo.amount} (${actualBalance.toFixed(6)} tokens)`);
          console.log(`🔢 Decimals: ${mintInfo.decimals}`);
        } catch (error) {
          console.log(`❌ No token account found or error: ${error}`);
        }
        return; // Exit after checking input token
      } catch (error) {
        console.log(`❌ Error loading token info: ${error}`);
        return;
      }
    }

    // Check specific token balance if mint is provided
    if (args.mint) {
      console.log('🔍 Checking specific token balance...');
      try {
        const mintPublicKey = new PublicKey(args.mint);
        const tokenAccount = await getAssociatedTokenAddress(
          mintPublicKey,
          walletKeypair.publicKey
        );

        console.log(`🪙 Checking specific token: ${args.mint}`);
        console.log(`   Token Account: ${tokenAccount.toString()}`);

        try {
          const accountInfo = await getAccount(connection, tokenAccount);
          const mintInfo = await getMint(connection, mintPublicKey);
          const actualBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
          
          console.log(`✅ Token Account found`);
          console.log(`💰 Balance: ${accountInfo.amount} (${actualBalance.toFixed(6)} tokens)`);
          console.log(`🔢 Decimals: ${mintInfo.decimals}`);

          if (accountInfo.amount > 0) {
            console.log(`   🎯 Has tokens!`);
          } else {
            console.log(`   ⚠️ Account exists but has 0 balance`);
          }
        } catch (error) {
          console.log(`   ❌ No token account found: ${error}`);
        }
      } catch (error) {
        console.log(`   ❌ Error checking token: ${error}`);
      }
    } else {
      // Check for SPL tokens with timeout and limit
      console.log('🔍 Checking for SPL tokens (limited to first 10)...');
      try {
        // Add timeout to prevent hanging
        const tokenCheckPromise = connection.getTokenAccountsByOwner(walletKeypair.publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
        );
        
        const tokenAccounts = await Promise.race([tokenCheckPromise, timeoutPromise]) as any;

        if (tokenAccounts.value && tokenAccounts.value.length > 0) {
          console.log(`Found ${tokenAccounts.value.length} token account(s):`);
          const accountsToCheck = tokenAccounts.value.slice(0, 10); // Limit to first 10
          
          for (const account of accountsToCheck) {
            try {
              const accountInfo = await getAccount(connection, account.pubkey);
              const mintInfo = await getMint(connection, accountInfo.mint);
              
              console.log(
                `   🪙 ${accountInfo.mint.toString()} - Balance: ${accountInfo.amount} (${mintInfo.decimals} decimals)`
              );

              if (accountInfo.amount > 0) {
                const actualBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
                console.log(`      💰 Actual Balance: ${actualBalance.toFixed(6)}`);
              }
            } catch (error) {
              console.log(`   ⚠️ Error reading account ${account.pubkey.toString()}: ${error}`);
            }
          }
          
          if (tokenAccounts.value.length > 10) {
            console.log(`   ... and ${tokenAccounts.value.length - 10} more accounts (not shown)`);
          }
        } else {
          console.log('No SPL token accounts found');
        }
      } catch (error) {
        console.log(`⚠️ Error checking SPL tokens: ${error}`);
        console.log('💡 Try using --mint <specific-mint> or --input-token <file> for specific tokens');
      }
    }
  } catch (error) {
    logError('❌ Error checking balances:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkWalletBalances().catch((error) => {
    console.error('❌ Error caught:', error);
    process.exit(1);
  });
}
