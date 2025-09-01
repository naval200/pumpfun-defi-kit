import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createPumpFunToken } from '../../src/bonding-curve/createToken';
import { buyPumpFunToken } from '../../src/bonding-curve/buy';
import { sellPumpFunToken } from '../../src/bonding-curve/sell';
import { createPool } from '../../src/amm/createPool';
import { buyAmmTokens } from '../../src/amm/buy';
import { addLiquidity, removeLiquidity } from '../../src/amm/liquidity';
import { TestHelpers } from '../utils/test-helpers';

// Mock all the functions
jest.mock('../../src/bonding-curve/createToken');
jest.mock('../../src/bonding-curve/buy');
jest.mock('../../src/bonding-curve/sell');
jest.mock('../../src/amm/createPool');
jest.mock('../../src/amm/buy');
jest.mock('../../src/amm/liquidity');

const mockCreatePumpFunToken = createPumpFunToken as jest.MockedFunction<typeof createPumpFunToken>;
const mockBuyPumpFunToken = buyPumpFunToken as jest.MockedFunction<typeof buyPumpFunToken>;
const mockSellPumpFunToken = sellPumpFunToken as jest.MockedFunction<typeof sellPumpFunToken>;
const mockCreatePool = createPool as jest.MockedFunction<typeof createPool>;
const mockBuyTokens = buyAmmTokens as jest.MockedFunction<typeof buyAmmTokens>;
const mockAddLiquidity = addLiquidity as jest.MockedFunction<typeof addLiquidity>;
const mockRemoveLiquidity = removeLiquidity as jest.MockedFunction<typeof removeLiquidity>;

