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
function generateDynamicQRIS(staticTemplate, amount) {
    if (!staticTemplate) return null;
    let payload = String(staticTemplate).trim();

    // Strip old CRC (Tag 63) if present
    const idx63 = payload.indexOf('6304');
    if (idx63 !== -1) {
        payload = payload.substring(0, idx63);
    }

    // Parse TLV tags
    const tags = [];
    let i = 0;
    try {
        while (i < payload.length) {
            const tag = payload.substring(i, i + 2);
            const length = parseInt(payload.substring(i + 2, i + 4), 10);
            if (isNaN(length)) break;
            const val = payload.substring(i + 4, i + 4 + length);
            tags.push({ tag, val });
            i += 4 + length;
        }
    } catch (e) {
        return null;
    }

    const amountStr = parseInt(amount, 10).toString();
    const newTags = [];
    let hasTag54 = false;

    for (const item of tags) {
        if (item.tag === '01') {
            // Change static (11) to dynamic (12)
            newTags.push({ tag: '01', val: '12' });
        } else if (item.tag === '54') {
            newTags.push({ tag: '54', val: amountStr });
            hasTag54 = true;
        } else if (item.tag === '58' && !hasTag54) {
            newTags.push({ tag: '54', val: amountStr });
            hasTag54 = true;
            newTags.push(item);
        } else {
            newTags.push(item);
        }
    }

    if (!hasTag54) {
        newTags.push({ tag: '54', val: amountStr });
    }

    let result = '';
    for (const item of newTags) {
        const lenStr = item.val.length.toString().padStart(2, '0');
        result += `${item.tag}${lenStr}${item.val}`;
    }

    result += '6304';
    const checksum = crc16(result);
    return result + checksum;
}

/**
 * Generate Base64 Data URL Image for QRIS
 */
async function generateQrisDataUrl(staticTemplate, amount) {
    const dynamicCode = generateDynamicQRIS(staticTemplate, amount);
    if (!dynamicCode) throw new Error("Gagal memproses string template QRIS.");

    const dataUrl = await qrcode.toDataURL(dynamicCode, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 380,
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
