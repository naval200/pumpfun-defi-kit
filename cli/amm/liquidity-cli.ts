import { Connection, PublicKey } from '@solana/web3.js';
import { addLiquidity, removeLiquidity } from '../../src/amm/amm';
import { parseArgs, loadWallet, loadTokenInfo, printUsage } from '../cli-args';

function showHelp() {
  console.log(`
Usage: npm run cli:amm:liquidity -- [options]

Options:
  --help                    Show this help message
  --action <action>         Action to perform: 'add' or 'remove' (required)
  --input-token <path>      Path to token-info.json file (required)
  --amount <number>         Amount of tokens for liquidity operation (required)
  --pool-key <address>      Pool key address (optional, will use from token info)

Examples:
  npm run cli:amm:liquidity -- --help
  npm run cli:amm:liquidity -- --action add --input-token ./token-info.json --amount 1000
  npm run cli:amm:liquidity -- --action remove --input-token ./token-info.json --amount 500 --pool-key <pool-address>
`);
}

/**
 * CLI for AMM liquidity operations
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  // Validate required arguments
  if (!args.action || !args.inputToken || !args.amount) {
    console.error('❌ Error: --action, --input-token, and --amount are required');
    printUsage('cli:amm:liquidity');
    return;
  }

  if (!['add', 'remove'].includes(args.action)) {
    console.error('❌ Error: --action must be either "add" or "remove"');
    return;
  }

  try {
    console.log(
      `🏊 AMM Liquidity ${args.action.charAt(0).toUpperCase() + args.action.slice(1)} CLI`
    );
    console.log('=====================================');
    console.log(`Action: ${args.action}`);
    console.log(`Input Token: ${args.inputToken}`);
    console.log(`Amount: ${args.amount}`);

    // Setup connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('✅ Connected to Solana devnet');

    // Load token information
    const tokenInfo = loadTokenInfo(args.inputToken);
    console.log(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
    console.log(`📍 Token Mint: ${tokenInfo.mint}`);

    // Load wallet
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

    // Execute liquidity operation
    console.log(`\n🚀 Executing ${args.action} liquidity operation...`);

    if (args.action === 'add') {
      const result = await addLiquidity(
        connection,
        wallet,
        poolKey,
        new PublicKey(tokenInfo.mint),
        args.amount
      );

      if (result.success) {
        console.log('✅ Liquidity added successfully');
        console.log(`📝 Transaction signature: ${result.signature}`);
      } else {
        console.log(`❌ Failed to add liquidity: ${result.error}`);
      }
    } else {
      const result = await removeLiquidity(
        connection,
        wallet,
        poolKey,
        new PublicKey(tokenInfo.mint),
        args.amount
      );

      if (result.success) {
        console.log('✅ Liquidity removed successfully');
        console.log(`📝 Transaction signature: ${result.signature}`);
      } else {
        console.log(`❌ Failed to remove liquidity: ${result.error}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
