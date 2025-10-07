#!/usr/bin/env tsx

/**
 * Example script demonstrating how to use the new createTokenInstruction function
 * for batch token creation operations
 */

import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { createTokenInstruction, createTokenTransaction } from '../src/bonding-curve/createToken';
import { SimpleWallet } from '../src/utils/wallet';
import { sendAndConfirmRawTransaction } from '../src/utils/transaction';
import { log, logSuccess, logError } from '../src/utils/debug';
import IDL from '../src/bonding-curve/idl/pump_program.json';

// Example: Batch Token Creation
async function batchTokenCreationExample() {
  const connection = new Connection('https://api.devnet.solana.com');
  const creator = Keypair.generate();
  
  // Create program instance
  const provider = new AnchorProvider(connection, new SimpleWallet(creator), {
    commitment: 'confirmed',
  });
  const program = new Program(IDL as unknown, provider);

  // Define multiple tokens to create
  const tokenConfigs = [
    {
      name: 'Test Token 1',
      symbol: 'TEST1',
      uri: 'https://example.com/metadata1.json',
      mint: Keypair.generate(),
    },
    {
      name: 'Test Token 2', 
      symbol: 'TEST2',
      uri: 'https://example.com/metadata2.json',
      mint: Keypair.generate(),
    },
    {
      name: 'Test Token 3',
      symbol: 'TEST3', 
      uri: 'https://example.com/metadata3.json',
      mint: Keypair.generate(),
    },
  ];

  try {
    log('🚀 Creating batch token creation instructions...');

    // Create instructions for all tokens
    const instructions = await Promise.all(
      tokenConfigs.map(config =>
        createTokenInstruction(
          program,
          creator.publicKey,
          config.name,
          config.symbol,
          config.uri,
          config.mint
        )
      )
    );

    log(`✅ Created ${instructions.length} token creation instructions`);

    // Create a single transaction with all instructions
    const transaction = new Transaction();
    instructions.forEach(instruction => {
      transaction.add(instruction);
    });

    // Add all mint keypairs as signers
    const signers = [creator, ...tokenConfigs.map(config => config.mint)];

    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator.publicKey;

    // Sign the transaction
    transaction.partialSign(...signers);

    log('📝 Sending batch token creation transaction...');

    // Send the transaction
    const result = await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
      preflightCommitment: 'confirmed',
    });

    if (result.success) {
      logSuccess('✅ Batch token creation successful!');
      log(`📝 Transaction signature: ${result.signature}`);
      
      // Log created token addresses
      tokenConfigs.forEach((config, index) => {
        log(`🪙 Token ${index + 1}: ${config.mint.publicKey.toString()}`);
      });
    } else {
      logError(`❌ Batch token creation failed: ${result.error}`);
    }

  } catch (error) {
    logError('❌ Error in batch token creation:', error);
  }
}

// Example: Individual Token Creation Instructions (for separate transactions)
async function individualTokenCreationExample() {
  const connection = new Connection('https://api.devnet.solana.com');
  const creator = Keypair.generate();
  
  // Create program instance
  const provider = new AnchorProvider(connection, new SimpleWallet(creator), {
    commitment: 'confirmed',
  });
  const program = new Program(IDL as unknown, provider);

  const tokenConfig = {
    name: 'Individual Token',
    symbol: 'INDIV',
    uri: 'https://example.com/metadata.json',
    mint: Keypair.generate(),
  };

  try {
    log('🚀 Creating individual token creation instruction...');

    // Create instruction
    const instruction = await createTokenInstruction(
      program,
      creator.publicKey,
      tokenConfig.name,
      tokenConfig.symbol,
      tokenConfig.uri,
      tokenConfig.mint
    );

    log('✅ Created token creation instruction');

    // Create transaction with single instruction
    const transaction = new Transaction();
    transaction.add(instruction);

    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator.publicKey;

    // Sign the transaction
    transaction.partialSign(creator, tokenConfig.mint);

    log('📝 Sending individual token creation transaction...');

    // Send the transaction
    const result = await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
      preflightCommitment: 'confirmed',
    });

    if (result.success) {
      logSuccess('✅ Individual token creation successful!');
      log(`📝 Transaction signature: ${result.signature}`);
      log(`🪙 Token mint: ${tokenConfig.mint.publicKey.toString()}`);
    } else {
      logError(`❌ Individual token creation failed: ${result.error}`);
    }

  } catch (error) {
    logError('❌ Error in individual token creation:', error);
  }
}

// Example: Mixed Operations with Token Creation
async function mixedOperationsWithTokenCreation() {
  const connection = new Connection('https://api.devnet.solana.com');
  const creator = Keypair.generate();
  
  // Create program instance
  const provider = new AnchorProvider(connection, new SimpleWallet(creator), {
    commitment: 'confirmed',
  });
  const program = new Program(IDL as unknown, provider);

  try {
    log('🚀 Creating mixed operations transaction...');

    // Create token creation instruction
    const tokenMint = Keypair.generate();
    const tokenInstruction = await createTokenInstruction(
      program,
      creator.publicKey,
      'Mixed Token',
      'MIXED',
      'https://example.com/metadata.json',
      tokenMint
    );

    // You could add other instructions here, such as:
    // - SOL transfers
    // - Token transfers
    // - Other program instructions
    
    // Create transaction with multiple instructions
    const transaction = new Transaction();
    transaction.add(tokenInstruction);
    // Add other instructions here...

    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator.publicKey;

    // Sign the transaction
    transaction.partialSign(creator, tokenMint);

    log('📝 Sending mixed operations transaction...');

    // Send the transaction
    const result = await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
      preflightCommitment: 'confirmed',
    });

    if (result.success) {
      logSuccess('✅ Mixed operations successful!');
      log(`📝 Transaction signature: ${result.signature}`);
      log(`🪙 Token mint: ${tokenMint.publicKey.toString()}`);
    } else {
      logError(`❌ Mixed operations failed: ${result.error}`);
    }

  } catch (error) {
    logError('❌ Error in mixed operations:', error);
  }
}

// Export examples for use in other files
export {
  batchTokenCreationExample,
  individualTokenCreationExample,
  mixedOperationsWithTokenCreation,
};

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Running Batch Token Creation Examples...\n');

    await individualTokenCreationExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await batchTokenCreationExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await mixedOperationsWithTokenCreation();

    console.log('\n✅ All examples completed!');
  })().catch(console.error);
}
