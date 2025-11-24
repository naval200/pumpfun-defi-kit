import IDL_DEVNET from './pump_program_devnet.json';
import IDL_MAINNET from './pump_program_mainnet.json';
import type { Idl } from '@coral-xyz/anchor';

/**
 * Load the appropriate IDL based on network
 * @param network - Network name (devnet, mainnet-beta, mainnet) or undefined
 * @returns The IDL object for the specified network
 */
export function loadIDL(network?: string): Idl {
  if (!network) {
    // Default to devnet if no network specified
    return IDL_DEVNET as Idl;
  }

  const normalizedNetwork = network.toLowerCase();
  
  if (normalizedNetwork === 'mainnet' || normalizedNetwork === 'mainnet-beta') {
    return IDL_MAINNET as Idl;
  }
  
  // Default to devnet for devnet, testnet, or unknown networks
  return IDL_DEVNET as Idl;
}

/**
 * Get IDL file path based on network (for dynamic imports if needed)
 * @param network - Network name (devnet, mainnet-beta, mainnet) or undefined
 * @returns Path to the IDL file
 */
export function getIDLPath(network?: string): string {
  if (!network) {
    return './pump_program_devnet.json';
  }

  const normalizedNetwork = network.toLowerCase();
  
  if (normalizedNetwork === 'mainnet' || normalizedNetwork === 'mainnet-beta') {
    return './pump_program_mainnet.json';
  }
  
  return './pump_program_devnet.json';
}

