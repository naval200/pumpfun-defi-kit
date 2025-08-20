import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { getPoolInfo } from '../../src/amm/info';
import { findPoolsForToken } from '../../src/utils/amm';

/**
 * Test AMM pool info function
 */
export async function testAMMPoolInfo() {
  console.log('🧪 Testing AMM Pool Info Function');
  console.log('==================================');

  // Load token information from configuration file
  let tokenInfo: any;
  try {
    const tokenInfoPath = path.join(process.cwd(), 'wallets', 'token-info.json');
    tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf8'));
    console.log(`🎯 Testing with token: ${tokenInfo.name} (${tokenInfo.symbol})`);
    console.log(`📍 Token Mint: ${tokenInfo.mint}`);
    if (tokenInfo.poolKey) {
      console.log(`🏊 Pool Key: ${tokenInfo.poolKey}`);
    }
  } catch (error) {
    console.error('❌ Failed to load token-info.json:', error);
    return;
  }

  // Setup connection and wallet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load test wallet from file
  const walletPath = path.join(process.cwd(), 'wallets', 'creator-wallet.json');
  let wallet: Keypair;

  try {
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
    console.log(`👛 Using test wallet: ${wallet.publicKey.toString()}`);
  } catch (error) {
    console.error('❌ Failed to load test wallet:', error);
    return;
  }

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Wallet balance: ${(balance / 1e9).toFixed(4)} SOL`);

  // Import the findPoolsForToken function to locate pools
  try {
    const tokenMint = new PublicKey(tokenInfo.mint);
    console.log('🔍 Searching for AMM pools for this token...');

    const pools = await findPoolsForToken(connection, tokenMint);

    if (pools.length === 0) {
      console.log('❌ No AMM pools found for this token');
      console.log(
        '💡 The token may not have been migrated to AMM yet, or the search method needs adjustment'
      );
      return;
    }

    // If we have a pool key from token-info.json, use it directly
    if (tokenInfo.poolKey) {
      console.log(`\n🏊 Using pool from token-info.json: ${tokenInfo.poolKey}`);

      try {
        const poolKey = new PublicKey(tokenInfo.poolKey);
        const poolInfo = await getPoolInfo(connection, wallet, poolKey);

        console.log('📊 Pool Information:');
        console.log(`   Pool Key: ${poolInfo.poolKey}`);
        console.log(`   Base Mint: ${poolInfo.baseMint}`);
        console.log(`   Quote Mint: ${poolInfo.quoteMint}`);
        console.log(`   Base Reserves: ${poolInfo.baseReserves}`);
        console.log(`   Quote Reserves: ${poolInfo.quoteReserves}`);
        console.log(`   Creator: ${poolInfo.creator}`);
        console.log(`   Global Config: ${JSON.stringify(poolInfo.globalConfig, null, 2)}`);
      } catch (error) {
        console.error(`❌ Error getting info for pool from token-info.json:`, error);

        // Provide helpful debugging information
        if (error.message?.includes('AccountNotFound')) {
          console.log('💡 The pool account may not exist or be accessible');
        } else if (error.message?.includes('InvalidAccountData')) {
          console.log('💡 The pool account data may be corrupted or in wrong format');
        }
      }
    } else {
      // Fallback to searching for pools
      console.log('🔍 No pool key in token-info.json, searching for pools...');

      // Test pool info for each pool found
      for (let i = 0; i < pools.length; i++) {
        const poolKey = pools[i];
        console.log(`\n🏊 Pool ${i + 1}: ${poolKey.toString()}`);

        try {
          const poolInfo = await getPoolInfo(connection, wallet, poolKey);

          console.log('📊 Pool Information:');
          console.log(`   Pool Key: ${poolInfo.poolKey}`);
          console.log(`   Base Mint: ${poolInfo.baseMint}`);
          console.log(`   Quote Mint: ${poolInfo.quoteMint}`);
          console.log(`   Base Reserves: ${poolInfo.baseReserves}`);
          console.log(`   Quote Reserves: ${poolInfo.quoteReserves}`);
          console.log(`   Creator: ${poolInfo.creator}`);
          console.log(`   Global Config: ${JSON.stringify(poolInfo.globalConfig, null, 2)}`);
        } catch (error) {
          console.error(`❌ Error getting info for pool ${i + 1}:`, error);

          // Provide helpful debugging information
          if (error.message?.includes('AccountNotFound')) {
            console.log('💡 The pool account may not exist or be accessible');
          } else if (error.message?.includes('InvalidAccountData')) {
            console.log('💡 The pool account data may be corrupted or in wrong format');
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error during AMM pool info test:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAMMPoolInfo().catch(console.error);
}
