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
        'Usage: npm run cli:check-wallet-balances -- --wallet <wallet-path> [--mint <token-mint>]'
      );
      console.log('  --wallet <path>     Path to wallet JSON file (required)');
      console.log('  --mint <mint>       Specific token mint to check (optional)');
      console.log('  --help              Show this help message');
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
    debugLog('🔍 Checking Wallet Balances...\n');

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    debugLog(`👤 Wallet: ${walletKeypair.publicKey.toString()}`);
    debugLog(`🔗 Network: ${connection.rpcEndpoint}\n`);

    // Check SOL balance
    console.log('🔍 Getting SOL balance...');
    const balance = await connection.getBalance(walletKeypair.publicKey);
    debugLog(`💰 SOL Balance: ${formatLamportsAsSol(balance)} SOL\n`);

    // Check specific token balance if mint is provided
    if (args.mint) {
      console.log('🔍 Checking specific token balance...');
      try {
        const mintPublicKey = new PublicKey(args.mint);
        console.log('✅ Created mint public key');
        const tokenAccount = await getAssociatedTokenAddress(
          mintPublicKey,
          walletKeypair.publicKey
        );
        console.log('✅ Got associated token address');

        debugLog(`🪙 Checking specific token: ${args.mint}`);
        debugLog(`   Token Account: ${tokenAccount.toString()}`);

        try {
          console.log('🔍 Getting account info...');
          const accountInfo = await getAccount(connection, tokenAccount);
          console.log('✅ Token Account found');
          debugLog(`   ✅ Token Account found`);
          console.log(`💰 Balance: ${accountInfo.amount}`);
          debugLog(`   💰 Balance: ${accountInfo.amount}`);

          if (accountInfo.amount > 0) {
            debugLog(`   🎯 Has tokens!`);
          } else {
            debugLog(`   ⚠️ Account exists but has 0 balance`);
          }
        } catch (error) {
          debugLog(`   ❌ No token account found`);
        }
        debugLog('');
      } catch (error) {
        debugLog(`   ❌ Error checking token: ${error}`);
      }
    } else {
      // Check for all SPL tokens
      debugLog('🔍 Checking for all SPL tokens...');
      try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(walletKeypair.publicKey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        if (tokenAccounts.value.length > 0) {
          debugLog(`Found ${tokenAccounts.value.length} token account(s):`);
          for (const account of tokenAccounts.value) {
            try {
              const accountInfo = await getAccount(connection, account.pubkey);
              const mintInfo = await getMint(connection, accountInfo.mint);
              debugLog(
                `   🪙 ${accountInfo.mint.toString()} - Balance: ${accountInfo.amount} (${mintInfo.decimals} decimals)`
              );

              if (accountInfo.amount > 0) {
                const actualBalance = Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
                debugLog(`      💰 Actual Balance: ${actualBalance.toFixed(6)}`);
              }
            } catch (error) {
              debugLog(`   ⚠️ Error reading account ${account.pubkey.toString()}: ${error}`);
            }
          }
        } else {
          debugLog('No SPL token accounts found');
        }
      } catch (error) {
        debugLog(`⚠️ Error checking SPL tokens: ${error}`);
      }
    }
  } catch (error) {
    logError('❌ Error checking balances:', error);
  }
}

// Run if this file is executed directly
console.log('🔍 Script loaded, checking if main module...');
console.log('require.main:', require.main);
console.log('module:', module);
if (require.main === module) {
  console.log('✅ Running main function...');
  checkWalletBalances().catch((error) => {
    console.error('❌ Error caught:', error);
    logError(error);
  });
} else {
  console.log('❌ Not main module, skipping execution');
}
