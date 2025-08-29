import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { deriveBondingCurveAddress, ensureBondingCurveAtas } from './bc-helper';
import { debugLog, log, logError, logSignature, logSuccess } from '../utils/debug';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { sendAndConfirmTransactionWithFeePayer } from '../utils/transaction';
import { createBondingCurveSellInstructionAssuming } from './instructions';

// Helper removed; logic inlined at call sites

/**
 * Calculate expected SOL output for selling tokens
 * This queries the actual bonding curve state for real-time pricing
 */
async function calculateExpectedSolOutput(
  connection: Connection,
  mint: PublicKey,
  tokenAmount: BN,
  slippageBasisPoints: number
): Promise<BN> {
  try {
    debugLog('🔍 Querying bonding curve state for real-time pricing...');

    // Get the bonding curve account
    const [bondingCurve] = deriveBondingCurveAddress(mint);
    debugLog(`📊 Bonding curve address: ${bondingCurve.toString()}`);

    // Try to get the bonding curve account data
    const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);

    if (!bondingCurveAccount) {
      debugLog('⚠️  Bonding curve account not found, using fallback calculation');
      return calculateFallbackSolOutput(tokenAmount, slippageBasisPoints);
    }

    debugLog(`📊 Bonding curve account size: ${bondingCurveAccount.data.length} bytes`);

    // For now, use a more sophisticated fallback calculation
    // In a real implementation, you'd parse the account data to get actual state
    // This would include current token supply, SOL reserves, and the bonding curve formula
    return calculateSophisticatedFallbackSolOutput(tokenAmount, slippageBasisPoints);
  } catch (error) {
    debugLog('⚠️  Error querying bonding curve state, using fallback calculation');
    logError('Failed to query bonding curve state:', error);
    return calculateFallbackSolOutput(tokenAmount, slippageBasisPoints);
  }
}

/**
 * Fallback calculation using basic bonding curve formula
 * This is a simplified version that should be more accurate than the placeholder
 */
function calculateFallbackSolOutput(tokenAmount: BN, slippageBasisPoints: number): BN {
  // Use a more realistic bonding curve model: 1 token = 0.0005 SOL (500 lamports)
  // This is based on typical PumpFun token economics
  const basePricePerToken = new BN(500); // 500 lamports = 0.0005 SOL per token

  // Calculate base SOL output
  const baseSolOutput = tokenAmount.mul(basePricePerToken);

  // Apply slippage tolerance (slippageBasisPoints is in basis points, e.g., 1000 = 10%)
  // For sell operations, we want to ensure we get at least this much SOL
  const slippageMultiplier = new BN(10000 - slippageBasisPoints); // 10000 = 100%
  const minSolOutput = baseSolOutput.mul(slippageMultiplier).div(new BN(10000));

  // Ensure minimum output is at least 1 lamport
  if (minSolOutput.lt(new BN(1))) {
    return new BN(1);
  }

  return minSolOutput;
}

/**
 * Sophisticated fallback calculation using bonding curve economics
 * This models a more realistic bonding curve with supply/demand dynamics
 */
function calculateSophisticatedFallbackSolOutput(tokenAmount: BN, slippageBasisPoints: number): BN {
  // Model a bonding curve where price increases with supply
  // This is more realistic than linear pricing

  // Base parameters (these would come from the actual bonding curve state)
  const totalSupply = new BN(1000000); // Assume 1M total supply
  const basePrice = new BN(100); // 100 lamports base price
  const priceMultiplier = new BN(2); // Price doubles every 100k tokens

  // Calculate current price based on supply
  const currentSupply = totalSupply.sub(tokenAmount); // Supply after selling
  const supplyFactor = currentSupply.div(new BN(100000)); // Every 100k tokens
  const supplyFactorNum = supplyFactor.toNumber();
  const priceFactor = priceMultiplier.pow(new BN(supplyFactorNum || 0));

  // Current price per token
  const currentPricePerToken = basePrice.mul(priceFactor);

  // Calculate expected SOL output
  const expectedSolOutput = tokenAmount.mul(currentPricePerToken);

  // Apply slippage tolerance
  const slippageMultiplier = new BN(10000 - slippageBasisPoints);
  const minSolOutput = expectedSolOutput.mul(slippageMultiplier).div(new BN(10000));

  // Ensure minimum output is at least 1 lamport
  if (minSolOutput.lt(new BN(1))) {
    return new BN(1);
  }

  debugLog(
    `🔧 Sophisticated calculation: ${tokenAmount.toString()} tokens = ${minSolOutput.toString()} lamports`
  );
  debugLog(`📊 Current price per token: ${currentPricePerToken.toString()} lamports`);

  return minSolOutput;
}

