#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createConnection } from '../src/utils/connection';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Check wallet balances for all known tokens
 */
async function main() {
  try {
    console.log('🔍 Checking Creator Wallet Balances...\n');

    // Load creator wallet
    const walletsDir = path.join(__dirname, '../wallets');
    const creatorWalletPath = path.join(walletsDir, 'creator-wallet.json');
    const creatorWalletData = JSON.parse(fs.readFileSync(creatorWalletPath, 'utf8'));
    const creatorKeypair = Keypair.fromSecretKey(Uint8Array.from(creatorWalletData));

    // Get connection
    const connection = createConnection();

    console.log(`👤 Creator Wallet: ${creatorKeypair.publicKey.toString()}`);
    console.log(`🔗 Network: ${connection.rpcEndpoint}\n`);

    // Check SOL balance
    const solBalance = await connection.getBalance(creatorKeypair.publicKey);
    console.log(`💰 SOL Balance: ${(solBalance / 1e9).toFixed(4)} SOL\n`);

    // Check all known token mints
    const tokenFiles = [
      'token-info-working.json',
      'token-info-1.json',
      'token-info-2.json'
    ];

    for (const tokenFile of tokenFiles) {
      try {
        const tokenInfoPath = path.join(walletsDir, tokenFile);
        if (!fs.existsSync(tokenInfoPath)) continue;

        const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf8'));
        const mintPublicKey = new PublicKey(tokenInfo.mint);

        console.log(`🪙 ${tokenInfo.name} (${tokenInfo.symbol})`);
        console.log(`   Mint: ${mintPublicKey.toString()}`);

        try {
          const tokenAccount = await getAssociatedTokenAddress(mintPublicKey, creatorKeypair.publicKey);
          const accountInfo = await getAccount(connection, tokenAccount);
          
          console.log(`   ✅ Token Account: ${tokenAccount.toString()}`);
          console.log(`   💰 Balance: ${accountInfo.amount}`);
          
          if (accountInfo.amount > 0) {
            console.log(`   🎯 Has tokens to send!`);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('Account does not exist')) {
            console.log(`   ❌ No token account found`);
          } else {
            console.log(`   ⚠️ Error checking balance: ${error}`);
          }
        }
        console.log('');
      } catch (error) {
        console.log(`⚠️ Error processing ${tokenFile}: ${error}\n`);
      }
    }

    // Also check for any other SPL tokens the wallet might have
    console.log('🔍 Checking for other SPL tokens...');
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        creatorKeypair.publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      if (tokenAccounts.value.length > 0) {
        console.log(`Found ${tokenAccounts.value.length} token account(s):`);
        for (const account of tokenAccounts.value) {
          const accountInfo = account.account.data.parsed.info;
          console.log(`   🪙 ${accountInfo.mint} - Balance: ${accountInfo.tokenAmount.amount}`);
        }
      } else {
        console.log('No SPL token accounts found');
      }
    } catch (error) {
      console.log(`⚠️ Error checking SPL tokens: ${error}`);
    }

  } catch (error) {
    console.error('❌ Error checking balances:', error);
  }
}

if (require.main === module) {
  main();
}
