"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveFeeConfigPDA = deriveFeeConfigPDA;
exports.createBondingCurveBuyInstruction = createBondingCurveBuyInstruction;
exports.createBondingCurveSellInstruction = createBondingCurveSellInstruction;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const constants_1 = require("./constants");
/**
 * Derive fee config PDA dynamically from IDL seeds
 * This matches the exact derivation logic from the IDL
 */
function deriveFeeConfigPDA() {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([
        constants_1.FEE_CONFIG_SEED,
        Buffer.from(constants_1.FEE_CONFIG_PDA_SECOND_SEED)
    ], constants_1.FEE_PROGRAM_ID // IDL shows fee_config is derived from fee_program
    );
    return pda;
}
/**
 * Create Pump program BUY instruction with pre-resolved PDAs
 */
function createBondingCurveBuyInstruction(buyer, mint, amountLamports, pdas, maxSlippageBasisPoints = 1000) {
    const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, pdas.bondingCurvePDA, true);
    const associatedUser = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, buyer, false);
    const feeConfigPDA = deriveFeeConfigPDA();
    const expectedTokenAmount = BigInt(100000000);
    const maxSolCost = BigInt(Math.floor(amountLamports * (10000 + maxSlippageBasisPoints) / 10000));
    const trackVolume = true;
    const data = Buffer.alloc(8 + 8 + 8 + 1);
    let offset = 0;
    data.set(constants_1.BUY_INSTRUCTION_DISCRIMINATOR, offset);
    offset += 8;
    data.writeBigUInt64LE(expectedTokenAmount, offset);
    offset += 8;
    data.writeBigUInt64LE(maxSolCost, offset);
    offset += 8;
    data.writeUInt8(trackVolume ? 1 : 0, offset);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: pdas.globalPDA, isSigner: false, isWritable: true },
            { pubkey: constants_1.FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: pdas.bondingCurvePDA, isSigner: false, isWritable: true },
            { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
            { pubkey: associatedUser, isSigner: false, isWritable: true },
            { pubkey: buyer, isSigner: true, isWritable: true },
            { pubkey: constants_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: constants_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: pdas.creatorVaultPDA, isSigner: false, isWritable: true },
            { pubkey: pdas.eventAuthorityPDA, isSigner: false, isWritable: false },
            { pubkey: constants_1.PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: pdas.globalVolumeAccumulatorPDA, isSigner: false, isWritable: true },
            { pubkey: pdas.userVolumeAccumulatorPDA, isSigner: false, isWritable: true },
            { pubkey: feeConfigPDA, isSigner: false, isWritable: false },
            { pubkey: constants_1.FEE_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: constants_1.PUMP_PROGRAM_ID,
        data,
    });
}
/**
 * Create Pump program SELL instruction with pre-resolved PDAs
 */
function createBondingCurveSellInstruction(seller, mint, tokenAmount, minSol, pdas) {
    const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, pdas.bondingCurvePDA, true);
    const associatedUser = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, seller, false);
    const feeConfigPDA = deriveFeeConfigPDA();
    const data = Buffer.alloc(8 + 8 + 8);
    let offset = 0;
    data.set(constants_1.SELL_INSTRUCTION_DISCRIMINATOR, offset);
    offset += 8;
    data.writeBigUInt64LE(BigInt(tokenAmount), offset);
    offset += 8;
    data.writeBigUInt64LE(BigInt(minSol), offset);
    return new web3_js_1.TransactionInstruction({
        keys: [
            { pubkey: pdas.globalPDA, isSigner: false, isWritable: true },
            { pubkey: constants_1.FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: pdas.bondingCurvePDA, isSigner: false, isWritable: true },
            { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
            { pubkey: associatedUser, isSigner: false, isWritable: true },
            { pubkey: seller, isSigner: true, isWritable: true },
            { pubkey: constants_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: pdas.creatorVaultPDA, isSigner: false, isWritable: true },
            { pubkey: constants_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: pdas.eventAuthorityPDA, isSigner: false, isWritable: false },
            { pubkey: constants_1.PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: feeConfigPDA, isSigner: false, isWritable: false },
            { pubkey: constants_1.FEE_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: constants_1.PUMP_PROGRAM_ID,
        data,
    });
}
//# sourceMappingURL=instructions.js.map