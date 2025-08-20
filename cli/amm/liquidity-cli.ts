import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { addLiquidity, removeLiquidity } from '../../src/amm/liquidity';
import { findPoolsForToken } from '../../src/utils/amm';

/**
 * Test AMM liquidity functions (add/remove)
 */
export async function testAMMLiquidity() {
  console.log('🧪 Testing AMM Liquidity Functions');
  console.log('===================================');

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
  console.log(`💰 Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  if (balance < 0.2 * LAMPORTS_PER_SOL) {
    console.log('⚠️ Wallet balance is low. Need at least 0.2 SOL for liquidity testing.');
    return;
  }

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
    let poolKey: PublicKey;
    if (tokenInfo.poolKey) {
      console.log(`\n🏊 Using pool from token-info.json: ${tokenInfo.poolKey}`);
      poolKey = new PublicKey(tokenInfo.poolKey);
    } else {
      // Use the first pool found for testing
      poolKey = pools[0];
      console.log(`🏊 Using pool: ${poolKey.toString()}`);
    }

    // Test adding liquidity
    console.log('\n💧 Testing Add Liquidity...');
    const addLiquidityAmount = 0.01; // 0.01 SOL worth
    const slippage = 1; // 1% slippage

    console.log(`📊 Adding ${addLiquidityAmount} SOL worth of liquidity`);
    console.log(`📊 Slippage tolerance: ${slippage}%`);

    const addResult = await addLiquidity(connection, wallet, poolKey, addLiquidityAmount, slippage);

    if (addResult.success) {
      console.log('✅ Add liquidity successful!');
      console.log(`📊 Transaction signature: ${addResult.signature}`);
      console.log(`🪙 LP tokens received: ${addResult.lpTokenAmount}`);

      // Wait a bit before testing remove liquidity
      console.log('\n⏳ Waiting 5 seconds before testing remove liquidity...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test removing liquidity
      console.log('\n💸 Testing Remove Liquidity...');
      const removeLpAmount = addResult.lpTokenAmount! * 0.5; // Remove half of LP tokens

      console.log(`📊 Removing ${removeLpAmount} LP tokens (50% of received)`);
      console.log(`📊 Slippage tolerance: ${slippage}%`);

      const removeResult = await removeLiquidity(
        connection,
        wallet,
        poolKey,
        removeLpAmount,
        slippage
      );

      if (removeResult.success) {
        console.log('✅ Remove liquidity successful!');
        console.log(`📊 Transaction signature: ${removeResult.signature}`);
        console.log(`🪙 Tokens received: ${removeResult.baseAmount}`);
        console.log(`💰 SOL received: ${removeResult.quoteAmount}`);
      } else {
        console.log(`❌ Remove liquidity failed: ${removeResult.error}`);
      }
    } else {
      console.log(`❌ Add liquidity failed: ${addResult.error}`);
    }
  } catch (error) {
    console.error('❌ Error during AMM liquidity test:', error);

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

/**
 * Test only add liquidity (useful for testing without removing)
 */
export async function testAddLiquidityOnly() {
  console.log('🧪 Testing AMM Add Liquidity Only');
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

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const walletPath = path.join(process.cwd(), 'wallets', 'creator-wallet.json');
  let wallet: Keypair;

  try {
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  } catch (error) {
    console.error('❌ Failed to load test wallet:', error);
    return;
  }

  try {
    const tokenMint = new PublicKey(tokenInfo.mint);
    const pools = await findPoolsForToken(connection, tokenMint);

    // If we have a pool key from token-info.json, use it directly
    let poolKey: PublicKey;
    if (tokenInfo.poolKey) {
      console.log(`\n🏊 Using pool from token-info.json: ${tokenInfo.poolKey}`);
      poolKey = new PublicKey(tokenInfo.poolKey);
    } else {
      if (pools.length === 0) {
        console.log('❌ No AMM pools found for this token');
        return;
      }
      poolKey = pools[0];
      console.log(`🏊 Using pool: ${poolKey.toString()}`);
    }

    const addLiquidityAmount = 0.01;
    const slippage = 1;

    console.log(
      `💧 Adding ${addLiquidityAmount} SOL worth of liquidity to pool: ${poolKey.toString()}`
    );

    const result = await addLiquidity(connection, wallet, poolKey, addLiquidityAmount, slippage);

    if (result.success) {
      console.log('✅ Add liquidity successful!');
      console.log(`📊 LP tokens received: ${result.lpTokenAmount}`);
      console.log(`📊 Transaction signature: ${result.signature}`);
    } else {
      console.log(`❌ Add liquidity failed: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Error during add liquidity test:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check command line arguments to determine which test to run
  const args = process.argv.slice(2);

  if (args.includes('--add-only')) {
    testAddLiquidityOnly().catch(console.error);
  } else {
    testAMMLiquidity().catch(console.error);
  }
}
