/**
 * Simple debug flag system to control logging verbosity
 */
export declare const DEBUG_MODE: boolean;
/**
 * Debug logger - only logs when DEBUG_MODE is true
 */
export declare function debugLog(...args: unknown[]): void;
/**
 * Always log important information (success, errors, warnings)
 */
export declare function log(...args: unknown[]): void;
/**
 * Log errors (always shown)
 */
export declare function logError(...args: unknown[]): void;
/**
 * Log warnings (always shown)
 */
export declare function logWarning(...args: unknown[]): void;
/**
 * Log success messages (always shown)
 */
export declare function logSuccess(...args: unknown[]): void;
/**
 * Log transaction signatures (always shown)
 */
export declare function logSignature(signature: string, operation: string): void;
//# sourceMappingURL=debug.d.ts.map