import type { BatchOperation } from '../src/@types';

/**
 * Example demonstrating batch operations with createAccount flags
 * This shows how to use the createAccount functionality in batch operations
 *
 * The createAccount logic is handled within each operation case in the batch helper,
 * automatically adding ATA creation instructions when needed.
 */

// Example batch operations with createAccount flags
export const batchOperationsWithCreateAccount: BatchOperation[] = [
  {
    type: 'transfer',
    id: 'transfer-1',
    description: 'Transfer tokens to recipient, create ATA if needed',
    params: {
      recipient: 'RecipientPublicKeyHere', // Replace with actual recipient
      mint: 'TokenMintPublicKeyHere', // Replace with actual token mint
      amount: 1000,
      createAccount: true, // ✅ Creates ATA for recipient before transfer
    },
  },
  {
    type: 'buy-bonding-curve',
    id: 'buy-bc-1',
    description: 'Buy tokens from bonding curve, create ATA if needed',
    params: {
      mint: 'TokenMintPublicKeyHere', // Replace with actual token mint
      amount: 1000000, // SOL amount in lamports
      slippage: 1,
      createAccount: true, // ✅ Creates ATA for buyer before purchase
    },
  },
  {
    type: 'buy-amm',
    id: 'buy-amm-1',
    description: 'Buy tokens from AMM pool, create ATA if needed',
    params: {
      poolKey: 'PoolPublicKeyHere', // Replace with actual pool key
      amount: 1000000, // SOL amount in lamports
      slippage: 1,
      createAccount: true, // ✅ Creates ATA for buyer before purchase
      tokenMint: 'TokenMintPublicKeyHere', // Required when createAccount is true
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
      createAccount: false, // ❌ No ATA creation instruction will be added
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
      console.log(`   Create Account: ${op.params.createAccount ? '✅ Yes' : '❌ No'}`);
      console.log(`   Recipient: ${op.params.recipient}`);
      console.log(`   Mint: ${op.params.mint}`);
      console.log(`   Amount: ${op.params.amount}`);
    } else if (op.type === 'buy-bonding-curve') {
      console.log(`   Create Account: ${op.params.createAccount ? '✅ Yes' : '❌ No'}`);
      console.log(`   Mint: ${op.params.mint}`);
      console.log(`   Amount: ${op.params.amount} lamports`);
      console.log(`   Slippage: ${op.params.slippage}%`);
    } else if (op.type === 'buy-amm') {
      console.log(`   Create Account: ${op.params.createAccount ? '✅ Yes' : '❌ No'}`);
      console.log(`   Pool Key: ${op.params.poolKey}`);
      console.log(`   Amount: ${op.params.amount} lamports`);
      console.log(`   Slippage: ${op.params.slippage}%`);
      console.log(`   Token Mint: ${op.params.tokenMint}`);
    }
  });

  console.log('\n🔧 How it works:');
  console.log('================');
  console.log('1. When createAccount: true is set, the batch helper will:');
  console.log('   - Check the createAccount flag within each operation case');
  console.log('   - Add a createAssociatedTokenAccountInstruction BEFORE the main instruction');
  console.log('   - Use the feePayer (if provided) or sender as the payer for ATA creation');
  console.log('   - Log the ATA creation for debugging');
  console.log('');
  console.log('2. For transfer operations:');
  console.log('   - Creates ATA for the recipient if createAccount: true');
  console.log('   - Then adds the transfer instruction');
  console.log('');
  console.log('3. For buy operations:');
  console.log('   - Creates ATA for the buyer (sender) if createAccount: true');
  console.log('   - Then adds the buy instruction');
  console.log('');
  console.log('4. For AMM buy operations:');
  console.log('   - Requires tokenMint parameter when createAccount is true');
  console.log('   - Creates ATA for the buyer with the specified token mint');
  console.log('');
  console.log('5. All instructions are batched together in a single transaction');
  console.log('   - ATA creation happens first (if createAccount: true)');
  console.log('   - Then the main operation (transfer/buy) happens');
  console.log('   - All in one atomic transaction');
  console.log('');
  console.log('6. Implementation details:');
  console.log('   - The createAccount logic is handled within each operation case');
  console.log('   - This approach avoids code duplication and keeps logic organized');
  console.log('   - Each operation type handles its own ATA creation requirements');
}

// Run the demonstration
if (require.main === module) {
  demonstrateBatchWithCreateAccount().catch(console.error);
}
