# Debug Scripts for PumpFun Token Issues

This folder contains debugging scripts to help troubleshoot creator vault derivation and other issues with the PumpFun token system.

## Quick Start

Run all debug scripts at once:
```bash
npx tsx debug/debug-master.ts
```

Run a specific debug script:
```bash
npx tsx debug/debug-master.ts tft
npx tsx debug/debug-master.ts creator-vault
npx tsx debug/debug-master.ts comparison
npx tsx debug/debug-master.ts layout
npx tsx debug/debug-master.ts constraint-seeds
```

## Individual Debug Scripts

### 1. `debug-tft-bonding-curve.ts`
- **Purpose**: Analyze TFT token's bonding curve data
- **What it does**: 
  - Fetches bonding curve account data
  - Tests different creator offsets
  - Tries different seed strings
  - Shows raw hex data for manual inspection

### 2. `debug-creator-vault-issue.ts`
- **Purpose**: Debug the specific creator vault constraint seeds error
- **What it does**:
  - Finds the exact creator that generates the expected vault
  - Tests different derivation methods
  - Checks alternative derivation sources

### 3. `debug-working-vs-tft-comparison.ts`
- **Purpose**: Compare working WTK token with problematic TFT token
- **What it does**:
  - Analyzes both tokens' bonding curve data
  - Compares data structures
  - Identifies differences that might cause issues

### 4. `debug-bonding-curve-layout.ts`
- **Purpose**: Analyze bonding curve account layout and field structure
- **What it does**:
  - Shows field offsets and values
  - Identifies potential PublicKey fields
  - Compares layouts between tokens

### 5. `debug-constraint-seeds-error.ts`
- **Purpose**: Specifically debug the constraint seeds error
- **What it does**:
  - Tries to find the exact creator for the expected vault
  - Tests different derivation patterns
  - Checks if vault is derived from other sources

## Current Issue

The TFT token is failing with a `ConstraintSeeds` error:
- **Left (our derived)**: `H7WAuvxNsNASUEbhY7bFdYuQwymmexUEbMLiGGBZ5YR2`
- **Right (expected)**: `72ZnbPGyFHR1Bz1pmVK4cgWNRUT9pCcapNiiUcWKWsDg`

## What to Look For

1. **Creator Offset**: Find which offset in the bonding curve data contains the correct creator
2. **Seed String**: Check if TFT uses a different seed string than "creator-vault"
3. **Data Structure**: Compare TFT vs WTK bonding curve layouts
4. **Alternative Derivation**: See if the expected vault is derived from something other than the creator

## Running Individual Scripts

You can also run individual scripts directly:

```bash
# TFT bonding curve analysis
npx tsx debug/debug-tft-bonding-curve.ts

# Creator vault issue debug
npx tsx debug/debug-creator-vault-issue.ts

# Working vs TFT comparison
npx tsx debug/debug-working-vs-tft-comparison.ts

# Bonding curve layout analysis
npx tsx debug/debug-bonding-curve-layout.ts

# Constraint seeds error debug
npx tsx debug/debug-constraint-seeds-error.ts
```

## Expected Output

Each script will provide detailed analysis including:
- ✅ Found matches
- ❌ Failed attempts
- 📊 Raw data analysis
- 🔍 Debug information
- 📍 Field offsets and values

## Next Steps

After running the debug scripts:
1. Identify the correct creator offset for TFT
2. Determine if TFT uses different seed strings
3. Update the derivation logic in `src/bonding-curve/buy.ts`
4. Test the fix with the TFT token
