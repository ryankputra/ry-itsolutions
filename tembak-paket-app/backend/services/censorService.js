const sharp = require('sharp');
const path = require('path');
const { createWorker } = require('tesseract.js');
const {
    MultiFormatReader,
    RGBLuminanceSource,
    BinaryBitmap,
    HybridBinarizer,
    DecodeHintType
} = require('@zxing/library');
const { Mutex } = require('async-mutex');

// Mutex untuk membatasi eksekusi OCR konkuren agar hemat CPU & RAM di server ARM/Linux
const workerMutex = new Mutex();
let tesseractWorker = null;

/**
 * Inisialisasi Tesseract worker (Singleton)
 * Menggunakan kombinasi 'ind+eng' untuk presisi struk lokal & teks global
 */
async function getWorker() {
    if (!tesseractWorker) {
        const langPath = path.join(__dirname, '..');
        tesseractWorker = await createWorker('ind+eng', 1, {
            langPath: langPath,
            cacheMethod: 'none',
            gzip: false
        });
        await tesseractWorker.setParameters({
            tessedit_pageseg_mode: '3' // Fully automatic page segmentation
        });
    }
    return tesseractWorker;
}

/**
 * Memetakan koordinat bounding box dari resolusi OCR (skala) ke resolusi asli gambar
 */
function mapBbox(b, scaleX, scaleY) {
    if (!b) return null;
    return {
        x0: Math.round(b.x0 * scaleX),
        y0: Math.round(b.y0 * scaleY),
        x1: Math.round(b.x1 * scaleX),
        y1: Math.round(b.y1 * scaleY)
    };
}

/**
 * Normalisasi teks: bersihkan non-breaking space (\u00A0) dan invisible unicode characters
 */
function normalizeText(str) {
    if (!str) return '';
    return str
        .replace(/\u00A0/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();
}

/**
 * Deteksi Barcode & QR Code menggunakan @zxing/library
 */
async function detectBarcodesWithZXing(grayBuffer, width, height, scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0) {
    const detectedBoxes = [];
    let reader = null;
    const oldWarn = console.warn;

    try {
        console.warn = () => {};

        const luminances = new Uint8ClampedArray(grayBuffer);
        const source = new RGBLuminanceSource(luminances, width, height);
        const bitmap = new BinaryBitmap(new HybridBinarizer(source));

        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);

        reader = new MultiFormatReader();
        reader.setHints(hints);

        const result = reader.decode(bitmap, hints);

        if (result) {
            const rawPoints = result.getResultPoints() || [];
            if (rawPoints.length > 0) {
                const xs = rawPoints.map(p => ((typeof p.getX === 'function' ? p.getX() : p.x) + offsetX) * scaleX);
                const ys = rawPoints.map(p => ((typeof p.getY === 'function' ? p.getY() : p.y) + offsetY) * scaleY);

                let minX = Math.min(...xs);
                let maxX = Math.max(...xs);
                let minY = Math.min(...ys);
                let maxY = Math.max(...ys);

                const boxW = maxX - minX;
                const boxH = maxY - minY;

                if (boxH < 35) {
                    const expandH = Math.max(60, Math.round(width * scaleX * 0.10));
                    minY = Math.max(0, minY - Math.round(expandH / 2));
                    maxY = maxY + Math.round(expandH / 2);
                }

                const pad = Math.max(14, Math.round(Math.max(boxW, boxH) * 0.15));

                detectedBoxes.push({
                    x0: Math.max(0, Math.floor(minX - pad)),
                    y0: Math.max(0, Math.floor(minY - pad)),
                    x1: Math.ceil(maxX + pad),
                    y1: Math.ceil(maxY + pad),
                    type: 'Barcode/QR Code (ZXing)'
                });
            }
        }
    } catch (_) {
    } finally {
        console.warn = oldWarn;
        if (reader && typeof reader.reset === 'function') {
            try { reader.reset(); } catch (_) {}
        }
    }

    return detectedBoxes;
}

/**
 * Merge Bounding Boxes menggunakan 2D Connected-Components (Disjoint-Set Union)
 * Menggabungkan kotak yang tumpang tindih secara presisi dan rapi
 */
