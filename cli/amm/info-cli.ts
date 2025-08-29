import { Connection, PublicKey } from '@solana/web3.js';
import { getPoolInfo } from '../../src/amm/info';
import { parseArgs, loadWallet, loadTokenInfo, printUsage } from '../cli-args';

function showHelp() {
  console.log(`
Usage: npm run cli:amm:info -- [options]

Options:
  --help                    Show this help message
  --input-token <path>     Path to token-info.json file (required)
  --pool-key <address>     Pool key address (optional, will search if not provided)

Examples:
  npm run cli:amm:info -- --help
  npm run cli:amm:info -- --input-token ./token-info.json
  npm run cli:amm:info -- --input-token ./token-info.json --pool-key <pool-address>
`);
}

/**
 * CLI for getting AMM pool information
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  // Validate required arguments
  if (!args.inputToken) {
    console.error('❌ Error: --input-token is required');
    printUsage('cli:amm:info');
    return;
  }

  try {
    console.log('🔍 AMM Pool Info CLI');
    console.log('=====================');
    console.log(`Input Token: ${args.inputToken}`);

    // Setup connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('✅ Connected to Solana devnet');

    // Load token information
    const tokenInfo = loadTokenInfo(args.inputToken);
    console.log(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
    console.log(`📍 Token Mint: ${tokenInfo.mint}`);

    // Load wallet for pool info
    const wallet = loadWallet(args.inputToken);
    console.log(`👛 Wallet: ${wallet.publicKey.toString()}`);

    // Determine pool key
    let poolKey: PublicKey;
    if (args.poolKey) {
      poolKey = new PublicKey(args.poolKey);
      console.log(`🏊 Pool Key: ${poolKey.toString()}`);
    } else if (tokenInfo.poolKey) {
      poolKey = new PublicKey(tokenInfo.poolKey);
      console.log(`🏊 Pool Key: ${poolKey.toString()} (from token info)`);
    } else {
      console.error('❌ Error: No pool key provided and none found in token info');
      console.log('💡 Use --pool-key to specify a pool address');
      return;
    }

    // Get pool info
    console.log('\n🔍 Fetching pool information...');
    const poolInfo = await getPoolInfo(connection, poolKey, wallet);

    if (poolInfo) {
      console.log('✅ Pool information retrieved successfully');
      console.log('📊 Pool Data:', JSON.stringify(poolInfo, null, 2));
    } else {
      console.log('❌ Failed to retrieve pool information');
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
