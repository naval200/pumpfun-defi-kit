#!/usr/bin/env tsx

/**
 * Fee Payer Example
 * 
 * This example demonstrates how to use the fee payer functionality
 * to separate the wallet that pays transaction fees from the wallet
 * that owns the tokens.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { buyPumpFunToken } from '../src/bonding-curve/buy';
import { sellPumpFunToken } from '../src/bonding-curve/sell';
import { sendToken } from '../src/sendToken';
import { buyTokens } from '../src/amm/buy';
import { sellTokens } from '../src/amm/sell';

// Example configuration
const CONFIG = {
  rpcUrl: 'https://api.devnet.solana.com',
  commitment: 'confirmed' as const,
  tokenMint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', // Example mint
  poolKey: 'PoolKeyExample123456789', // Example pool key
};

/**
 * Example: Treasury pays fees for user operations
 */
async function treasuryFeePayerExample() {
  console.log('🏦 Treasury Fee Payer Example');
  console.log('==============================');

  try {
    // Setup connection
    const connection = new Connection(CONFIG.rpcUrl, CONFIG.commitment);

    // In a real scenario, you would load these from wallet files
    // For this example, we'll generate new keypairs
    const treasuryWallet = Keypair.generate();
    const userWallet = Keypair.generate();
    const recipientAddress = Keypair.generate().publicKey;

    console.log(`👛 Treasury Wallet: ${treasuryWallet.publicKey.toString()}`);
    console.log(`👤 User Wallet: ${userWallet.publicKey.toString()}`);
    console.log(`👥 Recipient: ${recipientAddress.toString()}`);

    // Note: In a real scenario, these wallets would need to be funded
    console.log('\n⚠️  Note: These are example wallets. In production:');
    console.log('   - Treasury wallet needs SOL for fees');
    console.log('   - User wallet needs tokens to trade/send');
    console.log('   - Use loadWallet() and loadFeePayerWallet() from CLI args');

    // Example 1: Buy tokens with treasury paying fees
    console.log('\n🔄 Example 1: Buying tokens with treasury paying fees');
    try {
      const buyResult = await buyPumpFunToken(
        connection,
        userWallet,           // User owns the tokens
        new PublicKey(CONFIG.tokenMint),
        0.01,                 // 0.01 SOL worth of tokens
        1000,                 // 10% slippage
        treasuryWallet        // Treasury pays the fees
      );
      console.log(`✅ Buy successful! Signature: ${buyResult}`);
    } catch (error) {
      console.log(`❌ Buy failed (expected without funding): ${error.message}`);
    }

    // Example 2: Sell tokens with treasury paying fees
    console.log('\n🔄 Example 2: Selling tokens with treasury paying fees');
    try {
      const sellResult = await sellPumpFunToken(
        connection,
        userWallet,           // User owns the tokens
        new PublicKey(CONFIG.tokenMint),
        1000,                 // 1000 tokens
        treasuryWallet        // Treasury pays the fees
      );
      console.log(`✅ Sell successful! Signature: ${sellResult}`);
    } catch (error) {
      console.log(`❌ Sell failed (expected without funding): ${error.message}`);
    }

    // Example 3: Send tokens with treasury paying fees
    console.log('\n🔄 Example 3: Sending tokens with treasury paying fees');
    try {
      const sendResult = await sendToken(
        connection,
        userWallet,           // User owns the tokens
        recipientAddress,     // Recipient address
        new PublicKey(CONFIG.tokenMint),
        BigInt(100),         // 100 tokens
        false,                // allowOwnerOffCurve
        true,                 // createRecipientAccount
        treasuryWallet        // Treasury pays the fees
      );
      
      if (sendResult.success) {
        console.log(`✅ Send successful! Signature: ${sendResult.signature}`);
      } else {
        console.log(`❌ Send failed: ${sendResult.error}`);
      }
    } catch (error) {
      console.log(`❌ Send failed (expected without funding): ${error.message}`);
    }

    // Example 4: AMM operations with treasury paying fees
    console.log('\n🔄 Example 4: AMM operations with treasury paying fees');
    try {
      const ammBuyResult = await buyTokens(
        connection,
        userWallet,           // User owns the tokens
        new PublicKey(CONFIG.poolKey),
        0.01,                 // 0.01 SOL worth of tokens
        100,                  // 1% slippage
        treasuryWallet        // Treasury pays the fees
      );
      
      if (ammBuyResult.success) {
        console.log(`✅ AMM Buy successful! Signature: ${ammBuyResult.signature}`);
      } else {
        console.log(`❌ AMM Buy failed: ${ammBuyResult.error}`);
      }
    } catch (error) {
      console.log(`❌ AMM Buy failed (expected without funding): ${error.message}`);
    }

    console.log('\n🎉 Fee payer examples completed!');
    console.log('\n💡 To run with real wallets:');
    console.log('   1. Create wallet files using solana-keygen');
    console.log('   2. Fund treasury wallet with SOL for fees');
    console.log('   3. Fund user wallet with tokens to trade');
    console.log('   4. Use the CLI commands with --fee-payer option');

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

/**
 * Example: Batch operations with single fee payer
 */
async function batchOperationsExample() {
  console.log('\n📦 Batch Operations Example');
  console.log('=============================');

  try {
    const connection = new Connection(CONFIG.rpcUrl, CONFIG.commitment);
    
    // Generate wallets for batch operations
    const treasuryWallet = Keypair.generate();
    const user1Wallet = Keypair.generate();
    const user2Wallet = Keypair.generate();
    const user3Wallet = Keypair.generate();

    console.log(`🏦 Treasury: ${treasuryWallet.publicKey.toString()}`);
    console.log(`👤 User 1: ${user1Wallet.publicKey.toString()}`);
    console.log(`👤 User 2: ${user2Wallet.publicKey.toString()}`);
    console.log(`👤 User 3: ${user3Wallet.publicKey.toString()}`);

    // Example: Multiple users buying tokens with same treasury
    console.log('\n🔄 Batch buy operations with single treasury');
    
    const users = [user1Wallet, user2Wallet, user3Wallet];
    const amounts = [0.01, 0.02, 0.03]; // Different amounts for each user

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const amount = amounts[i];
      
      console.log(`\n   User ${i + 1} buying ${amount} SOL worth of tokens...`);
      
      try {
        const result = await buyPumpFunToken(
          connection,
          user,                    // User owns the tokens
          new PublicKey(CONFIG.tokenMint),
          amount,                  // Amount in SOL
          1000,                    // 10% slippage
          treasuryWallet           // Same treasury pays all fees
        );
        console.log(`   ✅ User ${i + 1} buy successful!`);
      } catch (error) {
        console.log(`   ❌ User ${i + 1} buy failed (expected without funding)`);
      }
    }

    console.log('\n💡 Benefits of batch operations:');
    console.log('   - Single treasury wallet covers all fees');
    console.log('   - Efficient for bulk operations');
    console.log('   - Cost savings compared to individual fee payments');
    console.log('   - Simplified treasury management');

  } catch (error) {
    console.error('❌ Batch operations example failed:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Fee Payer Functionality Examples');
  console.log('====================================');
  console.log('This demonstrates the new fee payer functionality\n');

  await treasuryFeePayerExample();
  await batchOperationsExample();

  console.log('\n🎯 Key Benefits:');
  console.log('   ✅ Separate fee payment from token ownership');
  console.log('   ✅ Treasury operations for multiple users');
  console.log('   ✅ Batch operations with single fee payer');
  console.log('   ✅ Gasless user experience');
  console.log('   ✅ Relayer service support');
  
  console.log('\n📚 For more information, see:');
  console.log('   - docs/fee-payer-usage.md');
  console.log('   - CLI commands with --fee-payer option');
  console.log('   - Source code in src/utils/transaction.ts');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  treasuryFeePayerExample,
  batchOperationsExample,
  runAllExamples
};
