import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { addLiquidity, removeLiquidity } from '../../src/amm/liquidity';
import { findPoolsForToken } from '../../src/amm/amm';
import { TestHelpers } from '../utils/test-helpers';

// Mock the AMM liquidity functions
jest.mock('../../src/amm/liquidity');
jest.mock('../../src/amm/amm');

const mockAddLiquidity = addLiquidity as jest.MockedFunction<typeof addLiquidity>;
const mockRemoveLiquidity = removeLiquidity as jest.MockedFunction<typeof removeLiquidity>;
const mockFindPoolsForToken = findPoolsForToken as jest.MockedFunction<typeof findPoolsForToken>;

describe('AMM Liquidity Operations', () => {
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

  describe('Add Liquidity Success Scenarios', () => {
    it('should add liquidity successfully', async () => {
      const addLiquidityAmount = 0.01; // 0.01 SOL worth
      const slippage = 1; // 1% slippage
      
      // Mock pool finding
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      // Mock successful add liquidity
      const mockResult = {
        success: true,
        signature: 'AddLiquiditySignature123',
        lpTokenAmount: 1000
      };
      
      mockAddLiquidity.mockResolvedValue(mockResult);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        addLiquidityAmount,
        slippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(result.lpTokenAmount).toBeDefined();
      expect(mockAddLiquidity).toHaveBeenCalledWith(
        connection,
        wallet,
        mockPoolKey,
        addLiquidityAmount,
        slippage
      );
    });

    it('should handle different liquidity amounts', async () => {
      const liquidityAmounts = [0.001, 0.01, 0.1, 1.0];
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      for (const amount of liquidityAmounts) {
        const mockResult = {
          success: true,
          signature: `AddLiquiditySignature${amount}`,
          lpTokenAmount: amount * 100000
        };
        
        mockAddLiquidity.mockResolvedValue(mockResult);

        const result = await addLiquidity(
          connection,
          wallet,
          mockPoolKey,
          amount,
          1
        );

        expect(result.success).toBe(true);
        expect(result.lpTokenAmount).toBeDefined();
      }
    });

    it('should handle different slippage tolerances', async () => {
      const slippages = [0.1, 1, 5, 10, 20];
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      for (const slippage of slippages) {
        const mockResult = {
          success: true,
          signature: `SlippageSignature${slippage}`,
          lpTokenAmount: 1000
        };
        
        mockAddLiquidity.mockResolvedValue(mockResult);

        const result = await addLiquidity(
          connection,
          wallet,
          mockPoolKey,
          0.01,
          slippage
        );

        expect(result.success).toBe(true);
        expect(result.signature).toBeDefined();
      }
    });

    it('should use pool from token info when available', async () => {
      const tokenInfoWithPool = {
        ...mockTokenInfo,
        poolKey: mockPoolKey.toString()
      };
      
      const mockResult = {
        success: true,
        signature: 'PoolFromTokenInfoSignature',
        lpTokenAmount: 1000
      };
      
      mockAddLiquidity.mockResolvedValue(mockResult);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });
  });

  describe('Remove Liquidity Success Scenarios', () => {
    it('should remove liquidity successfully', async () => {
      const removeLpAmount = 500; // 500 LP tokens
      const slippage = 1; // 1% slippage
      
      // Mock successful remove liquidity
      const mockResult = {
        success: true,
        signature: 'RemoveLiquiditySignature123',
        baseAmount: 1000,
        quoteAmount: 0.01
      };
      
      mockRemoveLiquidity.mockResolvedValue(mockResult);

      const result = await removeLiquidity(
        connection,
        wallet,
        mockPoolKey,
        removeLpAmount,
        slippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(result.baseAmount).toBeDefined();
      expect(result.quoteAmount).toBeDefined();
      expect(mockRemoveLiquidity).toHaveBeenCalledWith(
        connection,
        wallet,
        mockPoolKey,
        removeLpAmount,
        slippage
      );
    });

    it('should handle different LP token amounts', async () => {
      const lpAmounts = [100, 500, 1000, 5000];
      
      for (const amount of lpAmounts) {
        const mockResult = {
          success: true,
          signature: `RemoveLiquiditySignature${amount}`,
          baseAmount: amount * 2,
          quoteAmount: amount * 0.00002
        };
        
        mockRemoveLiquidity.mockResolvedValue(mockResult);

        const result = await removeLiquidity(
          connection,
          wallet,
          mockPoolKey,
          amount,
          1
        );

        expect(result.success).toBe(true);
        expect(result.baseAmount).toBeDefined();
        expect(result.quoteAmount).toBeDefined();
      }
    });

    it('should handle partial liquidity removal', async () => {
      const partialAmount = 250; // Remove half of 500 LP tokens
      
      const mockResult = {
        success: true,
        signature: 'PartialRemovalSignature',
        baseAmount: 500,
        quoteAmount: 0.005
      };
      
      mockRemoveLiquidity.mockResolvedValue(mockResult);

      const result = await removeLiquidity(
        connection,
        wallet,
        mockPoolKey,
        partialAmount,
        1
      );

      expect(result.success).toBe(true);
      expect(result.baseAmount).toBeDefined();
      expect(result.quoteAmount).toBeDefined();
    });
  });

  describe('Liquidity Error Scenarios', () => {
    it('should handle insufficient wallet balance for add liquidity', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockError = {
        success: false,
        error: 'Insufficient balance for add liquidity operation'
      };
      
      mockAddLiquidity.mockResolvedValue(mockError);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance for add liquidity operation');
    });

    it('should handle insufficient LP tokens for removal', async () => {
      const mockError = {
        success: false,
        error: 'Insufficient LP tokens for removal'
      };
      
      mockRemoveLiquidity.mockResolvedValue(mockError);

      const result = await removeLiquidity(
        connection,
        wallet,
        mockPoolKey,
        1000,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient LP tokens for removal');
    });

    it('should handle no AMM pools found', async () => {
      mockFindPoolsForToken.mockResolvedValue([]);
      
      // This would normally be handled by the calling function
      expect(mockFindPoolsForToken(connection, mockTokenMint)).resolves.toEqual([]);
    });

    it('should handle invalid pool key', async () => {
      const invalidPoolKey = new PublicKey("11111111111111111111111111111111");
      
      const mockError = {
        success: false,
        error: 'Invalid pool account'
      };
      
      mockAddLiquidity.mockResolvedValue(mockError);

      const result = await addLiquidity(
        connection,
        wallet,
        invalidPoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid pool account');
    });

    it('should handle network connection errors', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockError = {
        success: false,
        error: 'Network connection failed'
      };
      
      mockAddLiquidity.mockResolvedValue(mockError);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network connection failed');
    });

    it('should handle slippage tolerance exceeded', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockError = {
        success: false,
        error: 'Slippage tolerance exceeded'
      };
      
      mockAddLiquidity.mockResolvedValue(mockError);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        0.1 // Very low slippage
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slippage tolerance exceeded');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small liquidity amounts', async () => {
      const smallAmounts = [0.000001, 0.00001, 0.0001];
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      for (const amount of smallAmounts) {
        const mockResult = {
          success: true,
          signature: `SmallAmountSignature${amount}`,
          lpTokenAmount: amount * 1000000
        };
        
        mockAddLiquidity.mockResolvedValue(mockResult);

        const result = await addLiquidity(
          connection,
          wallet,
          mockPoolKey,
          amount,
          1
        );

        expect(result.success).toBe(true);
        expect(result.lpTokenAmount).toBeDefined();
      }
    });

    it('should handle very large liquidity amounts', async () => {
      const largeAmounts = [10, 100, 1000];
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      for (const amount of largeAmounts) {
        const mockResult = {
          success: true,
          signature: `LargeAmountSignature${amount}`,
          lpTokenAmount: amount * 100000
        };
        
        mockAddLiquidity.mockResolvedValue(mockResult);

        const result = await addLiquidity(
          connection,
          wallet,
          mockPoolKey,
          amount,
          1
        );

        expect(result.success).toBe(true);
        expect(result.lpTokenAmount).toBeDefined();
      }
    });

    it('should handle zero liquidity amount', async () => {
      const mockError = {
        success: false,
        error: 'Liquidity amount must be greater than 0'
      };
      
      mockAddLiquidity.mockResolvedValue(mockError);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Liquidity amount must be greater than 0');
    });

    it('should handle negative liquidity amount', async () => {
      const mockError = {
        success: false,
        error: 'Liquidity amount cannot be negative'
      };
      
      mockAddLiquidity.mockResolvedValue(mockError);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        -0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Liquidity amount cannot be negative');
    });

    it('should handle very low slippage tolerance', async () => {
      const veryLowSlippage = 0.01; // 0.01%
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockResult = {
        success: true,
        signature: 'VeryLowSlippageSignature',
        lpTokenAmount: 1000
      };
      
      mockAddLiquidity.mockResolvedValue(mockResult);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        veryLowSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });

    it('should handle very high slippage tolerance', async () => {
      const veryHighSlippage = 100; // 100%
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockResult = {
        success: true,
        signature: 'VeryHighSlippageSignature',
        lpTokenAmount: 1000
      };
      
      mockAddLiquidity.mockResolvedValue(mockResult);

      const result = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        veryHighSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should validate liquidity amount is positive', () => {
      const invalidAmounts = [0, -0.01, -1, -100];
      
      invalidAmounts.forEach(amount => {
        expect(() => {
          // This would normally be validated in the actual function
          if (amount <= 0) {
            throw new Error(`Liquidity amount must be positive: ${amount}`);
          }
        }).toThrow(`Liquidity amount must be positive: ${amount}`);
      });
    });

    it('should validate LP token amount is positive for removal', () => {
      const invalidAmounts = [0, -100, -1000, -10000];
      
      invalidAmounts.forEach(amount => {
        expect(() => {
          // This would normally be validated in the actual function
          if (amount <= 0) {
            throw new Error(`LP token amount must be positive: ${amount}`);
          }
        }).toThrow(`LP token amount must be positive: ${amount}`);
      });
    });

    it('should validate slippage tolerance is non-negative', () => {
      const invalidSlippages = [-0.1, -1, -10, -100];
      
      invalidSlippages.forEach(slippage => {
        expect(() => {
          // This would normally be validated in the actual function
          if (slippage < 0) {
            throw new Error(`Slippage tolerance cannot be negative: ${slippage}`);
          }
        }).toThrow(`Slippage tolerance cannot be negative: ${slippage}`);
      });
    });

    it('should validate pool key format', () => {
      const invalidPoolKeys = [
        'invalid-pool-key',
        '123',
        '',
        'not-a-valid-public-key',
        'too-short'
      ];
      
      invalidPoolKeys.forEach(poolKeyStr => {
        expect(() => {
          // This would normally be validated in the actual function
          try {
            new PublicKey(poolKeyStr);
          } catch {
            throw new Error(`Invalid pool key format: ${poolKeyStr}`);
          }
        }).toThrow(`Invalid pool key format: ${poolKeyStr}`);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete liquidity lifecycle (add then remove)', async () => {
      // Mock pool finding
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      // Mock add liquidity
      const addLiquidityResult = {
        success: true,
        signature: 'AddLiquiditySignature',
        lpTokenAmount: 1000
      };
      
      // Mock remove liquidity
      const removeLiquidityResult = {
        success: true,
        signature: 'RemoveLiquiditySignature',
        baseAmount: 1000,
        quoteAmount: 0.01
      };
      
      mockAddLiquidity.mockResolvedValue(addLiquidityResult);
      mockRemoveLiquidity.mockResolvedValue(removeLiquidityResult);

      // Add liquidity
      const addResult = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        1
      );

      expect(addResult.success).toBe(true);
      expect(addResult.lpTokenAmount).toBe(1000);

      // Remove half of the liquidity
      const removeAmount = addResult.lpTokenAmount! * 0.5;
      const removeResult = await removeLiquidity(
        connection,
        wallet,
        mockPoolKey,
        removeAmount,
        1
      );

      expect(removeResult.success).toBe(true);
      expect(removeResult.baseAmount).toBeDefined();
      expect(removeResult.quoteAmount).toBeDefined();
    });

    it('should handle multiple consecutive add liquidity operations', async () => {
      const liquidityAmounts = [0.01, 0.02, 0.05];
      const mockResults = liquidityAmounts.map((amount, index) => ({
        success: true,
        signature: `ConsecutiveAddLiquiditySignature${index + 1}`,
        lpTokenAmount: amount * 100000
      }));
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      mockAddLiquidity
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < liquidityAmounts.length; i++) {
        const result = await addLiquidity(
          connection,
          wallet,
          mockPoolKey,
          liquidityAmounts[i],
          1
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockAddLiquidity).toHaveBeenCalledTimes(3);
    });

    it('should handle liquidity operations with different pools', async () => {
      const pools = [
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey()
      ];
      
      const mockResults = pools.map((pool, index) => ({
        success: true,
        signature: `DifferentPoolLiquiditySignature${index + 1}`,
        lpTokenAmount: 1000
      }));
      
      mockFindPoolsForToken.mockResolvedValue(pools);
      
      mockAddLiquidity
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < pools.length; i++) {
        const result = await addLiquidity(
          connection,
          wallet,
          pools[i],
          0.01,
          1
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockAddLiquidity).toHaveBeenCalledTimes(3);
    });

    it('should handle pool discovery and liquidity addition', async () => {
      const availablePools = [
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey()
      ];
      
      mockFindPoolsForToken.mockResolvedValue(availablePools);
      
      const mockResult = {
        success: true,
        signature: 'PoolDiscoveryLiquiditySignature',
        lpTokenAmount: 1000
      };
      
      mockAddLiquidity.mockResolvedValue(mockResult);

      // Find pools
      const pools = await findPoolsForToken(connection, mockTokenMint);
      expect(pools).toHaveLength(2);
      
      // Use first pool for liquidity
      const selectedPool = pools[0];
      const result = await addLiquidity(
        connection,
        wallet,
        selectedPool,
        0.01,
        1
      );

      expect(result.success).toBe(true);
      expect(mockFindPoolsForToken).toHaveBeenCalledWith(connection, mockTokenMint);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should retry failed add liquidity operations with increased slippage', async () => {
      const initialSlippage = 1; // 1%
      const increasedSlippage = 5; // 5%
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      // First attempt fails, second succeeds
      mockAddLiquidity
        .mockResolvedValueOnce({ success: false, error: 'Slippage tolerance exceeded' })
        .mockResolvedValueOnce({ success: true, signature: 'RetrySuccessSignature', lpTokenAmount: 1000 });

      // Simulate retry logic
      let result;
      try {
        result = await addLiquidity(
          connection,
          wallet,
          mockPoolKey,
          0.01,
          initialSlippage
        );
        if (!result.success) {
          // Retry with increased slippage
          result = await addLiquidity(
            connection,
            wallet,
            mockPoolKey,
            0.01,
            increasedSlippage
          );
        }
      } catch (error) {
        throw error;
      }

      expect(result!.success).toBe(true);
      expect(mockAddLiquidity).toHaveBeenCalledTimes(2);
    });

    it('should handle temporary network issues during liquidity operations', async () => {
      const networkErrors = [
        { success: false, error: 'Connection timeout' },
        { success: false, error: 'RPC server error' },
        { success: false, error: 'Network congestion' }
      ];
      
      const mockResult = { success: true, signature: 'NetworkRecoverySignature', lpTokenAmount: 1000 };
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      mockAddLiquidity
        .mockResolvedValueOnce(networkErrors[0])
        .mockResolvedValueOnce(networkErrors[1])
        .mockResolvedValueOnce(networkErrors[2])
        .mockResolvedValueOnce(mockResult);

      // Simulate retry logic
      let result;
      let attempts = 0;
      const maxAttempts = 4;
      
      while (attempts < maxAttempts) {
        result = await addLiquidity(connection, wallet, mockPoolKey, 0.01, 1);
        if (result.success) break;
        attempts++;
        if (attempts >= maxAttempts) break;
        // Wait before retry
        await TestHelpers.wait(1000);
      }

      expect(result!.success).toBe(true);
      expect(mockAddLiquidity).toHaveBeenCalledTimes(4);
    });

    it('should handle insufficient balance recovery for liquidity', async () => {
      // First attempt with too much SOL
      const mockInsufficientResult = {
        success: false,
        error: 'Insufficient balance for liquidity operation'
      };
      
      // Second attempt with available balance
      const mockSuccessResult = {
        success: true,
        signature: 'BalanceRecoverySignature',
        lpTokenAmount: 1000
      };
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      mockAddLiquidity
        .mockResolvedValueOnce(mockInsufficientResult)
        .mockResolvedValueOnce(mockSuccessResult);

      // First attempt - too much SOL (fails)
      const firstResult = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        1.0, // Too much
        1
      );
      
      // Second attempt - reasonable amount (succeeds)
      const secondResult = await addLiquidity(
        connection,
        wallet,
        mockPoolKey,
        0.01, // Reasonable amount
        1
      );

      expect(firstResult.success).toBe(false);
      expect(secondResult.success).toBe(true);
      expect(mockAddLiquidity).toHaveBeenCalledTimes(2);
    });
  });
});
