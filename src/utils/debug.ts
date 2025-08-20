/**
 * Simple debug flag system to control logging verbosity
 */

// Set this to true to enable verbose logging, false for minimal logging
// Can be enabled from client code: process.env.DEBUG_PUMPFUN_DEFI_SDK = 'true'
export const DEBUG_MODE =
  process.env.DEBUG_PUMPFUN_DEFI_SDK === 'true' || process.env.DEBUG_PUMPFUN_DEFI_SDK === '1';

/**
 * Debug logger - only logs when DEBUG_MODE is true
 */
export function debugLog(...args: unknown[]): void {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

/**
 * Always log important information (success, errors, warnings)
 */
export function log(...args: unknown[]): void {
  console.log(...args);
}

/**
 * Log errors (always shown)
 */
export function logError(...args: unknown[]): void {
  console.error(...args);
}

/**
 * Log warnings (always shown)
 */
export function logWarning(...args: unknown[]): void {
  console.warn(...args);
}

/**
 * Log success messages (always shown)
 */
export function logSuccess(...args: unknown[]): void {
  console.log('✅', ...args);
}

/**
 * Log transaction signatures (always shown)
 */
export function logSignature(signature: string, operation: string): void {
  console.log(`📝 ${operation} successful! Signature: ${signature}`);
}
