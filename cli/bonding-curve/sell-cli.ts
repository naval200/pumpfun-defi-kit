#!/usr/bin/env tsx

import { Connection, PublicKey } from '@solana/web3.js';
import { sellPumpFunToken } from '../../src/bonding-curve/sell';
import { sellAmmTokens } from '../../src/amm/sell';
import { findPoolsForToken } from '../../src/amm/amm';
import { parseArgs, loadWallet, loadTokenInfo, loadFeePayerWallet, printUsage } from '../cli-args';
import { debugLog, logError, logWarning } from '../../src/utils/debug';
import { createConnectionFromNetwork } from '../../src/utils/connection';

/**
 * Sell PumpFun tokens via bonding curve with configurable parameters
 */
export async function sellToken() {
  const args = parseArgs();

  if (args.help) {
    printUsage('cli:bond-sell', [
      '  --amount <number>           Amount of tokens to sell (required)',
      '  --slippage <number>         Slippage tolerance in basis points (default: 1000)',
      '  --input-token <path>        Path to token info JSON file',
      '  --wallet <path>             Path to wallet JSON file',
      '  --fee-payer <path>          Path to fee payer wallet JSON file (optional)',
      '  --network <network>         Network to use (devnet/mainnet-beta/mainnet, default: devnet)',
      '  --rpc-url <url>            Custom RPC URL (overrides --network)',
    ]);
    return;
  }

  // Validate required arguments
  if (!args.amount || args.amount <= 0) {
    logError('❌ Error: --amount is required and must be greater than 0');
    printUsage('cli:bond-sell');
    return;
  }

  debugLog('💸 Selling PumpFun Tokens via Bonding Curve');
  debugLog('============================================');
  debugLog(
    `Amount: ${args.amount} tokens (will be converted to smallest unit: ${args.amount * Math.pow(10, 0)})`
  );
  debugLog(`Slippage: ${args.slippage || 1000} basis points (${(args.slippage || 1000) / 100}%)`);

  try {
    // Load token information
    const tokenInfo = loadTokenInfo(args.inputToken);
    debugLog(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
    debugLog(`📍 Mint: ${tokenInfo.mint}`);

    // Setup connection and wallet with network support
    const connection = createConnectionFromNetwork(args.network, args.rpcUrl);
    const wallet = loadWallet(args.wallet);
    const feePayer = loadFeePayerWallet(args.feePayer);

    debugLog(`🌐 Network: ${args.network || 'devnet (default)'}`);
    if (args.rpcUrl) {
      debugLog(`🔗 RPC URL: ${args.rpcUrl}`);
    }
    debugLog(`👛 Using wallet: ${wallet.publicKey.toString()}`);
    if (feePayer) {
      debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
    }

    // Try bonding curve sell first
    debugLog(`\n🔄 Executing sell of ${args.amount} tokens via bonding curve...`);
    let result = await sellPumpFunToken(
      connection,
      wallet,
      new PublicKey(tokenInfo.mint),
      args.amount,
      feePayer || undefined
    );

    // Check if bonding curve failed due to account not found or completion (token may have graduated)
    const bondingCurveError = result.error || '';
    const isBondingCurveNotFound = 
      !result.success && 
      (bondingCurveError.includes('bonding curve account not found') ||
       bondingCurveError.includes('Bonding curve account not found'));
    
    // Check for errors indicating bonding curve is complete or not authorized (token graduated)
    const isBondingCurveComplete = 
      !result.success && 
      (bondingCurveError.includes('NotAuthorized') ||
       bondingCurveError.includes('0x1770') ||
       bondingCurveError.includes('custom program error: 0x1770') ||
       bondingCurveError.includes('BondingCurveComplete') ||
       bondingCurveError.includes('bonding curve has completed'));

    if (isBondingCurveNotFound || isBondingCurveComplete) {
      if (isBondingCurveComplete) {
        logWarning('⚠️  Bonding curve operation failed (NotAuthorized/Complete). Token has likely graduated to AMM.');
      } else {
        logWarning('⚠️  Bonding curve account not found. Token may have graduated to AMM.');
      }
      debugLog('🔍 Attempting to find AMM pool for this token...');

      try {
        const tokenMint = new PublicKey(tokenInfo.mint);
        const pools = await findPoolsForToken(connection, tokenMint);

        if (pools.length > 0) {
          logWarning('✅ Found AMM pool(s). Attempting to sell via AMM instead...');
          debugLog(`🏊 Using pool: ${pools[0].toString()}`);

          // Use poolKey from tokenInfo if available, otherwise use first found pool
          const poolKey = tokenInfo.poolKey ? new PublicKey(tokenInfo.poolKey) : pools[0];
          const ammResult = await sellAmmTokens(
            connection,
            wallet,
            poolKey,
            args.amount,
            args.slippage || 100,
            feePayer || undefined
          );

          if (ammResult.success) {
            debugLog(`✅ AMM sell successful! Signature: ${ammResult.signature}`);
            if (ammResult.quoteAmount) {
              debugLog(`💰 SOL received: ${ammResult.quoteAmount}`);
            }
            return;
          } else {
            logError(`❌ AMM sell failed: ${ammResult.error}`);
            logError('💡 If you know the pool key, try using --pool-key with amm-sell command');
            return;
          }
        } else {
          logError('❌ No AMM pools found for this token.');
          logError('💡 This token may not have graduated to AMM yet, or the bonding curve account may be incorrect.');
          logError('💡 If this is a mainnet token, ensure you are using --network mainnet-beta');
          return;
        }
      } catch (ammError) {
        logError(`❌ Error while checking for AMM pools: ${ammError}`);
        logError('💡 Original bonding curve error: ' + bondingCurveError);
        return;
      }
    }

    // Handle bonding curve result
    if (result.success) {
      debugLog(`✅ Sell successful! Signature: ${result.signature}`);
    } else {
      logError(`❌ Sell failed: ${bondingCurveError}`);
      if (isBondingCurveNotFound || isBondingCurveComplete) {
        logError('💡 If this is a mainnet token, ensure you are using --network mainnet-beta');
        logError('💡 If the token has graduated to AMM, try using amm-sell instead');
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`❌ Error: ${errorMessage}`);
    
    // Check if this is a bonding curve account not found or complete error
    const isBondingCurveError = 
      errorMessage.includes('bonding curve account not found') || 
      errorMessage.includes('Bonding curve account not found') ||
      errorMessage.includes('NotAuthorized') ||
      errorMessage.includes('0x1770') ||
      errorMessage.includes('custom program error: 0x1770') ||
      errorMessage.includes('BondingCurveComplete');
    
    if (isBondingCurveError) {
      if (errorMessage.includes('NotAuthorized') || errorMessage.includes('0x1770')) {
        logWarning('⚠️  Bonding curve operation failed (NotAuthorized). Token has likely graduated to AMM.');
      } else {
        logWarning('⚠️  Bonding curve account not found. Token may have graduated to AMM.');
      }
      debugLog('🔍 Attempting to find AMM pool for this token...');

      try {
        // Re-initialize connection and load token info in case they weren't set
        const connection = createConnectionFromNetwork(args.network, args.rpcUrl);
        const tokenInfo = loadTokenInfo(args.inputToken);
        const tokenMint = new PublicKey(tokenInfo.mint);
        const pools = await findPoolsForToken(connection, tokenMint);

        if (pools.length > 0) {
          logWarning('✅ Found AMM pool(s). Attempting to sell via AMM instead...');
          debugLog(`🏊 Using pool: ${pools[0].toString()}`);

          const wallet = loadWallet(args.wallet);
          const feePayer = loadFeePayerWallet(args.feePayer);
          const poolKey = tokenInfo.poolKey ? new PublicKey(tokenInfo.poolKey) : pools[0];
          const ammResult = await sellAmmTokens(
            connection,
            wallet,
            poolKey,
            args.amount,
            args.slippage || 100,
            feePayer || undefined
          );

          if (ammResult.success) {
            debugLog(`✅ AMM sell successful! Signature: ${ammResult.signature}`);
            if (ammResult.quoteAmount) {
              debugLog(`💰 SOL received: ${ammResult.quoteAmount}`);
            }
            return;
          } else {
            logError(`❌ AMM sell failed: ${ammResult.error}`);
            logError('💡 If you know the pool key, try using --pool-key with amm-sell command');
            return;
          }
        } else {
          logError('❌ No AMM pools found for this token.');
          logError('💡 If this is a mainnet token, ensure you are using --network mainnet-beta');
          logError('💡 If the token has graduated to AMM, try using amm-sell instead');
        }
      } catch (ammError) {
        logError(`❌ Error while checking for AMM pools: ${ammError}`);
        logError('💡 Original error: ' + errorMessage);
      }
    } else {
      logError('💡 If this is a mainnet token, ensure you are using --network mainnet-beta');
    }
    return;
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  sellToken().catch(logError);
}
