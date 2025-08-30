import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test helper utilities for PumpFun testing
 */
export class TestHelpers {
  private static connection: Connection | null = null;
  private static testWallet: Keypair | null = null;

  /**
   * Get or create a connection to Solana devnet
   */
  static getConnection(): Connection {
    if (!this.connection) {
      this.connection = new Connection(
        process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
        "confirmed"
      );
    }
    return this.connection;
  }

  /**
   * Load test wallet from file or generate a new one for testing
   */
  static loadTestWallet(): Keypair {
    if (!this.testWallet) {
      try {
        // First try to load from file if it exists
        const walletPath = path.join(process.cwd(), 'wallets', 'creator-wallet.json');
        if (fs.existsSync(walletPath)) {
          const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
          this.testWallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
        } else {
          // Generate a new wallet for testing if file doesn't exist
          console.log('⚠️  Test wallet file not found, generating new wallet for testing');
          this.testWallet = Keypair.generate();
        }
      } catch (error) {
        // Fallback to generated wallet if loading fails
        console.log('⚠️  Failed to load test wallet, generating new wallet for testing');
        this.testWallet = Keypair.generate();
      }
    }
    return this.testWallet;
  }

  /**
   * Check wallet balance and ensure minimum required
   */
  static async checkWalletBalance(minimumSOL: number = 0.1): Promise<number> {
    const connection = this.getConnection();
    const wallet = this.loadTestWallet();
    
    const balance = await connection.getBalance(wallet.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    if (balanceSOL < minimumSOL) {
      throw new Error(`Insufficient wallet balance: ${balanceSOL.toFixed(4)} SOL. Need at least ${minimumSOL} SOL.`);
    }
    
    return balanceSOL;
  }

  /**
   * Create a mock token configuration for testing
   */
  static createMockTokenConfig(prefix: string = 'TEST') {
    const timestamp = Date.now();
    return {
      name: `${prefix}-TOKEN-${timestamp}`,
      symbol: `${prefix}${timestamp.toString().slice(-4)}`,
      description: `Test token created at ${new Date(timestamp).toISOString()}`,
      imagePath: "random.png",
      initialBuyAmount: 0
    };
  }

  /**
   * Generate a random PublicKey for testing
   */
  static generateRandomPublicKey(): PublicKey {
    return Keypair.generate().publicKey;
  }

  /**
   * Wait for a specified number of milliseconds
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mock file system operations for testing
   */
  static mockFileSystem() {
    const mockFs = {
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
      mkdirSync: jest.fn()
    };
    
    jest.doMock('fs', () => mockFs);
    return mockFs;
  }

  /**
   * Create a mock token info object
   */
  static createMockTokenInfo(mint?: string) {
    return {
      mint: mint || this.generateRandomPublicKey().toString(),
      name: "TEST-TOKEN",
      symbol: "TEST",
      bondingCurve: this.generateRandomPublicKey().toString(),
      createdAt: new Date().toISOString(),
      poolKey: this.generateRandomPublicKey().toString()
    };
  }

  /**
   * Validate transaction result structure
   */
  static validateTransactionResult(result: any): boolean {
    return result && 
           typeof result === 'object' && 
           (result.success === true || result.signature);
  }

  /**
   * Clean up test resources
   */
  static cleanup() {
    this.connection = null;
    this.testWallet = null;
  }
}
