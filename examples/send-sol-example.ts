#!/usr/bin/env tsx

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  sendSol, 
  createSendSolInstruction, 
  createSignedSendSolTransaction,
  validateSendSolParams,
  getEstimatedSendSolFee
} from '../src/sendSol';

/**
 * Example demonstrating SOL transfer functionality
 */
async function main() {
  console.log('💸 SOL Transfer Example');
  console.log('========================');

  try {
    // Setup connection (devnet for testing)
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('✅ Connected to Solana devnet');

    // Generate test wallets (in real usage, load from wallet files)
    const senderWallet = Keypair.generate();
    const recipientWallet = Keypair.generate();
    
    console.log(`👛 Sender wallet: ${senderWallet.publicKey.toString()}`);
    console.log(`🎯 Recipient wallet: ${recipientWallet.publicKey.toString()}`);

    // Airdrop some SOL to sender for testing
    console.log('\n🪂 Airdropping 1 SOL to sender wallet...');
    const airdropSignature = await connection.requestAirdrop(senderWallet.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature, 'confirmed');
    console.log('✅ Airdrop successful');

    // Check balances
    const senderBalance = await connection.getBalance(senderWallet.publicKey);
    const recipientBalance = await connection.getBalance(recipientWallet.publicKey);
    
    console.log(`💰 Sender balance: ${(senderBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`💰 Recipient balance: ${(recipientBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    // Validate transfer parameters
    const transferAmount = 0.1; // 0.1 SOL
    console.log(`\n🔍 Validating transfer parameters...`);
    console.log(`📊 Transfer amount: ${transferAmount} SOL`);
    
    const validation = validateSendSolParams(senderWallet, recipientWallet.publicKey, transferAmount);
    if (!validation.isValid) {
      console.error('❌ Validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      return;
    }
    console.log('✅ Validation passed');

    // Get estimated fee
    console.log('\n💰 Estimating transaction fee...');
    const estimatedFee = await getEstimatedSendSolFee(
      connection,
      senderWallet,
      recipientWallet.publicKey,
      transferAmount
    );
    console.log(`📊 Estimated fee: ${estimatedFee} lamports (${(estimatedFee / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);

    // Create instruction (for batching)
    console.log('\n🔧 Creating transfer instruction for batching...');
    const transferInstruction = createSendSolInstruction(
      senderWallet,
      recipientWallet.publicKey,
      transferAmount
    );
    console.log('✅ Transfer instruction created');
    console.log(`   Program ID: ${transferInstruction.programId.toString()}`);
    console.log(`   Keys: ${transferInstruction.keys.length} accounts`);

    // Create signed transaction (for batching)
    console.log('\n🔧 Creating signed transfer transaction for batching...');
    const signedTransaction = await createSignedSendSolTransaction(
      connection,
      senderWallet,
      recipientWallet.publicKey,
      transferAmount
    );
    console.log('✅ Signed transaction created');
    console.log(`   Fee payer: ${signedTransaction.feePayer?.toString()}`);
    console.log(`   Instructions: ${signedTransaction.instructions.length}`);

    // Execute actual transfer
    console.log('\n🚀 Executing SOL transfer...');
    const result = await sendSol(
      connection,
      senderWallet,
      recipientWallet.publicKey,
      transferAmount
    );

    if (result.success) {
      console.log('✅ SOL transfer successful!');
      console.log(`📝 Transaction signature: ${result.signature}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);

      // Check updated balances
      console.log('\n💰 Updated balances:');
      const newSenderBalance = await connection.getBalance(senderWallet.publicKey);
      const newRecipientBalance = await connection.getBalance(recipientWallet.publicKey);
      
      console.log(`👛 Sender: ${(newSenderBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      console.log(`🎯 Recipient: ${(newRecipientBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      
      // Calculate actual amount transferred (accounting for fees)
      const actualTransferAmount = (senderBalance - newSenderBalance - estimatedFee) / LAMPORTS_PER_SOL;
      console.log(`📊 Actual amount transferred: ${actualTransferAmount.toFixed(6)} SOL`);
      console.log(`💸 Fee paid: ${(estimatedFee / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    } else {
      console.log(`❌ SOL transfer failed: ${result.error}`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
