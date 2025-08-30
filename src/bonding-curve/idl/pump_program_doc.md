# Pump Program Documentation

This document provides a simplified, LLM‑friendly reference of the Pump program defined in the provided JSON. It includes Accounts, Errors, Events, and Instructions in a clean, readable format.

---

## Program Address
```
6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
```

---

## Accounts
- **BondingCurve** — Program Derived Address for bonding curve state.
- **Global** — Global state account.
- **GlobalVolumeAccumulator** — Tracks global trading volume.
- **UserVolumeAccumulator** — Tracks per-user trading volume.

---

## Errors
- **6000 NotAuthorized** — The account is not authorized.
- **6001 AlreadyInitialized** — Program already initialized.
- **6002 TooMuchSolRequired** — Slippage: too much SOL required for buy.
- **6003 TooLittleSolReceived** — Slippage: too little SOL received for sell.
- **6004 MintDoesNotMatchBondingCurve** — Invalid mint.
- **6005 BondingCurveComplete** — Liquidity migrated to Raydium.
- **6006 BondingCurveNotComplete** — Curve not finished.
- **6007 NotInitialized** — Program not initialized.
- **6008 WithdrawTooFrequent** — Withdrawal attempted too often.
- **6009 NewSizeShouldBeGreaterThanCurrentSize** — Invalid resize.
- **6010 AccountTypeNotSupported** — Unsupported account type.
- **6011 InitialRealTokenReservesShouldBeLessThanTokenTotalSupply**.
- **6012 InitialVirtualTokenReservesShouldBeGreaterThanInitialRealTokenReserves**.
- **6013 FeeBasisPointsGreaterThanMaximum**.
- **6014 AllZerosWithdrawAuthority** — Cannot be system program.
- **6015 PoolMigrationFeeShouldBeLessThanFinalRealSolReserves**.
- **6016 PoolMigrationFeeShouldBeGreaterThanCreatorFeePlusMaxMigrateFees**.
- **6017 DisabledWithdraw**.
- **6018 DisabledMigrate**.
- **6019 InvalidCreator**.
- **6020 BuyZeroAmount**.
- **6021 NotEnoughTokensToBuy**.
- **6022 SellZeroAmount**.
- **6023 NotEnoughTokensToSell**.
- **6024 Overflow**.
- **6025 Truncation**.
- **6026 DivisionByZero**.
- **6027 NotEnoughRemainingAccounts**.
- **6028 AllFeeRecipientsShouldBeNonZero**.
- **6029 UnsortedNotUniqueFeeRecipients**.
- **6030 CreatorShouldNotBeZero**.
- **6031 StartTimeInThePast**.
- **6032 EndTimeInThePast**.
- **6033 EndTimeBeforeStartTime**.
- **6034 TimeRangeTooLarge**.
- **6035 EndTimeBeforeCurrentDay**.
- **6036 SupplyUpdateForFinishedRange**.
- **6037 DayIndexAfterEndIndex**.
- **6038 DayInActiveRange**.
- **6039 InvalidIncentiveMint**.

---

## Events
- **AdminSetCreatorEvent**
- **AdminSetIdlAuthorityEvent**
- **AdminUpdateTokenIncentivesEvent**
- **ClaimTokenIncentivesEvent**
- **CloseUserVolumeAccumulatorEvent**
- **CollectCreatorFeeEvent**
- **CompleteEvent**
- **CompletePumpAmmMigrationEvent**
- **CreateEvent**
- **ExtendAccountEvent**
- **InitUserVolumeAccumulatorEvent**
- **SetCreatorEvent**
- **SetMetaplexCreatorEvent**
- **SetParamsEvent**
- **SyncUserVolumeAccumulatorEvent**
- **TradeEvent**
- **UpdateGlobalAuthorityEvent**

---

## Instructions (Simplified)

### Admin
- **admin_set_creator(creator: pubkey)** — Override bonding curve creator.
- **admin_set_idl_authority(idl_authority: pubkey)** — Set IDL authority.
- **admin_update_token_incentives(start, end, seconds_in_day, day_num, supply_per_day)** — Update token incentives.

### User Trading
- **buy(amount, max_sol_cost, track_volume)** — Buy tokens from bonding curve.
- **sell(amount, min_sol_output)** — Sell tokens back into curve.
- **migrate()** — Migrate liquidity to Pump AMM once curve completes.
- **claim_token_incentives()** — Claim rewards.

### Creator
- **collect_creator_fee()** — Collect accumulated creator fees.
- **set_creator(creator: pubkey)** — Set creator authority.
- **set_metaplex_creator()** — Sync creator from metadata.

### Account Management
- **create(name, symbol, uri, creator)** — Create a new token + bonding curve.
- **extend_account()** — Extend size of program-owned account.
- **init_user_volume_accumulator()** — Initialize per-user volume.
- **close_user_volume_accumulator()** — Close user volume account.
- **sync_user_volume_accumulator()** — Sync user volume data.

### Program Lifecycle
- **initialize()** — Initialize program.
- **set_params(...)** — Set global state params (reserves, fees, authorities).

---

## Notes
- Uses PDAs (Program Derived Addresses) for accounts like bonding curve, creator vault, metadata, etc.
- Integrates with Metaplex metadata and Pump AMM for migration.
- Incentives tracked via global and user accumulators.

