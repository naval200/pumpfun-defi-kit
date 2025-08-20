import { Connection, PublicKey } from '@solana/web3.js';
import { checkGraduationStatus, getGraduationAnalysis } from '../../src/utils/graduation-utils';
import { TestHelpers } from './test-helpers';

describe('Graduation Utils', () => {
  let mockConnection: jest.Mocked<Connection>;
  let mockTokenMint: PublicKey;

  beforeEach(() => {
    mockConnection = {
      getAccountInfo: jest.fn(),
      getProgramAccounts: jest.fn(),
    } as any;
    
    mockTokenMint = TestHelpers.generateRandomPublicKey();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkGraduationStatus', () => {
    it('should handle connection errors gracefully', async () => {
      // Mock connection error
      mockConnection.getAccountInfo.mockRejectedValue(new Error('Connection failed'));

      const result = await checkGraduationStatus(mockConnection, mockTokenMint);
      expect(result).toBe(false);
    });

    it('should return false for new tokens without pools', async () => {
      // Mock no AMM pools and no bonding curve
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const result = await checkGraduationStatus(mockConnection, mockTokenMint);
      expect(result).toBe(false);
    });
  });

  describe('getGraduationAnalysis', () => {
    it('should handle connection errors gracefully', async () => {
      // Mock connection error by making getAccountInfo throw synchronously
      mockConnection.getAccountInfo.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const analysis = await getGraduationAnalysis(mockConnection, mockTokenMint);
      
      expect(analysis.isGraduated).toBe(false);
      expect(analysis.hasAMMPools).toBe(false);
      expect(analysis.hasSufficientLiquidity).toBe(false);
      expect(analysis.bondingCurveActive).toBe(false);
      // The error is caught at a lower level, so we get the default analysis
      expect(analysis.graduationReason).toContain('no AMM pools and inactive bonding curve');
    });

    it('should return analysis for tokens without pools', async () => {
      // Mock no AMM pools and no bonding curve
      mockConnection.getAccountInfo.mockResolvedValue(null);

      const analysis = await getGraduationAnalysis(mockConnection, mockTokenMint);
      
      expect(analysis.isGraduated).toBe(false);
      expect(analysis.hasAMMPools).toBe(false);
      expect(analysis.hasSufficientLiquidity).toBe(false);
      expect(analysis.bondingCurveActive).toBe(false);
      expect(analysis.graduationReason).toContain('no AMM pools and inactive bonding curve');
    });

    it('should return analysis for tokens with bonding curve only', async () => {
      // Mock bonding curve active
      mockConnection.getAccountInfo.mockResolvedValue({
        owner: new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
        data: Buffer.from('some data'),
        lamports: 1000000,
        executable: false,
        rentEpoch: 0,
      });

      const analysis = await getGraduationAnalysis(mockConnection, mockTokenMint);
      
      expect(analysis.isGraduated).toBe(false);
      expect(analysis.hasAMMPools).toBe(false);
      expect(analysis.hasSufficientLiquidity).toBe(false);
      expect(analysis.bondingCurveActive).toBe(true);
      expect(analysis.graduationReason).toContain('bonding curve trading only');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty bonding curve account data', async () => {
      // Mock bonding curve account with empty data
      mockConnection.getAccountInfo.mockResolvedValue({
        owner: new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
        data: Buffer.alloc(0), // Empty data
        lamports: 1000000,
        executable: false,
        rentEpoch: 0,
      });

      const result = await checkGraduationStatus(mockConnection, mockTokenMint);
      expect(result).toBe(false);
    });

    it('should handle bonding curve account owned by wrong program', async () => {
      // Mock bonding curve account owned by wrong program
      mockConnection.getAccountInfo.mockResolvedValue({
        owner: TestHelpers.generateRandomPublicKey(),
        data: Buffer.from('some data'),
        lamports: 1000000,
        executable: false,
        rentEpoch: 0,
      });

      const result = await checkGraduationStatus(mockConnection, mockTokenMint);
      expect(result).toBe(false);
    });
  });
});
