import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { sendToken, sendTokenWithAccountCreation, canReceiveTokens } from '../src/sendToken';
import { createConnection } from '../src/utils/connection';
import { getWallet } from '../src/utils/connection';
import { getAccount, getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

// Mock the connection and wallet for testing
jest.mock('../src/utils/connection');
jest.mock('@solana/spl-token');
jest.mock('../src/createAccount');
jest.mock('../src/utils/transaction');

// Import mocked modules
import { createAssociatedTokenAccount } from '../src/createAccount';
import { sendAndConfirmTransaction } from '../src/utils/transaction';

describe('sendToken', () => {
  let mockConnection: jest.Mocked<Connection>;
  let mockWallet: Keypair;
  let mockRecipient: PublicKey;
  let mockMint: PublicKey;

  beforeEach(() => {
    // Create mock objects
    mockConnection = {
      rpcEndpoint: 'https://api.devnet.solana.com',
      getLatestBlockhash: jest.fn(),
      sendTransaction: jest.fn(),
      confirmTransaction: jest.fn(),
      sendRawTransaction: jest.fn(),
    } as any;

    mockWallet = Keypair.generate();
    mockRecipient = Keypair.generate().publicKey;
    mockMint = Keypair.generate().publicKey;

    // Mock the utility functions
    (createConnection as jest.Mock).mockReturnValue(mockConnection);
    (getWallet as jest.Mock).mockReturnValue(mockWallet);
    
    // Reset all mocks to default state
    (getAccount as jest.Mock).mockReset();
    (getAssociatedTokenAddress as jest.Mock).mockReset();
    (createTransferInstruction as jest.Mock).mockReset();
    (createAssociatedTokenAccount as jest.Mock).mockReset();
    (sendAndConfirmTransaction as jest.Mock).mockReset();
    
    // Set default mock implementations
    (getAccount as jest.Mock).mockImplementation((connection, address) => {
      // Default mock - will be overridden in specific tests
      throw new Error('Account not found');
    });
    (getAssociatedTokenAddress as jest.Mock).mockResolvedValue(Keypair.generate().publicKey);
    (createTransferInstruction as jest.Mock).mockReturnValue({} as any);

    // Mock createAssociatedTokenAccount
    (createAssociatedTokenAccount as jest.Mock).mockResolvedValue({
      success: true,
      account: Keypair.generate().publicKey,
    });

    // Mock sendAndConfirmTransaction - default to success
    (sendAndConfirmTransaction as jest.Mock).mockResolvedValue({
      success: true,
      signature: 'test-signature',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canReceiveTokens', () => {
    it('should return true when recipient can receive tokens', async () => {
      // Mock successful account check
      (getAccount as jest.Mock).mockResolvedValue({
        amount: BigInt(1000),
        owner: mockRecipient,
        mint: mockMint,
      });

      const result = await canReceiveTokens(mockConnection, mockRecipient, mockMint);

      expect(result.canReceive).toBe(true);
      expect(result.hasAccount).toBe(true);
      expect(result.accountAddress).toBeDefined();
    });

    it('should return true when recipient can receive tokens but account does not exist', async () => {
      // Mock account not found
      (getAccount as jest.Mock).mockRejectedValue(new Error('Account not found'));

      const result = await canReceiveTokens(mockConnection, mockRecipient, mockMint);

      expect(result.canReceive).toBe(true);
      expect(result.hasAccount).toBe(false);
      expect(result.accountAddress).toBeDefined();
    });
  });

  describe('sendToken', () => {
    it('should send tokens successfully when recipient account exists', async () => {
      // Mock successful operations
      (getAccount as jest.Mock)
        .mockResolvedValueOnce({ amount: BigInt(1000) }) // Sender account
        .mockResolvedValueOnce({ amount: BigInt(500) }); // Recipient account

      const result = await sendToken(
        mockConnection,
        mockWallet,
        mockRecipient,
        mockMint,
        BigInt(100),
        false, // allowOwnerOffCurve
        false  // createRecipientAccount
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBe('test-signature');
    });

    it('should create recipient account and send tokens when account does not exist', async () => {
      // Mock sender account exists, recipient account does not
      (getAccount as jest.Mock)
        .mockResolvedValueOnce({ amount: BigInt(1000) }) // Sender account
        .mockRejectedValueOnce(new Error('Account not found')) // Recipient account
        .mockResolvedValueOnce({ amount: BigInt(100) }) // After creation
        .mockResolvedValueOnce({ amount: BigInt(100) }); // After transfer

      const result = await sendToken(
        mockConnection,
        mockWallet,
        mockRecipient,
        mockMint,
        BigInt(100),
        false, // allowOwnerOffCurve
        true   // createRecipientAccount
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBe('test-signature');
    });

    it('should fail when sender has insufficient balance', async () => {
      // Mock sender account with insufficient balance
      (getAccount as jest.Mock).mockResolvedValue({
        amount: BigInt(50), // Less than requested amount
        owner: mockWallet.publicKey,
        mint: mockMint,
      });

      const result = await sendToken(
        mockConnection,
        mockWallet,
        mockRecipient,
        mockMint,
        BigInt(100),
        false, // allowOwnerOffCurve
        false  // createRecipientAccount
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
      
      // Verify that sendAndConfirmTransaction was not called
      expect(sendAndConfirmTransaction).not.toHaveBeenCalled();
    });

    it('should fail when sender account does not exist', async () => {
      // Mock sender account not found
      (getAccount as jest.Mock).mockRejectedValue(new Error('Account not found'));

      const result = await sendToken(
        mockConnection,
        mockWallet,
        mockRecipient,
        mockMint,
        BigInt(100),
        false, // allowOwnerOffCurve
        false  // createRecipientAccount
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sender token account not found');
    });
  });

  describe('sendTokenWithAccountCreation', () => {
    it('should always create recipient account if needed', async () => {
      // Mock successful operations
      (getAccount as jest.Mock)
        .mockResolvedValueOnce({ amount: BigInt(1000) }) // Sender account
        .mockRejectedValueOnce(new Error('Account not found')) // Recipient account
        .mockResolvedValueOnce({ amount: BigInt(100) }) // After creation
        .mockResolvedValueOnce({ amount: BigInt(100) }); // After transfer

      const result = await sendTokenWithAccountCreation(
        mockConnection,
        mockWallet,
        mockRecipient,
        mockMint,
        BigInt(100)
      );

      expect(result.success).toBe(true);
      expect(result.signature).toBe('test-signature');
    });
  });

  describe('sendTokenToExistingAccount', () => {
    it('should fail when recipient account does not exist', async () => {
      // Mock sender account exists, recipient account does not
      (getAccount as jest.Mock)
        .mockResolvedValueOnce({ amount: BigInt(1000) }) // Sender account
        .mockRejectedValueOnce(new Error('Account not found')); // Recipient account

      // Mock getAssociatedTokenAddress to throw an error for this test
      (getAssociatedTokenAddress as jest.Mock).mockRejectedValueOnce(new Error('Invalid recipient'));

      const result = await sendToken(
        mockConnection,
        mockWallet,
        mockRecipient,
        mockMint,
        BigInt(100),
        false, // allowOwnerOffCurve
        false  // createRecipientAccount
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token transfer error: Invalid recipient');
      
      // Verify that sendAndConfirmTransaction was not called
      expect(sendAndConfirmTransaction).not.toHaveBeenCalled();
    });
  });
});
