const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

let tesseractWorker = null;

async function getWorker() {
    if (!tesseractWorker) {
        tesseractWorker = await createWorker('ind+eng');
    }
    return tesseractWorker;
}

/**
 * Mendeteksi dan menyensor data sensitif (Nomor HP, No Rekening, dan Nama Pelanggan)
 * menggunakan Tesseract OCR + Sharp dengan Gaya 1 (Frosted Dark Glass Box).
 * 
 * @param {Buffer} imageBuffer 
 * @returns {Promise<{ censoredBuffer: Buffer, boxesCount: number, detectedTypes: string[] }>}
 */
async function censorScreenshot(imageBuffer) {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width || 800;
        const imgHeight = metadata.height || 1200;

        const worker = await getWorker();
        // Tesseract v7 memerlukan { blocks: true } agar data.blocks & hierarchy kata terisi
        const { data } = await worker.recognize(imageBuffer, {}, { blocks: true });

        const boxesToCensor = [];
        const detectedTypes = new Set();

        const lines = [];
        for (const block of data.blocks || []) {
            for (const para of block.paragraphs || []) {
                for (const line of para.lines || []) {
                    lines.push(line);
                }
            }
        }

        // Keywords yang mengindikasikan baris data nama atau rekening
        const nameKeywords = /(nama|penerima|pengirim|kepada|dari|atas\s*nama|a\.?n|customer|pelanggan)/i;
        const accountKeywords = /(rekening|rek|no\.?\s*rek|va|virtual\s*account|tujuan)/i;
        const phoneRegex = /(\+?62|08)[0-9\s\-]{8,15}/;
        const accountDigitsRegex = /\b\d{8,16}\b/;

        for (const line of lines) {
            const lineText = (line.text || '').trim();
            const words = line.words || [];

            // 1. Cek apakah baris ini memuat keyword nama
            if (nameKeywords.test(lineText)) {
                let foundKeyword = false;
                for (const w of words) {
                    if (nameKeywords.test(w.text)) {
                        foundKeyword = true;
                        continue;
                    }
                    if (foundKeyword && w.text.trim().length > 1 && w.bbox) {
                        boxesToCensor.push(w.bbox);
                        detectedTypes.add('Nama Pelanggan');
                    }
                }
            }

            // 2. Cek apakah baris ini memuat keyword rekening
            if (accountKeywords.test(lineText)) {
                let foundAccountKeyword = false;
                for (const w of words) {
                    if (accountKeywords.test(w.text)) {
                        foundAccountKeyword = true;
                        continue;
                    }
                    if (foundAccountKeyword && /\d{4,}/.test(w.text) && w.bbox) {
                        boxesToCensor.push(w.bbox);
                        detectedTypes.add('No. Rekening');
                    }
                }
            }

            // 3. Scan tiap kata untuk Nomor HP atau digit rekening terisolasi
            for (const w of words) {
                if (!w.bbox) continue;
                const cleanWord = w.text.replace(/[\s\-\.:]/g, '');

                if (phoneRegex.test(cleanWord) || (cleanWord.startsWith('08') && cleanWord.length >= 10 && cleanWord.length <= 13)) {
                    boxesToCensor.push(w.bbox);
                    detectedTypes.add('No. WhatsApp / HP');
                } else if (accountDigitsRegex.test(cleanWord) && !cleanWord.startsWith('2026') && !cleanWord.startsWith('2025')) {
                    // Hindari false positive tahun/tanggal
                    boxesToCensor.push(w.bbox);
                    detectedTypes.add('No. Rekening / E-Wallet');
                }
            }
        }

        // Buat overlay SVG dengan Gaya 1 (Frosted Dark Glass Box dengan aksen border neon halus)
        let rectsSvg = '';
        const padX = 6;
        const padY = 4;

        for (const box of boxesToCensor) {
            const x = Math.max(0, box.x0 - padX);
            const y = Math.max(0, box.y0 - padY);
            const w = Math.min(imgWidth - x, (box.x1 - box.x0) + (padX * 2));
            const h = Math.min(imgHeight - y, (box.y1 - box.y0) + (padY * 2));

            if (w > 0 && h > 0) {
                rectsSvg += `
                    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#090d16" fill-opacity="0.96" />
                    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.4" fill="none" />
                `;
            }
        }

        // Watermark badge estetik di sudut
        const badgeW = 205;
        const badgeH = 34;
        const badgeX = Math.max(10, imgWidth - badgeW - 14);
        const badgeY = Math.max(10, imgHeight - badgeH - 14);

        const badgeSvg = `
            <g transform="translate(${badgeX}, ${badgeY})">
                <rect width="${badgeW}" height="${badgeH}" rx="17" fill="#090d16" fill-opacity="0.88" stroke="#06b6d4" stroke-width="1.2" />
                <circle cx="18" cy="17" r="6" fill="#10b981" />
                <text x="32" y="21" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#f8fafc">Ry-ITSolutions Verified</text>
            </g>
        `;

        const fullSvg = `
            <svg width="${imgWidth}" height="${imgHeight}">
                ${rectsSvg}
                ${badgeSvg}
            </svg>
        `;

        const censoredBuffer = await sharp(imageBuffer)
            .composite([
                {
                    input: Buffer.from(fullSvg),
                    top: 0,
                    left: 0
                }
            ])
            .jpeg({ quality: 92 })
            .toBuffer();

        return {
            censoredBuffer,
            boxesCount: boxesToCensor.length,
            detectedTypes: Array.from(detectedTypes)
        };
    } catch (err) {
        console.error('[censorService] Error processing image:', err.message);
        const fallback = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
        return {
            censoredBuffer: fallback,
            boxesCount: 0,
            detectedTypes: []
        };
    }
}

module.exports = {
    censorScreenshot
};
