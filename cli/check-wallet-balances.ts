#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getMint, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { loadWallet } from './cli-args';
import { debugLog, log, logError } from '../src/utils/debug';

/**
 * Check wallet balances for all known tokens
 */
async function checkWalletBalances() {
  try {
    debugLog('🔍 Checking Creator Wallet Balances...\n');

    // Load wallet from CLI args
    const creatorKeypair = await loadWallet();
    if (!creatorKeypair) {
      logError('❌ Failed to load wallet');
      return;
    }

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    debugLog(`👤 Creator Wallet: ${creatorKeypair.publicKey.toString()}`);
    debugLog(`🔗 Network: ${connection.rpcEndpoint}\n`);

    // Check SOL balance
    const solBalance = await connection.getBalance(creatorKeypair.publicKey);
    debugLog(`💰 SOL Balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

    // Check specific token balances from token files
    const tokenFiles = [
      'wallets/token1.json',
      'wallets/token2.json',
      'wallets/token3.json'
    ];

    for (const tokenFile of tokenFiles) {
      try {
        const tokenInfo = JSON.parse(require('fs').readFileSync(tokenFile, 'utf8'));
        const mintPublicKey = new PublicKey(tokenInfo.mint);

        // Get token info
        const mintInfo = await getMint(connection, mintPublicKey);
        const tokenAccount = await getAssociatedTokenAddress(mintPublicKey, creatorKeypair.publicKey);

        debugLog(`🪙 ${tokenInfo.name} (${tokenInfo.symbol})`);
        debugLog(`   Mint: ${mintPublicKey.toString()}`);

        try {
          const accountInfo = await getAccount(connection, tokenAccount);
          debugLog(`   ✅ Token Account: ${tokenAccount.toString()}`);
          debugLog(`   💰 Balance: ${accountInfo.amount}`);
          
          if (Number(accountInfo.amount) > 0) {
            debugLog(`   🎯 Has tokens to send!`);
          }
        } catch (error) {
          debugLog(`   ❌ No token account found`);
        }
      } catch (error) {
        debugLog(`   ⚠️ Error checking balance: ${error}`);
      }
      debugLog('');
    }

    // Check for other SPL tokens
    debugLog('🔍 Checking for other SPL tokens...');
    try {
      const tokenAccounts = await connection.getTokenAccountsByOwner(creatorKeypair.publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });

      if (tokenAccounts.value.length > 0) {
        debugLog(`Found ${tokenAccounts.value.length} token account(s):`);
        for (const account of tokenAccounts.value) {
          const accountInfo = await getAccount(connection, account.pubkey);
          debugLog(`   🪙 ${accountInfo.mint} - Balance: ${accountInfo.tokenAmount.amount}`);
        }
      } else {
        debugLog('No SPL token accounts found');
      }
    } catch (error) {
      debugLog(`⚠️ Error checking SPL tokens: ${error}`);
    }

  } catch (error) {
    logError('❌ Error checking balances:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkWalletBalances().catch(logError);
}
