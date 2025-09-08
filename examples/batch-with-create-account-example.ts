import type { BatchOperation } from '../src/@types';

/**
 * Example demonstrating batch operations with explicit create-account operations
 * This shows how to use the create-account functionality in batch operations
 *
 * The createAccount logic is handled within each operation case in the batch helper,
 * automatically adding ATA creation instructions when needed.
 */

// Example batch operations with explicit create-account operations
export const batchOperationsWithCreateAccount: BatchOperation[] = [
  // Create recipient ATA first
  {
    type: 'create-account',
    id: 'create-ata-recipient',
    description: 'Create ATA for recipient before transfer',
    params: {
      mint: 'TokenMintPublicKeyHere',
      owner: 'RecipientPublicKeyHere',
    },
  },
  // Then transfer tokens
  {
    type: 'transfer',
    id: 'transfer-1',
    description: 'Transfer tokens to recipient',
    params: {
      recipient: 'RecipientPublicKeyHere', // Replace with actual recipient
      mint: 'TokenMintPublicKeyHere', // Replace with actual token mint
      amount: 1000,
    },
  },
  {
    type: 'buy-bonding-curve',
    id: 'buy-bc-1',
    description: 'Buy tokens from bonding curve',
    params: {
      mint: 'TokenMintPublicKeyHere', // Replace with actual token mint
      amount: 1000000, // SOL amount in lamports
      slippage: 1,
    },
  },
  {
    type: 'buy-amm',
    id: 'buy-amm-1',
    description: 'Buy tokens from AMM pool',
    params: {
      poolKey: 'PoolPublicKeyHere', // Replace with actual pool key
      amount: 1000000, // SOL amount in lamports
      slippage: 1,
    },
  },
  {
    type: 'transfer',
    id: 'transfer-2',
    description: 'Transfer tokens without creating ATA (assumes it exists)',
    params: {
      recipient: 'AnotherRecipientPublicKeyHere', // Replace with actual recipient
      mint: 'TokenMintPublicKeyHere', // Replace with actual token mint
      amount: 500,
    },
  },
  {
    type: 'sol-transfer',
    id: 'sol-transfer-1',
    description: 'Transfer SOL (no ATA creation needed)',
    params: {
      recipient: 'RecipientPublicKeyHere', // Replace with actual recipient
      amount: 50000000, // 0.05 SOL in lamports
    },
  },
];

/**
 * Example of how to use the batch operations
 * Note: This is just a demonstration - you would need to provide actual keypairs and public keys
 */
export async function demonstrateBatchWithCreateAccount() {
  console.log('📋 Batch Operations with Create Account Flags:');
  console.log('===============================================');

  batchOperationsWithCreateAccount.forEach((op, index) => {
    console.log(`\n${index + 1}. ${op.description}`);
    console.log(`   Type: ${op.type}`);
    console.log(`   ID: ${op.id}`);

    if (op.type === 'transfer') {
      console.log(`   Recipient: ${op.params.recipient}`);
      console.log(`   Mint: ${op.params.mint}`);
      console.log(`   Amount: ${op.params.amount}`);
    } else if (op.type === 'buy-bonding-curve') {
      console.log(`   Mint: ${op.params.mint}`);
      console.log(`   Amount: ${op.params.amount} lamports`);
      console.log(`   Slippage: ${op.params.slippage}%`);
    } else if (op.type === 'buy-amm') {
      console.log(`   Pool Key: ${op.params.poolKey}`);
      console.log(`   Amount: ${op.params.amount} lamports`);
      console.log(`   Slippage: ${op.params.slippage}%`);
    }
  });

  console.log('\n🔧 How it works:');
  console.log('================');
  console.log('1. Use explicit create-account operations to create ATAs:');
  console.log('   - Add a create-account operation BEFORE the main instruction');
  console.log('   - Use the feePayer (if provided) or sender as the payer for ATA creation');
  console.log('   - Log the ATA creation for debugging');
  console.log('');
  console.log('2. For transfer operations:');
  console.log('   - Create ATA for the recipient with create-account');
  console.log('   - Then add the transfer instruction');
  console.log('');
  console.log('3. For buy operations:');
  console.log('   - Create ATA for the buyer (sender) with create-account');
  console.log('   - Then add the buy instruction');
  console.log('');
  console.log('4. For AMM buy operations:');
  console.log('   - Create ATA for the buyer using create-account (specify mint/owner)');
  console.log('   - Then run the AMM buy');
  console.log('');
  console.log('5. All instructions are batched together in a single transaction');
  console.log('   - ATA creation happens first via create-account');
  console.log('   - Then the main operation (transfer/buy) happens');
  console.log('   - All in one atomic transaction');
  console.log('');
  console.log('6. Implementation details:');
  console.log('   - Account creation is modeled as a separate create-account operation');
  console.log('   - This approach avoids code duplication and keeps logic organized');
  console.log('   - Each operation type handles its own ATA creation requirements');
}

// Run the demonstration
if (require.main === module) {
  demonstrateBatchWithCreateAccount().catch(console.error);
}
