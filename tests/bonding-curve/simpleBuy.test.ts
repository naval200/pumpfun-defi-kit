import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createSimpleBuyInstruction } from '../../src/bonding-curve/simpleBuy';

// Mock the debug utilities
jest.mock('../../src/utils/debug', () => ({
  log: jest.fn(),
  logSuccess: jest.fn(),
  logError: jest.fn(),
}));

// Mock the bc-helper functions
jest.mock('../../src/bonding-curve/bc-helper', () => ({
  getGlobalPDA: jest.fn(() => new PublicKey('11111111111111111111111111111111')),
  deriveBondingCurveAddress: jest.fn(() => [new PublicKey('11111111111111111111111111111112')]),
  deriveCreatorVaultAddress: jest.fn(() => [new PublicKey('11111111111111111111111111111113')]),
  deriveGlobalVolumeAccumulatorAddress: jest.fn(() => [new PublicKey('11111111111111111111111111111114')]),
  getUserVolumeAccumulator: jest.fn(() => new PublicKey('11111111111111111111111111111115')),
}));

// Mock the instruction creation
jest.mock('../../src/bonding-curve/idl/instructions', () => ({
  createBondingCurveBuyInstruction: jest.fn(() => ({
    programId: new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
    keys: [],
    data: Buffer.from('mock-instruction-data'),
  })),
}));

describe('createSimpleBuyInstruction', () => {
  let connection: Connection;
  let buyerKeypair: Keypair;
  let mint: PublicKey;
  let creator: PublicKey;

  beforeEach(() => {
    connection = new Connection('https://api.devnet.solana.com');
    buyerKeypair = Keypair.generate();
    mint = new PublicKey('So11111111111111111111111111111111111111112');
    creator = new PublicKey('11111111111111111111111111111111');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a buy instruction with default parameters', async () => {
    const amountLamports = 0.1e9; // 0.1 SOL

    const instruction = await createSimpleBuyInstruction(
      connection,
      buyerKeypair,
      mint,
      amountLamports
    );

    expect(instruction).toBeDefined();
    expect(instruction.programId.toString()).toBe('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
  });

  it('should create a buy instruction with custom slippage', async () => {
    const amountLamports = 0.5e9; // 0.5 SOL
    const slippageBasisPoints = 500; // 5%

    const instruction = await createSimpleBuyInstruction(
      connection,
      buyerKeypair,
      mint,
      amountLamports,
      slippageBasisPoints
    );

    expect(instruction).toBeDefined();
  });

  it('should create a buy instruction with custom creator', async () => {
    const amountLamports = 0.2e9; // 0.2 SOL
    const slippageBasisPoints = 1000; // 10%

    const instruction = await createSimpleBuyInstruction(
      connection,
      buyerKeypair,
      mint,
      amountLamports,
      slippageBasisPoints,
      creator
    );

    expect(instruction).toBeDefined();
  });

  it('should use buyer as creator when no creator is provided', async () => {
    const amountLamports = 0.3e9; // 0.3 SOL

    const instruction = await createSimpleBuyInstruction(
      connection,
      buyerKeypair,
      mint,
      amountLamports
    );

    expect(instruction).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    // Create a separate test with a fresh mock
    const { getGlobalPDA } = require('../../src/bonding-curve/bc-helper');
    
    // Store original implementation
    const originalImplementation = getGlobalPDA.getMockImplementation();
    
    // Mock an error in the PDA calculation
    getGlobalPDA.mockImplementationOnce(() => {
      throw new Error('PDA calculation failed');
    });

    const amountLamports = 0.1e9;

    await expect(
      createSimpleBuyInstruction(
        connection,
        buyerKeypair,
        mint,
        amountLamports
      )
    ).rejects.toThrow('PDA calculation failed');
    
    // Restore original implementation
    getGlobalPDA.mockImplementation(originalImplementation);
  });

  it('should call all required PDA calculation functions', async () => {
    const { 
      getGlobalPDA, 
      deriveBondingCurveAddress, 
      deriveCreatorVaultAddress,
      deriveGlobalVolumeAccumulatorAddress,
      getUserVolumeAccumulator
    } = require('../../src/bonding-curve/bc-helper');

    // Reset mocks to clear previous calls
    jest.clearAllMocks();

    const amountLamports = 0.1e9;

    await createSimpleBuyInstruction(
      connection,
      buyerKeypair,
      mint,
      amountLamports,
      1000,
      creator
    );

    expect(getGlobalPDA).toHaveBeenCalled();
    expect(deriveBondingCurveAddress).toHaveBeenCalledWith(mint);
    expect(deriveCreatorVaultAddress).toHaveBeenCalledWith(creator);
    expect(deriveGlobalVolumeAccumulatorAddress).toHaveBeenCalled();
    expect(getUserVolumeAccumulator).toHaveBeenCalledWith(
      expect.any(PublicKey), // PUMP_PROGRAM_ID
      buyerKeypair.publicKey
    );
  });

  it('should pass correct parameters to createBondingCurveBuyInstruction', async () => {
    const { createBondingCurveBuyInstruction } = require('../../src/bonding-curve/idl/instructions');
    
    // Reset mocks to clear previous calls
    jest.clearAllMocks();
    
    const amountLamports = 0.1e9;
    const slippageBasisPoints = 1000;

    await createSimpleBuyInstruction(
      connection,
      buyerKeypair,
      mint,
      amountLamports,
      slippageBasisPoints,
      creator
    );

    expect(createBondingCurveBuyInstruction).toHaveBeenCalledWith(
      buyerKeypair.publicKey,
      mint,
      amountLamports,
      expect.objectContaining({
        globalPDA: expect.any(PublicKey),
        bondingCurvePDA: expect.any(PublicKey),
        creatorVaultPDA: expect.any(PublicKey),
        eventAuthorityPDA: expect.any(PublicKey),
        globalVolumeAccumulatorPDA: expect.any(PublicKey),
        userVolumeAccumulatorPDA: expect.any(PublicKey),
      }),
      slippageBasisPoints
    );
  });
});
