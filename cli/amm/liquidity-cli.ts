import { Connection, PublicKey } from '@solana/web3.js';
import { addLiquidity, removeLiquidity } from '../../src/amm';
import { parseArgs, loadWallet, loadTokenInfo, printUsage } from '../cli-args';

function showHelp() {
  console.log(`
Usage: npm run cli:amm:liquidity -- [options]

Options:
  --help                    Show this help message
  --action <action>         Action to perform: 'add' or 'remove' (required)
  --input-token <path>      Path to token-info.json file (required)
  --amount <number>         Amount for liquidity operation (required)
  --pool-key <address>      Pool key address (optional, will use from token info)
  --slippage <number>       Slippage tolerance in basis points (default: 1)

Examples:
  npm run cli:amm:liquidity -- --help
  npm run cli:amm:liquidity -- --action add --input-token ./token-info.json --amount 1000
  npm run cli:amm:liquidity -- --action remove --input-token ./token-info.json --amount 500 --pool-key <pool-address>
  npm run cli:amm:liquidity -- --action add --input-token ./token-info.json --amount 1000 --slippage 100
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

  if (args.amount <= 0) {
    console.error('❌ Error: --amount must be greater than 0');
    return;
  }

  const slippage = args.slippage || 1;
  if (slippage <= 0 || slippage > 10000) {
    console.error('❌ Error: --slippage must be between 1 and 10000 basis points');
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
    console.log(`Slippage: ${slippage} basis points`);

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
      const result = await addLiquidity(connection, wallet, poolKey, args.amount, slippage);

      if (result.success) {
        console.log('✅ Liquidity added successfully');
        console.log(`📝 Transaction signature: ${result.signature}`);
        if (result.lpTokenAmount) {
          console.log(`🪙 LP tokens received: ${result.lpTokenAmount}`);
        }
      } else {
        console.log(`❌ Failed to add liquidity: ${result.error}`);
      }
    } else {
      const result = await removeLiquidity(connection, wallet, poolKey, args.amount, slippage);

      if (result.success) {
        console.log('✅ Liquidity removed successfully');
        console.log(`📝 Transaction signature: ${result.signature}`);
        if (result.baseAmount) {
          console.log(`🪙 Tokens received: ${result.baseAmount}`);
        }
        if (result.quoteAmount) {
          console.log(`💎 SOL received: ${result.quoteAmount}`);
        }
      } else {
        console.log(`❌ Failed to remove liquidity: ${result.error}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    if (error instanceof Error) {
      console.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