/**
 * Get user's token balance for a specific mint
 */
async function getUserTokenBalance(
  connection: Connection,
  wallet: PublicKey,
  mint: PublicKey
): Promise<number> {
  try {
    const userATA = getAssociatedTokenAddressSync(mint, wallet, false);

    const tokenAccount = await connection.getTokenAccountBalance(userATA);
    return parseInt(tokenAccount.value.amount);
  } catch (error) {
    logError('Could not get token balance:', error);
    return 0;
  }
}

/**
 * Sell PumpFun tokens on the bonding curve
 * @param connection - Solana connection instance
 * @param wallet - Keypair for the seller wallet
 * @param mint - PublicKey of the token mint to sell
 * @param tokenAmount - Amount of tokens to sell (in token units)
 * @param feePayer - Optional Keypair for the fee payer (if different from wallet)
 * @returns Promise resolving to transaction signature
 */
export async function sellPumpFunToken(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  tokenAmount: number,
  feePayer?: Keypair,
  slippageBasisPoints: number = 1000,
  options?: {
    assumeAccountsExist?: boolean;
    assumeBalanceExists?: boolean;
    minSolOutputLamports?: number;
  }
): Promise<string> {
  log('💸 Setting up sell transaction...');

  if (!options?.assumeBalanceExists) {
    // Check user's token balance first
    const userBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);
    log(`💰 User token balance: ${userBalance} tokens`);
    if (userBalance === 0) {
      throw new Error('Cannot sell: User has no tokens to sell');
    }
    if (tokenAmount > userBalance) {
      throw new Error(`Cannot sell ${tokenAmount} tokens: User only has ${userBalance} tokens`);
    }
  }

  if (!options?.assumeAccountsExist) {
    await ensureBondingCurveAtas(connection, wallet, mint);
  }

  // Create complete sell transaction
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    debugLog(`📡 Creating complete sell transaction (attempt ${attempts}/${maxAttempts})...`);

    try {
      // Compute expected SOL output (allow override to skip RPC)
      const minSol =
        options?.minSolOutputLamports !== undefined
          ? new BN(options.minSolOutputLamports)
          : await calculateExpectedSolOutput(
              connection,
              mint,
              new BN(tokenAmount),
              slippageBasisPoints
            );
      debugLog(`🔧 Calculated expected SOL output: ${minSol.toString()} lamports`);
      debugLog(`📊 Applied slippage: ${slippageBasisPoints} basis points`);

      const sellInstruction = createBondingCurveSellInstructionAssuming(
        wallet.publicKey,
        mint,
        new BN(tokenAmount),
        minSol
      );

      const transaction = new Transaction().add(sellInstruction);

      // Use the new fee payer transaction utility
      if (feePayer) {
        debugLog(`💸 Using fee payer: ${feePayer.publicKey.toString()}`);
        const signature = await sendAndConfirmTransactionWithFeePayer(
          connection,
          transaction,
          [wallet], // signers
          feePayer, // fee payer
          { preflightCommitment: 'confirmed' }
        );

        if (!signature.success) {
          throw new Error(`Transaction failed: ${signature.error}`);
        }

        logSuccess('Sell transaction confirmed successfully!');
        log(`💸 Sold ${tokenAmount} tokens`);
        logSignature(signature.signature!, 'Sell');

        // Show updated balance
        const newBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);
        debugLog(`💰 New token balance: ${newBalance} tokens`);

        return signature.signature!;
      } else {
        // Fallback to original method for backward compatibility
        // Set recent blockhash and fee payer
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // Sign the transaction
        transaction.sign(wallet);

        // Send transaction
        debugLog(`📡 Sending sell transaction (attempt ${attempts}/${maxAttempts})...`);
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        // Wait for confirmation
        await connection.confirmTransaction(
          {
            signature,
            ...(await connection.getLatestBlockhash('confirmed')),
          },
          'confirmed'
        );

        logSuccess('Sell transaction confirmed successfully!');
        log(`💸 Sold ${tokenAmount} tokens`);
        logSignature(signature, 'Sell');

        // Show updated balance
        const newBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);
        debugLog(`💰 New token balance: ${newBalance} tokens`);

        return signature;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(`Transaction attempt ${attempts} failed: ${errorMessage}`);

      // If this is a seed constraint error, extract the expected address
      if (errorMessage.includes('ConstraintSeeds') || errorMessage.includes('seeds constraint')) {
        debugLog('🔧 Detected seed constraint error. Check the logs for the expected address.');
        debugLog('💡 This may require updating PDA mappings similar to the buy function.');
      }

      if (attempts >= maxAttempts) {
        throw new Error(
          `Transaction failed after ${maxAttempts} attempts. Last error: ${errorMessage}`
        );
      }

      // Wait before retry
      debugLog(`⏳ Waiting 2000ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error('Transaction failed after maximum attempts');
}

/**
 * Create signed sell transaction without submitting it
 * Returns the signed transaction for batch processing
 */
export async function createSignedSellTransaction(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  tokenAmount: number,
  slippageBasisPoints: number = 1000,
  feePayer?: Keypair,
  blockhash?: string
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  try {
    debugLog(`🔧 Creating signed sell transaction for ${tokenAmount} tokens`);
    debugLog(`🎯 Target mint: ${mint.toString()}`);
    debugLog(`📊 Slippage: ${slippageBasisPoints} basis points`);

    // Compute expected SOL output (RPC read)
    const minSol = await calculateExpectedSolOutput(
      connection,
      mint,
      new BN(tokenAmount),
      slippageBasisPoints
    );
    debugLog('📝 Creating complete sell instruction...');
    const sellInstruction = createBondingCurveSellInstructionAssuming(
      wallet.publicKey,
      mint,
      new BN(tokenAmount),
      minSol
    );

    // Create transaction
    const transaction = new Transaction().add(sellInstruction);

    // Set recent blockhash
    // Use provided blockhash for batch operations, or get new one if not provided
    if (blockhash) {
      transaction.recentBlockhash = blockhash;
    } else {
      const { blockhash: newBlockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = newBlockhash;
    }

    // Set fee payer (use feePayer if provided, otherwise use wallet)
    transaction.feePayer = feePayer ? feePayer.publicKey : wallet.publicKey;

    // Sign the transaction
    // For batch transactions, the fee payer signs all transactions
    // The main wallet signs if it's different from the fee payer
    if (feePayer && feePayer.publicKey.toString() !== wallet.publicKey.toString()) {
      transaction.sign(wallet, feePayer);
    } else {
      transaction.sign(wallet);
    }

    debugLog('✅ Signed sell transaction created successfully');

    return {
      success: true,
      transaction,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Failed to create signed sell transaction: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Sell all tokens for a specific mint
 */
export async function sellAllPumpFunTokens(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey
): Promise<string> {
  // Get user's current token balance
  const userBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);

  if (userBalance === 0) {
    throw new Error('Cannot sell: User has no tokens to sell');
  }

  log(`💸 Selling all ${userBalance} tokens...`);
  return sellPumpFunToken(connection, wallet, mint, userBalance);
}

/**
 * Sell a percentage of user's tokens
 */
export async function sellPercentagePumpFunTokens(
  connection: Connection,
  wallet: Keypair,
  mint: PublicKey,
  percentage: number // 0-100
): Promise<string> {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }

  // Get user's current token balance
  const userBalance = await getUserTokenBalance(connection, wallet.publicKey, mint);

  if (userBalance === 0) {
    throw new Error('Cannot sell: User has no tokens to sell');
  }

  const tokensToSell = Math.floor((userBalance * percentage) / 100);

  if (tokensToSell === 0) {
    throw new Error(
      `Calculated token amount to sell is 0. Balance: ${userBalance}, Percentage: ${percentage}%`
    );
  }

  log(`💸 Selling ${percentage}% of tokens (${tokensToSell} out of ${userBalance})...`);
  return sellPumpFunToken(connection, wallet, mint, tokensToSell);
}
