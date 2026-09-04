const qrcode = require('qrcode');

const DEFAULT_QRIS_NOBU = "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214550177920473550303UMI51440014ID.CO.QRIS.WWW0215ID20253782970190303UMI5204541153033605802ID5918RYYSTORE OK22859056009SURAKARTA61055712462070703A016304774D";
const DEFAULT_QRIS_GOPAY = "00020101021126610014COM.GO-JEK.WWW01189360091432137105260210G2137105260303UMI51440014ID.CO.QRIS.WWW0215ID10264985528880303UMI5204737953033605802ID5921RyyStore IT Solutions6011KARANGANYAR61055773162070703A016304F027";

/**
 * Calculate CRC16 CCITT (0xFFFF, Poly: 0x1021) as required by EMVCo QRIS specification
 */
function crc16(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= (data.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Converts a static QRIS template into an official EMVCo dynamic QRIS string with amount
 */
function generateDynamicQRIS(rawPayload, amount) {
    if (!rawPayload) return null;

    // 1. Sanitize string: remove surrounding quotes, newlines (\r, \n), tabs (\t) and trim ends
    let cleanPayload = String(rawPayload)
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/[\r\n\t]+/g, '')
        .trim();

    // 2. Validate EMVCo standard format (must start with 00020101 or 000201)
    if (!cleanPayload.startsWith('00020101') && !cleanPayload.startsWith('000201')) {
        console.warn("[QRIS] Payload string does not start with valid EMVCo header (00020101):", cleanPayload.substring(0, 12));
        return null;
    }

    // 3. Parse EMVCo TLV (Tag-Length-Value) tags sequentially until Tag 63 (CRC)
    const tags = [];
    let i = 0;
    try {
        while (i < cleanPayload.length) {
            if (i + 4 > cleanPayload.length) break;
            const tag = cleanPayload.substring(i, i + 2);
            const length = parseInt(cleanPayload.substring(i + 2, i + 4), 10);
            if (isNaN(length) || length < 0) break;

            // When Tag 63 (CRC Checksum) is reached, stop parsing (will be recalculated)
            if (tag === '63') {
                break;
            }

            const val = cleanPayload.substring(i + 4, i + 4 + length);
            tags.push({ tag, val });
            i += 4 + length;
        }
    } catch (e) {
        console.error("[QRIS] Error parsing TLV tags:", e.message);
        return null;
    }

    const amountNum = parseInt(amount, 10);
    const amountStr = (!isNaN(amountNum) && amountNum > 0) ? amountNum.toString() : '';
    const newTags = [];
    let hasTag54 = false;

    for (const item of tags) {
        if (item.tag === '01') {
            // Change Point of Initiation: Static (11) to Dynamic (12)
            newTags.push({ tag: '01', val: '12' });
        } else if (item.tag === '54') {
            if (amountStr) {
                newTags.push({ tag: '54', val: amountStr });
                hasTag54 = true;
            }
        } else if (item.tag === '58' && !hasTag54 && amountStr) {
            // Standard EMVCo placement: Tag 54 precedes Tag 58 (Country Code ID)
            newTags.push({ tag: '54', val: amountStr });
            hasTag54 = true;
            newTags.push(item);
        } else {
            newTags.push(item);
        }
    }

    if (!hasTag54 && amountStr) {
        newTags.push({ tag: '54', val: amountStr });
    }

    // Assemble payload string with exact 2-digit length headers
    let result = '';
    for (const item of newTags) {
        const lenStr = item.val.length.toString().padStart(2, '0');
        result += `${item.tag}${lenStr}${item.val}`;
    }

    // Append Tag 63 header (6304) and calculate ISO/IEC 13239 CRC16
    result += '6304';
    const checksum = crc16(result);
    return result + checksum;
}

/**
 * Generate Base64 Data URL Image for QRIS with High Error Correction ('H') & Quiet Zone Margin 4
 */
async function generateQrisDataUrl(rawPayload, amount) {
    const dynamicCode = generateDynamicQRIS(rawPayload, amount);
    if (!dynamicCode) throw new Error("Gagal memproses string template QRIS.");

    const dataUrl = await qrcode.toDataURL(dynamicCode, {
        errorCorrectionLevel: 'H', // 30% recovery capability allows center logo overlay
        margin: 4,               // Quiet zone standard for reliable camera detection
        width: 480,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    });

    return {
        dynamicCode,
        dataUrl
    };
}

module.exports = {
    DEFAULT_QRIS_NOBU,
    DEFAULT_QRIS_GOPAY,
    crc16,
    generateDynamicQRIS,
    generateQrisDataUrl
};
