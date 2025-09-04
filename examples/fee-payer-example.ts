#!/usr/bin/env tsx

/**
 * Fee Payer Example
 * 
 * This example demonstrates how to use the fee payer functionality
 * where a separate wallet pays transaction fees for another wallet's operations.
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { sellPumpFunToken, buyPumpFunToken } from '../src/bonding-curve/sell';
import { buyPumpFunToken as buyToken } from '../src/bonding-curve/buy';
import { formatLamportsAsSol } from '../src/utils/amounts';

// Example: User has tokens but no SOL for fees
// Treasury wallet pays the fees for the user's sell operation

async function feePayerExample() {
  console.log('🚀 Fee Payer Example');
  console.log('==================\n');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // In a real scenario, these would be loaded from wallet files
  const userWallet = Keypair.generate(); // User who owns tokens
  const treasuryWallet = Keypair.generate(); // Treasury that pays fees
  
  console.log(`👤 User Wallet: ${userWallet.publicKey.toString()}`);
  console.log(`🏦 Treasury Wallet: ${treasuryWallet.publicKey.toString()}`);
  console.log(`🔗 Network: ${connection.rpcEndpoint}\n`);

  // Example token mint (replace with actual mint)
  const tokenMint = new PublicKey('WdXzfEJepxu169mjppvUiiPVzrCtkwy76gyGhagkoNi');

  try {
    // Example 1: User sells tokens, treasury pays fees
    console.log('📤 Example 1: User sells tokens, treasury pays fees');
    console.log('--------------------------------------------------');
    
    const sellResult = await sellPumpFunToken(
      connection,
      userWallet,        // User who owns the tokens
      tokenMint,         // Token to sell
      1000,              // Amount of tokens to sell
      treasuryWallet     // Treasury pays the fees
    );

    if (sellResult.success) {
      console.log(`✅ Sell successful! Signature: ${sellResult.signature}`);
      console.log('💡 User sold tokens but treasury paid the transaction fees');
    } else {
      console.log(`❌ Sell failed: ${sellResult.error}`);
    }

    console.log('\n');

    // Example 2: User buys tokens, treasury pays fees
    console.log('📥 Example 2: User buys tokens, treasury pays fees');
    console.log('-------------------------------------------------');
    
    const buySignature = await buyToken(
      connection,
      userWallet,        // User who receives the tokens
      tokenMint,         // Token to buy
      100000000,         // 0.1 SOL in lamports
      1000,              // 10% slippage
      treasuryWallet     // Treasury pays the fees
    );

    console.log(`✅ Buy successful! Signature: ${buySignature}`);
    console.log('💡 User bought tokens but treasury paid the transaction fees');

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Example: Batch operations with fee payer
async function batchFeePayerExample() {
  console.log('\n🔄 Batch Operations with Fee Payer');
  console.log('===================================\n');

  // In batch operations, the fee payer covers fees for all operations
  console.log('💡 In batch operations, one fee payer can cover fees for multiple users');
  console.log('💡 This is useful for:');
  console.log('   - Treasury operations');
  console.log('   - Relayer services');
  console.log('   - Gasless user experiences');
  console.log('   - Enterprise applications');
}

// Run examples
if (require.main === module) {
  feePayerExample()
    .then(() => batchFeePayerExample())
    .catch(console.error);
}

export { feePayerExample, batchFeePayerExample };