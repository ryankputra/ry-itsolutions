const assert = require('assert');
const { proto } = require('@whiskeysockets/baileys');
const { dbGet, dbRun } = require('../config/db');

// Import waBot internal functions or test target helpers directly
const waBot = require('../services/waBot');

async function runRetryVerificationTest() {
    console.log("==================================================================");
    console.log("TESTING WA BOT RETRY & DECRYPTION MECHANICS VERIFICATION");
    console.log("==================================================================");

    // 1. Test deviceSentMessage unwrapping
    const mockSentMessageFromBaileys = {
        deviceSentMessage: {
            destinationJid: "6287767287284@s.whatsapp.net",
            message: {
                conversation: "PESANAN BARU MASUK #TEST12345"
            }
        }
    };

    const testMsgId = "RYY_TEST_RETRY_" + Date.now();
    const testJid = "6287767287284@s.whatsapp.net";

    // Store raw mock message (which simulates what Baileys returns on sendMessage to self/admin)
    const testPhone = "6287767287284";
    
    // Check if sendTextMessage or storeMessage handles this clean payload
    console.log("[Test 1] Testing message normalization & storeMessage...");
    
    // We query SQLite wa_message_store directly to verify raw stored JSON content
    await dbRun(
        "INSERT OR REPLACE INTO wa_message_store (id, remoteJid, messageContent, createdAt) VALUES (?, ?, ?, ?)",
        [testMsgId, testJid, JSON.stringify(mockSentMessageFromBaileys), Date.now()]
    );

    // Call getStoredMessage with the key
    const retrievedProto = await waBot.getStoredMessage({ id: testMsgId, remoteJid: testJid });
    
    assert(retrievedProto !== undefined, "getStoredMessage must not return undefined");
    assert(!retrievedProto.deviceSentMessage, "Retrieved message must NOT contain nested deviceSentMessage wrapper");
    assert.strictEqual(retrievedProto.conversation, "PESANAN BARU MASUK #TEST12345", "Conversation text must match unwrapped inner payload");
    console.log("PASSED: deviceSentMessage unwrapped successfully into raw conversation proto.");

    // 2. Test Case-insensitive Key Lookup
    console.log("[Test 2] Testing case-insensitive key lookup...");
    const lowerKeyRetrieved = await waBot.getStoredMessage({ id: testMsgId.toLowerCase(), remoteJid: testJid });
    assert(lowerKeyRetrieved !== undefined, "Case-insensitive lookup (lowercase key) must succeed");
    assert.strictEqual(lowerKeyRetrieved.conversation, "PESANAN BARU MASUK #TEST12345", "Conversation text must match on case-insensitive key lookup");
    console.log("PASSED: Case-insensitive key lookup verified.");

    // 3. Cleanup test row
    await dbRun("DELETE FROM wa_message_store WHERE id = ?", [testMsgId]);

    console.log("==================================================================");
    console.log("ALL VERIFICATION TESTS PASSED SUCCESSFULLY");
    console.log("==================================================================");
}

runRetryVerificationTest().catch(err => {
    console.error("VERIFICATION TEST FAILED:", err);
    process.exit(1);
});