function mergeBoundingBoxes(boxes, imgW, imgH, padX = 8, padY = 6) {
    if (!boxes || boxes.length === 0) return [];

    const validBoxes = boxes
        .filter(b => b && b.x1 > b.x0 && b.y1 > b.y0)
        .map(b => ({
            x0: Math.max(0, Math.floor(b.x0)),
            y0: Math.max(0, Math.floor(b.y0)),
            x1: Math.min(imgW, Math.ceil(b.x1)),
            y1: Math.min(imgH, Math.ceil(b.y1))
        }));

    if (validBoxes.length === 0) return [];

    const parent = validBoxes.map((_, idx) => idx);
    function find(i) {
        if (parent[i] === i) return i;
        parent[i] = find(parent[i]);
        return parent[i];
    }
    function union(i, j) {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parent[rootI] = rootJ;
    }

    function shouldMerge(a, b) {
        const ax0 = Math.max(0, a.x0 - padX);
        const ay0 = Math.max(0, a.y0 - padY);
        const ax1 = Math.min(imgW, a.x1 + padX);
        const ay1 = Math.min(imgH, a.y1 + padY);

        return !(ax1 < b.x0 || ax0 > b.x1 || ay1 < b.y0 || ay0 > b.y1);
    }

    for (let i = 0; i < validBoxes.length; i++) {
        for (let j = i + 1; j < validBoxes.length; j++) {
            if (shouldMerge(validBoxes[i], validBoxes[j])) {
                union(i, j);
            }
        }
    }

    const clusters = new Map();
    for (let i = 0; i < validBoxes.length; i++) {
        const root = find(i);
        if (!clusters.has(root)) clusters.set(root, []);
        clusters.get(root).push(validBoxes[i]);
    }

    const merged = [];
    for (const cluster of clusters.values()) {
        const x0 = Math.max(0, Math.min(...cluster.map(b => b.x0)));
        const y0 = Math.max(0, Math.min(...cluster.map(b => b.y0)));
        const x1 = Math.min(imgW, Math.max(...cluster.map(b => b.x1)));
        const y1 = Math.min(imgH, Math.max(...cluster.map(b => b.y1)));
        merged.push({ x0, y0, x1, y1 });
    }

    merged.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    return merged;
}

/**
 * Fungsi Utama: Sensor Screenshot secara menyeluruh, 100% presisi & rapi
 * @param {Buffer} imageBuffer - Buffer input gambar (JPEG/PNG/WebP)
 * @param {Object} options - Pengaturan opsional:
 *   - maskMode: 'blur' (default Frosted Glass rapi) | 'solid' (Blok Warna Bersih)
 *   - solidColor: string warna hex untuk solid mask (default: auto-detect dark/light)
 *   - blurRadius: tingkat kepekatan Gaussian blur (default: 16)
 */
