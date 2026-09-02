const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { DEFAULT_QRIS_NOBU, DEFAULT_QRIS_GOPAY, generateDynamicQRIS, generateQrisDataUrl } = require('../config/qrisGenerator');

console.log("==================================================================");
console.log("🧪 TESTING ENV RESTORATION, CEIRGO INIT, AND DUAL QRIS MAPPING");
console.log("==================================================================");

// 1. Verify ENV & Fallbacks
assert(process.env.CEIRGO_API_KEY, "process.env.CEIRGO_API_KEY should be loaded from .env");
console.log(`✔ [PASS] CEIRGO_API_KEY successfully loaded: ${process.env.CEIRGO_API_KEY.substring(0, 10)}...`);

const expectedNobu = "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214550177920473550303UMI51440014ID.CO.QRIS.WWW0215ID20253782970190303UMI5204541153033605802ID5918RYYSTORE OK22859056009SURAKARTA61055712462070703A016304774D";
const expectedGopay = "00020101021126610014COM.GO-JEK.WWW01189360091432137105260210G2137105260303UMI51440014ID.CO.QRIS.WWW0215ID10264985528880303UMI5204737953033605802ID5921RyyStore IT Solutions6011KARANGANYAR61055773162070703A016304F027";

assert.strictEqual(process.env.QRIS_NOBU_STATIS_STRING, expectedNobu, "QRIS_NOBU_STATIS_STRING mismatch");
console.log("✔ [PASS] QRIS_NOBU_STATIS_STRING mapped to RYYSTORE OK2285905");

assert.strictEqual(process.env.QRIS_GOPAY_STATIS_STRING, expectedGopay, "QRIS_GOPAY_STATIS_STRING mismatch");
console.log("✔ [PASS] QRIS_GOPAY_STATIS_STRING mapped to RyyStore IT Solutions");

// 2. Dynamic QRIS Generation
const nobuDynamic = generateDynamicQRIS(expectedNobu, 55000);
assert(nobuDynamic.includes("RYYSTORE OK2285905"), "Nobu dynamic QRIS must contain merchant name");
assert(nobuDynamic.includes("540555000"), "Nobu dynamic QRIS must contain amount 55000");
console.log("✔ [PASS] Nobu dynamic QRIS generated with Tag 54 amount & correct merchant");

const gopayDynamic = generateDynamicQRIS(expectedGopay, 25000);
assert(gopayDynamic.includes("RyyStore IT Solutions"), "GoPay dynamic QRIS must contain merchant name");
assert(gopayDynamic.includes("540525000"), "GoPay dynamic QRIS must contain amount 25000");
console.log("✔ [PASS] GoPay dynamic QRIS generated with Tag 54 amount & correct merchant");

// 3. Base64 Data URL Image Generation
async function runAsyncTests() {
    const nobuUrl = await generateQrisDataUrl(expectedNobu, 55000);
    assert(nobuUrl.dataUrl.startsWith("data:image/png;base64,"), "Nobu dataUrl must be PNG base64");
    console.log("✔ [PASS] Nobu QRIS Image Base64 generated successfully");

    const gopayUrl = await generateQrisDataUrl(expectedGopay, 25000);
    assert(gopayUrl.dataUrl.startsWith("data:image/png;base64,"), "GoPay dataUrl must be PNG base64");
    console.log("✔ [PASS] GoPay QRIS Image Base64 generated successfully");

    console.log("==================================================================");
    console.log("🎉 ALL DUAL QRIS & ENV RESTORATION TESTS PASSED 100%!");
    console.log("==================================================================");
}

runAsyncTests().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