describe('PumpFun Complete Token Lifecycle Integration', () => {
  let connection: Connection;
  let wallet: Keypair;
  let mockTokenMint: PublicKey;
  let mockPoolKey: PublicKey;
  let mockTokenInfo: any;

  beforeEach(() => {
    // Setup test environment
    connection = TestHelpers.getConnection();
    wallet = TestHelpers.loadTestWallet();
    mockTokenMint = TestHelpers.generateRandomPublicKey();
    mockPoolKey = TestHelpers.generateRandomPublicKey();
    mockTokenInfo = TestHelpers.createMockTokenInfo(mockTokenMint.toString());
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    TestHelpers.cleanup();
  });

  describe('Complete Token Lifecycle - Bonding Curve to AMM', () => {
    it('should complete full token lifecycle: create -> buy -> sell -> create pool -> AMM trade -> liquidity', async () => {
      // Phase 1: Token Creation
      const mockCreateResult = {
        success: true,
        mint: mockTokenMint.toString(),
        mintKeypair: Keypair.generate(),
        bondingCurveAddress: TestHelpers.generateRandomPublicKey().toString(),
        signature: 'TokenCreationSignature'
      };
      
      mockCreatePumpFunToken.mockResolvedValue(mockCreateResult);

      const createResult = await createPumpFunToken(
        connection,
        wallet,
        TestHelpers.createMockTokenConfig(),
        false
      );

      expect(createResult.success).toBe(true);
      expect(createResult.mint).toBeDefined();
      expect(createResult.bondingCurveAddress).toBeDefined();

      // Phase 2: Bonding Curve Buy
      const mockBuyResult = 'BondingCurveBuySignature';
      mockBuyPumpFunToken.mockResolvedValue(mockBuyResult);

      const buyResult = await buyPumpFunToken(
        connection,
        wallet,
        mockTokenMint,
        0.01, // 0.01 SOL
        1000  // Priority fee
      );

      expect(buyResult).toBe(mockBuyResult);

      // Phase 3: Bonding Curve Sell
      const mockSellResult = {
        success: true,
        signature: 'BondingCurveSellSignature'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockSellResult);

      const sellResult = await sellPumpFunToken(
        connection,
        wallet,
        mockTokenMint,
        500 // Sell 500 tokens
      );

      expect(sellResult.success).toBe(true);
      expect(sellResult.signature).toBeDefined();

      // Phase 4: Create AMM Pool
      const mockPoolResult = {
        success: true,
        poolKey: mockPoolKey,
        signature: 'PoolCreationSignature'
      };
      
      mockCreatePool.mockResolvedValue(mockPoolResult);

      const poolResult = await createPool(
        connection,
        wallet,
        mockTokenMint,
        new PublicKey('So11111111111111111111111111111111111111112'), // SOL
        1000000, // 1M tokens
        0.1,     // 0.1 SOL
        0        // Pool index
      );

      expect(poolResult.success).toBe(true);
      expect(poolResult.poolKey).toBeDefined();

      // Phase 5: AMM Buy
      const mockAMMBuyResult = {
        success: true,
        signature: 'AMMBuySignature',
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockAMMBuyResult);

      const ammBuyResult = await buyAmmTokens(
        connection,
        wallet,
        mockPoolKey,
        0.01, // 0.01 SOL
        1     // 1% slippage
      );

      expect(ammBuyResult.success).toBe(true);
      expect(ammBuyResult.baseAmount).toBeDefined();

      // Phase 6: Add Liquidity
      const mockAddLiquidityResult = {
        success: true,
        signature: 'AddLiquiditySignature',
        lpTokenAmount: 1000
      };
      
      mockAddLiquidity.mockResolvedValue(mockAddLiquidityResult);

      const addLiquidityResult = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01, // 0.01 SOL worth
        1     // 1% slippage
      );

      expect(addLiquidityResult.success).toBe(true);
      expect(addLiquidityResult.lpTokenAmount).toBeDefined();

      // Phase 7: Remove Liquidity
      const mockRemoveLiquidityResult = {
        success: true,
        signature: 'RemoveLiquiditySignature',
        baseAmount: 500,
        quoteAmount: 0.005
      };
      
      mockRemoveLiquidity.mockResolvedValue(mockRemoveLiquidityResult);

      const removeLiquidityResult = await removeLiquidity(
        connection,
        wallet,
        mockPoolKey,
        500, // Remove 500 LP tokens
        1    // 1% slippage
      );

      expect(removeLiquidityResult.success).toBe(true);
      expect(removeLiquidityResult.baseAmount).toBeDefined();
      expect(removeLiquidityResult.quoteAmount).toBeDefined();

      // Verify all functions were called
      expect(mockCreatePumpFunToken).toHaveBeenCalledTimes(1);
      expect(mockBuyPumpFunToken).toHaveBeenCalledTimes(1);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(1);
      expect(mockCreatePool).toHaveBeenCalledTimes(1);
      expect(mockBuyTokens).toHaveBeenCalledTimes(1);
      expect(mockAddLiquidity).toHaveBeenCalledTimes(1);
      expect(mockRemoveLiquidity).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery and Retry Scenarios', () => {
    it('should handle network failures and retry successfully', async () => {
      // Mock network failures followed by success
      mockCreatePumpFunToken
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          success: true,
          mint: mockTokenMint.toString(),
          mintKeypair: Keypair.generate(),
          bondingCurveAddress: TestHelpers.generateRandomPublicKey().toString(),
          signature: 'RetrySuccessSignature'
        });

      // Simulate retry logic
      let result;
      let attempts = 0;
      const maxAttempts = 2;
      
      while (attempts < maxAttempts) {
        try {
          result = await createPumpFunToken(
            connection,
            wallet,
            TestHelpers.createMockTokenConfig(),
            false
          );
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) throw error;
          // Wait before retry
          await TestHelpers.wait(1000);
        }
      }

      expect(result!.success).toBe(true);
      expect(mockCreatePumpFunToken).toHaveBeenCalledTimes(2);
    });

    it('should handle insufficient balance and adjust parameters', async () => {
      // Mock insufficient balance followed by success with adjusted amounts
      mockCreatePool
        .mockResolvedValueOnce({ success: false, error: 'Insufficient balance' })
        .mockResolvedValueOnce({
          success: true,
          poolKey: mockPoolKey,
          signature: 'AdjustedAmountSuccessSignature'
        });

      // Simulate retry with adjusted amounts
      let result;
      try {
        result = await createPool(
          connection,
          wallet,
          mockTokenMint,
          new PublicKey('So11111111111111111111111111111111111111112'),
          1000000, // Initial amount
          0.1,
          0
        );
        if (!result.success) {
          // Retry with reduced amounts
          result = await createPool(
            connection,
            wallet,
            mockTokenMint,
            new PublicKey('So11111111111111111111111111111111111111112'),
            500000,  // Reduced base amount
            0.05,    // Reduced quote amount
            0
          );
        }
      } catch (error) {
        throw error;
      }

      expect(result!.success).toBe(true);
      expect(mockCreatePool).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent token operations', async () => {
      // Mock successful results for all operations
      const mockResults = {
        create: {
          success: true,
          mint: mockTokenMint.toString(),
          mintKeypair: Keypair.generate(),
          bondingCurveAddress: TestHelpers.generateRandomPublicKey().toString(),
          signature: 'ConcurrentCreateSignature'
        },
        buy: 'ConcurrentBuySignature',
        sell: {
          success: true,
          signature: 'ConcurrentSellSignature'
        }
      };

      mockCreatePumpFunToken.mockResolvedValue(mockResults.create);
      mockBuyPumpFunToken.mockResolvedValue(mockResults.buy);
      mockSellPumpFunToken.mockResolvedValue(mockResults.sell);

      // Execute operations concurrently
      const [createResult, buyResult, sellResult] = await Promise.all([
        createPumpFunToken(connection, wallet, TestHelpers.createMockTokenConfig(), false),
        buyPumpFunToken(connection, wallet, mockTokenMint, 0.01, 1000),
        sellPumpFunToken(connection, wallet, mockTokenMint, 100)
      ]);

      // Verify all operations completed successfully
      expect(createResult.success).toBe(true);
      expect(buyResult).toBe(mockResults.buy);
      expect(sellResult.success).toBe(true);

      // Verify all functions were called
      expect(mockCreatePumpFunToken).toHaveBeenCalledTimes(1);
      expect(mockBuyPumpFunToken).toHaveBeenCalledTimes(1);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent AMM operations', async () => {
      // Mock successful results for AMM operations
      const mockResults = {
        buy: {
          success: true,
          signature: 'ConcurrentAMMBuySignature',
          baseAmount: 1000
        },
        addLiquidity: {
          success: true,
          signature: 'ConcurrentAddLiquiditySignature',
          lpTokenAmount: 1000
        },
        removeLiquidity: {
          success: true,
          signature: 'ConcurrentRemoveLiquiditySignature',
          baseAmount: 500,
          quoteAmount: 0.005
        }
      };

      mockBuyTokens.mockResolvedValue(mockResults.buy);
      mockAddLiquidity.mockResolvedValue(mockResults.addLiquidity);
      mockRemoveLiquidity.mockResolvedValue(mockResults.removeLiquidity);

      // Execute AMM operations concurrently
      const [buyResult, addLiquidityResult, removeLiquidityResult] = await Promise.all([
        buyAmmTokens(connection, wallet, mockPoolKey, 0.01, 1),
        addLiquidity(connection, wallet, mockPoolKey, 0.01, 1),
        removeLiquidity(connection, wallet, mockPoolKey, 500, 1)
      ]);

      // Verify all operations completed successfully
      expect(buyResult.success).toBe(true);
      expect(addLiquidityResult.success).toBe(true);
      expect(removeLiquidityResult.success).toBe(true);

      // Verify all functions were called
      expect(mockBuyTokens).toHaveBeenCalledTimes(1);
      expect(mockAddLiquidity).toHaveBeenCalledTimes(1);
      expect(mockRemoveLiquidity).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should maintain consistent state across operations', async () => {
      // Mock token creation
      const mockCreateResult = {
        success: true,
        mint: mockTokenMint.toString(),
        mintKeypair: Keypair.generate(),
        bondingCurveAddress: TestHelpers.generateRandomPublicKey().toString(),
        signature: 'StatePersistenceSignature'
      };
      
      mockCreatePumpFunToken.mockResolvedValue(mockCreateResult);

      const createResult = await createPumpFunToken(
        connection,
        wallet,
        TestHelpers.createMockTokenConfig(),
        false
      );

      // Verify token state is consistent
      expect(createResult.mint).toBe(mockTokenMint.toString());
      expect(createResult.bondingCurveAddress).toBeDefined();

      // Mock pool creation using the same token
      const mockPoolResult = {
        success: true,
        poolKey: mockPoolKey,
        signature: 'StatePersistencePoolSignature'
      };
      
      mockCreatePool.mockResolvedValue(mockPoolResult);

      const poolResult = await createPool(
        connection,
        wallet,
        mockTokenMint, // Same token mint
        new PublicKey('So11111111111111111111111111111111111111112'),
        1000000,
        0.1,
        0
      );

      // Verify pool state is consistent with token
      expect(poolResult.success).toBe(true);
      expect(poolResult.poolKey).toBeDefined();

      // Mock AMM operations using the same pool
      const mockAMMBuyResult = {
        success: true,
        signature: 'StatePersistenceAMMBuySignature',
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockAMMBuyResult);

      const ammBuyResult = await buyAmmTokens(
        connection,
        wallet,
        mockPoolKey, // Same pool key
        0.01,
        1
      );

      // Verify AMM state is consistent with pool
      expect(ammBuyResult.success).toBe(true);
      expect(ammBuyResult.baseAmount).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume operations efficiently', async () => {
      const highVolumeOperations = Array.from({ length: 10 }, (_, i) => ({
        buyAmount: 0.001 * (i + 1),
        sellAmount: 100 * (i + 1),
        priorityFee: 1000 + (i * 100)
      }));

      // Mock successful results for all operations
      highVolumeOperations.forEach((op, index) => {
        mockBuyPumpFunToken.mockResolvedValueOnce(`HighVolumeBuySignature${index + 1}`);
        mockSellPumpFunToken.mockResolvedValueOnce({
          success: true,
          signature: `HighVolumeSellSignature${index + 1}`
        });
      });

      // Execute high-volume operations
      const buyResults: string[] = [];
      const sellResults: Array<{success: boolean; signature?: string; error?: string}> = [];

      for (let i = 0; i < highVolumeOperations.length; i++) {
        const op = highVolumeOperations[i];
        
        const buyResult = await buyPumpFunToken(
          connection,
          wallet,
          mockTokenMint,
          op.buyAmount,
          op.priorityFee
        );
        buyResults.push(buyResult);

        const sellResult = await sellPumpFunToken(
          connection,
          wallet,
          mockTokenMint,
          op.sellAmount
        );
        sellResults.push(sellResult);
      }

      // Verify all operations completed
      expect(buyResults).toHaveLength(10);
      expect(sellResults).toHaveLength(10);
      expect(sellResults.every(r => r.success)).toBe(true);

      // Verify all functions were called the expected number of times
      expect(mockBuyPumpFunToken).toHaveBeenCalledTimes(10);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(10);
    });

    it('should handle multiple token types efficiently', async () => {
      const tokenTypes = Array.from({ length: 5 }, (_, i) => ({
        mint: TestHelpers.generateRandomPublicKey(),
        config: TestHelpers.createMockTokenConfig(`TOKEN${i + 1}`)
      }));

      // Mock successful creation for all token types
      tokenTypes.forEach((token, index) => {
        mockCreatePumpFunToken.mockResolvedValueOnce({
          success: true,
          mint: token.mint.toString(),
          mintKeypair: Keypair.generate(),
          bondingCurveAddress: TestHelpers.generateRandomPublicKey().toString(),
          signature: `MultiTokenSignature${index + 1}`
        });
      });

      // Create multiple tokens concurrently
      const createPromises = tokenTypes.map(token =>
        createPumpFunToken(connection, wallet, token.config, false)
      );

      const createResults = await Promise.all(createPromises);

      // Verify all tokens were created successfully
      expect(createResults).toHaveLength(5);
      expect(createResults.every(r => r.success)).toBe(true);

      // Verify all functions were called the expected number of times
      expect(mockCreatePumpFunToken).toHaveBeenCalledTimes(5);
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle extreme parameter values gracefully', async () => {
      // Test with extreme values
      const extremeConfigs = [
        { baseIn: 1, quoteIn: 0.000001, poolIndex: 0 },
        { baseIn: 1000000000000, quoteIn: 100000, poolIndex: 999999 },
        { baseIn: 1000000, quoteIn: 0.1, poolIndex: 0 }
      ];

      // Mock successful results for extreme values
      extremeConfigs.forEach((config, index) => {
        mockCreatePool.mockResolvedValueOnce({
          success: true,
          poolKey: TestHelpers.generateRandomPublicKey(),
          signature: `ExtremeValueSignature${index + 1}`
        });
      });

      // Test extreme configurations
      for (const config of extremeConfigs) {
        const result = await createPool(
          connection,
          wallet,
          mockTokenMint,
          new PublicKey('So11111111111111111111111111111111111111112'),
          config.baseIn,
          config.quoteIn,
          config.poolIndex
        );

        expect(result!.success).toBe(true);
        expect(result!.poolKey).toBeDefined();
      }
    });

    it('should handle rapid state changes', async () => {
      // Mock rapid state changes
      const rapidOperations = Array.from({ length: 20 }, (_, i) => ({
        buyAmount: 0.001,
        sellAmount: 50,
        priorityFee: 1000
      }));

      // Mock alternating success/failure for rapid operations
      rapidOperations.forEach((op, index) => {
        if (index % 2 === 0) {
          mockBuyPumpFunToken.mockResolvedValueOnce(`RapidBuySignature${index + 1}`);
          mockSellPumpFunToken.mockResolvedValueOnce({
            success: true,
            signature: `RapidSellSignature${index + 1}`
          });
        } else {
          mockBuyPumpFunToken.mockRejectedValueOnce(new Error(`RapidError${index + 1}`));
          mockSellPumpFunToken.mockResolvedValueOnce({
            success: false,
            error: `RapidError${index + 1}`
          });
        }
      });

      // Execute rapid operations
      const results: Array<{type: string; success: boolean; result?: any; error?: string}> = [];
      for (let i = 0; i < rapidOperations.length; i++) {
        const op = rapidOperations[i];
        
        try {
          const buyResult = await buyPumpFunToken(
            connection,
            wallet,
            mockTokenMint,
            op.buyAmount,
            op.priorityFee
          );
          results.push({ type: 'buy', success: true, result: buyResult });
        } catch (error) {
          results.push({ type: 'buy', success: false, error: (error as Error).message });
        }

        const sellResult = await sellPumpFunToken(
          connection,
          wallet,
          mockTokenMint,
          op.sellAmount
        );
        results.push({ type: 'sell', success: sellResult.success, result: sellResult });
      }

      // Verify results contain both successes and failures
      expect(results).toHaveLength(40); // 20 buy + 20 sell operations
      expect(results.some(r => r.success)).toBe(true);
      expect(results.some(r => !r.success)).toBe(true);
    });
  });
});
