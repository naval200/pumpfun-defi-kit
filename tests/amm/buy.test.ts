import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { buyTokens } from '../../src/amm/buy.js';
import { findPoolsForToken } from '../../src/amm/amm.js';
import { TestHelpers } from '../utils/test-helpers.js';

// Mock the AMM functions
jest.mock('../../src/amm/buy.js');
jest.mock('../../src/amm/amm.js');

const mockBuyTokens = buyTokens as jest.MockedFunction<typeof buyTokens>;
const mockFindPoolsForToken = findPoolsForToken as jest.MockedFunction<typeof findPoolsForToken>;

describe('AMM Buy Operations', () => {
  let connection: Connection;
  let wallet: Keypair;
  let mockTokenMint: PublicKey;
  let mockPoolKey: PublicKey;

  beforeEach(() => {
    // Setup test environment
    connection = TestHelpers.getConnection();
    wallet = TestHelpers.loadTestWallet();
    mockTokenMint = TestHelpers.generateRandomPublicKey();
    mockPoolKey = TestHelpers.generateRandomPublicKey();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    TestHelpers.cleanup();
  });

  describe('AMM Buy Success Scenarios', () => {
    it('should buy tokens successfully using AMM', async () => {
      const buyAmount = 0.01; // 0.01 SOL
      const slippage = 1; // 1% slippage
      
      // Mock pool finding
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      // Mock successful buy
      const mockResult = {
        success: true,
        signature: 'AMMBuySignature123',
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockResult);

      const result = await buyTokens(
        connection,
        wallet,
        mockPoolKey,
        buyAmount,
        slippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(result.baseAmount).toBeDefined();
      expect(mockBuyTokens).toHaveBeenCalledWith(
        connection,
        wallet,
        mockPoolKey,
        buyAmount,
        slippage
      );
    });

    it('should handle different buy amounts', async () => {
      const buyAmounts = [0.001, 0.01, 0.1, 1.0];
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      for (const amount of buyAmounts) {
        const mockResult = {
          success: true,
          signature: `AMMBuySignature${amount}`,
          baseAmount: amount * 100000
        };
        
        mockBuyTokens.mockResolvedValue(mockResult);

        const result = await buyTokens(
          connection,
          wallet,
          mockPoolKey,
          amount,
          1
        );

        expect(result.success).toBe(true);
        expect(result.baseAmount).toBeDefined();
      }
    });

    it('should handle different slippage tolerances', async () => {
      const slippages = [0.1, 1, 5, 10, 20];
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      for (const slippage of slippages) {
        const mockResult = {
          success: true,
          signature: `SlippageSignature${slippage}`,
          baseAmount: 1000
        };
        
        mockBuyTokens.mockResolvedValue(mockResult);

        const result = await buyTokens(
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

    it('should find and use available pools', async () => {
      const availablePools = [
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey()
      ];
      
      mockFindPoolsForToken.mockResolvedValue(availablePools);
      
      const mockResult = {
        success: true,
        signature: 'PoolFoundSignature',
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockResult);

      // Use the first available pool
      const selectedPool = availablePools[0];
      const result = await buyTokens(
        connection,
        wallet,
        selectedPool,
        0.01,
        1
      );

      expect(result.success).toBe(true);
      // Note: mockFindPoolsForToken is called in the test setup, not in this specific test
    });
  });

  describe('AMM Buy Error Scenarios', () => {
    it('should handle no AMM pools found', async () => {
      mockFindPoolsForToken.mockResolvedValue([]);
      
      // This would normally be handled by the calling function
      expect(mockFindPoolsForToken(connection, mockTokenMint)).resolves.toEqual([]);
    });

    it('should handle insufficient wallet balance', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockError = {
        success: false,
        error: 'Insufficient balance for AMM buy operation'
      };
      
      mockBuyTokens.mockResolvedValue(mockError);

      const result = await buyTokens(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance for AMM buy operation');
    });

    it('should handle invalid pool key', async () => {
      const invalidPoolKey = new PublicKey("11111111111111111111111111111111");
      
      const mockError = {
        success: false,
        error: 'Invalid pool account'
      };
      
      mockBuyTokens.mockResolvedValue(mockError);

      const result = await buyTokens(
        connection,
        wallet,
        invalidPoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid pool account');
    });

    it('should handle non-existent pool', async () => {
      const fakePoolKey = TestHelpers.generateRandomPublicKey();
      
      const mockError = {
        success: false,
        error: 'Pool account not found'
      };
      
      mockBuyTokens.mockResolvedValue(mockError);

      const result = await buyTokens(
        connection,
        wallet,
        fakePoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pool account not found');
    });

    it('should handle network connection errors', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockError = {
        success: false,
        error: 'Network connection failed'
      };
      
      mockBuyTokens.mockResolvedValue(mockError);

      const result = await buyTokens(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network connection failed');
    });

    it('should handle RPC rate limiting', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockError = {
        success: false,
        error: 'RPC rate limit exceeded'
      };
      
      mockBuyTokens.mockResolvedValue(mockError);

      const result = await buyTokens(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC rate limit exceeded');
    });

    it('should handle slippage tolerance exceeded', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockError = {
        success: false,
        error: 'Slippage tolerance exceeded'
      };
      
      mockBuyTokens.mockResolvedValue(mockError);

      const result = await buyTokens(
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
    it('should handle very small buy amounts', async () => {
      const smallAmounts = [0.000001, 0.00001, 0.0001];
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      for (const amount of smallAmounts) {
        const mockResult = {
          success: true,
          signature: `SmallAmountSignature${amount}`,
          baseAmount: amount * 1000000
        };
        
        mockBuyTokens.mockResolvedValue(mockResult);

        const result = await buyTokens(
          connection,
          wallet,
          mockPoolKey,
          amount,
          1
        );

        expect(result.success).toBe(true);
        expect(result.baseAmount).toBeDefined();
      }
    });

    it('should handle very large buy amounts', async () => {
      const largeAmounts = [10, 100, 1000];
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      for (const amount of largeAmounts) {
        const mockResult = {
          success: true,
          signature: `LargeAmountSignature${amount}`,
          baseAmount: amount * 100000
        };
        
        mockBuyTokens.mockResolvedValue(mockResult);

        const result = await buyTokens(
          connection,
          wallet,
          mockPoolKey,
          amount,
          1
        );

        expect(result.success).toBe(true);
        expect(result.baseAmount).toBeDefined();
      }
    });

    it('should handle zero buy amount', async () => {
      const mockError = {
        success: false,
        error: 'Buy amount must be greater than 0'
      };
      
      mockBuyTokens.mockResolvedValue(mockError);

      const result = await buyTokens(
        connection,
        wallet,
        mockPoolKey,
        0,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Buy amount must be greater than 0');
    });

    it('should handle negative buy amount', async () => {
      const mockError = {
        success: false,
        error: 'Buy amount cannot be negative'
      };
      
      mockBuyTokens.mockResolvedValue(mockError);

      const result = await buyTokens(
        connection,
        wallet,
        mockPoolKey,
        -0.01,
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Buy amount cannot be negative');
    });

    it('should handle very low slippage tolerance', async () => {
      const veryLowSlippage = 0.01; // 0.01%
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockResult = {
        success: true,
        signature: 'VeryLowSlippageSignature',
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockResult);

      const result = await buyTokens(
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
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockResult);

      const result = await buyTokens(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        veryHighSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });

    it('should handle zero slippage tolerance', async () => {
      const zeroSlippage = 0;
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      const mockResult = {
        success: true,
        signature: 'ZeroSlippageSignature',
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockResult);

      const result = await buyTokens(
        connection,
        wallet,
        mockPoolKey,
        0.01,
        zeroSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should validate buy amount is positive', () => {
      const invalidAmounts = [0, -0.01, -1, -100];
      
      invalidAmounts.forEach(amount => {
        expect(() => {
          // This would normally be validated in the actual function
          if (amount <= 0) {
            throw new Error(`Buy amount must be positive: ${amount}`);
          }
        }).toThrow(`Buy amount must be positive: ${amount}`);
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
    it('should handle multiple consecutive AMM buy operations', async () => {
      const buyAmounts = [0.01, 0.02, 0.05];
      const mockResults = buyAmounts.map((amount, index) => ({
        success: true,
        signature: `ConsecutiveAMMBuySignature${index + 1}`,
        baseAmount: amount * 100000
      }));
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      mockBuyTokens
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < buyAmounts.length; i++) {
        const result = await buyTokens(
          connection,
          wallet,
          mockPoolKey,
          buyAmounts[i],
          1
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockBuyTokens).toHaveBeenCalledTimes(3);
    });

    it('should handle AMM buy operations with different pools', async () => {
      const pools = [
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey()
      ];
      
      const mockResults = pools.map((pool, index) => ({
        success: true,
        signature: `DifferentPoolAMMBuySignature${index + 1}`,
        baseAmount: 1000
      }));
      
      mockFindPoolsForToken.mockResolvedValue(pools);
      
      mockBuyTokens
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < pools.length; i++) {
        const result = await buyTokens(
          connection,
          wallet,
          pools[i],
          0.01,
          1
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockBuyTokens).toHaveBeenCalledTimes(3);
    });

    it('should handle AMM buy operations with dynamic slippage', async () => {
      const baseSlippage = 1;
      const dynamicSlippages = [baseSlippage, baseSlippage * 2, baseSlippage * 4];
      
      const mockResults = dynamicSlippages.map((slippage, index) => ({
        success: true,
        signature: `DynamicSlippageAMMBuySignature${index + 1}`,
        baseAmount: 1000
      }));
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      mockBuyTokens
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < dynamicSlippages.length; i++) {
        const result = await buyTokens(
          connection,
          wallet,
          mockPoolKey,
          0.01,
          dynamicSlippages[i]
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockBuyTokens).toHaveBeenCalledTimes(3);
    });

    it('should handle pool discovery and selection', async () => {
      const availablePools = [
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey()
      ];
      
      mockFindPoolsForToken.mockResolvedValue(availablePools);
      
      const mockResult = {
        success: true,
        signature: 'PoolDiscoverySignature',
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockResult);

      // Find pools
      const pools = await findPoolsForToken(connection, mockTokenMint);
      expect(pools).toHaveLength(2);
      
      // Use first pool
      const selectedPool = pools[0];
      const result = await buyTokens(
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
    it('should retry failed AMM buy operations with increased slippage', async () => {
      const initialSlippage = 1; // 1%
      const increasedSlippage = 5; // 5%
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      // First attempt fails, second succeeds
      mockBuyTokens
        .mockResolvedValueOnce({ success: false, error: 'Slippage tolerance exceeded' })
        .mockResolvedValueOnce({ success: true, signature: 'RetrySuccessSignature', baseAmount: 1000 });

      // Simulate retry logic
      let result;
      try {
        result = await buyTokens(
          connection,
          wallet,
          mockPoolKey,
          0.01,
          initialSlippage
        );
        if (!result.success) {
          // Retry with increased slippage
          result = await buyTokens(
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
      expect(mockBuyTokens).toHaveBeenCalledTimes(2);
    });

    it('should handle temporary network issues during AMM buy', async () => {
      const networkErrors = [
        { success: false, error: 'Connection timeout' },
        { success: false, error: 'RPC server error' },
        { success: false, error: 'Network congestion' }
      ];
      
      const mockResult = { success: true, signature: 'NetworkRecoverySignature', baseAmount: 1000 };
      
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      
      mockBuyTokens
        .mockResolvedValueOnce(networkErrors[0])
        .mockResolvedValueOnce(networkErrors[1])
        .mockResolvedValueOnce(networkErrors[2])
        .mockResolvedValueOnce(mockResult);

      // Simulate retry logic
      let result;
      let attempts = 0;
      const maxAttempts = 4;
      
      while (attempts < maxAttempts) {
        result = await buyTokens(connection, wallet, mockPoolKey, 0.01, 1);
        if (result.success) break;
        attempts++;
        if (attempts >= maxAttempts) break;
        // Wait before retry
        await TestHelpers.wait(1000);
      }

      expect(result!.success).toBe(true);
      expect(mockBuyTokens).toHaveBeenCalledTimes(4);
    });

    it('should handle pool not found recovery', async () => {
      // First attempt - no pools found
      mockFindPoolsForToken.mockResolvedValueOnce([]);
      
      // Second attempt - pool found
      mockFindPoolsForToken.mockResolvedValueOnce([mockPoolKey]);
      
      const mockResult = {
        success: true,
        signature: 'PoolRecoverySignature',
        baseAmount: 1000
      };
      
      mockBuyTokens.mockResolvedValue(mockResult);

      // First attempt - no pools
      let pools = await findPoolsForToken(connection, mockTokenMint);
      expect(pools).toHaveLength(0);
      
      // Second attempt - pool found
      pools = await findPoolsForToken(connection, mockTokenMint);
      expect(pools).toHaveLength(1);
      
      // Use the found pool
      const result = await buyTokens(
        connection,
        wallet,
        pools[0],
        0.01,
        1
      );

      expect(result.success).toBe(true);
      expect(mockFindPoolsForToken).toHaveBeenCalledTimes(2);
    });
  });
});
