import { 
  Connection, 
  PublicKey, 
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { createPool } from '../../src/amm/createPool';
import { getPoolInfo } from '../../src/amm/info';
import fs from 'fs';
import path from 'path';

/**
 * Test script for creating a liquidity pool OR using existing pool
 * This script demonstrates how to create an AMM pool for trading
 * or use an existing pool if one already exists
 */
async function testCreatePoolOrUseExisting() {
  try {
    console.log('🚀 Starting AMM Pool Creation/Usage Test...\n');

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

    // Check if pool already exists
    if (tokenInfo.poolKey) {
      console.log(`🏊 Pool already exists: ${tokenInfo.poolKey}`);
      console.log(`📅 Created: ${tokenInfo.poolCreatedAt}`);
      console.log(`📊 Config: ${tokenInfo.poolConfig.baseAmount} ${tokenInfo.symbol} + ${tokenInfo.poolConfig.quoteAmount} SOL`);
      
      // Test if the existing pool is accessible
      try {
        console.log('\n🔍 Testing existing pool accessibility...');
        const poolKey = new PublicKey(tokenInfo.poolKey);
        const poolInfo = await getPoolInfo(connection, wallet, poolKey);
        
        console.log('✅ Existing pool is accessible!');
        console.log('📊 Current Pool Information:');
        console.log(`   Pool Key: ${poolInfo.poolKey}`);
        console.log(`   Base Mint: ${poolInfo.baseMint}`);
        console.log(`   Quote Mint: ${poolInfo.quoteMint}`);
        console.log(`   Base Reserves: ${poolInfo.baseReserves}`);
        console.log(`   Quote Reserves: ${poolInfo.quoteReserves}`);
        console.log(`   Creator: ${poolInfo.creator}`);
        
        console.log('\n🎉 Pool is ready for AMM operations!');
        console.log('💡 You can now run:');
        console.log('   npm run test:amm:info');
        console.log('   npm run test:amm:liquidity');
        console.log('   npm run test:amm:add-only');
        
        return;
        
      } catch (error) {
        console.log('⚠️ Existing pool is not accessible, will try to create new one...');
        console.log('Error:', error.message);
      }
    }

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

      // Write updated token info back to file
      fs.writeFileSync(tokenInfoPath, JSON.stringify(updatedTokenInfo, null, 2));
      console.log('✅ Updated token-info.json with pool information');
      
      console.log('\n🎉 Pool is ready for AMM operations!');
      console.log('💡 You can now run:');
      console.log('   npm run test:amm:info');
      console.log('   npm run test:amm:liquidity');
      console.log('   npm run test:amm:add-only');
      
    } else {
      console.log('\n❌ Pool creation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error during pool creation/usage test:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCreatePoolOrUseExisting().catch(console.error);
}
