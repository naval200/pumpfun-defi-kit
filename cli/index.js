#!/usr/bin/env node

/**
 * PumpFun DeFi Kit CLI
 * 
 * Main entry point for all CLI commands
 */

const { execSync } = require('child_process');
const path = require('path');

const commands = {
  'bond-create-token': 'bonding-curve/create-token-cli.ts',
  'bond-buy': 'bonding-curve/buy-cli.ts',
  'bond-sell': 'bonding-curve/sell-cli.ts',
  'bond-check-accounts': 'bonding-curve/check-accounts-cli.ts',
  'bond-create-account': 'bonding-curve/create-account.ts',
  'amm-buy': 'amm/buy-cli.ts',
  'amm-sell': 'amm/sell-cli.ts',
  'amm-create-pool': 'amm/create-pool-cli.ts',
  'amm-info': 'amm/info-cli.ts',
  'amm-liquidity': 'amm/liquidity-cli.ts',
  'send-sol': 'send-sol-cli.ts',
  'send-token': 'send-token-cli.ts',
  'check-balances': 'check-wallet-balances.ts',
  'create-ata': 'create-ata-cli.ts',
  'batch': 'batch-transactions-cli.ts'
};

function showHelp() {
  console.log('🚀 PumpFun DeFi Kit CLI');
  console.log('========================\n');
  console.log('Available commands:\n');
  
  console.log('📈 Bonding Curve Operations:');
  console.log('  pumpfun-cli bond-create-token --help');
  console.log('  pumpfun-cli bond-buy --help');
  console.log('  pumpfun-cli bond-sell --help');
  console.log('  pumpfun-cli bond-check-accounts --help');
  console.log('  pumpfun-cli bond-create-account --help\n');
  
  console.log('🏊 AMM Operations:');
  console.log('  pumpfun-cli amm-buy --help');
  console.log('  pumpfun-cli amm-sell --help');
  console.log('  pumpfun-cli amm-create-pool --help');
  console.log('  pumpfun-cli amm-info --help');
  console.log('  pumpfun-cli amm-liquidity --help\n');
  
  console.log('🔧 Utilities:');
  console.log('  pumpfun-cli send-sol --help');
  console.log('  pumpfun-cli send-token --help');
  console.log('  pumpfun-cli check-balances --help');
  console.log('  pumpfun-cli create-ata --help\n');
  
  console.log('📦 Batch Operations:');
  console.log('  pumpfun-cli batch --help\n');
  
  console.log('For detailed help on any command, use:');
  console.log('  pumpfun-cli <command> --help');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  if (!commands[command]) {
    console.error(`❌ Unknown command: ${command}`);
    console.error('Run "pumpfun-cli --help" to see available commands');
    process.exit(1);
  }
  
  const scriptPath = path.join(__dirname, commands[command]);
  
  try {
    // Use tsx to run TypeScript files
    const commandLine = `npx tsx "${scriptPath}" ${commandArgs.join(' ')}`;
    execSync(commandLine, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Error running command: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, commands };
