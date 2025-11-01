import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { 
  getTokenToSolConversionRate, 
  getSolToTokenConversionRate 
} from '../../src/utils/conversion-rate';
import { TestHelpers } from './test-helpers';
import { findPoolsForToken } from '../../src/amm/amm';

// Mock dependencies
jest.mock('../../src/amm/amm');
jest.mock('@pump-fun/pump-swap-sdk', () => {
  const actualSdk = jest.requireActual('@pump-fun/pump-swap-sdk');
  return {
    ...actualSdk,
    PumpAmmSdk: jest.fn().mockImplementation(() => ({
      swapSolanaState: jest.fn(),
      swapAutocompleteQuoteFromBase: jest.fn(),
      swapAutocompleteBaseFromQuote: jest.fn(),
    })),
  };
});

const mockFindPoolsForToken = findPoolsForToken as jest.MockedFunction<typeof findPoolsForToken>;

describe('Token to SOL Conversion Rate', () => {
  let connection: Connection;
  let mockTokenMint: PublicKey;
  let mockPoolKey: PublicKey;
  let mockPumpAmmSdk: any;

  beforeEach(() => {
    connection = TestHelpers.getConnection();
    mockTokenMint = TestHelpers.generateRandomPublicKey();
    mockPoolKey = TestHelpers.generateRandomPublicKey();

    // Mock PumpAmmSdk
    const { PumpAmmSdk } = require('@pump-fun/pump-swap-sdk');
    mockPumpAmmSdk = {
      swapSolanaState: jest.fn(),
      swapAutocompleteQuoteFromBase: jest.fn(),
      swapAutocompleteBaseFromQuote: jest.fn(),
    };
    (PumpAmmSdk as jest.Mock).mockImplementation(() => mockPumpAmmSdk);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    TestHelpers.cleanup();
  });

  describe('getTokenToSolConversionRate', () => {
    it('should get conversion rate successfully for 1 token', async () => {
      const tokenAmount = 1;
      const tokenDecimals = 6;
      const slippage = 0.005;
      const expectedSolAmount = 0.0001; // 0.0001 SOL for 1 token
      const expectedSolLamports = expectedSolAmount * LAMPORTS_PER_SOL;

      // Mock pool finding
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);

      // Mock swap state
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000), // 0.1 SOL
      });

      // Mock autocomplete quote calculation
      mockPumpAmmSdk.swapAutocompleteQuoteFromBase.mockResolvedValue(
        new BN(Math.floor(expectedSolLamports))
      );

      const rate = await getTokenToSolConversionRate(
        connection,
        mockTokenMint,
        tokenAmount,
        tokenDecimals,
        slippage
      );

      expect(rate).not.toBeNull();
      expect(rate).toBeCloseTo(expectedSolAmount, 6);
      expect(mockFindPoolsForToken).toHaveBeenCalledWith(connection, mockTokenMint);
      expect(mockPumpAmmSdk.swapAutocompleteQuoteFromBase).toHaveBeenCalled();
    });

    it('should get conversion rate for custom token amount', async () => {
      const tokenAmount = 100; // 100 tokens
      const tokenDecimals = 6;
      const expectedSolAmount = 0.01; // 0.01 SOL for 100 tokens
      const expectedSolLamports = expectedSolAmount * LAMPORTS_PER_SOL;

      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });
      mockPumpAmmSdk.swapAutocompleteQuoteFromBase.mockResolvedValue(
        new BN(Math.floor(expectedSolLamports))
      );

      const rate = await getTokenToSolConversionRate(
        connection,
        mockTokenMint,
        tokenAmount,
        tokenDecimals
      );

      expect(rate).not.toBeNull();
      expect(rate).toBeCloseTo(expectedSolAmount / tokenAmount, 6);
    });

    it('should handle tokens with 0 decimals', async () => {
      const tokenAmount = 10;
      const tokenDecimals = 0; // No decimals
      const expectedSolAmount = 0.001;
      const expectedSolLamports = expectedSolAmount * LAMPORTS_PER_SOL;

      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });
      mockPumpAmmSdk.swapAutocompleteQuoteFromBase.mockResolvedValue(
        new BN(Math.floor(expectedSolLamports))
      );

      const rate = await getTokenToSolConversionRate(
        connection,
        mockTokenMint,
        tokenAmount,
        tokenDecimals
      );

      expect(rate).not.toBeNull();
    });

    it('should use provided pool key when available', async () => {
      const expectedSolAmount = 0.0001;
      const expectedSolLamports = expectedSolAmount * LAMPORTS_PER_SOL;

      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });
      mockPumpAmmSdk.swapAutocompleteQuoteFromBase.mockResolvedValue(
        new BN(Math.floor(expectedSolLamports))
      );

      const rate = await getTokenToSolConversionRate(
        connection,
        mockTokenMint,
        1,
        6,
        0.005,
        mockPoolKey // Provided pool key
      );

      expect(rate).not.toBeNull();
      expect(mockFindPoolsForToken).not.toHaveBeenCalled(); // Should not search for pools
    });

    it('should return null when no pools found', async () => {
      mockFindPoolsForToken.mockResolvedValue([]);

      const rate = await getTokenToSolConversionRate(
        connection,
        mockTokenMint,
        1,
        6
      );

      expect(rate).toBeNull();
    });

    it('should return null on SDK error', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockRejectedValue(new Error('SDK error'));

      const rate = await getTokenToSolConversionRate(
        connection,
        mockTokenMint,
        1,
        6
      );

      expect(rate).toBeNull();
    });

    it('should return null when calculation returns negative value', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });
      mockPumpAmmSdk.swapAutocompleteQuoteFromBase.mockResolvedValue(new BN(-1));

      const rate = await getTokenToSolConversionRate(
        connection,
        mockTokenMint,
        1,
        6
      );

      expect(rate).toBeNull();
    });

    it('should handle different slippage values', async () => {
      const slippageValues = [0.001, 0.005, 0.01, 0.05];
      const expectedSolAmount = 0.0001;
      const expectedSolLamports = expectedSolAmount * LAMPORTS_PER_SOL;

      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });

      for (const slippage of slippageValues) {
        mockPumpAmmSdk.swapAutocompleteQuoteFromBase.mockResolvedValue(
          new BN(Math.floor(expectedSolLamports))
        );

        const rate = await getTokenToSolConversionRate(
          connection,
          mockTokenMint,
          1,
          6,
          slippage
        );

        expect(rate).not.toBeNull();
      }
    });
  });

  describe('getSolToTokenConversionRate', () => {
    it('should get conversion rate successfully for 1 SOL', async () => {
      const solAmount = 1;
      const slippage = 0.005;
      const expectedTokenAmount = 1000000; // 1M tokens for 1 SOL (with 6 decimals)

      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });
      mockPumpAmmSdk.swapAutocompleteBaseFromQuote.mockResolvedValue(
        new BN(expectedTokenAmount)
      );

      const rate = await getSolToTokenConversionRate(
        connection,
        mockTokenMint,
        solAmount,
        slippage
      );

      expect(rate).not.toBeNull();
      expect(rate).toBe(expectedTokenAmount);
      expect(mockPumpAmmSdk.swapAutocompleteBaseFromQuote).toHaveBeenCalled();
    });

    it('should get conversion rate for custom SOL amount', async () => {
      const solAmount = 0.1; // 0.1 SOL
      const expectedTokenAmount = 100000; // 100k tokens

      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });
      mockPumpAmmSdk.swapAutocompleteBaseFromQuote.mockResolvedValue(
        new BN(expectedTokenAmount)
      );

      const rate = await getSolToTokenConversionRate(
        connection,
        mockTokenMint,
        solAmount
      );

      expect(rate).not.toBeNull();
      expect(rate).toBe(expectedTokenAmount / solAmount);
    });

    it('should use provided pool key when available', async () => {
      const expectedTokenAmount = 1000000;

      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });
      mockPumpAmmSdk.swapAutocompleteBaseFromQuote.mockResolvedValue(
        new BN(expectedTokenAmount)
      );

      const rate = await getSolToTokenConversionRate(
        connection,
        mockTokenMint,
        1,
        0.005,
        mockPoolKey
      );

      expect(rate).not.toBeNull();
      expect(mockFindPoolsForToken).not.toHaveBeenCalled();
    });

    it('should return null when no pools found', async () => {
      mockFindPoolsForToken.mockResolvedValue([]);

      const rate = await getSolToTokenConversionRate(connection, mockTokenMint);

      expect(rate).toBeNull();
    });

    it('should return null on SDK error', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockRejectedValue(new Error('SDK error'));

      const rate = await getSolToTokenConversionRate(connection, mockTokenMint);

      expect(rate).toBeNull();
    });

    it('should return null when calculation returns negative value', async () => {
      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });
      mockPumpAmmSdk.swapAutocompleteBaseFromQuote.mockResolvedValue(new BN(-1));

      const rate = await getSolToTokenConversionRate(connection, mockTokenMint);

      expect(rate).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should calculate consistent rates for round trip (token->SOL->token)', async () => {
      const tokenAmount = 100;
      const tokenDecimals = 6;
      const solForTokens = 0.01; // SOL received for 100 tokens
      const tokensForSol = 100; // Tokens received for 0.01 SOL

      mockFindPoolsForToken.mockResolvedValue([mockPoolKey]);
      mockPumpAmmSdk.swapSolanaState.mockResolvedValue({
        poolBaseAmount: new BN(1000000),
        poolQuoteAmount: new BN(100000000),
      });

      // Mock token to SOL conversion
      mockPumpAmmSdk.swapAutocompleteQuoteFromBase.mockResolvedValue(
        new BN(Math.floor(solForTokens * LAMPORTS_PER_SOL))
      );

      const tokenToSolRate = await getTokenToSolConversionRate(
        connection,
        mockTokenMint,
        tokenAmount,
        tokenDecimals
      );

      // Mock SOL to token conversion
      mockPumpAmmSdk.swapAutocompleteBaseFromQuote.mockResolvedValue(
        new BN(tokensForSol * Math.pow(10, tokenDecimals))
      );

      const solToTokenRate = await getSolToTokenConversionRate(
        connection,
        mockTokenMint,
        solForTokens
      );

      expect(tokenToSolRate).not.toBeNull();
      expect(solToTokenRate).not.toBeNull();
    });
  });
});

