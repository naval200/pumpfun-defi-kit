"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOSE_USER_VOLUME_ACCUMULATOR_EVENT_DISCRIMINATOR = exports.CLAIM_TOKEN_INCENTIVES_EVENT_DISCRIMINATOR = exports.ADMIN_UPDATE_TOKEN_INCENTIVES_EVENT_DISCRIMINATOR = exports.ADMIN_SET_IDL_AUTHORITY_EVENT_DISCRIMINATOR = exports.ADMIN_SET_CREATOR_EVENT_DISCRIMINATOR = exports.USER_VOLUME_ACCUMULATOR_ACCOUNT_DISCRIMINATOR = exports.GLOBAL_VOLUME_ACCUMULATOR_ACCOUNT_DISCRIMINATOR = exports.GLOBAL_ACCOUNT_DISCRIMINATOR = exports.BONDING_CURVE_ACCOUNT_DISCRIMINATOR = exports.UPDATE_GLOBAL_AUTHORITY_INSTRUCTION_DISCRIMINATOR = exports.SYNC_USER_VOLUME_ACCUMULATOR_INSTRUCTION_DISCRIMINATOR = exports.MIGRATE_INSTRUCTION_DISCRIMINATOR = exports.INIT_USER_VOLUME_ACCUMULATOR_INSTRUCTION_DISCRIMINATOR = exports.EXTEND_ACCOUNT_INSTRUCTION_DISCRIMINATOR = exports.COMPLETE_INSTRUCTION_DISCRIMINATOR = exports.COLLECT_CREATOR_FEE_INSTRUCTION_DISCRIMINATOR = exports.CLOSE_USER_VOLUME_ACCUMULATOR_INSTRUCTION_DISCRIMINATOR = exports.CLAIM_TOKEN_INCENTIVES_INSTRUCTION_DISCRIMINATOR = exports.ADMIN_UPDATE_TOKEN_INCENTIVES_INSTRUCTION_DISCRIMINATOR = exports.ADMIN_SET_IDL_AUTHORITY_INSTRUCTION_DISCRIMINATOR = exports.SET_METAPLEX_CREATOR_INSTRUCTION_DISCRIMINATOR = exports.SET_CREATOR_INSTRUCTION_DISCRIMINATOR = exports.ADMIN_SET_CREATOR_INSTRUCTION_DISCRIMINATOR = exports.SET_PARAMS_INSTRUCTION_DISCRIMINATOR = exports.INITIALIZE_INSTRUCTION_DISCRIMINATOR = exports.CREATE_INSTRUCTION_DISCRIMINATOR = exports.SELL_INSTRUCTION_DISCRIMINATOR = exports.BUY_INSTRUCTION_DISCRIMINATOR = exports.GLOBAL_CONFIG_SEED = exports.POOL_LP_MINT_SEED = exports.POOL_AUTHORITY_SEED = exports.POOL_SEED = exports.METADATA_SEED = exports.MINT_AUTHORITY_SEED = exports.EVENT_AUTHORITY_SEED = exports.USER_VOLUME_ACCUMULATOR_SEED = exports.GLOBAL_VOLUME_ACCUMULATOR_SEED = exports.CREATOR_VAULT_SEED = exports.BONDING_CURVE_SEED = exports.GLOBAL_SEED = exports.WSOL_MINT = exports.PUMP_AMM_PROGRAM_ID = exports.TOKEN_2022_PROGRAM_ID = exports.METAPLEX_TOKEN_METADATA_PROGRAM_ID = exports.RENT_SYSVAR = exports.COMPUTE_BUDGET_PROGRAM_ID = exports.SYSTEM_PROGRAM_ID = exports.ASSOCIATED_TOKEN_PROGRAM_ID = exports.TOKEN_PROGRAM_ID = exports.PUMP_PROGRAM_ID = void 0;
exports.COMPUTE_BUDGET_INSTRUCTIONS = exports.GLOBAL_VOLUME_ACCUMULATOR = exports.EVENT_AUTHORITY = exports.CREATOR_VAULT = exports.FEE_RECIPIENT = exports.GLOBAL_ACCOUNT = exports.ERROR_CODES = exports.UPDATE_GLOBAL_AUTHORITY_EVENT_DISCRIMINATOR = exports.TRADE_EVENT_DISCRIMINATOR = exports.SYNC_USER_VOLUME_ACCUMULATOR_EVENT_DISCRIMINATOR = exports.SET_PARAMS_EVENT_DISCRIMINATOR = exports.SET_METAPLEX_CREATOR_EVENT_DISCRIMINATOR = exports.SET_CREATOR_EVENT_DISCRIMINATOR = exports.INIT_USER_VOLUME_ACCUMULATOR_EVENT_DISCRIMINATOR = exports.EXTEND_ACCOUNT_EVENT_DISCRIMINATOR = exports.CREATE_EVENT_DISCRIMINATOR = exports.COMPLETE_PUMP_AMM_MIGRATION_EVENT_DISCRIMINATOR = exports.COMPLETE_EVENT_DISCRIMINATOR = exports.COLLECT_CREATOR_FEE_EVENT_DISCRIMINATOR = void 0;
const web3_js_1 = require("@solana/web3.js");
// ============================================================================
// PUMP.FUN PROGRAM CONSTANTS
// ============================================================================
// Program ID
exports.PUMP_PROGRAM_ID = new web3_js_1.PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
// ============================================================================
// SYSTEM PROGRAM IDs
// ============================================================================
exports.TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
exports.ASSOCIATED_TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
exports.SYSTEM_PROGRAM_ID = new web3_js_1.PublicKey('11111111111111111111111111111111');
exports.COMPUTE_BUDGET_PROGRAM_ID = new web3_js_1.PublicKey('ComputeBudget111111111111111111111111111111');
exports.RENT_SYSVAR = new web3_js_1.PublicKey('SysvarRent111111111111111111111111111111111');
// ============================================================================
// METAPLEX TOKEN METADATA PROGRAM
// ============================================================================
exports.METAPLEX_TOKEN_METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
// ============================================================================
// TOKEN-2022 PROGRAM
// ============================================================================
exports.TOKEN_2022_PROGRAM_ID = new web3_js_1.PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
// ============================================================================
// PUMP AMM PROGRAM
// ============================================================================
exports.PUMP_AMM_PROGRAM_ID = new web3_js_1.PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA');
// ============================================================================
// WRAPPED SOL MINT
// ============================================================================
exports.WSOL_MINT = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112');
// ============================================================================
// PDA SEED CONSTANTS (from IDL)
// ============================================================================
// Global account seed
exports.GLOBAL_SEED = Buffer.from('global');
// Bonding curve seed
exports.BONDING_CURVE_SEED = Buffer.from('bonding-curve');
// Creator vault seed
exports.CREATOR_VAULT_SEED = Buffer.from('creator-vault');
// Global volume accumulator seed
exports.GLOBAL_VOLUME_ACCUMULATOR_SEED = Buffer.from('global_volume_accumulator');
// User volume accumulator seed
exports.USER_VOLUME_ACCUMULATOR_SEED = Buffer.from('user_volume_accumulator');
// Event authority seed
exports.EVENT_AUTHORITY_SEED = Buffer.from('__event_authority');
// Mint authority seed
exports.MINT_AUTHORITY_SEED = Buffer.from('mint-authority');
// Metadata seed
exports.METADATA_SEED = Buffer.from('metadata');
// Pool seed
exports.POOL_SEED = Buffer.from('pool');
// Pool authority seed
exports.POOL_AUTHORITY_SEED = Buffer.from('pool-authority');
// Pool LP mint seed
exports.POOL_LP_MINT_SEED = Buffer.from('pool_lp_mint');
// Global config seed
exports.GLOBAL_CONFIG_SEED = Buffer.from('global_config');
// ============================================================================
// INSTRUCTION DISCRIMINATORS (from IDL)
// ============================================================================
// Buy instruction discriminator
exports.BUY_INSTRUCTION_DISCRIMINATOR = [102, 6, 61, 18, 1, 218, 235, 234];
// Sell instruction discriminator
exports.SELL_INSTRUCTION_DISCRIMINATOR = [51, 230, 133, 164, 1, 127, 131, 173];
// Create instruction discriminator
exports.CREATE_INSTRUCTION_DISCRIMINATOR = [24, 30, 200, 40, 5, 28, 7, 119];
// Initialize instruction discriminator
exports.INITIALIZE_INSTRUCTION_DISCRIMINATOR = [175, 175, 109, 31, 13, 152, 155, 237];
// Set params instruction discriminator
exports.SET_PARAMS_INSTRUCTION_DISCRIMINATOR = [27, 234, 178, 52, 147, 2, 187, 141];
// Admin set creator instruction discriminator
exports.ADMIN_SET_CREATOR_INSTRUCTION_DISCRIMINATOR = [69, 25, 171, 142, 57, 239, 13, 4];
// Set creator instruction discriminator
exports.SET_CREATOR_INSTRUCTION_DISCRIMINATOR = [254, 148, 255, 112, 207, 142, 170, 165];
// Set metaplex creator instruction discriminator
exports.SET_METAPLEX_CREATOR_INSTRUCTION_DISCRIMINATOR = [138, 96, 174, 217, 48, 85, 197, 246];
// Admin set IDL authority instruction discriminator
exports.ADMIN_SET_IDL_AUTHORITY_INSTRUCTION_DISCRIMINATOR = [
    8, 217, 96, 231, 144, 104, 192, 5,
];
// Admin update token incentives instruction discriminator
exports.ADMIN_UPDATE_TOKEN_INCENTIVES_INSTRUCTION_DISCRIMINATOR = [
    209, 11, 115, 87, 213, 23, 124, 204,
];
// Claim token incentives instruction discriminator
exports.CLAIM_TOKEN_INCENTIVES_INSTRUCTION_DISCRIMINATOR = [16, 4, 71, 28, 204, 1, 40, 27];
// Close user volume accumulator instruction discriminator
exports.CLOSE_USER_VOLUME_ACCUMULATOR_INSTRUCTION_DISCRIMINATOR = [
    249, 69, 164, 218, 150, 103, 84, 138,
];
// Collect creator fee instruction discriminator
exports.COLLECT_CREATOR_FEE_INSTRUCTION_DISCRIMINATOR = [20, 22, 86, 123, 198, 28, 219, 132];
// Complete instruction discriminator
exports.COMPLETE_INSTRUCTION_DISCRIMINATOR = [155, 234, 231, 146, 236, 158, 162, 30];
// Extend account instruction discriminator
exports.EXTEND_ACCOUNT_INSTRUCTION_DISCRIMINATOR = [234, 102, 194, 203, 150, 72, 62, 229];
// Init user volume accumulator instruction discriminator
exports.INIT_USER_VOLUME_ACCUMULATOR_INSTRUCTION_DISCRIMINATOR = [
    94, 6, 202, 115, 255, 96, 232, 183,
];
// Migrate instruction discriminator
exports.MIGRATE_INSTRUCTION_DISCRIMINATOR = [155, 234, 231, 146, 236, 158, 162, 30];
// Sync user volume accumulator instruction discriminator
exports.SYNC_USER_VOLUME_ACCUMULATOR_INSTRUCTION_DISCRIMINATOR = [
    86, 31, 192, 87, 163, 87, 79, 238,
];
// Update global authority instruction discriminator
exports.UPDATE_GLOBAL_AUTHORITY_INSTRUCTION_DISCRIMINATOR = [
    227, 181, 74, 196, 208, 21, 97, 213,
];
// ============================================================================
// ACCOUNT DISCRIMINATORS (from IDL)
// ============================================================================
// BondingCurve account discriminator
exports.BONDING_CURVE_ACCOUNT_DISCRIMINATOR = [23, 183, 248, 55, 96, 216, 172, 96];
// Global account discriminator
exports.GLOBAL_ACCOUNT_DISCRIMINATOR = [167, 232, 232, 177, 200, 108, 114, 127];
// GlobalVolumeAccumulator account discriminator
exports.GLOBAL_VOLUME_ACCUMULATOR_ACCOUNT_DISCRIMINATOR = [
    202, 42, 246, 43, 142, 190, 30, 255,
];
// UserVolumeAccumulator account discriminator
exports.USER_VOLUME_ACCUMULATOR_ACCOUNT_DISCRIMINATOR = [86, 255, 112, 14, 102, 53, 154, 250];
// ============================================================================
// EVENT DISCRIMINATORS (from IDL)
// ============================================================================
// AdminSetCreatorEvent discriminator
exports.ADMIN_SET_CREATOR_EVENT_DISCRIMINATOR = [64, 69, 192, 104, 29, 30, 25, 107];
// AdminSetIdlAuthorityEvent discriminator
exports.ADMIN_SET_IDL_AUTHORITY_EVENT_DISCRIMINATOR = [245, 59, 70, 34, 75, 185, 109, 92];
// AdminUpdateTokenIncentivesEvent discriminator
exports.ADMIN_UPDATE_TOKEN_INCENTIVES_EVENT_DISCRIMINATOR = [
    147, 250, 108, 120, 247, 29, 67, 222,
];
// ClaimTokenIncentivesEvent discriminator
exports.CLAIM_TOKEN_INCENTIVES_EVENT_DISCRIMINATOR = [79, 172, 246, 49, 205, 91, 206, 232];
// CloseUserVolumeAccumulatorEvent discriminator
exports.CLOSE_USER_VOLUME_ACCUMULATOR_EVENT_DISCRIMINATOR = [
    146, 159, 189, 172, 146, 88, 56, 244,
];
// CollectCreatorFeeEvent discriminator
exports.COLLECT_CREATOR_FEE_EVENT_DISCRIMINATOR = [122, 2, 127, 1, 14, 191, 12, 175];
// CompleteEvent discriminator
exports.COMPLETE_EVENT_DISCRIMINATOR = [95, 114, 97, 156, 212, 46, 152, 8];
// CompletePumpAmmMigrationEvent discriminator
exports.COMPLETE_PUMP_AMM_MIGRATION_EVENT_DISCRIMINATOR = [
    189, 233, 93, 185, 92, 148, 234, 148,
];
// CreateEvent discriminator
exports.CREATE_EVENT_DISCRIMINATOR = [27, 114, 169, 77, 222, 235, 99, 118];
// ExtendAccountEvent discriminator
exports.EXTEND_ACCOUNT_EVENT_DISCRIMINATOR = [97, 97, 215, 144, 93, 146, 22, 124];
// InitUserVolumeAccumulatorEvent discriminator
exports.INIT_USER_VOLUME_ACCUMULATOR_EVENT_DISCRIMINATOR = [
    134, 36, 13, 72, 232, 101, 130, 216,
];
// SetCreatorEvent discriminator
exports.SET_CREATOR_EVENT_DISCRIMINATOR = [237, 52, 123, 37, 245, 251, 72, 210];
// SetMetaplexCreatorEvent discriminator
exports.SET_METAPLEX_CREATOR_EVENT_DISCRIMINATOR = [142, 203, 6, 32, 127, 105, 191, 162];
// SetParamsEvent discriminator
exports.SET_PARAMS_EVENT_DISCRIMINATOR = [223, 195, 159, 246, 62, 48, 143, 131];
// SyncUserVolumeAccumulatorEvent discriminator
exports.SYNC_USER_VOLUME_ACCUMULATOR_EVENT_DISCRIMINATOR = [
    197, 122, 167, 124, 116, 81, 91, 255,
];
// TradeEvent discriminator
exports.TRADE_EVENT_DISCRIMINATOR = [189, 219, 127, 211, 78, 230, 97, 238];
// UpdateGlobalAuthorityEvent discriminator
exports.UPDATE_GLOBAL_AUTHORITY_EVENT_DISCRIMINATOR = [182, 195, 137, 42, 35, 206, 207, 247];
// ============================================================================
// ERROR CODES (from IDL)
// ============================================================================
exports.ERROR_CODES = {
    NOT_AUTHORIZED: 6000,
    ALREADY_INITIALIZED: 6001,
    TOO_MUCH_SOL_REQUIRED: 6002,
    TOO_LITTLE_SOL_RECEIVED: 6003,
    MINT_DOES_NOT_MATCH_BONDING_CURVE: 6004,
    BONDING_CURVE_COMPLETE: 6005,
    BONDING_CURVE_NOT_COMPLETE: 6006,
    NOT_INITIALIZED: 6007,
    WITHDRAW_TOO_FREQUENT: 6008,
    NEW_SIZE_SHOULD_BE_GREATER_THAN_CURRENT_SIZE: 6009,
    ACCOUNT_TYPE_NOT_SUPPORTED: 6010,
    INITIAL_REAL_TOKEN_RESERVES_SHOULD_BE_LESS_THAN_TOKEN_TOTAL_SUPPLY: 6011,
    INITIAL_VIRTUAL_TOKEN_RESERVES_SHOULD_BE_GREATER_THAN_INITIAL_REAL_TOKEN_RESERVES: 6012,
    FEE_BASIS_POINTS_GREATER_THAN_MAXIMUM: 6013,
    ALL_ZEROS_WITHDRAW_AUTHORITY: 6014,
    POOL_MIGRATION_FEE_SHOULD_BE_LESS_THAN_FINAL_REAL_SOL_RESERVES: 6015,
    POOL_MIGRATION_FEE_SHOULD_BE_GREATER_THAN_CREATOR_FEE_PLUS_MAX_MIGRATE_FEES: 6016,
    DISABLED_WITHDRAW: 6017,
    DISABLED_MIGRATE: 6018,
    INVALID_CREATOR: 6019,
    BUY_ZERO_AMOUNT: 6020,
    NOT_ENOUGH_TOKENS_TO_BUY: 6021,
    SELL_ZERO_AMOUNT: 6022,
    NOT_ENOUGH_TOKENS_TO_SELL: 6023,
    OVERFLOW: 6024,
    TRUNCATION: 6025,
    DIVISION_BY_ZERO: 6026,
    NOT_ENOUGH_REMAINING_ACCOUNTS: 6027,
    ALL_FEE_RECIPIENTS_SHOULD_BE_NON_ZERO: 6028,
    UNSORTED_OR_NOT_UNIQUE_FEE_RECIPIENTS: 6029,
    CREATOR_SHOULD_NOT_BE_ZERO: 6030,
    START_TIME_IN_THE_PAST: 6031,
    END_TIME_IN_THE_PAST: 6032,
    END_TIME_BEFORE_START_TIME: 6033,
    TIME_RANGE_TOO_LARGE: 6034,
    END_TIME_BEFORE_CURRENT_DAY: 6035,
    SUPPLY_UPDATE_FOR_FINISHED_RANGE: 6036,
    DAY_INDEX_AFTER_END_INDEX: 6037,
    DAY_IN_ACTIVE_RANGE: 6038,
    INVALID_INCENTIVE_MINT: 6039,
};
// ============================================================================
// LEGACY CONSTANTS (kept for backward compatibility)
// ============================================================================
// These are hardcoded addresses that were working - consider deriving them instead
exports.GLOBAL_ACCOUNT = new web3_js_1.PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
exports.FEE_RECIPIENT = new web3_js_1.PublicKey('68yFSZxzLWJXkxxRGydZ63C6mHx1NLEDWmwN9Lb5yySg');
exports.CREATOR_VAULT = new web3_js_1.PublicKey('72ZnbPGyFHR1Bz1pmVK4cgWNRUT9pCcapNiiUcWKWsDg');
exports.EVENT_AUTHORITY = new web3_js_1.PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');
exports.GLOBAL_VOLUME_ACCUMULATOR = 'Hq2wp8uJ9jCPsYgNHex8RtqdvMPfVGoYwjvF1ATiwn2Y';
// ============================================================================
// COMPUTE BUDGET CONSTANTS
// ============================================================================
exports.COMPUTE_BUDGET_INSTRUCTIONS = {
    SET_COMPUTE_UNIT_LIMIT: 0x02,
    SET_COMPUTE_UNIT_PRICE: 0x03,
};
//# sourceMappingURL=constants.js.map