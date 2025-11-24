#!/usr/bin/env tsx

import { Connection, PublicKey } from '@solana/web3.js';
import { deriveBondingCurveAddress, getGlobalPDA, PUMP_PROGRAM_ID } from '../src/bonding-curve/bc-helper';
import { FEE_RECIPIENT } from '../src/bonding-curve/idl/constants';
import { parseArgs, loadTokenInfo } from './cli-args';
import { createConnectionFromNetwork } from '../src/utils/connection';

/**
 * Comprehensive diagnostic tool for bonding curve issues
 */
async function runDiagnostic() {
  const args = parseArgs();

  if (args.help) {
    console.log(`
Bonding Curve Diagnostic Tool
==============================

Usage: npx tsx cli/bonding-curve-diagnostic.ts [options]

Options:
  --input-token <path>    Path to token info JSON file
  --mint <address>        Token mint address (overrides input-token)
  --network <network>     Network (devnet/mainnet-beta/mainnet, default: devnet)
  --rpc-url <url>         Custom RPC URL (overrides --network)

This tool checks:
  - Bonding curve account existence and size
  - Account data structure and completeness
  - Creator field status
  - Fee recipient configuration
  - Global account state
  - Potential issues and recommendations
`);
    return;
  }

  try {
    console.log('🔍 Bonding Curve Diagnostic Tool');
    console.log('================================\n');

    // Setup connection
    const connection = createConnectionFromNetwork(args.network, args.rpcUrl);
    const networkName = args.network || 'devnet (default)';
    console.log(`🌐 Network: ${networkName}`);
    if (args.rpcUrl) {
      console.log(`🔗 RPC URL: ${args.rpcUrl}`);
    }
    console.log('');

    // Get mint address
    let mint: PublicKey;
    if (args.mint) {
      mint = new PublicKey(args.mint);
      console.log(`📍 Mint: ${mint.toString()}`);
    } else if (args.inputToken) {
      const tokenInfo = loadTokenInfo(args.inputToken);
      mint = new PublicKey(tokenInfo.mint);
      console.log(`📍 Mint: ${mint.toString()}`);
      console.log(`🎯 Token: ${tokenInfo.name || 'Unknown'} (${tokenInfo.symbol || 'Unknown'})`);
    } else {
      console.error('❌ Error: Either --mint or --input-token must be provided');
      return;
    }
    console.log('');

    // 1. Check Bonding Curve Account
    console.log('1️⃣  Checking Bonding Curve Account...');
    console.log('-----------------------------------');
    const [bondingCurvePDA] = deriveBondingCurveAddress(mint);
    console.log(`   PDA Address: ${bondingCurvePDA.toString()}`);

    const bondingCurveAccount = await connection.getAccountInfo(bondingCurvePDA);
    if (!bondingCurveAccount) {
      console.log('   ❌ Account NOT FOUND');
      console.log('   💡 This token may not exist or bonding curve was never created');
      return;
    }

    console.log('   ✅ Account EXISTS');
    console.log(`   📊 Account Size: ${bondingCurveAccount.data.length} bytes`);
    console.log(`   👤 Owner: ${bondingCurveAccount.owner.toString()}`);
    console.log(`   💰 Rent: ${bondingCurveAccount.lamports / 1e9} SOL`);

    // Check if account size is sufficient (should be at least 82 bytes for full structure)
    const expectedMinSize = 82; // 8 discriminator + 6*8 reserves + 1 complete + 32 creator + 1 optional
    if (bondingCurveAccount.data.length < expectedMinSize) {
      console.log(`   ⚠️  WARNING: Account size (${bondingCurveAccount.data.length}) is less than expected minimum (${expectedMinSize})`);
      console.log('   💡 Account may need extension before selling');
    } else {
      console.log(`   ✅ Account size is sufficient (>= ${expectedMinSize} bytes)`);
    }
    console.log('');

    // 2. Parse Bonding Curve Data
    console.log('2️⃣  Parsing Bonding Curve Data...');
    console.log('-----------------------------------');
    const data = bondingCurveAccount.data;

    if (data.length >= 50) {
      // Extract complete flag (offset 49: 8 discriminator + 6*8 bytes for reserves)
      const completeOffset = 49;
      const isComplete = data[completeOffset] === 1;
      console.log(`   🏁 Complete Flag: ${isComplete ? '✅ TRUE (graduated)' : '❌ FALSE (active)'}`);

      // Extract creator (offset 49: 8 discriminator + 6*8 reserves + 1 complete = 49)
      if (data.length >= 82) {
        const creatorOffset = 49; // Same as getBondingCurveCreator function
        const creatorBytes = data.slice(creatorOffset, creatorOffset + 32);
        const creator = new PublicKey(creatorBytes);
        console.log(`   👤 Creator: ${creator.toString()}`);

        // Check if creator is default/zero pubkey
        const defaultPubkey = new PublicKey('11111111111111111111111111111111');
        if (creator.equals(defaultPubkey)) {
          console.log('   ⚠️  WARNING: Creator is default pubkey (may indicate uninitialized)');
        }
      } else {
        console.log('   ⚠️  Account data too short to read creator field');
      }

      // Try to read reserves (for informational purposes)
      if (data.length >= 49) {
        try {
          const readU64 = (offset: number) => {
            return data.readBigUInt64LE(offset);
          };
          const virtualTokenReserves = readU64(8);
          const virtualSolReserves = readU64(16);
          const realTokenReserves = readU64(24);
          const realSolReserves = readU64(32);
          const tokenTotalSupply = readU64(40);

          console.log(`   💎 Virtual Token Reserves: ${virtualTokenReserves.toString()}`);
          console.log(`   💰 Virtual SOL Reserves: ${(Number(virtualSolReserves) / 1e9).toFixed(9)} SOL`);
          console.log(`   💎 Real Token Reserves: ${realTokenReserves.toString()}`);
          console.log(`   💰 Real SOL Reserves: ${(Number(realSolReserves) / 1e9).toFixed(9)} SOL`);
          console.log(`   📊 Token Total Supply: ${tokenTotalSupply.toString()}`);
        } catch (e) {
          console.log('   ⚠️  Could not parse reserve data');
        }
      }
    } else {
      console.log('   ⚠️  Account data too short to parse');
    }
    console.log('');

    // 3. Check Global Account
    console.log('3️⃣  Checking Global Account...');
    console.log('-----------------------------------');
    let globalPDA: PublicKey;
    try {
      globalPDA = getGlobalPDA(PUMP_PROGRAM_ID);
      console.log(`   Global PDA: ${globalPDA.toString()}`);
    } catch (e) {
      console.log('   ⚠️  Could not derive global PDA (checking with known address)');
      // Use a known global PDA address if derivation fails
      globalPDA = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUr7BAkCsRkvWLp3q9VC1j9z');
      console.log(`   Using known Global PDA: ${globalPDA.toString()}`);
    }

    const globalAccount = await connection.getAccountInfo(globalPDA);
    if (globalAccount) {
      console.log('   ✅ Global account exists');
      console.log(`   📊 Size: ${globalAccount.data.length} bytes`);
    } else {
      console.log('   ❌ Global account NOT FOUND');
      console.log('   💡 This is a critical protocol issue');
    }
    console.log('');

    // 4. Check Fee Recipient
    console.log('4️⃣  Checking Fee Recipient Configuration...');
    console.log('-----------------------------------');
    console.log(`   Hardcoded Fee Recipient: ${FEE_RECIPIENT.toString()}`);

    const feeRecipientAccount = await connection.getAccountInfo(FEE_RECIPIENT);
    if (feeRecipientAccount) {
      console.log('   ✅ Fee recipient account exists');
      console.log(`   💰 Balance: ${(feeRecipientAccount.lamports / 1e9).toFixed(9)} SOL`);
      console.log(`   👤 Owner: ${feeRecipientAccount.owner.toString()}`);
    } else {
      console.log('   ❌ Fee recipient account NOT FOUND');
      console.log('   💡 CRITICAL: This may be the cause of NotAuthorized error');
    }
    console.log('');

    // 5. Recommendations
    console.log('5️⃣  Recommendations...');
    console.log('-----------------------------------');
    
    if (!bondingCurveAccount) {
      console.log('   ❌ Cannot proceed - bonding curve account not found');
      return;
    }

    if (bondingCurveAccount.data.length < expectedMinSize) {
      console.log('   ⚠️  Account needs extension:');
      console.log('      - Call extend_account instruction before selling');
      console.log('      - SDK may not handle this automatically');
    }

    if (!feeRecipientAccount) {
      console.log('   ⚠️  Fee recipient issue:');
      console.log('      - Fee recipient account does not exist');
      console.log('      - This is likely causing the NotAuthorized error');
      console.log('      - May need to check if fee recipient changed on mainnet');
    }

    const isComplete = data.length >= 50 && data[49] === 1;
    if (isComplete) {
      console.log('   ℹ️  Token has graduated:');
      console.log('      - Bonding curve is complete');
      console.log('      - Should use AMM pools for trading');
      console.log('      - Try using amm-sell command instead');
    } else {
      console.log('   ℹ️  Token is still on bonding curve:');
      console.log('      - Should be able to sell via bonding curve');
      console.log('      - If NotAuthorized error persists, check:');
      console.log('        1. Fee recipient configuration');
      console.log('        2. Account extension requirements');
      console.log('        3. Token-specific restrictions');
    }

    console.log('\n✅ Diagnostic complete!');
  } catch (error) {
    console.error('\n❌ Error during diagnostic:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

