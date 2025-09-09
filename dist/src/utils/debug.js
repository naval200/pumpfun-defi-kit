"use strict";
/**
 * Simple debug flag system to control logging verbosity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEBUG_MODE = void 0;
exports.debugLog = debugLog;
exports.log = log;
exports.logError = logError;
exports.logWarning = logWarning;
exports.logSuccess = logSuccess;
exports.logSignature = logSignature;
// Set this to true to enable verbose logging, false for minimal logging
// Can be enabled from client code: process.env.DEBUG_PUMPFUN_DEFI_SDK = 'true'
exports.DEBUG_MODE = process.env.DEBUG_PUMPFUN_DEFI_SDK === 'true' || process.env.DEBUG_PUMPFUN_DEFI_SDK === '1';
/**
 * Debug logger - only logs when DEBUG_MODE is true
 */
function debugLog(...args) {
    if (exports.DEBUG_MODE) {
        console.log(...args);
    }
}
/**
 * Always log important information (success, errors, warnings)
 */
function log(...args) {
    console.log(...args);
}
/**
 * Log errors (always shown)
 */
function logError(...args) {
    console.error(...args);
}
/**
 * Log warnings (always shown)
 */
function logWarning(...args) {
    console.warn(...args);
}
/**
 * Log success messages (always shown)
 */
function logSuccess(...args) {
    console.log('✅', ...args);
}
/**
 * Log transaction signatures (always shown)
 */
function logSignature(signature, operation) {
    console.log(`📝 ${operation} successful! Signature: ${signature}`);
}
//# sourceMappingURL=debug.js.map