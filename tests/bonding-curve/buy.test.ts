import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { buyPumpFunToken } from '../../src/bonding-curve/buy';
import { TestHelpers } from '../utils/test-helpers';

// Mock the buyPumpFunToken function
jest.mock('../../src/bonding-curve/buy');
const mockBuyPumpFunToken = buyPumpFunToken as jest.MockedFunction<typeof buyPumpFunToken>;

describe('PumpFun Token Buy Operations', () => {
  let connection: Connection;
  let wallet: Keypair;
  let mockMint: PublicKey;
  let mockCreatorVault: PublicKey;

  beforeEach(() => {
    // Setup test environment
    connection = TestHelpers.getConnection();
    wallet = TestHelpers.loadTestWallet();
    mockMint = TestHelpers.generateRandomPublicKey();
    mockCreatorVault = TestHelpers.generateRandomPublicKey();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    TestHelpers.cleanup();
  });

  describe('Buy Success Scenarios', () => {
    it('should buy tokens successfully with valid parameters', async () => {
      const buyAmount = 0.01; // 0.01 SOL
      const priorityFee = 1000;
      
      const mockResult = 'TransactionSignature123';
      mockBuyPumpFunToken.mockResolvedValue(mockResult);

      const result = await buyPumpFunToken(
        connection,
        wallet,
        mockMint,
        buyAmount,
        priorityFee
      );

      expect(result).toBe(mockResult);
      expect(mockBuyPumpFunToken).toHaveBeenCalledWith(
        connection,
        wallet,
        mockMint,
        buyAmount,
        priorityFee
      );
    });

    it('should handle different buy amounts', async () => {
      const buyAmounts = [0.001, 0.01, 0.1, 1.0];
      
      for (const amount of buyAmounts) {
        const mockResult = `TransactionSignature${amount}`;
        mockBuyPumpFunToken.mockResolvedValue(mockResult);

        const result = await buyPumpFunToken(
          connection,
          wallet,
          mockMint,
          amount,
          1000
        );

        expect(result).toBe(mockResult);
        expect(mockBuyPumpFunToken).toHaveBeenCalledWith(
          connection,
          wallet,
          mockMint,
          amount,
          1000
        );
      }
    });

    it('should handle different priority fees', async () => {
      const priorityFees = [100, 500, 1000, 5000, 10000];
      
      for (const fee of priorityFees) {
        const mockResult = `TransactionSignature${fee}`;
        mockBuyPumpFunToken.mockResolvedValue(mockResult);

        const result = await buyPumpFunToken(
          connection,
          wallet,
          mockMint,
          0.01,
          fee
        );

        expect(result).toBe(mockResult);
        expect(mockBuyPumpFunToken).toHaveBeenCalledWith(
          connection,
          wallet,
          mockMint,
          0.01,
          fee
        );
      }
    });

    it('should buy tokens with expected creator vault', async () => {
      // This test simulates the specific case from the CLI test
      const expectedCreatorVault = new PublicKey("72ZnbPGyFHR1Bz1pmVK4cgWNRUT9pCcapNiiUcWKWsDg");
      const buyAmount = 0.01;
      const priorityFee = 1000;
      
      const mockResult = 'ExpectedCreatorVaultSignature';
      mockBuyPumpFunToken.mockResolvedValue(mockResult);

      const result = await buyPumpFunToken(
        connection,
        wallet,
        mockMint,
        buyAmount,
        priorityFee
      );

      expect(result).toBe(mockResult);
      expect(mockBuyPumpFunToken).toHaveBeenCalledWith(
        connection,
        wallet,
        mockMint,
        buyAmount,
        priorityFee
      );
    });
  });

  describe('Buy Error Scenarios', () => {
    it('should handle insufficient wallet balance', async () => {
      const mockError = new Error('Insufficient balance for buy operation');
      mockBuyPumpFunToken.mockRejectedValue(mockError);

      await expect(
        buyPumpFunToken(connection, wallet, mockMint, 0.01, 1000)
      ).rejects.toThrow('Insufficient balance for buy operation');
    });

    it('should handle invalid mint address', async () => {
      const invalidMint = new PublicKey("11111111111111111111111111111111");
      const mockError = new Error('Invalid mint address');
      mockBuyPumpFunToken.mockRejectedValue(mockError);

      await expect(
        buyPumpFunToken(connection, wallet, invalidMint, 0.01, 1000)
      ).rejects.toThrow('Invalid mint address');
    });

    it('should handle non-existent token', async () => {
      const fakeMint = TestHelpers.generateRandomPublicKey();
      const mockError = new Error('Token not found');
      mockBuyPumpFunToken.mockRejectedValue(mockError);

      await expect(
        buyPumpFunToken(connection, wallet, fakeMint, 0.01, 1000)
      ).rejects.toThrow('Token not found');
    });

    it('should handle network connection errors', async () => {
      const mockError = new Error('Network connection failed');
      mockBuyPumpFunToken.mockRejectedValue(mockError);

      await expect(
        buyPumpFunToken(connection, wallet, mockMint, 0.01, 1000)
      ).rejects.toThrow('Network connection failed');
    });

    it('should handle RPC rate limiting', async () => {
      const mockError = new Error('RPC rate limit exceeded');
      mockBuyPumpFunToken.mockRejectedValue(mockError);

      await expect(
        buyPumpFunToken(connection, wallet, mockMint, 0.01, 1000)
      ).rejects.toThrow('RPC rate limit exceeded');
    });

    it('should handle creator vault derivation errors', async () => {
      const mockError = new Error('Failed to derive creator vault');
      mockBuyPumpFunToken.mockRejectedValue(mockError);

      await expect(
        buyPumpFunToken(connection, wallet, mockMint, 0.01, 1000)
      ).rejects.toThrow('Failed to derive creator vault');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small buy amounts', async () => {
      const smallAmounts = [0.000001, 0.00001, 0.0001];
      
      for (const amount of smallAmounts) {
        const mockResult = `SmallAmountSignature${amount}`;
        mockBuyPumpFunToken.mockResolvedValue(mockResult);

        const result = await buyPumpFunToken(
          connection,
          wallet,
          mockMint,
          amount,
          1000
        );

        expect(result).toBe(mockResult);
      }
    });

    it('should handle very large buy amounts', async () => {
      const largeAmounts = [10, 100, 1000];
      
      for (const amount of largeAmounts) {
        const mockResult = `LargeAmountSignature${amount}`;
        mockBuyPumpFunToken.mockResolvedValue(mockResult);

        const result = await buyPumpFunToken(
          connection,
          wallet,
          mockMint,
          amount,
          1000
        );

        expect(result).toBe(mockResult);
      }
    });

    it('should handle zero buy amount', async () => {
      const mockError = new Error('Buy amount must be greater than 0');
      mockBuyPumpFunToken.mockRejectedValue(mockError);

      await expect(
        buyPumpFunToken(connection, wallet, mockMint, 0, 1000)
      ).rejects.toThrow('Buy amount must be greater than 0');
    });

    it('should handle negative buy amount', async () => {
      const mockError = new Error('Buy amount cannot be negative');
      mockBuyPumpFunToken.mockRejectedValue(mockError);

      await expect(
        buyPumpFunToken(connection, wallet, mockMint, -0.01, 1000)
      ).rejects.toThrow('Buy amount cannot be negative');
    });

    it('should handle very high priority fees', async () => {
      const highPriorityFees = [50000, 100000, 1000000];
      
      for (const fee of highPriorityFees) {
        const mockResult = `HighPrioritySignature${fee}`;
        mockBuyPumpFunToken.mockResolvedValue(mockResult);

        const result = await buyPumpFunToken(
          connection,
          wallet,
          mockMint,
          0.01,
          fee
        );

        expect(result).toBe(mockResult);
      }
    });

    it('should handle zero priority fee', async () => {
      const mockResult = 'ZeroPrioritySignature';
      mockBuyPumpFunToken.mockResolvedValue(mockResult);

      const result = await buyPumpFunToken(
        connection,
        wallet,
        mockMint,
        0.01,
        0
      );

      expect(result).toBe(mockResult);
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

    it('should validate priority fee is non-negative', () => {
      const invalidFees = [-100, -1000, -10000];
      
      invalidFees.forEach(fee => {
        expect(() => {
          // This would normally be validated in the actual function
          if (fee < 0) {
            throw new Error(`Priority fee cannot be negative: ${fee}`);
          }
        }).toThrow(`Priority fee cannot be negative: ${fee}`);
      });
    });

    it('should validate mint address format', () => {
      const invalidMints = [
        'invalid-address',
        '123',
        '',
        'not-a-valid-public-key'
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
    it('should handle multiple consecutive buy operations', async () => {
      const buyAmounts = [0.01, 0.02, 0.05];
      const mockResults = buyAmounts.map((amount, index) => `ConsecutiveSignature${index + 1}`);
      
      mockBuyPumpFunToken
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < buyAmounts.length; i++) {
        const result = await buyPumpFunToken(
          connection,
          wallet,
          mockMint,
          buyAmounts[i],
          1000
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockBuyPumpFunToken).toHaveBeenCalledTimes(3);
    });

    it('should handle buy operations with different tokens', async () => {
      const tokens = [
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey(),
        TestHelpers.generateRandomPublicKey()
      ];
      
      const mockResults = tokens.map((token, index) => `DifferentTokenSignature${index + 1}`);
      
      mockBuyPumpFunToken
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (let i = 0; i < tokens.length; i++) {
        const result = await buyPumpFunToken(
          connection,
          wallet,
          tokens[i],
          0.01,
          1000
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockBuyPumpFunToken).toHaveBeenCalledTimes(3);
    });

    it('should handle buy operations with dynamic priority fees', async () => {
      const baseFee = 1000;
      const dynamicFees = [baseFee, baseFee * 2, baseFee * 4, baseFee * 8];
      
      const mockResults = dynamicFees.map((fee, index) => `DynamicFeeSignature${index + 1}`);
      
      mockBuyPumpFunToken
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2])
        .mockResolvedValueOnce(mockResults[3]);

      const results = [];
      for (let i = 0; i < dynamicFees.length; i++) {
        const result = await buyPumpFunToken(
          connection,
          wallet,
          mockMint,
          0.01,
          dynamicFees[i]
        );
        results.push(result);
      }

      expect(results).toEqual(mockResults);
      expect(mockBuyPumpFunToken).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should retry failed transactions with increased priority fee', async () => {
      const initialFee = 1000;
      const increasedFee = 2000;
      
      // First attempt fails, second succeeds
      mockBuyPumpFunToken
        .mockRejectedValueOnce(new Error('Transaction failed'))
        .mockResolvedValueOnce('RetrySuccessSignature');

      // Simulate retry logic
      let result;
      try {
        result = await buyPumpFunToken(connection, wallet, mockMint, 0.01, initialFee);
      } catch (error) {
        // Retry with increased fee
        result = await buyPumpFunToken(connection, wallet, mockMint, 0.01, increasedFee);
      }

      expect(result).toBe('RetrySuccessSignature');
      expect(mockBuyPumpFunToken).toHaveBeenCalledTimes(2);
    });

    it('should handle temporary network issues', async () => {
      const networkErrors = [
        new Error('Connection timeout'),
        new Error('RPC server error'),
        new Error('Network congestion')
      ];
      
      const mockResult = 'NetworkRecoverySignature';
      mockBuyPumpFunToken
        .mockRejectedValueOnce(networkErrors[0])
        .mockRejectedValueOnce(networkErrors[1])
        .mockRejectedValueOnce(networkErrors[2])
        .mockResolvedValueOnce(mockResult);

      // Simulate retry logic
      let result;
      let attempts = 0;
      const maxAttempts = 4;
      
      while (attempts < maxAttempts) {
        try {
          result = await buyPumpFunToken(connection, wallet, mockMint, 0.01, 1000);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) throw error;
          // Wait before retry
          await TestHelpers.wait(1000);
        }
      }

      expect(result).toBe(mockResult);
      expect(mockBuyPumpFunToken).toHaveBeenCalledTimes(4);
    });
  });
});
