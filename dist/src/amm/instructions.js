"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAmmBuyInstructionsAssuming = createAmmBuyInstructionsAssuming;
exports.createAmmSellInstructionsAssuming = createAmmSellInstructionsAssuming;
const tslib_1 = require("tslib");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
async function createAmmBuyInstructionsAssuming(pumpAmmSdk, swapSolanaState, quoteAmount, slippage = 1) {
    return await pumpAmmSdk.buyQuoteInput(swapSolanaState, new bn_js_1.default(quoteAmount), slippage);
}
async function createAmmSellInstructionsAssuming(pumpAmmSdk, swapSolanaState, baseAmount, slippage = 1) {
    return await pumpAmmSdk.sellBaseInput(swapSolanaState, new bn_js_1.default(baseAmount), slippage);
}
//# sourceMappingURL=instructions.js.map