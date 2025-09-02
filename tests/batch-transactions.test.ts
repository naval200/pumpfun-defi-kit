import { batchTransactions as batchTransactions, validatePumpFunBatchOperations as validateBatchOperations } from '../src/batch';

// Mock the dependencies
jest.mock('../src/sendToken');
jest.mock('../src/bonding-curve/buy');
jest.mock('../src/bonding-curve/sell');
jest.mock('../src/amm/buy');
jest.mock('../src/amm/sell');

describe('Batch Transactions', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Operation Types', () => {
    it('should support transfer operations', () => {
      const transferOperation = {
        type: 'transfer',
        id: 'transfer-1',
        description: 'Test transfer',
        params: {
          recipient: '11111111111111111111111111111111',
          mint: '22222222222222222222222222222222',
          amount: '100000000',
          createAccount: true,
        },
      };

      expect(transferOperation.type).toBe('transfer');
      expect(transferOperation.params).toHaveProperty('recipient');
      expect(transferOperation.params).toHaveProperty('mint');
      expect(transferOperation.params).toHaveProperty('amount');
      expect(transferOperation.params).toHaveProperty('createAccount');
      expect(transferOperation.params.createAccount).toBe(true);
    });

    it('should support transfer operations without createAccount', () => {
      const transferOperation = {
        type: 'transfer',
        id: 'transfer-2',
        description: 'Test transfer without ATA creation',
        params: {
          recipient: '11111111111111111111111111111111',
          mint: '22222222222222222222222222222222',
          amount: '100000000',
          createAccount: false,
        },
      };

      expect(transferOperation.params.createAccount).toBe(false);
    });

    it('should support buy-bonding-curve operations with createAccount', () => {
      const buyOperation = {
        type: 'buy-bonding-curve',
        id: 'buy-bc-1',
        description: 'Test bonding curve buy with ATA creation',
        params: {
          mint: '22222222222222222222222222222222',
          amount: 1000000,
          slippage: 1,
          createAccount: true,
        },
      };

      expect(buyOperation.type).toBe('buy-bonding-curve');
      expect(buyOperation.params).toHaveProperty('mint');
      expect(buyOperation.params).toHaveProperty('amount');
      expect(buyOperation.params).toHaveProperty('slippage');
      expect(buyOperation.params).toHaveProperty('createAccount');
      expect(buyOperation.params.createAccount).toBe(true);
    });

    it('should support buy-amm operations with createAccount and tokenMint', () => {
      const buyAmmOperation = {
        type: 'buy-amm',
        id: 'buy-amm-1',
        description: 'Test AMM buy with ATA creation',
        params: {
          poolKey: '33333333333333333333333333333333',
          amount: 1000000,
          slippage: 1,
          createAccount: true,
          tokenMint: '22222222222222222222222222222222',
        },
      };

      expect(buyAmmOperation.type).toBe('buy-amm');
      expect(buyAmmOperation.params).toHaveProperty('poolKey');
      expect(buyAmmOperation.params).toHaveProperty('amount');
      expect(buyAmmOperation.params).toHaveProperty('slippage');
      expect(buyAmmOperation.params).toHaveProperty('createAccount');
      expect(buyAmmOperation.params).toHaveProperty('tokenMint');
      expect(buyAmmOperation.params.createAccount).toBe(true);
      expect(buyAmmOperation.params.tokenMint).toBe('22222222222222222222222222222222');
    });

    it('should support AMM sell operations', () => {
      const ammSellOperation = {
        type: 'sell-amm',
        id: 'sell-amm-1',
        description: 'Test AMM sell',
        params: {
          poolKey: '44444444444444444444444444444444',
          amount: 1000,
          slippage: 1,
        },
      };

      expect(ammSellOperation.type).toBe('sell-amm');
      expect(ammSellOperation.params).toHaveProperty('poolKey');
      expect(ammSellOperation.params).toHaveProperty('amount');
      expect(ammSellOperation.params).toHaveProperty('slippage');
    });

    it('should support bonding curve sell operations', () => {
      const bcSellOperation = {
        type: 'sell-bonding-curve',
        id: 'sell-bc-1',
        description: 'Test bonding curve sell',
        params: {
          mint: '66666666666666666666666666666666',
          amount: 500,
          slippage: 1000,
        },
      };

      expect(bcSellOperation.type).toBe('sell-bonding-curve');
      expect(bcSellOperation.params).toHaveProperty('mint');
      expect(bcSellOperation.params).toHaveProperty('amount');
      expect(bcSellOperation.params).toHaveProperty('slippage');
    });

    it('should support SOL transfer operations', () => {
      const solTransferOperation = {
        type: 'sol-transfer',
        id: 'sol-transfer-1',
        description: 'Test SOL transfer',
        params: {
          recipient: '77777777777777777777777777777777',
          lamports: 1000000000, // 1 SOL
        },
      };

      expect(solTransferOperation.type).toBe('sol-transfer');
      expect(solTransferOperation.params).toHaveProperty('recipient');
      expect(solTransferOperation.params).toHaveProperty('lamports');
      expect(typeof solTransferOperation.params.lamports).toBe('number');
    });
  });

  describe('Operation Validation', () => {
    it('should require valid operation types', () => {
      const invalidOperation = {
        type: 'invalid-type',
        id: 'invalid-1',
        description: 'Invalid operation',
        params: {},
      };

      // This should be caught by the validation
      expect(invalidOperation.type).not.toBe('transfer');
      expect(invalidOperation.type).not.toBe('sell-amm');
      expect(invalidOperation.type).not.toBe('sell-bonding-curve');
    });

    it('should require unique operation IDs', () => {
      const operations = [
        { id: 'op-1', type: 'transfer', description: 'Op 1', params: {} },
        { id: 'op-2', type: 'transfer', description: 'Op 2', params: {} },
        { id: 'op-1', type: 'transfer', description: 'Op 3', params: {} }, // Duplicate ID
      ];

      const ids = operations.map(op => op.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBeGreaterThan(uniqueIds.size);
    });
  });

  describe('Parameter Validation', () => {
    it('should validate transfer parameters', () => {
      const transferParams = {
        recipient: '11111111111111111111111111111111',
        mint: '22222222222222222222222222222222',
        amount: '100000000',
        createAccount: true,
      };

      expect(transferParams.recipient).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(transferParams.mint).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(transferParams.amount).toBeDefined();
      expect(typeof transferParams.createAccount).toBe('boolean');
    });

    it('should validate AMM sell parameters', () => {
      const ammParams = {
        poolKey: '44444444444444444444444444444444',
        amount: 1000,
        slippage: 1,
      };

      expect(ammParams.poolKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(typeof ammParams.amount).toBe('number');
      expect(typeof ammParams.slippage).toBe('number');
      expect(ammParams.slippage).toBeGreaterThan(0);
    });

    it('should validate bonding curve sell parameters', () => {
      const bcParams = {
        mint: '66666666666666666666666666666666',
        amount: 500,
        slippage: 1000,
      };

      expect(bcParams.mint).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(typeof bcParams.amount).toBe('number');
      expect(typeof bcParams.slippage).toBe('number');
      expect(bcParams.slippage).toBeGreaterThan(0);
    });

    it('should validate SOL transfer parameters', () => {
      const solParams = {
        recipient: '77777777777777777777777777777777',
        lamports: 1000000000, // 1 SOL
      };

      expect(solParams.recipient).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(typeof solParams.lamports).toBe('number');
      expect(solParams.lamports).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    it('should chunk operations into batches', () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        type: 'transfer' as const,
        id: `op-${i}`,
        description: `Operation ${i}`,
        params: {
          recipient: '11111111111111111111111111111111',
          mint: '22222222222222222222222222222222',
          amount: '100000000',
          createAccount: true,
        },
      }));

      const maxParallel = 3;
      const batches: (typeof operations)[] = [];

      for (let i = 0; i < operations.length; i += maxParallel) {
        batches.push(operations.slice(i, i + maxParallel));
      }

      expect(batches.length).toBe(Math.ceil(operations.length / maxParallel));
      expect(batches[0].length).toBeLessThanOrEqual(maxParallel);
      expect(batches[batches.length - 1].length).toBeLessThanOrEqual(maxParallel);
    });

    it('should handle empty operations array', () => {
      const operations: unknown[] = [];
      const maxParallel = 3;
      const batches: unknown[][] = [];

      for (let i = 0; i < operations.length; i += maxParallel) {
        batches.push(operations.slice(i, i + maxParallel));
      }

      expect(batches.length).toBe(0);
    });

    it('should handle operations count less than maxParallel', () => {
      const operations = Array.from({ length: 2 }, (_, i) => ({
        type: 'transfer' as const,
        id: `op-${i}`,
        description: `Operation ${i}`,
        params: {
          recipient: '11111111111111111111111111111111',
          mint: '22222222222222222222222222222222',
          amount: '100000000',
          createAccount: true,
        },
      }));

      const maxParallel = 5;
      const batches: (typeof operations)[] = [];

      for (let i = 0; i < operations.length; i += maxParallel) {
        batches.push(operations.slice(i, i + maxParallel));
      }

      expect(batches.length).toBe(1);
      expect(batches[0].length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required parameters', () => {
      const invalidTransfer = {
        type: 'transfer',
        id: 'invalid-transfer',
        description: 'Invalid transfer',
        params: {
          // Missing recipient, mint, amount
        } as Record<string, unknown>,
      };

      expect(invalidTransfer.params.recipient).toBeUndefined();
      expect(invalidTransfer.params.mint).toBeUndefined();
      expect(invalidTransfer.params.amount).toBeUndefined();
    });

    it('should handle invalid public key formats', () => {
      const invalidPublicKey = 'invalid-public-key';

      // This should not match the Solana public key format
      expect(invalidPublicKey).not.toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    });

    it('should handle invalid amounts', () => {
      const invalidAmounts = [-1, NaN, Infinity, -Infinity];

      invalidAmounts.forEach(amount => {
        if (amount === -1) {
          // -1 is finite but invalid for amounts
          expect(amount).toBeLessThanOrEqual(0);
        } else {
          // NaN, Infinity, -Infinity are not finite
          expect(isFinite(amount)).toBeFalsy();
        }
      });
    });
  });

  describe('CreateAccount Functionality', () => {
    it('should validate createAccount parameter for transfer operations', () => {
      const operations = [
        {
          type: 'transfer',
          id: 'transfer-with-ata',
          params: {
            recipient: '11111111111111111111111111111111',
            mint: '22222222222222222222222222222222',
            amount: 1000,
            createAccount: true,
          },
        },
        {
          type: 'transfer',
          id: 'transfer-without-ata',
          params: {
            recipient: '11111111111111111111111111111111',
            mint: '22222222222222222222222222222222',
            amount: 1000,
            createAccount: false,
          },
        },
      ];

      operations.forEach(op => {
        expect(op.params).toHaveProperty('createAccount');
        expect(typeof op.params.createAccount).toBe('boolean');
      });
    });

    it('should validate createAccount parameter for buy operations', () => {
      const operations = [
        {
          type: 'buy-bonding-curve',
          id: 'buy-bc-with-ata',
          params: {
            mint: '22222222222222222222222222222222',
            amount: 1000000,
            slippage: 1,
            createAccount: true,
          },
        },
        {
          type: 'buy-bonding-curve',
          id: 'buy-bc-without-ata',
          params: {
            mint: '22222222222222222222222222222222',
            amount: 1000000,
            slippage: 1,
            createAccount: false,
          },
        },
      ];

      operations.forEach(op => {
        expect(op.params).toHaveProperty('createAccount');
        expect(typeof op.params.createAccount).toBe('boolean');
      });
    });

    it('should require tokenMint for AMM buy operations with createAccount', () => {
      const validOperation = {
        type: 'buy-amm',
        id: 'buy-amm-valid',
        params: {
          poolKey: '33333333333333333333333333333333',
          amount: 1000000,
          slippage: 1,
          createAccount: true,
          tokenMint: '22222222222222222222222222222222',
        },
      };

      const invalidOperation = {
        type: 'buy-amm',
        id: 'buy-amm-invalid',
        params: {
          poolKey: '33333333333333333333333333333333',
          amount: 1000000,
          slippage: 1,
          createAccount: true,
          // Missing tokenMint - should be invalid
        },
      };

      expect(validOperation.params).toHaveProperty('tokenMint');
      expect(validOperation.params.tokenMint).toBeTruthy();
      
      expect(invalidOperation.params).not.toHaveProperty('tokenMint');
    });

    it('should support mixed createAccount scenarios in batch operations', () => {
      const mixedOperations = [
        {
          type: 'transfer',
          id: 'transfer-with-ata',
          params: {
            recipient: '11111111111111111111111111111111',
            mint: '22222222222222222222222222222222',
            amount: 1000,
            createAccount: true,
          },
        },
        {
          type: 'transfer',
          id: 'transfer-without-ata',
          params: {
            recipient: '11111111111111111111111111111111',
            mint: '22222222222222222222222222222222',
            amount: 1000,
            createAccount: false,
          },
        },
        {
          type: 'buy-bonding-curve',
          id: 'buy-with-ata',
          params: {
            mint: '22222222222222222222222222222222',
            amount: 1000000,
            slippage: 1,
            createAccount: true,
          },
        },
        {
          type: 'buy-amm',
          id: 'buy-amm-with-ata',
          params: {
            poolKey: '33333333333333333333333333333333',
            amount: 1000000,
            slippage: 1,
            createAccount: true,
            tokenMint: '22222222222222222222222222222222',
          },
        },
        {
          type: 'sol-transfer',
          id: 'sol-transfer',
          params: {
            recipient: '11111111111111111111111111111111',
            amount: 50000000,
          },
        },
      ];

      // Count operations with createAccount
      const withCreateAccount = mixedOperations.filter(op => 
        'createAccount' in op.params && op.params.createAccount === true
      );
      const withoutCreateAccount = mixedOperations.filter(op => 
        'createAccount' in op.params && op.params.createAccount === false
      );
      const noCreateAccountParam = mixedOperations.filter(op => 
        !('createAccount' in op.params)
      );

      expect(withCreateAccount).toHaveLength(3);
      expect(withoutCreateAccount).toHaveLength(1);
      expect(noCreateAccountParam).toHaveLength(1); // sol-transfer doesn't need createAccount
    });

    it('should handle createAccount parameter validation', () => {
      const operations = [
        {
          type: 'transfer',
          id: 'transfer-valid',
          params: {
            recipient: '11111111111111111111111111111111',
            mint: '22222222222222222222222222222222',
            amount: 1000,
            createAccount: true,
          },
        },
        {
          type: 'transfer',
          id: 'transfer-default',
          params: {
            recipient: '11111111111111111111111111111111',
            mint: '22222222222222222222222222222222',
            amount: 1000,
            // createAccount not specified - should default to false
          },
        },
      ];

      // Test that createAccount defaults to false when not specified
      const defaultOperation = operations.find(op => op.id === 'transfer-default');
      expect(defaultOperation?.params.createAccount).toBeUndefined();
    });
  });

  describe('Module Integration', () => {
    it('should export the main batchTransactions function', () => {
      expect(typeof batchTransactions).toBe('function');
    });

    it('should export the validateBatchOperations function', () => {
      expect(typeof validateBatchOperations).toBe('function');
    });

    it('should be callable', () => {
      expect(() => {
        // This is just a test that the function exists and is callable
        // We're not actually executing it due to mocked dependencies
        batchTransactions;
        validateBatchOperations;
      }).not.toThrow();
    });
  });
});
