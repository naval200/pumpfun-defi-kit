import { 
  Connection, 
  PublicKey, 
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { createPool } from '../../src/amm/createPool';
import fs from 'fs';
import path from 'path';

/**
 * Test script for creating a liquidity pool for a token
 * This script demonstrates how to create an AMM pool for trading
 */
async function testCreatePool() {
  try {
    console.log('🚀 Starting AMM Pool Creation Test...\n');

    // Setup connection and wallet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    console.log('✅ Connected to Solana devnet');
    
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
    console.log(`💰 Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.log('⚠️ Wallet balance is low. Need at least 0.1 SOL for testing.');
      return;
    }

    // Load token info
    const tokenInfoPath = path.join(process.cwd(), 'token-info.json');
    if (!fs.existsSync(tokenInfoPath)) {
      throw new Error('token-info.json not found. Please create a token first.');
    }

    const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf8'));
    console.log('✅ Token info loaded:', {
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      mint: tokenInfo.mint
    });

    // Define pool parameters
    const baseMint = new PublicKey(tokenInfo.mint); // Your token
    const quoteMint = new PublicKey('So11111111111111111111111111111111111111112'); // SOL (wrapped SOL)
    
    // Pool amounts (adjust these based on your needs)
    const baseIn = 1000000; // 1M tokens (assuming 6 decimals)
    const quoteIn = 0.1; // 0.1 SOL
    
    console.log('\n📊 Pool Creation Parameters:');
    console.log(`Base Token (${tokenInfo.symbol}): ${baseIn} tokens`);
    console.log(`Quote Token (SOL): ${quoteIn} SOL`);
    console.log(`Pool Index: 0`);

    // Create the pool
    console.log('\n🏊 Creating AMM liquidity pool...');
    const result = await createPool(
      connection,
      wallet,
      baseMint,
      quoteMint,
      baseIn,
      quoteIn,
      0 // pool index
    );

    if (result.success) {
      console.log('\n🎉 Pool created successfully!');
      console.log(`Pool Key: ${result.poolKey?.toString()}`);
      console.log(`Transaction: ${result.signature}`);
      
      // Update token-info.json with pool information
      const updatedTokenInfo = {
        ...tokenInfo,
        poolKey: result.poolKey?.toString(),
        poolCreatedAt: new Date().toISOString(),
        poolTransaction: result.signature,
        poolConfig: {
          baseAmount: baseIn,
          quoteAmount: quoteIn,
          poolIndex: 0
        }
      };

      // Write updated token info
      fs.writeFileSync(tokenInfoPath, JSON.stringify(updatedTokenInfo, null, 2));
      console.log('\n💾 Updated token-info.json with pool information');
      
      // Display final token info
      console.log('\n📋 Updated Token Information:');
      console.log(JSON.stringify(updatedTokenInfo, null, 2));
      
    } else {
      console.error('\n❌ Pool creation failed:', result.error);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n💥 Test failed with error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCreatePool();
}

export { testCreatePool };
