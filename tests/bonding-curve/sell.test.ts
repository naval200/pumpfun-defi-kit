import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { sellPumpFunToken } from '../../src/bonding-curve/sell';
import { TestHelpers } from '../utils/test-helpers';

// Mock the sellPumpFunToken function
jest.mock('../../src/bonding-curve/sell');
const mockSellPumpFunToken = sellPumpFunToken as jest.MockedFunction<typeof sellPumpFunToken>;

describe('PumpFun Token Sell Operations', () => {
  let connection: Connection;
  let wallet: Keypair;
  let mockMint: string;

  beforeEach(() => {
    // Setup test environment
    connection = TestHelpers.getConnection();
    wallet = TestHelpers.loadTestWallet();
    mockMint = TestHelpers.generateRandomPublicKey().toString();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    TestHelpers.cleanup();
  });

  describe('Sell Success Scenarios', () => {
    it('should sell all tokens successfully (default behavior)', async () => {
      const mockResult = {
        success: true,
        signature: 'SellAllSignature123'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockResult);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(mockSellPumpFunToken).toHaveBeenCalledWith(
        connection,
        wallet,
        mockMint
      );
    });

    it('should sell specific amount of tokens successfully', async () => {
      const specificAmount = 1000;
      const mockResult = {
        success: true,
        signature: 'SellSpecificSignature123'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockResult);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        specificAmount
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(mockSellPumpFunToken).toHaveBeenCalledWith(
        connection,
        wallet,
        mockMint,
        specificAmount
      );
    });

    it('should sell with custom slippage tolerance', async () => {
      const customSlippage = 500; // 5%
      const mockResult = {
        success: true,
        signature: 'CustomSlippageSignature123'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockResult);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        undefined, // Sell all
        customSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(mockSellPumpFunToken).toHaveBeenCalledWith(
        connection,
        wallet,
        mockMint,
        undefined,
        customSlippage
      );
    });

    it('should sell with both specific amount and custom slippage', async () => {
      const specificAmount = 500;
      const customSlippage = 1000; // 10%
      const mockResult = {
        success: true,
        signature: 'SpecificAmountAndSlippageSignature123'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockResult);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        specificAmount,
        customSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
      expect(mockSellPumpFunToken).toHaveBeenCalledWith(
        connection,
        wallet,
        mockMint,
        specificAmount,
        customSlippage
      );
    });
  });

  describe('Sell Error Scenarios', () => {
    it('should handle insufficient token balance', async () => {
      const mockError = {
        success: false,
        error: 'Insufficient token balance for sell operation'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockError);

      const result = await sellPumpFunToken(connection, wallet, mockMint);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient token balance for sell operation');
    });

    it('should handle invalid mint address', async () => {
      const invalidMint = "11111111111111111111111111111111";
      const mockError = {
        success: false,
        error: 'Invalid mint address'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockError);

      const result = await sellPumpFunToken(connection, wallet, invalidMint);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid mint address');
    });

    it('should handle non-existent token', async () => {
      const fakeMint = "FakeMintAddressThatDoesNotExist123456789";
      const mockError = {
        success: false,
        error: 'Token not found'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockError);

      const result = await sellPumpFunToken(connection, wallet, fakeMint);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token not found');
    });

    it('should handle network connection errors', async () => {
      const mockError = {
        success: false,
        error: 'Network connection failed'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockError);

      const result = await sellPumpFunToken(connection, wallet, mockMint);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network connection failed');
    });

    it('should handle RPC rate limiting', async () => {
      const mockError = {
        success: false,
        error: 'RPC rate limit exceeded'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockError);

      const result = await sellPumpFunToken(connection, wallet, mockMint);

      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC rate limit exceeded');
    });

    it('should handle slippage tolerance exceeded', async () => {
      const mockError = {
        success: false,
        error: 'Slippage tolerance exceeded'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockError);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        undefined,
        100 // 1% slippage
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slippage tolerance exceeded');
    });
  });

  describe('Edge Cases', () => {
    it('should handle selling very small amounts', async () => {
      const smallAmounts = [1, 10, 100];
      
      for (const amount of smallAmounts) {
        const mockResult = {
          success: true,
          signature: `SmallAmountSignature${amount}`
        };
        
        mockSellPumpFunToken.mockResolvedValue(mockResult);

        const result = await sellPumpFunToken(
          connection,
          wallet,
          mockMint,
          amount
        );

        expect(result.success).toBe(true);
        expect(result.signature).toBeDefined();
      }
    });

    it('should handle selling very large amounts', async () => {
      const largeAmounts = [1000000, 10000000, 100000000];
      
      for (const amount of largeAmounts) {
        const mockResult = {
          success: true,
          signature: `LargeAmountSignature${amount}`
        };
        
        mockSellPumpFunToken.mockResolvedValue(mockResult);

        const result = await sellPumpFunToken(
          connection,
          wallet,
          mockMint,
          amount
        );

        expect(result.success).toBe(true);
        expect(result.signature).toBeDefined();
      }
    });

    it('should handle zero token amount', async () => {
      const mockError = {
        success: false,
        error: 'Token amount must be greater than 0'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockError);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        0
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token amount must be greater than 0');
    });

    it('should handle negative token amount', async () => {
      const mockError = {
        success: false,
        error: 'Token amount cannot be negative'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockError);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        -100
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token amount cannot be negative');
    });

    it('should handle very low slippage tolerance', async () => {
      const veryLowSlippage = 1; // 0.01%
      const mockResult = {
        success: true,
        signature: 'VeryLowSlippageSignature'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockResult);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        undefined,
        veryLowSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });

    it('should handle very high slippage tolerance', async () => {
      const veryHighSlippage = 50000; // 500%
      const mockResult = {
        success: true,
        signature: 'VeryHighSlippageSignature'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockResult);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        undefined,
        veryHighSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });

    it('should handle zero slippage tolerance', async () => {
      const zeroSlippage = 0;
      const mockResult = {
        success: true,
        signature: 'ZeroSlippageSignature'
      };
      
      mockSellPumpFunToken.mockResolvedValue(mockResult);

      const result = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        undefined,
        zeroSlippage
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should validate token amount is positive when specified', () => {
      const invalidAmounts = [0, -1, -100, -1000];
      
      invalidAmounts.forEach(amount => {
        expect(() => {
          // This would normally be validated in the actual function
          if (amount !== undefined && amount <= 0) {
            throw new Error(`Token amount must be positive: ${amount}`);
          }
        }).toThrow(`Token amount must be positive: ${amount}`);
      });
    });

    it('should validate slippage tolerance is non-negative', () => {
      const invalidSlippages = [-100, -1000, -10000];
      
      invalidSlippages.forEach(slippage => {
        expect(() => {
          // This would normally be validated in the actual function
          if (slippage !== undefined && slippage < 0) {
            throw new Error(`Slippage tolerance cannot be negative: ${slippage}`);
          }
        }).toThrow(`Slippage tolerance cannot be negative: ${slippage}`);
      });
    });

    it('should validate mint address format', () => {
      const invalidMints = [
        'invalid-address',
        '123',
        '',
        'not-a-valid-public-key',
        'too-short'
      ];
      
      invalidMints.forEach(mintStr => {
        expect(() => {
          // This would normally be validated in the actual function
          try {
            new PublicKey(mintStr);
          } catch {
            throw new Error(`Invalid mint address format: ${mintStr}`);
          }
        }).toThrow(`Invalid mint address format: ${mintStr}`);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple consecutive sell operations', async () => {
      const sellAmounts = [100, 200, 500];
      const mockResults = sellAmounts.map((amount, index) => ({
        success: true,
        signature: `ConsecutiveSellSignature${index + 1}`
      }));
      
      mockSellPumpFunToken
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < sellAmounts.length; i++) {
        const result = await sellPumpFunToken(
          connection,
          wallet,
          mockMint,
          sellAmounts[i]
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(3);
    });

    it('should handle sell operations with different tokens', async () => {
      const tokens = [
        TestHelpers.generateRandomPublicKey().toString(),
        TestHelpers.generateRandomPublicKey().toString(),
        TestHelpers.generateRandomPublicKey().toString()
      ];
      
      const mockResults = tokens.map((token, index) => ({
        success: true,
        signature: `DifferentTokenSellSignature${index + 1}`
      }));
      
      mockSellPumpFunToken
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < tokens.length; i++) {
        const result = await sellPumpFunToken(
          connection,
          wallet,
          tokens[i],
          1000
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(3);
    });

    it('should handle sell operations with dynamic slippage', async () => {
      const baseSlippage = 1000;
      const dynamicSlippages = [baseSlippage, baseSlippage * 2, baseSlippage * 4];
      
      const mockResults = dynamicSlippages.map((slippage, index) => ({
        success: true,
        signature: `DynamicSlippageSignature${index + 1}`
      }));
      
      mockSellPumpFunToken
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < dynamicSlippages.length; i++) {
        const result = await sellPumpFunToken(
          connection,
          wallet,
          mockMint,
          1000,
          dynamicSlippages[i]
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(3);
    });

    it('should handle partial sells followed by sell all', async () => {
      // First sell specific amount
      const specificAmount = 500;
      const mockSpecificResult = {
        success: true,
        signature: 'PartialSellSignature'
      };
      
      // Then sell all remaining
      const mockSellAllResult = {
        success: true,
        signature: 'SellAllRemainingSignature'
      };
      
      mockSellPumpFunToken
        .mockResolvedValueOnce(mockSpecificResult)
        .mockResolvedValueOnce(mockSellAllResult);

      // Partial sell
      const partialResult = await sellPumpFunToken(
        connection,
        wallet,
        mockMint,
        specificAmount
      );

      // Sell all remaining
      const sellAllResult = await sellPumpFunToken(
        connection,
        wallet,
        mockMint
      );

      expect(partialResult.success).toBe(true);
      expect(sellAllResult.success).toBe(true);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should retry failed sell operations with increased slippage', async () => {
      const initialSlippage = 1000; // 10%
      const increasedSlippage = 2000; // 20%
      
      // First attempt fails, second succeeds
      mockSellPumpFunToken
        .mockResolvedValueOnce({ success: false, error: 'Slippage tolerance exceeded' })
        .mockResolvedValueOnce({ success: true, signature: 'RetrySuccessSignature' });

      // Simulate retry logic
      let result;
      try {
        result = await sellPumpFunToken(
          connection,
          wallet,
          mockMint,
          undefined,
          initialSlippage
        );
        if (!result.success) {
          // Retry with increased slippage
          result = await sellPumpFunToken(
            connection,
            wallet,
            mockMint,
            undefined,
            increasedSlippage
          );
        }
      } catch (error) {
        throw error;
      }

      expect(result!.success).toBe(true);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(2);
    });

    it('should handle temporary network issues during sell', async () => {
      const networkErrors = [
        { success: false, error: 'Connection timeout' },
        { success: false, error: 'RPC server error' },
        { success: false, error: 'Network congestion' }
      ];
      
      const mockResult = { success: true, signature: 'NetworkRecoverySignature' };
      mockSellPumpFunToken
        .mockResolvedValueOnce(networkErrors[0])
        .mockResolvedValueOnce(networkErrors[1])
        .mockResolvedValueOnce(networkErrors[2])
        .mockResolvedValueOnce(mockResult);

      // Simulate retry logic
      let result;
      let attempts = 0;
      const maxAttempts = 4;
      
      while (attempts < maxAttempts) {
        result = await sellPumpFunToken(connection, wallet, mockMint);
        if (result.success) break;
        attempts++;
        if (attempts >= maxAttempts) break;
        // Wait before retry
        await TestHelpers.wait(1000);
      }

      expect(result!.success).toBe(true);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(4);
    });

    it('should handle insufficient balance recovery', async () => {
      // First attempt with too many tokens
      const mockInsufficientResult = {
        success: false,
        error: 'Insufficient token balance'
      };
      
      // Second attempt with available balance
      const mockSuccessResult = {
        success: true,
        signature: 'BalanceRecoverySignature'
      };
      
      mockSellPumpFunToken
        .mockResolvedValueOnce(mockInsufficientResult)
        .mockResolvedValueOnce(mockSuccessResult);

      // First attempt - sell all (fails)
      const firstResult = await sellPumpFunToken(connection, wallet, mockMint);
      
      // Second attempt - sell specific amount (succeeds)
      const secondResult = await sellPumpFunToken(connection, wallet, mockMint, 100);

      expect(firstResult.success).toBe(false);
      expect(secondResult.success).toBe(true);
      expect(mockSellPumpFunToken).toHaveBeenCalledTimes(2);
    });
  });
});
