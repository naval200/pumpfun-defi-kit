#!/usr/bin/env tsx

import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createPumpFunToken } from '../../src/bonding-curve/createToken';
import { deriveBondingCurveAddress } from '../../src/bonding-curve/helper';
import { parseArgs, loadWallet, saveTokenInfo, printUsage } from '../cli-args';

/**
 * Create a new PumpFun token with configurable parameters
 */
export async function createToken() {
  const args = parseArgs();

  if (args.help) {
    printUsage('cli:bc-create-token', [
      '  --token-name <name>        Token name (required)',
      '  --token-symbol <symbol>    Token symbol (required)',
      '  --token-description <desc> Token description',
      '  --image-path <path>        Path to token image',
      '  --initial-buy <amount>     Initial buy amount in SOL',
      '  --wallet <path>            Path to wallet JSON file',
      '  --output-token <path>      Path to save token info',
    ]);
    return;
  }

  // Validate required arguments
  if (!args.tokenName || !args.tokenSymbol) {
    console.error('❌ Error: --token-name and --token-symbol are required');
    printUsage('cli:bc-create-token');
    return;
  }

  console.log('🚀 Creating PumpFun Token');
  console.log('==========================');
  console.log(`Token Name: ${args.tokenName}`);
  console.log(`Token Symbol: ${args.tokenSymbol}`);
  console.log(`Description: ${args.tokenDescription || 'No description'}`);
  console.log(`Image Path: ${args.imagePath || 'No image'}`);
  console.log(`Initial Buy: ${args.initialBuyAmount || 0} SOL`);

  try {
    // Setup connection and wallet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const wallet = loadWallet(args.wallet);

    console.log(`👛 Using wallet: ${wallet.publicKey.toString()}`);

    // Check wallet balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.log('⚠️ Wallet balance is low. Need at least 0.1 SOL for testing.');
      return;
    }

    // Create token configuration
    const tokenConfig = {
      name: args.tokenName,
      symbol: args.tokenSymbol,
      description: args.tokenDescription || `Test token ${args.tokenName}`,
      imagePath: args.imagePath || 'random.png',
      initialBuyAmount: args.initialBuyAmount || 0,
    };

    console.log('\n🎯 Creating token...');
    const createResult = await createPumpFunToken(connection, wallet, tokenConfig, false);

    if (createResult.success && createResult.mintKeypair) {
      const mint = createResult.mintKeypair;
      const tokenAddress = createResult.mint || mint.publicKey.toString();
      
      // Derive bonding curve address from mint (this is how it works in PumpFun)
      const [bondingCurveAddress] = deriveBondingCurveAddress(mint.publicKey);

      console.log(`✅ Token created successfully!`);
      console.log(`   Mint: ${tokenAddress}`);
      console.log(`   Name: ${tokenConfig.name}`);
      console.log(`   Symbol: ${tokenConfig.symbol}`);
      console.log(`   Bonding Curve: ${bondingCurveAddress.toString()}`);

      // Save token info
      const tokenInfo = {
        mint: tokenAddress,
        name: tokenConfig.name,
        symbol: tokenConfig.symbol,
        description: tokenConfig.description,
        bondingCurve: bondingCurveAddress.toString(),
        createdAt: new Date().toISOString(),
      };

      saveTokenInfo(tokenInfo, args.outputToken);

      console.log('\n📋 Token Details:');
      console.log(JSON.stringify(tokenInfo, null, 2));
    } else {
      console.log(`❌ Token creation failed: ${createResult.error}`);
      return;
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    return;
  }

  console.log('\n✅ Token creation completed!');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createToken().catch(console.error);
}
