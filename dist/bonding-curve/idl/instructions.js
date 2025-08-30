"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveFeeConfigPDA = deriveFeeConfigPDA;
exports.createBondingCurveBuyInstruction = createBondingCurveBuyInstruction;
exports.createBondingCurveSellInstruction = createBondingCurveSellInstruction;
const tslib_1 = require("tslib");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const constants_1 = require("./constants");
const spl_token_1 = require("@solana/spl-token");
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
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
    console.log(`🔧 Fee Config PDA Debug:`);
    console.log(`   Derived from: ${constants_1.FEE_PROGRAM_ID.toString()}`);
    console.log(`   Account: ${pda.toString()}`);
    console.log(`   Seeds: [${constants_1.FEE_CONFIG_SEED.toString()}, ${Buffer.from(constants_1.FEE_CONFIG_PDA_SECOND_SEED).toString('hex')}]`);
    return pda;
}
// ============================================================================
// SIMPLE INSTRUCTION CREATION
// ============================================================================
/**
 * Create Pump program BUY instruction with pre-resolved PDAs
 */
function createBondingCurveBuyInstruction(buyer, mint, solAmountLamports, pdas, maxSlippageBasisPoints = 1000) {
    const solAmount = bn_js_1.default.isBN(solAmountLamports) ? solAmountLamports : new bn_js_1.default(solAmountLamports);
    const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, pdas.bondingCurvePDA, true);
    const associatedUser = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, buyer, false);
    const feeConfigPDA = deriveFeeConfigPDA();
    const expectedTokenAmount = new bn_js_1.default(100000000);
    const maxSolCost = solAmount.mul(new bn_js_1.default(10000 + maxSlippageBasisPoints)).div(new bn_js_1.default(10000));
    const trackVolume = true;
    const data = Buffer.alloc(8 + 8 + 8 + 1);
    let offset = 0;
    data.set(constants_1.BUY_INSTRUCTION_DISCRIMINATOR, offset);
    offset += 8;
    expectedTokenAmount.toArrayLike(Buffer, 'le', 8).copy(data, offset);
    offset += 8;
    maxSolCost.toArrayLike(Buffer, 'le', 8).copy(data, offset);
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
function createBondingCurveSellInstruction(seller, mint, tokenAmount, minSolOutputLamports, pdas) {
    const amount = bn_js_1.default.isBN(tokenAmount) ? tokenAmount : new bn_js_1.default(tokenAmount);
    const minSol = bn_js_1.default.isBN(minSolOutputLamports) ? minSolOutputLamports : new bn_js_1.default(minSolOutputLamports);
    const associatedBondingCurve = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, pdas.bondingCurvePDA, true);
    const associatedUser = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, seller, false);
    const feeConfigPDA = deriveFeeConfigPDA();
    const data = Buffer.alloc(8 + 8 + 8);
    let offset = 0;
    data.set(constants_1.SELL_INSTRUCTION_DISCRIMINATOR, offset);
    offset += 8;
    amount.toArrayLike(Buffer, 'le', 8).copy(data, offset);
    offset += 8;
    minSol.toArrayLike(Buffer, 'le', 8).copy(data, offset);
    console.log(`🔧 SELL Instruction Debug:`);
    console.log(`   Amount: ${amount.toString()} (${amount.toArrayLike(Buffer, 'le', 8).toString('hex')})`);
    console.log(`   MinSol: ${minSol.toString()} (${minSol.toArrayLike(Buffer, 'le', 8).toString('hex')})`);
    console.log(`   Data: ${data.toString('hex')}`);
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