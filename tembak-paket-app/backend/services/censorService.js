const sharp = require('sharp');
const path = require('path');
const { createWorker } = require('tesseract.js');

let tesseractWorker = null;

async function getWorker() {
    if (!tesseractWorker) {
        const langPath = path.join(__dirname, '..');
        tesseractWorker = await createWorker('eng', 1, {
            langPath: langPath,
            cacheMethod: 'none',
            gzip: false
        });
        await tesseractWorker.setParameters({
            tessedit_pageseg_mode: '3'
        });
    }
    return tesseractWorker;
}

/**
 * Menggabungkan bounding box yang berdekatan/tumpang tindih
 */
function mergeBoundingBoxes(boxes, imgW, imgH) {
    if (!boxes || boxes.length === 0) return [];

    const padX = 2;
    const padY = 2;

    const padded = boxes.map(b => ({
        x0: Math.max(0, Math.floor(b.x0 - padX)),
        y0: Math.max(0, Math.floor(b.y0 - padY)),
        x1: Math.min(imgW, Math.ceil(b.x1 + padX)),
        y1: Math.min(imgH, Math.ceil(b.y1 + padY))
    }));

    padded.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);

    const merged = [];
    let curr = { ...padded[0] };

    for (let i = 1; i < padded.length; i++) {
        const next = padded[i];
        const yOverlap = Math.min(curr.y1, next.y1) - Math.max(curr.y0, next.y0);
        const minH = Math.min(curr.y1 - curr.y0, next.y1 - next.y0);
        const xDist = next.x0 - curr.x1;

        // Hanya gabungkan jika satu baris rapat dan jarak horizontal sangat dekat (<= 6px)
        if (yOverlap > minH * 0.5 && xDist <= 6) {
            curr.x1 = Math.max(curr.x1, next.x1);
            curr.y0 = Math.min(curr.y0, next.y0);
            curr.y1 = Math.max(curr.y1, next.y1);
        } else {
            merged.push(curr);
            curr = { ...next };
        }
    }
    merged.push(curr);
    return merged;
}

function mapBbox(b, scaleX, scaleY) {
    if (!b) return b;
    return {
        x0: Math.round(b.x0 * scaleX),
        y0: Math.round(b.y0 * scaleY),
        x1: Math.round(b.x1 * scaleX),
        y1: Math.round(b.y1 * scaleY)
    };
}

/**
 * Mendeteksi dan menyensor data sensitif dengan EFEK PRIVACY BLUR (Gaussian Privacy Blur):
 * 1. Nama pengguna (nama profil / header WA & nama pada struk transfer)
 * 2. Nomor pengguna (nomor HP/WhatsApp & no. rekening / e-wallet)
 * 3. Nomor IMEI / Serial Number (14-20 digit angka)
 * 4. Nominal transaksi (Rp / IDR / jumlah pembayaran)
 * 
 * PENTING:
 * - Angka jam/waktu pengiriman pesan (misal 11.39, 20.07, 00.50) TIDAK AKAN di-blur!
 * - Isi pesan / obrolan biasa TIDAK AKAN di-blur.
 * 
 * @param {Buffer} imageBuffer 
 * @returns {Promise<{ censoredBuffer: Buffer, boxesCount: number, detectedTypes: string[] }>}
 */
