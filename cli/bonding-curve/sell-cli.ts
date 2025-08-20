import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { sellPumpFunToken } from '../../src/bonding-curve/sell';
import { debugLog, log, logError, logSuccess } from '../../src/utils/debug';

/**
 * Test the sell function with proper setup and validation
 */
export async function testSell() {
  log('🧪 Testing Sell Function');
  log('=========================');

  try {
    // Load token information
    const { mint: mintString } = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'wallets', 'token-info.json'), 'utf8')
    );
    const mint = new PublicKey(mintString);
    log(`🎯 Testing with token: ${mint.toString()}`);

    // Setup connection and wallet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Load test wallet from file
    const walletPath = path.join(process.cwd(), 'wallets', 'creator-wallet.json');
    let wallet: Keypair;

    try {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
      wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
      debugLog(`👛 Using test wallet: ${wallet.publicKey.toString()}`);
    } catch (error) {
      logError('Failed to load test wallet:', error);
      return;
    }

    // Check wallet balance
    const balance = await connection.getBalance(wallet.publicKey);
    debugLog(`💰 Wallet SOL balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    // Test selling all tokens (default behavior)
    log(`\n🔄 Testing sell all tokens...`);
    try {
      // Get user's current token balance to sell all
      const userBalance = await connection.getTokenAccountBalance(
        getAssociatedTokenAddressSync(mint, wallet.publicKey, false)
      );
      const allTokens = parseInt(userBalance.value.amount);
      log(`💰 Selling all ${allTokens} tokens...`);
      
      const signature = await sellPumpFunToken(
        connection,
        wallet,
        mint,
        allTokens, // Sell all tokens
        1000 // Default slippage (10%)
      );
      
      logSuccess(`Sell all successful! Signature: ${signature}`);
    } catch (error) {
      logError(`Sell all failed: ${error}`);
    }
  } catch (error) {
    logError(`Test error: ${error}`);
  }
}

/**
 * Test selling a specific amount of tokens
 */
export async function testSellSpecificAmount() {
  log('\n🧪 Testing Sell Specific Amount');
  log('=================================');

  try {
    const { mint: mintString } = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'wallets', 'token-info.json'), 'utf8')
    );
    const mint = new PublicKey(mintString);

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const walletPath = path.join(process.cwd(), 'wallets', 'creator-wallet.json');
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

    // Test selling specific amount (e.g., 1000 tokens)
    const specificAmount = 1000;
    log(`🔄 Testing sell ${specificAmount} tokens...`);

    const signature = await sellPumpFunToken(
      connection,
      wallet,
      mint,
      specificAmount,
      1000 // Default slippage (10%)
    );

    logSuccess(`Sell specific amount successful! Signature: ${signature}`);
  } catch (error) {
    logError(`Test error: ${error}`);
  }
}

/**
 * Test selling with custom slippage
 */
export async function testSellWithCustomSlippage() {
  log('\n🧪 Testing Sell with Custom Slippage');
  log('=====================================');

  try {
    const { mint: mintString } = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'wallets', 'token-info.json'), 'utf8')
    );
    const mint = new PublicKey(mintString);

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const walletPath = path.join(process.cwd(), 'wallets', 'creator-wallet.json');
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

    // Test selling with 5% slippage (500 basis points)
    const customSlippage = 500;
    log(`🔄 Testing sell with ${customSlippage / 100}% slippage...`);

    try {
      // Get user's current token balance to sell all
      const userBalance = await connection.getTokenAccountBalance(
        getAssociatedTokenAddressSync(mint, wallet.publicKey, false)
      );
      const allTokens = parseInt(userBalance.value.amount);
      log(`💰 Selling all ${allTokens} tokens with custom slippage...`);
      
      const signature = await sellPumpFunToken(
        connection,
        wallet,
        mint,
        allTokens, // Sell all tokens
        customSlippage
      );

      logSuccess(`Sell with custom slippage successful! Signature: ${signature}`);
    } catch (error) {
      logError(`Sell with custom slippage failed: ${error}`);
    }
  } catch (error) {
    console.log(`❌ Test error: ${error}`);
  }
}

/**
 * Test error handling scenarios
 */
export async function testErrorHandling() {
  log('\n🧪 Testing Error Handling');
  log('===========================');

  try {
    // Load token information for bonding curve address
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const walletPath = path.join(process.cwd(), 'wallets', 'creator-wallet.json');
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

    // Test with invalid mint address
    log('🔄 Testing with invalid mint address...');
    const invalidMint = new PublicKey('11111111111111111111111111111111');

    try {
      await sellPumpFunToken(connection, wallet, invalidMint, 1000);
      logError(`Should have failed with invalid mint`);
    } catch (error) {
      logSuccess(`Error handling working: ${error}`);
    }

    // Test with non-existent token
    log('🔄 Testing with non-existent token...');
    const fakeMint = new PublicKey('FakeMintAddressThatDoesNotExist123456789');

    try {
      await sellPumpFunToken(connection, wallet, fakeMint, 1000);
      logError(`Should have failed with fake mint`);
    } catch (error) {
      logSuccess(`Error handling working: ${error}`);
    }
  } catch (error) {
    logError(`Test error: ${error}`);
  }
}

/**
 * Run comprehensive sell tests
 */
export async function runComprehensiveSellTests() {
  log('🚀 Starting Comprehensive Sell Tests');
  log('=====================================');

  try {
    // Run all test scenarios
    await testSell();
    await testSellSpecificAmount();
    await testSellWithCustomSlippage();
    await testErrorHandling();

    logSuccess('\n🎉 All sell tests completed!');
  } catch (error) {
    logError('Comprehensive test error:', error);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testType = process.argv[2];

  switch (testType) {
    case 'all':
      runComprehensiveSellTests().catch(console.error);
      break;
    case 'specific':
      testSellSpecificAmount().catch(console.error);
      break;
    case 'slippage':
      testSellWithCustomSlippage().catch(console.error);
      break;
    case 'errors':
      testErrorHandling().catch(console.error);
      break;
    default:
      testSell().catch(console.error);
  }
}
