import { Connection, PublicKey } from '@solana/web3.js';
import { getPoolInfo } from '../../src/amm';
import { parseArgs, loadWallet, loadTokenInfo, printUsage } from '../cli-args';

function showHelp() {
  console.log(`
Usage: npm run cli:amm:info -- [options]

Options:
  --help                    Show this help message
  --input-token <path>     Path to token-info.json file (required)
  --wallet <path>          Path to wallet.json file (required)
  --pool-key <address>     Pool key address (optional, will search if not provided)

Examples:
  npm run cli:amm:info -- --help
  npm run cli:amm:info -- --input-token ./token-info.json --wallet ./fixtures/creator-wallet.json
  npm run cli:amm:info -- --input-token ./token-info.json --wallet ./fixtures/creator-wallet.json --pool-key <pool-address>
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
  if (!args.inputToken || !args.wallet) {
    console.error('❌ Error: --input-token and --wallet are required');
    printUsage('cli:amm:info');
    return;
  }

  try {
    console.log('🔍 AMM Pool Info CLI');
    console.log('=====================');
    console.log(`Input Token: ${args.inputToken}`);
    console.log(`Wallet: ${args.wallet}`);

    // Setup connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('✅ Connected to Solana devnet');

    // Load token information
    const tokenInfo = loadTokenInfo(args.inputToken);
    console.log(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
    console.log(`📍 Token Mint: ${tokenInfo.mint}`);

    // Load wallet for pool info
    const wallet = loadWallet(args.wallet);
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

      // Safely serialize pool info without BigInt issues
      try {
        const safePoolInfo = JSON.parse(
          JSON.stringify(poolInfo, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )
        );
        console.log('📊 Pool Data:', JSON.stringify(safePoolInfo, null, 2));

        // Extract key pool metrics
        if (safePoolInfo.poolBaseAmount && safePoolInfo.poolQuoteAmount) {
          console.log('\n🏊 Pool Liquidity Summary:');
          console.log(`Base Tokens (TBC): ${Number(safePoolInfo.poolBaseAmount)}`);
          console.log(`Quote Tokens (SOL): ${Number(safePoolInfo.poolQuoteAmount) / 1e9} SOL`);
        }
      } catch (e) {
        console.log('📊 Pool Data (raw):', poolInfo);
        console.log('⚠️  Could not parse pool data due to serialization issues');
      }
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