async function censorScreenshot(imageBuffer) {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width || 800;
        const imgHeight = metadata.height || 1200;

        // Optimasi Kecepatan: Jika resolusi sangat tinggi (> 720px), skala turun untuk OCR saja
        let ocrBuffer = imageBuffer;
        let scaleX = 1;
        let scaleY = 1;

        if (imgWidth > 720) {
            const targetOcrW = 720;
            const targetOcrH = Math.round((imgHeight * targetOcrW) / imgWidth);
            scaleX = imgWidth / targetOcrW;
            scaleY = imgHeight / targetOcrH;
            ocrBuffer = await sharp(imageBuffer)
                .resize(targetOcrW, targetOcrH, { fit: 'fill' })
                .grayscale()
                .toBuffer();
        }

        const worker = await getWorker();
        const { data } = await worker.recognize(ocrBuffer, {}, { blocks: true });

        const rawBoxes = [];
        const detectedTypes = new Set();

        const lines = [];
        for (const block of data.blocks || []) {
            for (const para of block.paragraphs || []) {
                for (const line of para.lines || []) {
                    lines.push(line);
                }
            }
        }

        const isMobileAspect = imgHeight > imgWidth;
        const headerTopLimit = isMobileAspect ? (imgHeight / scaleY) * 0.035 : 0;
        const headerBottomLimit = isMobileAspect ? (imgHeight / scaleY) * 0.11 : 0;

        // Regex abaikan status bar / indikator sistem di header
        const systemStatusRegex = /^(online|daring|terakhir dilihat|last seen|mengetik|typing|ketuk di sini|info kontak|\d{1,2}[:\.]\d{2}|\d{1,3}%)$/i;

        // Regex label struk resmi
        const receiptNameLabelRegex = /(?:nama\s*penerima|nama\s*pengirim|penerima|atas\s*nama|a\/n|a\.n)\s*[:\-]?/i;
        const accountLabelRegex = /(?:imei|sn|serial\s*number|no\.?\s*seri|perangkat|device\s*id|customer\s*pan|merchant\s*pan|terminal\s*id|rekening|rek|no\.?\s*rek|virtual\s*account|va|no\.?\s*va|tujuan|id\s*pelanggan|rrn|ref)\s*[:\-]?/i;

        // Regex jam / timestamp pesan WA (misal: 11.39, 11:39, 20.07, 00.50, 11:38:15)
        const isTimestampOrMetaRegex = /^(?:\d{1,2}[:\.\;]\d{2}(?:[:\.\;]\d{2})?[a-z✓\s]*|\d{1,2}[:\.]\d{2})$/i;

        // Strict Currency / Nominal Regex
        const currencySymbolRegex = /^(?:rp\.?|idr)$/i;
        const thousandAmountRegex = /^\d{1,3}(?:\.\d{3})+(?:,\d{2})?$/;

        for (const line of lines) {
            const lineText = (line.text || '').trim();
            const words = line.words || [];
            const lineBbox = line.bbox || {};

            // A. DETEKSI NAMA PENGGUNA DI HEADER WHATSAPP
            if (isMobileAspect && lineBbox.y0 >= headerTopLimit && lineBbox.y1 <= headerBottomLimit) {
                if (!systemStatusRegex.test(lineText) && lineText.length >= 2) {
                    const headerX0 = Math.max(0, Math.floor(imgWidth * 0.13));
                    const headerX1 = Math.min(imgWidth, Math.floor(imgWidth * 0.72));
                    const headerY0 = Math.max(0, Math.floor((lineBbox.y0 * scaleY) - 4));
                    const headerY1 = Math.min(imgHeight, Math.ceil((lineBbox.y1 * scaleY) + 4));

                    rawBoxes.push({
                        x0: headerX0,
                        y0: headerY0,
                        x1: headerX1,
                        y1: headerY1
                    });
                    detectedTypes.add('Nama Pengguna (Header WA)');
                    continue;
                }
            }

            // B. DETEKSI NAMA PADA STRUK TRANSFER (setelah label 'Nama Penerima', 'A/N', dsb)
            if (receiptNameLabelRegex.test(lineText)) {
                let pastLabel = false;
                for (const w of words) {
                    if (receiptNameLabelRegex.test(w.text)) {
                        pastLabel = true;
                        continue;
                    }
                    if (pastLabel && w.text.trim().length > 1 && w.bbox) {
                        rawBoxes.push(mapBbox(w.bbox, scaleX, scaleY));
                        detectedTypes.add('Nama Penerima / Pengirim');
                    }
                }
            }

            // C. DETEKSI NOMOR TELEPON PENGGUNA (HP / WhatsApp: 08xx atau +628xx panjang 10-13 digit)
            for (const w of words) {
                if (!w.bbox) continue;
                const cleanNum = w.text.replace(/[\s\-\.:]/g, '');
                if (/^(?:08|628|\+628)\d{8,11}$/.test(cleanNum)) {
                    rawBoxes.push(mapBbox(w.bbox, scaleX, scaleY));
                    detectedTypes.add('Nomor Pengguna');
                }
            }

            // D. DETEKSI NOMOR IMEI / REKENING / REFERENSI SENSITIF
            const hasSensitiveLabel = accountLabelRegex.test(lineText);

            // 1. Jika baris memuat label spesifik (IMEI, SN, Rekening, VA, Ref, RRN, PAN)
            if (hasSensitiveLabel) {
                for (const w of words) {
                    if (!w.bbox) continue;
                    const trimmed = w.text.trim();
                    if (isTimestampOrMetaRegex.test(trimmed)) continue;

                    const cleanDigits = w.text.replace(/\D/g, '');
                    if (cleanDigits.length >= 4) {
                        rawBoxes.push(mapBbox(w.bbox, scaleX, scaleY));
                        detectedTypes.add('Nomor IMEI / Data Sensitif');
                    }
                }
            }

            // 2. Deteksi IMEI (14-20 digit) dan nomor referensi panjang
            // PENTING: Jam pesan (11.39, 20.07, dsb) TIDAK BOLEH di-blur!
            for (const w of words) {
                if (!w.bbox) continue;
                const trimmed = w.text.trim();
                if (isTimestampOrMetaRegex.test(trimmed)) continue;

                const cleanDigits = w.text.replace(/\D/g, '');
                if (cleanDigits.length >= 12 && cleanDigits.length <= 36) {
                    rawBoxes.push(mapBbox(w.bbox, scaleX, scaleY));
                    detectedTypes.add('Nomor IMEI / Referensi Transaksi');
                }
            }

            // 3. Deteksi IMEI yang terpisah spasi/tanda hubung (e.g. 3547 2723 9304 066)
            let currentRunWords = [];
            let currentRunDigits = '';

            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                if (!w.bbox) continue;
                const trimmed = w.text.trim();

                if (isTimestampOrMetaRegex.test(trimmed)) {
                    if (currentRunDigits.length >= 12 && currentRunDigits.length <= 36) {
                        for (const rw of currentRunWords) {
                            rawBoxes.push(mapBbox(rw.bbox, scaleX, scaleY));
                        }
                        detectedTypes.add('Nomor IMEI / Data Sensitif');
                    }
                    currentRunWords = [];
                    currentRunDigits = '';
                    continue;
                }

                const digits = w.text.replace(/\D/g, '');
                const stripped = w.text.replace(/[\s\-\.\/:\(\)\[\],_#]/g, '');
                const isDigitWord = digits.length > 0 && stripped.length > 0 && (digits.length / stripped.length) >= 0.7;

                if (isDigitWord) {
                    currentRunWords.push(w);
                    currentRunDigits += digits;
                } else {
                    if (currentRunDigits.length >= 12 && currentRunDigits.length <= 36) {
                        for (const rw of currentRunWords) {
                            rawBoxes.push(mapBbox(rw.bbox, scaleX, scaleY));
                        }
                        detectedTypes.add('Nomor IMEI / Data Sensitif');
                    }
                    currentRunWords = [];
                    currentRunDigits = '';
                }
            }
            if (currentRunDigits.length >= 12 && currentRunDigits.length <= 36) {
                for (const rw of currentRunWords) {
                    rawBoxes.push(mapBbox(rw.bbox, scaleX, scaleY));
                }
                detectedTypes.add('Nomor IMEI / Data Sensitif');
            }

            // 4. Fallback line jika words kosong tetapi baris memiliki 12-36 digit (bukan jam)
            if (words.length === 0 && lineBbox && lineBbox.x0 !== undefined) {
                const trimmedLine = lineText.trim();
                if (!isTimestampOrMetaRegex.test(trimmedLine)) {
                    const cleanDigits = lineText.replace(/\D/g, '');
                    if (cleanDigits.length >= 12 && cleanDigits.length <= 36) {
                        rawBoxes.push(mapBbox(lineBbox, scaleX, scaleY));
                        detectedTypes.add('Nomor IMEI / Data Sensitif');
                    }
                }
            }

            // E. DETEKSI NOMINAL TRANSAKSI
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                if (!w.bbox) continue;
                const cleanW = w.text.trim();

                if (currencySymbolRegex.test(cleanW) || cleanW.toLowerCase().startsWith('rp')) {
                    rawBoxes.push(mapBbox(w.bbox, scaleX, scaleY));
                    detectedTypes.add('Nominal Transaksi');

                    if (i + 1 < words.length && words[i + 1].bbox) {
                        const nextW = words[i + 1];
                        const cleanNext = nextW.text.trim().replace(/[\.,]/g, '');
                        if (/^\d+$/.test(cleanNext)) {
                            rawBoxes.push(mapBbox(nextW.bbox, scaleX, scaleY));
                            i++;
                        }
                    }
                } else if (thousandAmountRegex.test(cleanW)) {
                    const cleanDigits = cleanW.replace(/[\.,]/g, '');
                    if (cleanDigits !== '2024' && cleanDigits !== '2025' && cleanDigits !== '2026' && cleanDigits !== '2027') {
                        rawBoxes.push(mapBbox(w.bbox, scaleX, scaleY));
                        detectedTypes.add('Nominal Transaksi');
                    }
                }
            }
        }

        // Gabungkan bounding box yang berdampingan
        const mergedBoxes = mergeBoundingBoxes(rawBoxes, imgWidth, imgHeight);

        if (mergedBoxes.length === 0) {
            const fallback = await sharp(imageBuffer).jpeg({ quality: 92 }).toBuffer();
            return {
                censoredBuffer: fallback,
                boxesCount: 0,
                detectedTypes: []
            };
        }

        // Privacy Blur yang Cepat: Render 1/4 size downscaled blur sekali, lalu extract patch
        const smallW = Math.max(16, Math.floor(imgWidth / 4));
        const smallH = Math.max(16, Math.floor(imgHeight / 4));

        const blurredFull = await sharp(imageBuffer)
            .resize(smallW, smallH, { fit: 'fill' })
            .resize(imgWidth, imgHeight, { fit: 'fill', kernel: 'cubic' })
            .blur(8)
            .toBuffer();

        const compositeOverlays = [];
        for (const box of mergedBoxes) {
            const left = Math.max(0, box.x0);
            const top = Math.max(0, box.y0);
            const width = Math.min(imgWidth - left, box.x1 - box.x0);
            const height = Math.min(imgHeight - top, box.y1 - box.y0);

            if (width < 3 || height < 3) continue;

            const patch = await sharp(blurredFull)
                .extract({ left, top, width, height })
                .toBuffer();

            compositeOverlays.push({
                input: patch,
                left,
                top
            });
        }

        const censoredBuffer = await sharp(imageBuffer)
            .composite(compositeOverlays)
            .jpeg({ quality: 92 })
            .toBuffer();

        return {
            censoredBuffer,
            boxesCount: mergedBoxes.length,
            detectedTypes: Array.from(detectedTypes)
        };
    } catch (err) {
        console.error('[censorService] Error processing image blur:', err.message);
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
