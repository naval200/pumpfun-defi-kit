import { Connection, PublicKey } from '@solana/web3.js';
import { checkGraduationStatus, getGraduationAnalysis } from '../src/utils/graduation-utils';
import { createConnectionFromNetwork } from '../src/utils/connection';
import { parseArgs as parseCliArgs } from './cli-args';
import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Usage: npm run cli:graduation-check -- [options]

Options:
  --help                    Show this help message
  --input-token <path>     Path to token info JSON file (default: token-info.json)
  --mint <address>         Token mint address (overrides input-token file)
  --network <network>      Network to use (devnet/mainnet-beta/mainnet, default: devnet)
  --rpc-url <url>          Custom RPC URL (overrides --network)

Examples:
  npm run cli:graduation-check -- --help
  npm run cli:graduation-check -- --mint <token-mint-address>
  npm run cli:graduation-check -- --input-token ./my-token.json
`);
}

function parseArgs() {
  const args: any = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--input-token':
        args.inputToken = argv[++i];
        break;
      case '--mint':
        args.mint = argv[++i];
        break;
      case '--network':
        args.network = argv[++i];
        break;
      case '--rpc-url':
      case '--rpc':
        args.rpcUrl = argv[++i];
        break;
    }
  }

  return args;
}

/**
 * CLI for checking token graduation status
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  try {
    console.log('🚀 Starting Token Graduation Status Check...\n');

    // Setup connection with network support
    const connection = createConnectionFromNetwork(args.network, args.rpcUrl);
    const networkName = args.network || 'devnet (default)';
    console.log(`✅ Connected to Solana ${networkName}`);
    if (args.rpcUrl) {
      console.log(`🔗 RPC URL: ${args.rpcUrl}`);
    }

    let tokenMint: PublicKey;

    // If mint is provided via args, use it directly
    if (args.mint) {
      tokenMint = new PublicKey(args.mint);
      console.log(`🎯 Using provided mint: ${tokenMint.toString()}`);
    }
    // Otherwise load from token info file
    else {
      const tokenInfoPath = args.inputToken || path.join(process.cwd(), 'token-info.json');
      if (!fs.existsSync(tokenInfoPath)) {
        console.log(`❌ Token info file not found: ${tokenInfoPath}`);
        console.log(
          '💡 Please provide --mint or create a token first with: npm run cli:bond-create-token'
        );
        return;
      }

      const tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf8'));
      console.log('✅ Token info loaded:', {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        mint: tokenInfo.mint,
      });

      tokenMint = new PublicKey(tokenInfo.mint);

      // Check if token has a pool key (indicates AMM creation)
      if (tokenInfo.poolKey) {
        console.log(`🏊 Token has AMM pool: ${tokenInfo.poolKey}`);
        if (tokenInfo.poolCreatedAt) {
          console.log(`📅 Pool created: ${tokenInfo.poolCreatedAt}`);
        }
      } else {
        console.log('📈 Token does not have AMM pool yet');
      }
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
      console.log('   • Consider running: npm run cli:amm:liquidity');
    } else if (!analysis.hasAMMPools && analysis.bondingCurveActive) {
      console.log('📈 Token is still in bonding curve mode');
      console.log('   • Create AMM pool to enable graduation');
      console.log('   • Run: npm run cli:amm:create-pool');
    } else {
      console.log('❓ Token status unclear');
      console.log('   • Check if token was created properly');
      console.log('   • Verify network connection and program IDs');
    }

    console.log('\n✅ Graduation check completed!');
  } catch (error: any) {
    console.error('\n💥 Error during graduation check:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