async function censorScreenshot(imageBuffer, options = {}) {
    const {
        maskMode = 'blur',
        solidColor = null,
        blurRadius = 16
    } = options;

    try {
        if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
            throw new Error('Buffer gambar kosong atau tidak valid.');
        }

        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width || 800;
        const imgHeight = metadata.height || 1200;

        // Normalisasi skala ke lebar standar 1080px agar deteksi font kecil struk selalu presisi
        const targetW = 1080;
        const scaledW = targetW;
        const scaledH = Math.round((imgHeight * targetW) / imgWidth);
        const scaleX = imgWidth / scaledW;
        const scaleY = imgHeight / scaledH;

        // Pipeline optimal untuk OCR: Normalisasi kontras
        const basePipeline = sharp(imageBuffer)
            .resize(scaledW, scaledH, { fit: 'fill' })
            .grayscale()
            .normalize();

        const [rawGrayObj, ocrBuffer] = await Promise.all([
            basePipeline.clone().raw().toBuffer({ resolveWithObject: true }),
            basePipeline.clone().jpeg({ quality: 95 }).toBuffer()
        ]);

        const rawBoxes = [];
        const detectedTypes = new Set();

        // 1. DETEKSI BARCODE & QR CODE GLOBAL DENGAN @zxing/library
        try {
            const zxingBoxes = await detectBarcodesWithZXing(
                rawGrayObj.data,
                rawGrayObj.info.width,
                rawGrayObj.info.height,
                scaleX,
                scaleY
            );
            if (zxingBoxes.length > 0) {
                detectedTypes.add('Barcode/QR Code (ZXing)');
                for (const b of zxingBoxes) {
                    rawBoxes.push(b);
                }
            }
        } catch (_) {}

        // 2. OCR EKSTRAKSI TEKS (TESSERACT) DENGAN PENGATURAN MUTEX
        let ocrData = null;
        try {
            ocrData = await workerMutex.runExclusive(async () => {
                const worker = await getWorker();
                const res = await worker.recognize(ocrBuffer, {}, { blocks: true });
                return res.data;
            });
        } catch (ocrErr) {
            console.warn('[censorService] Warning: OCR Tesseract mengalami gangguan:', ocrErr.message);
        }

        const lines = [];
        const blocks = (ocrData && ocrData.blocks) ? ocrData.blocks : [];
        for (const block of blocks) {
            for (const para of block.paragraphs || []) {
                for (const line of para.lines || []) {
                    lines.push(line);
                }
            }
        }

        // 3. ANALISIS STRUKTUR KARTU & BOUNDS
        const isMobileAspect = imgHeight > imgWidth;
        const headerTopLimit = isMobileAspect ? (imgHeight / scaleY) * 0.030 : 0;
        const headerBottomLimit = isMobileAspect ? (imgHeight / scaleY) * 0.120 : 0;
        const systemStatusRegex = /^(online|daring|terakhir dilihat|last seen|mengetik|typing|ketuk di sini|info kontak|\d{1,2}[:\.]\d{2}|\d{1,3}%)$/i;

        let cardLeft = Math.floor(imgWidth * 0.06);
        let cardRight = Math.floor(imgWidth * 0.67);

        for (const line of lines) {
            const text = normalizeText(line.text);
            const lower = text.toLowerCase();
            const mapped = mapBbox(line.bbox, scaleX, scaleY);
            if (!mapped) continue;

            if (lower.includes('aloysia') || lower.includes('seabank') || lower.includes('transfer') || lower.includes('pembayaran') || lower.includes('transaksi') || lower.includes('realtime online')) {
                cardRight = Math.max(cardRight, mapped.x1);
                cardLeft = Math.min(cardLeft, mapped.x0);
            }
        }
        cardRight = Math.min(cardRight, Math.floor(imgWidth * 0.68));
        const safeCardRight = cardRight;

        let seaBankHeaderLine = null;
        let aloysiaLine = null;
        let senderLine = null;
        let imeiHeaderLine = null;
        let bcaHeaderLine = null;
        let jumlahTransferLine = null;
        let isQrisCardDetected = false;
        let qrisCardBbox = null;

        for (const line of lines) {
            const lineText = normalizeText(line.text);
            const lowerLine = lineText.toLowerCase();
            const mappedLine = mapBbox(line.bbox, scaleX, scaleY);
            const words = line.words || [];

            // A. WhatsApp Top Navigation Bar Contact Header
            if (isMobileAspect && line.bbox && line.bbox.y0 >= headerTopLimit && line.bbox.y1 <= headerBottomLimit) {
                if (!systemStatusRegex.test(lineText) && lineText.length >= 2) {
                    rawBoxes.push({
                        x0: Math.floor(imgWidth * 0.12),
                        y0: Math.max(0, mappedLine.y0 - 4),
                        x1: Math.floor(imgWidth * 0.72),
                        y1: Math.min(imgHeight, mappedLine.y1 + 4)
                    });
                    detectedTypes.add('WhatsApp Header Contact');
                    continue;
                }
            }

            // B. WhatsApp Quoted Reply Header (misal "Yoshua cust imei")
            if (lowerLine.includes('cust') && !/\d{5,}/.test(lineText) && mappedLine && mappedLine.y0 < imgHeight * 0.60) {
                if (words.length >= 1 && words.length <= 5 && !lowerLine.includes('oke kak') && !lowerLine.includes('done')) {
                    rawBoxes.push({
                        x0: Math.max(0, mappedLine.x0 - 4),
                        y0: Math.max(0, mappedLine.y0 - 2),
                        x1: Math.min(imgWidth, mappedLine.x1 + 6),
                        y1: Math.min(imgHeight, mappedLine.y1 + 2)
                    });
                    detectedTypes.add('WhatsApp Reply Quote');
                }
            }

            // C. Nomor HP & No Rekening pada Chat Bubble (+62... / 08... / 901985232254)
            if (/^(?:\+?62|08)[\d\s-]{8,16}/.test(lineText) || (/\bimei\b/i.test(lineText) && /[\d\s]{8,}/.test(lineText)) || /\b\d{9,16}\b/.test(lineText)) {
                for (const w of words) {
                    const wText = normalizeText(w.text);
                    if (/^(?:\+?62|08)/.test(wText) || /[\d-]{6,}/.test(wText) || (/^\d+$/.test(wText) && wText.length >= 4) || (/^\d{3,4}$/.test(wText) && /\bimei\b/i.test(lineText))) {
                        const mW = mapBbox(w.bbox, scaleX, scaleY);
                        if (mW) {
                            rawBoxes.push({
                                x0: Math.max(0, mW.x0 - 3),
                                y0: Math.max(0, mW.y0 - 2),
                                x1: Math.min(imgWidth, mW.x1 + 3),
                                y1: Math.min(imgHeight, mW.y1 + 2)
                            });
                            detectedTypes.add('Nomor HP/Rekening/IMEI Chat');
                        }
                    }
                }
            }

            // D. Struk SeaBank Header
            if (/bukti\s*transaksi|pembayaran\s*diterima/i.test(lineText)) {
                seaBankHeaderLine = mappedLine;
            }

            // E. Struk BCA Header
            if (/transfer\s*berhasil|pembayaran\s*qris\s*berhasil/i.test(lineText)) {
                bcaHeaderLine = mappedLine;
            }

            // F. Baris Penerima Aloysia Omega
            if (lowerLine.includes('aloysia') || lowerLine.includes('omega')) {
                aloysiaLine = { mapped: mappedLine, lineText, words };
            }

            // G. Baris Pengirim
            if (/^(?:dari|pengirim|dar|dan|dati)\b/i.test(lineText) || lowerLine.startsWith('dari') || lowerLine.startsWith('dar ')) {
                senderLine = { mapped: mappedLine, lineText, words };
            }

            // H. Kartu IMEI Header
            if (/bagikan\s*pengenal|memindai\s*kode\s*bar/i.test(lineText) || (lowerLine.includes('imei') && lowerLine.includes('perangkat'))) {
                if (!imeiHeaderLine || mappedLine.y1 > imeiHeaderLine.y1) {
                    imeiHeaderLine = mappedLine;
                }
            }

            // I. QRIS Voucher Detection
            if (/qris/i.test(lineText) || /satu\s*qris/i.test(lineText) || /dicetak\s*oleh/i.test(lineText)) {
                isQrisCardDetected = true;
                if (mappedLine) {
                    if (!qrisCardBbox) {
                        qrisCardBbox = { ...mappedLine };
                    } else {
                        qrisCardBbox.x0 = Math.min(qrisCardBbox.x0, mappedLine.x0);
                        qrisCardBbox.y0 = Math.min(qrisCardBbox.y0, mappedLine.y0);
                        qrisCardBbox.x1 = Math.max(qrisCardBbox.x1, mappedLine.x1);
                        qrisCardBbox.y1 = Math.max(qrisCardBbox.y1, mappedLine.y1);
                    }
                }
            }

            // J. ATURAN KHUSUS "ALOYSIA OMEGA NOVENA PUTRI":
            // SENSOR HANYA "Novena Putri", "Aloysia Omega" TETAP TERLIHAT 100%!
            if (lowerLine.includes('novena') || lowerLine.includes('putri')) {
                for (const wordObj of words) {
                    if (!wordObj.bbox) continue;
                    const wClean = normalizeText(wordObj.text).toLowerCase().replace(/[^a-z]/g, '');
                    if (wClean.includes('novena') || wClean.includes('putri')) {
                        const mW = mapBbox(wordObj.bbox, scaleX, scaleY);
                        if (mW) {
                            rawBoxes.push({
                                x0: Math.max(0, mW.x0 - 3),
                                y0: Math.max(0, mW.y0 - 2),
                                x1: Math.min(safeCardRight, mW.x1 + 15),
                                y1: Math.min(imgHeight, mW.y1 + 2)
                            });
                            detectedTypes.add('Novena Putri (Sensor Presisi)');
                        }
                    }
                }
            }

            // K. Nominal Besar di Header Struk (misal Rp 45.000 / Rp 90.000 / IDR 145,000.00)
            if (/(?:rp|idr)\.?\s*[\d.,]+/i.test(lineText)) {
                for (const w of words) {
                    if (!w.bbox) continue;
                    const wClean = normalizeText(w.text);
                    if (/^(?:rp|idr)\.?/i.test(wClean) || /[\d.,]{4,}/.test(wClean)) {
                        const mW = mapBbox(w.bbox, scaleX, scaleY);
                        rawBoxes.push({
                            x0: Math.max(0, mW.x0 - 4),
                            y0: Math.max(0, mW.y0 - 3),
                            x1: Math.min(safeCardRight, mW.x1 + 6),
                            y1: Math.min(imgHeight, mW.y1 + 3)
                        });
                        detectedTypes.add('Nominal Pembayaran Rp');
                    }
                }
            }

            // L. SeaBank: Nilai "Jumlah Transfer" dan "Jumlah Total"
            if (/jumlah\s*transfer/i.test(lineText)) {
                jumlahTransferLine = mappedLine;
            }
            if (/jumlah\s*transfer|jumlah\s*total/i.test(lineText)) {
                for (const w of words) {
                    const wClean = normalizeText(w.text);
                    if (/^(?:rp|idr)\.?/i.test(wClean) || /[\d.,]{4,}/.test(wClean)) {
                        const mW = mapBbox(w.bbox, scaleX, scaleY);
                        rawBoxes.push({
                            x0: Math.max(0, mW.x0 - 4),
                            y0: Math.max(0, mW.y0 - 2),
                            x1: Math.min(safeCardRight, mW.x1 + 18),
                            y1: Math.min(imgHeight, mW.y1 + 2)
                        });
                        detectedTypes.add('Nominal Transfer SeaBank');
                    }
                }
            }

            // M. SeaBank: Baris "No. Transaksi"
            if (/no\.?\s*transaksi/i.test(lineText) || /\b202610\d{6,}/.test(lineText) || /^\d{4,}\s*[©]?$/.test(lineText)) {
                for (const w of words) {
                    const wClean = normalizeText(w.text);
                    if (/\d{4,}/.test(wClean)) {
                        const mW = mapBbox(w.bbox, scaleX, scaleY);
                        rawBoxes.push({
                            x0: Math.max(0, mW.x0 - 4),
                            y0: Math.max(0, mW.y0 - 2),
                            x1: Math.min(safeCardRight, mW.x1 + 10),
                            y1: Math.min(imgHeight, mW.y1 + Math.round(28 * scaleY))
                        });
                        detectedTypes.add('No. Transaksi SeaBank');
                    }
                }
            }

            // N. NOMOR REKENING SEABANK (SEMUA REKENING DI-BLUR, TERMASUK MILIK ALOYSIA)
            if (/seabank/i.test(lineText) && /[\*\d]{4,}/.test(lineText)) {
                for (const w of words) {
                    const wClean = normalizeText(w.text);
                    if (/[\*\d]{4,}/.test(wClean)) {
                        const mW = mapBbox(w.bbox, scaleX, scaleY);
                        rawBoxes.push({
                            x0: Math.max(0, mW.x0 - 4),
                            y0: Math.max(0, mW.y0 - 2),
                            x1: Math.min(safeCardRight, mW.x1 + 6),
                            y1: Math.min(imgHeight, mW.y1 + 2)
                        });
                        detectedTypes.add('Nomor Rekening SeaBank');
                    }
                }
            }

            // O. BCA: No. Rekening Tujuan / Bank Tujuan / Data PAN / Ref / RRN
            if (/no\.?\s*rekening|bank\s*tujuan|merchant\s*pan|customer\s*pan|\brrn\b|\bref\b/i.test(lineText)) {
                for (const w of words) {
                    const wClean = normalizeText(w.text);
                    if (/[\d-]{3,}/.test(wClean)) {
                        const mW = mapBbox(w.bbox, scaleX, scaleY);
                        rawBoxes.push({
                            x0: Math.max(0, mW.x0 - 4),
                            y0: Math.max(0, mW.y0 - 2),
                            x1: Math.min(safeCardRight, mW.x1 + 10),
                            y1: Math.min(imgHeight, mW.y1 + 2)
                        });
                        detectedTypes.add('Data Rekening Tujuan BCA');
                    }
                }
            }
        }

        // P. SENSOR NAMA PENGIRIM (CUSTOMER) + REKENING PENGIRIM PADA SEABANK
        if (senderLine) {
            let senderWords = senderLine.words.filter(w => {
                const clean = normalizeText(w.text).toLowerCase().replace(/[^a-z]/g, '');
                return !['dari', 'dar', 'dan', 'dati'].includes(clean);
            });
            if (senderWords.length > 0) {
                const firstW = mapBbox(senderWords[0].bbox, scaleX, scaleY);
                const lastW = mapBbox(senderWords[senderWords.length - 1].bbox, scaleX, scaleY);
                const bottomLimit = aloysiaLine ? aloysiaLine.mapped.y0 - 6 : senderLine.mapped.y1 + Math.round(28 * scaleY);
                rawBoxes.push({
                    x0: Math.max(0, firstW.x0 - 4),
                    y0: Math.max(0, senderLine.mapped.y0 - 3),
                    x1: Math.min(safeCardRight, lastW.x1 + 4),
                    y1: Math.min(imgHeight, bottomLimit)
                });
                detectedTypes.add('Nama & Rekening Pengirim (Customer)');
            }
        }

        // Q. SENSOR NOMOR REKENING SEABANK ALOYSIA DI BAWAH NAMA TOKO
        // Terletak persis di bawah baris "Aloysia Omega" dan di atas baris "Jumlah Transfer"
        if (aloysiaLine && !bcaHeaderLine) {
            const bottomSeaBank = jumlahTransferLine
                ? Math.max(aloysiaLine.mapped.y1 + 10, jumlahTransferLine.y0 - Math.round(imgHeight * 0.008))
                : aloysiaLine.mapped.y1 + Math.round(imgHeight * 0.045);

            rawBoxes.push({
                x0: Math.floor(cardLeft + (safeCardRight - cardLeft) * 0.25),
                y0: Math.max(0, aloysiaLine.mapped.y1 + 1),
                x1: safeCardRight,
                y1: Math.min(imgHeight, bottomSeaBank)
            });
            detectedTypes.add('No. Rekening SeaBank Aloysia');
        }

        // R. KARTU IMEI: TUTUP LENGKAP NOMOR IMEI 1, IMEI 2 & SEMUA GARIS BARCODE HINGGA DASAR KARTU
        if (imeiHeaderLine) {
            let lastImeiLineY = imeiHeaderLine.y1 + Math.round(imgHeight * 0.15);
            for (const line of lines) {
                const text = normalizeText(line.text).toLowerCase();
                const mapped = mapBbox(line.bbox, scaleX, scaleY);
                if (mapped && mapped.y0 > imeiHeaderLine.y1 && (text.includes('imei') || /\b\d{10,15}\b/.test(text) || text.includes('wii') || text.includes('||') || mapped.y0 < imeiHeaderLine.y1 + Math.round(imgHeight * 0.32))) {
                    if (mapped.y0 < imgHeight * 0.92) {
                        lastImeiLineY = Math.max(lastImeiLineY, mapped.y1);
                    }
                }
            }

            const imeiBottom = Math.min(lastImeiLineY + Math.round(imgHeight * 0.065), Math.floor(imgHeight * 0.915));

            // Gunakan lebar compact: 8% sampai 61.5% lebar layar agar selalu di dalam kartu putih (zero-leak)
            rawBoxes.push({
                x0: Math.floor(imgWidth * 0.08),
                y0: Math.floor(imeiHeaderLine.y1 + 10),
                x1: Math.floor(imgWidth * 0.615),
                y1: Math.floor(imeiBottom)
            });
            detectedTypes.add('Barcode & IMEI Lengkap');
        }

        // S. QR CODE QRIS GRAFIS
        if (isQrisCardDetected && qrisCardBbox) {
            const qrCardTop = Math.max(0, qrisCardBbox.y0 - Math.round(imgHeight * 0.22));
            const qrCardBottom = qrisCardBbox.y0 - Math.round(imgHeight * 0.015);

            rawBoxes.push({
                x0: Math.floor(imgWidth * 0.35),
                y0: Math.floor(qrCardTop),
                x1: Math.floor(imgWidth * 0.94),
                y1: Math.floor(qrCardBottom)
            });
            detectedTypes.add('QR Code QRIS');
        }

        // 4. MERGE BOUNDING BOXES (DISJOINT-SET UNION)
        const mergedBoxes = mergeBoundingBoxes(rawBoxes, imgWidth, imgHeight, 3, 2);

        if (mergedBoxes.length === 0) {
            const fallback = await sharp(imageBuffer).jpeg({ quality: 92 }).toBuffer();
            return {
                censoredBuffer: fallback,
                boxesCount: 0,
                detectedTypes: []
            };
        }

        // 5. EKSEKUSI MASKING RAPI (PATCH-BY-PATCH FROSTED BLUR & SOLID BLOCKS)
        let censoredBuffer = null;

        if (maskMode === 'solid') {
            let fillColor = solidColor;
            let strokeColor = solidColor;

            if (!fillColor) {
                const stats = await sharp(imageBuffer).stats();
                const avgLuma = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
                if (avgLuma < 110) {
                    fillColor = '#1e293b';
                    strokeColor = '#334155';
                } else {
                    fillColor = '#e2e8f0';
                    strokeColor = '#cbd5e1';
                }
            }

            const rectsSvg = mergedBoxes.map(b => {
                const w = Math.max(1, b.x1 - b.x0);
                const h = Math.max(1, b.y1 - b.y0);
                return `<rect x="${b.x0}" y="${b.y0}" width="${w}" height="${h}" rx="6" ry="6" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1" />`;
            }).join('');

            const svgOverlay = Buffer.from(`<svg width="${imgWidth}" height="${imgHeight}">${rectsSvg}</svg>`);

            censoredBuffer = await sharp(imageBuffer)
                .composite([{ input: svgOverlay, top: 0, left: 0 }])
                .jpeg({ quality: 92 })
                .toBuffer();

        } else {
            // Masking Frosted Blur Presisi (Patch-by-Patch)
            const compositeOverlays = await Promise.all(
                mergedBoxes.map(async (box) => {
                    const left = Math.max(0, box.x0);
                    const top = Math.max(0, box.y0);
                    const width = Math.min(imgWidth - left, box.x1 - box.x0);
                    const height = Math.min(imgHeight - top, box.y1 - box.y0);

                    if (width < 4 || height < 4) return null;

                    const patch = await sharp(imageBuffer)
                        .extract({ left, top, width, height })
                        .resize(Math.max(4, Math.floor(width / 4)), Math.max(4, Math.floor(height / 4)), { fit: 'fill' })
                        .resize(width, height, { fit: 'fill', kernel: 'cubic' })
                        .blur(blurRadius)
                        .toBuffer();

                    return { input: patch, left, top };
                })
            );

            const validOverlays = compositeOverlays.filter(Boolean);

            censoredBuffer = await sharp(imageBuffer)
                .composite(validOverlays)
                .jpeg({ quality: 94 })
                .toBuffer();
        }

        return {
            censoredBuffer,
            boxesCount: mergedBoxes.length,
            detectedTypes: Array.from(detectedTypes)
        };

    } catch (err) {
        console.error('[censorService] Error processing image censor:', err.message);
        let fallback = imageBuffer;
        try {
            if (Buffer.isBuffer(imageBuffer) && imageBuffer.length > 0) {
                fallback = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
            }
        } catch (_) {}
        return {
            censoredBuffer: fallback,
            boxesCount: 0,
            detectedTypes: []
        };
    }
}

/**
 * Pembersihan worker saat server shutdown
 */
async function terminateWorker() {
    if (tesseractWorker) {
        try {
            await tesseractWorker.terminate();
            tesseractWorker = null;
        } catch (_) {}
    }
}

module.exports = {
    censorScreenshot,
    mergeBoundingBoxes,
    detectBarcodesWithZXing,
    terminateWorker
};
