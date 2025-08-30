"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAmmBuyInstructionsAssuming = createAmmBuyInstructionsAssuming;
exports.createAmmSellInstructionsAssuming = createAmmSellInstructionsAssuming;
const tslib_1 = require("tslib");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
async function createAmmBuyInstructionsAssuming(pumpAmmSdk, swapSolanaState, quoteAmountLamports, slippage = 1) {
    const quoteAmount = bn_js_1.default.isBN(quoteAmountLamports)
        ? quoteAmountLamports
        : new bn_js_1.default(quoteAmountLamports);
    return await pumpAmmSdk.buyQuoteInput(swapSolanaState, quoteAmount, slippage);
}
async function createAmmSellInstructionsAssuming(pumpAmmSdk, swapSolanaState, baseAmount, slippage = 1) {
    const base = bn_js_1.default.isBN(baseAmount) ? baseAmount : new bn_js_1.default(baseAmount);
    return await pumpAmmSdk.sellBaseInput(swapSolanaState, base, slippage);
}
//# sourceMappingURL=instructions.js.map