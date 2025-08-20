import { Connection, PublicKey } from '@solana/web3.js';
import { checkGraduationStatus, getGraduationAnalysis } from '../src/utils/graduation-utils';
import fs from 'fs';
import path from 'path';

/**
 * Test script for checking token graduation status
 * This script demonstrates how to check if a token has graduated from bonding curve to AMM
 */
async function testGraduationCheck() {
  try {
    console.log('🚀 Starting Token Graduation Status Check...\n');

    // Setup connection to devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    console.log('✅ Connected to Solana devnet');
    
    // Load token info from file
    const tokenInfoPath = path.join(process.cwd(), 'token-info.json');
    if (!fs.existsSync(tokenInfoPath)) {
      console.log('❌ token-info.json not found. Please create a token first.');
      console.log('💡 Run: npm run test:create-token');
      return;
    }

    const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf8'));
    console.log('✅ Token info loaded:', {
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      mint: tokenInfo.mint
    });

    const tokenMint = new PublicKey(tokenInfo.mint);
    
    // Check if token has a pool key (indicates AMM creation)
    if (tokenInfo.poolKey) {
      console.log(`🏊 Token has AMM pool: ${tokenInfo.poolKey}`);
      console.log(`📅 Pool created: ${tokenInfo.poolCreatedAt}`);
    } else {
      console.log('📈 Token does not have AMM pool yet');
    }

    console.log('\n🔍 Checking graduation status...');
    
    // Method 1: Simple graduation check
    const isGraduated = await checkGraduationStatus(connection, tokenMint);
    console.log(`\n🎯 Graduation Status: ${isGraduated ? '✅ GRADUATED' : '❌ NOT GRADUATED'}`);
    
    // Method 2: Detailed graduation analysis
    console.log('\n📊 Performing detailed graduation analysis...');
    const analysis = await getGraduationAnalysis(connection, tokenMint);
    
    console.log('\n📋 Detailed Graduation Analysis:');
    console.log(`   Graduated: ${analysis.isGraduated ? '✅ Yes' : '❌ No'}`);
    console.log(`   Has AMM Pools: ${analysis.hasAMMPools ? '✅ Yes' : '❌ No'}`);
    console.log(`   Sufficient Liquidity: ${analysis.hasSufficientLiquidity ? '✅ Yes' : '❌ No'}`);
    console.log(`   Bonding Curve Active: ${analysis.bondingCurveActive ? '✅ Yes' : '❌ No'}`);
    console.log(`   Reason: ${analysis.graduationReason}`);
    
    // Provide recommendations based on analysis
    console.log('\n💡 Recommendations:');
    
    if (analysis.isGraduated) {
      console.log('🎉 Your token has successfully graduated to AMM trading!');
      console.log('   • Users can now trade using AMM pools');
      console.log('   • Better price discovery and liquidity');
      console.log('   • Consider adding more liquidity to improve trading experience');
    } else if (analysis.hasAMMPools && analysis.hasSufficientLiquidity) {
      console.log('⚠️ Token has AMM pools but bonding curve is still active');
      console.log('   • This is normal during the transition period');
      console.log('   • Both trading mechanisms may be available');
      console.log('   • Graduation will complete when bonding curve becomes inactive');
    } else if (analysis.hasAMMPools && !analysis.hasSufficientLiquidity) {
      console.log('📊 Token has AMM pools but needs more liquidity');
      console.log('   • Add more liquidity to the pool');
      console.log('   • Consider running: npm run test:amm:liquidity');
    } else if (!analysis.hasAMMPools && analysis.bondingCurveActive) {
      console.log('📈 Token is still in bonding curve mode');
      console.log('   • Create AMM pool to enable graduation');
      console.log('   • Run: npm run test:create-pool');
    } else {
      console.log('❓ Token status unclear');
      console.log('   • Check if token was created properly');
      console.log('   • Verify network connection and program IDs');
    }

    console.log('\n✅ Graduation check completed!');

  } catch (error: any) {
    console.error('\n💥 Test failed with error:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGraduationCheck();
}
