#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { Keypair } from '@solana/web3.js';
import { debugLog, logError } from '../src/utils/debug';

export interface CliArgs {
  wallet?: string;
  inputToken?: string;
  outputToken?: string;
  amount?: number;
  slippage?: number;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDescription?: string;
  imagePath?: string;
  initialBuyAmount?: number;
  poolKey?: string;
  lpTokenAmount?: number;
  feePayer?: string;
  recipient?: string;
  mint?: string;
  createAccount?: boolean;
  maxParallel?: number;
  retryFailed?: boolean;
  disableFallbackRetry?: boolean;
  delayBetween?: number;
  dynamicBatching?: boolean;
  dryRun?: boolean;
  help?: boolean;
  action?: string;
  address?: string;
  limit?: number;
  output?: string;
  network?: string;
  format?: string;
  signature?: string;
  operations?: string;
  type?: string;
  batchAnalysis?: boolean;
}

export function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--wallet':
      case '-w':
        args.wallet = argv[++i];
        break;
      case '--action':
        args.action = argv[++i];
        break;
      case '--input-token':
      case '-i':
        args.inputToken = argv[++i];
        break;
      case '--output-token':
      case '-o':
        args.outputToken = argv[++i];
        break;
      case '--amount':
      case '-a':
        args.amount = parseFloat(argv[++i]);
        break;
      case '--slippage':
      case '-s':
        args.slippage = parseInt(argv[++i]);
        break;
      case '--token-name':
      case '-n':
        args.tokenName = argv[++i];
        break;
      case '--token-symbol':
      case '-y':
        args.tokenSymbol = argv[++i];
        break;
      case '--token-description':
      case '-d':
        args.tokenDescription = argv[++i];
        break;
      case '--image-path':
      case '-p':
        args.imagePath = argv[++i];
        break;
      case '--initial-buy':
      case '-b':
        args.initialBuyAmount = parseFloat(argv[++i]);
        break;
      case '--pool-key':
      case '-k':
        args.poolKey = argv[++i];
        break;
      case '--lp-amount':
      case '-l':
        args.lpTokenAmount = parseFloat(argv[++i]);
        break;
      case '--fee-payer':
      case '-f':
        args.feePayer = argv[++i];
        break;
      case '--recipient':
      case '-r':
        args.recipient = argv[++i];
        break;
      case '--mint':
      case '-m':
        args.mint = argv[++i];
        break;
      case '--create-account':
      case '-c':
        args.createAccount = true;
        break;
      case '--operations':
        args.operations = argv[++i];
        break;
      case '--max-parallel':
        args.maxParallel = parseInt(argv[++i]);
        break;
      case '--retry-failed':
        args.retryFailed = true;
        break;
      case '--disable-fallback-retry':
        args.disableFallbackRetry = true;
        break;
      case '--delay-between':
        args.delayBetween = parseInt(argv[++i]);
        break;
      case '--dynamic-batching':
        args.dynamicBatching = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--address':
        args.address = argv[++i];
        break;
      case '--limit':
        args.limit = parseInt(argv[++i]);
        break;
      case '--output':
        args.output = argv[++i];
        break;
      case '--network':
        args.network = argv[++i];
        break;
      case "--signature":
        args.signature = argv[++i];
        break;
      case "--operations":
        args.operations = argv[++i];
        break;
      case '--format':
        args.format = argv[++i];
        break;
      case '--type':
        args.type = argv[++i];
        break;
      case '--batch-analysis':
        args.batchAnalysis = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

export function loadWallet(walletPath?: string): Keypair {
  const defaultWalletPath = path.join(process.cwd(), 'wallets', 'creator-wallet.json');
  const finalWalletPath = walletPath || defaultWalletPath;

  try {
    const walletData = JSON.parse(fs.readFileSync(finalWalletPath, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(walletData));
  } catch (error) {
    throw new Error(`Failed to load wallet from ${finalWalletPath}: ${error}`);
  }
}

export function loadFeePayerWallet(feePayerPath?: string): Keypair | null {
  if (!feePayerPath) return null;

  try {
    const walletData = JSON.parse(fs.readFileSync(feePayerPath, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(walletData));
  } catch (error) {
    throw new Error(`Failed to load fee payer wallet from ${feePayerPath}: ${error}`);
  }
}

export function loadTokenInfo(tokenPath?: string): any {
  const defaultTokenPath = path.join(process.cwd(), 'wallets', 'token-info.json');
  const finalTokenPath = tokenPath || defaultTokenPath;

  try {
    return JSON.parse(fs.readFileSync(finalTokenPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load token info from ${finalTokenPath}: ${error}`);
  }
}

export function saveTokenInfo(tokenInfo: any, outputPath?: string): void {
  try {
    const finalOutputPath = outputPath || `token-info-${Date.now()}.json`;
    require('fs').writeFileSync(finalOutputPath, JSON.stringify(tokenInfo, null, 2));
    debugLog(`💾 Token info saved to ${finalOutputPath}`);
  } catch (error) {
    logError(`❌ Failed to save token info: ${error}`);
  }
}

export function printUsage(scriptName: string, options: string[] = []): void {
  console.log(`Usage: npm run ${scriptName} [options]`);
  console.log('');
  console.log('Options:');
  console.log('  -w, --wallet <path>           Path to wallet JSON file');
  console.log('  -i, --input-token <path>      Path to input token JSON file');
  console.log('  -o, --output-token <path>     Path to output token JSON file');
  console.log('  -a, --amount <number>         Amount for buy/sell operations');
  console.log('  -s, --slippage <number>       Slippage tolerance in basis points');
  console.log('  -n, --token-name <string>     Token name for creation');
  console.log('  -y, --token-symbol <string>   Token symbol for creation');
  console.log('  -d, --token-description <string> Token description for creation');
  console.log('  -p, --image-path <path>       Path to token image');
  console.log('  -b, --initial-buy <number>    Initial buy amount for token creation');
  console.log('  -k, --pool-key <string>       Pool key for AMM operations');
  console.log('  -l, --lp-amount <number>      LP token amount for liquidity operations');
  console.log('  -f, --fee-payer <path>        Path to fee payer wallet JSON file');
  console.log('  -r, --recipient <string>      Recipient address for token transfer');
  console.log('  -m, --mint <string>           Mint address for token creation');
  console.log('  -c, --create-account          Create a new account for the token');
  console.log('  --operations <path>           Path to JSON file containing batch operations');
  console.log('  --max-parallel <number>       Maximum parallel transactions for batch operations');
  console.log('  --retry-failed                Retry failed transactions in batch mode');
  console.log('  --disable-fallback-retry      Disable fallback retry (operations executed individually)');
  console.log('  --delay-between <ms>          Delay between transaction batches in milliseconds');
  console.log('  --dynamic-batching            Enable dynamic batch size determination');
  console.log('  --dry-run                     Show what would be executed without running');
  console.log('  --address <public-key>        Public key to get transactions for');
  console.log('  --limit <number>              Number of transactions to fetch (default: 50)');
  console.log('  --output <file>               Save results to JSON file');
  console.log('  --network <network>           Network to use (devnet/mainnet, default: devnet)');
  console.log('  --format <format>             Output format (table/json, default: table)');
  console.log('  -h, --help                    Show this help message');

  if (options.length > 0) {
    console.log('');
    console.log('Script-specific options:');
    options.forEach(option => console.log(`  ${option}`));
  }

  console.log('');
  console.log('Examples:');
  console.log(`  npm run ${scriptName} --amount 0.1 --slippage 1000`);
  console.log(`  npm run ${scriptName} --wallet ./my-wallet.json --input-token ./my-token.json`);
}
