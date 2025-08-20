// Test setup file for Jest
import { jest } from '@jest/globals';

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
  
  // Increase timeout for Solana operations
  jest.setTimeout(30000);
});

afterAll(() => {
  // Cleanup after all tests
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
