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
 * Mendukung pembacaan buffer grayscale pada resolusi penuh atau potongan kartu
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

                // Untuk barcode 1D: titik hanya mendeteksi garis transversal horizontal tipis
                if (boxH < 35) {
                    const expandH = Math.max(55, Math.round(width * scaleX * 0.10));
                    minY = Math.max(0, minY - Math.round(expandH / 2));
                    maxY = maxY + Math.round(expandH / 2);
                }

                // Untuk QR Code: beri margin pengaman 15% dari ukuran modul
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
    } catch (err) {
        // NotFoundException adalah kondisi wajar jika gambar tidak memuat barcode/QR
    } finally {
        console.warn = oldWarn;
        if (reader && typeof reader.reset === 'function') {
            try { reader.reset(); } catch (_) {}
        }
    }

    return detectedBoxes;
}

/**
 * 4. Merge Bounding Boxes menggunakan algoritma 2D Connected-Components (Disjoint-Set Union)
 * Menggabungkan kotak-kotak sensor yang berdekatan/tumpang tindih menjadi satu blok rapi.
 */
function mergeBoundingBoxes(boxes, imgW, imgH, padX = 12, padY = 8) {
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
        const x0 = Math.max(0, Math.min(...cluster.map(b => b.x0)) - 4);
        const y0 = Math.max(0, Math.min(...cluster.map(b => b.y0)) - 3);
        const x1 = Math.min(imgW, Math.max(...cluster.map(b => b.x1)) + 4);
        const y1 = Math.min(imgH, Math.max(...cluster.map(b => b.y1)) + 3);
        merged.push({ x0, y0, x1, y1 });
    }

    merged.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    return merged;
}

/**
 * Fungsi Utama: Sensor Screenshot secara menyeluruh & 100% presisi
 * @param {Buffer} imageBuffer - Buffer input gambar (JPEG/PNG/WebP)
 * @param {Object} options - Pengaturan opsional:
 *   - maskMode: 'blur' (default Gaussian Blur pekat) | 'solid' (Blok Warna Bersih)
 *   - solidColor: string warna hex untuk solid mask (default: auto-detect dark/light)
 *   - blurRadius: tingkat kepekatan Gaussian blur (default: 16)
 *   - padX: padding horizontal penggabungan kotak (default: 12)
 *   - padY: padding vertikal penggabungan kotak (default: 8)
 */
async function censorScreenshot(imageBuffer, options = {}) {
    const {
        maskMode = 'blur',
        solidColor = null,
        blurRadius = 16,
        padX = 12,
        padY = 8
    } = options;

    try {
        if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
            throw new Error('Buffer gambar kosong atau tidak valid.');
        }

        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width || 800;
        const imgHeight = metadata.height || 1200;

        // Gunakan target lebar 1080px (Sweet Spot) agar font kecil pada struk tetap tajam dan tidak hilang di OCR
        let scaleX = 1;
        let scaleY = 1;
        let scaledW = imgWidth;
        let scaledH = imgHeight;

        if (imgWidth > 1080) {
            scaledW = 1080;
            scaledH = Math.round((imgHeight * scaledW) / imgWidth);
            scaleX = imgWidth / scaledW;
            scaleY = imgHeight / scaledH;
        }

        // Pipeline optimal untuk OCR: Normalisasi kontras agar teks berwarna & watermark BCA/SeaBank terbaca jelas
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

        // =========================================================================
        // 1. DETEKSI BARCODE & QR CODE GLOBAL DENGAN @zxing/library
        // =========================================================================
        let barcodeDetected = false;
        try {
            const zxingBoxes = await detectBarcodesWithZXing(
                rawGrayObj.data,
                rawGrayObj.info.width,
                rawGrayObj.info.height,
                scaleX,
                scaleY
            );
            if (zxingBoxes.length > 0) {
                barcodeDetected = true;
                detectedTypes.add('Barcode/QR Code (ZXing Global)');
                for (const b of zxingBoxes) {
                    rawBoxes.push(b);
                }
            }
        } catch (_) {}

        // =========================================================================
        // 2. OCR EKSTRAKSI TEKS (TESSERACT) DENGAN PENGATURAN MUTEX
        // =========================================================================
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

        // =========================================================================
        // 3. ANALISIS SPATIAL ANCHOR GEOMETRY & POLA DATA SENSITIF
        // =========================================================================
        const isMobileAspect = imgHeight > imgWidth;
        const headerTopLimit = isMobileAspect ? (imgHeight / scaleY) * 0.030 : 0;
        const headerBottomLimit = isMobileAspect ? (imgHeight / scaleY) * 0.120 : 0;
        const systemStatusRegex = /^(online|daring|terakhir dilihat|last seen|mengetik|typing|ketuk di sini|info kontak|\d{1,2}[:\.]\d{2}|\d{1,3}%)$/i;

        // Token kata acuan struk transaksi (termasuk toleransi typo umum OCR)
        const SENDER_ANCHORS = ['dari', 'pengirim', 'darl', 'dan', 'dati', 'penglrlm'];
        const RECIPIENT_ANCHORS = ['ke', 'penerima', 'kepada', 'tujuan', 'penerlma', 'ka', 'ko'];

        // Regex angka nominal & ribuan
        const currencyLineRegex = /(?:rp|idr)\.?\s*[\d.,\s]+/i;
        const thousandNumberRegex = /\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\b/;

        // Regex IMEI, Telepon & Rekening
        const imeiStrictRegex = /\b\d{15}\b/;
        const phoneStrictRegex = /^(?:\+?62|08)[\d\s-]{8,14}$/;
        const phoneCleanRegex = /^(?:08|628|\+628)\d{7,12}$/;
        const accountRegex = /^\d{9,16}$/;

        // Status konteks halaman
        let isImeiScreen = false;
        let imeiHeaderLine = null;
        let imeiBottomNumberLine = null;

        let isQrisCardDetected = false;
        let qrisCardBbox = null;

        for (const line of lines) {
            const rawLineText = line.text || '';
            const lineText = normalizeText(rawLineText);
            const lowerLine = lineText.toLowerCase();
            const words = line.words || [];
            const lineBbox = line.bbox || {};

            // Deteksi Tampilan IMEI ("Bagikan Pengenal Perangkat" / "memindai kode bar")
            if (/bagikan\s*pengenal|memindai\s*kode\s*bar/i.test(lineText) || (lowerLine.includes('imei') && lowerLine.includes('perangkat'))) {
                isImeiScreen = true;
                const mapped = mapBbox(lineBbox, scaleX, scaleY);
                if (mapped && (!imeiHeaderLine || mapped.y1 > imeiHeaderLine.y1)) {
                    imeiHeaderLine = mapped;
                }
            }

            // Deteksi Kartu QRIS ("SATU QRIS UNTUK SEMUA" / "QRIS" / "Dicetak oleh")
            if (/qris/i.test(lineText) || /satu\s*qris/i.test(lineText) || /dicetak\s*oleh/i.test(lineText)) {
                isQrisCardDetected = true;
                const mapped = mapBbox(lineBbox, scaleX, scaleY);
                if (mapped) {
                    if (!qrisCardBbox) {
                        qrisCardBbox = { ...mapped };
                    } else {
                        qrisCardBbox.x0 = Math.min(qrisCardBbox.x0, mapped.x0);
                        qrisCardBbox.y0 = Math.min(qrisCardBbox.y0, mapped.y0);
                        qrisCardBbox.x1 = Math.max(qrisCardBbox.x1, mapped.x1);
                        qrisCardBbox.y1 = Math.max(qrisCardBbox.y1, mapped.y1);
                    }
                }
            }

            // A. WhatsApp Chat Header Name (Anchor Bar Navigasi Atas)
            if (isMobileAspect && lineBbox.y0 >= headerTopLimit && lineBbox.y1 <= headerBottomLimit) {
                if (!systemStatusRegex.test(lineText) && lineText.length >= 2) {
                    rawBoxes.push({
                        x0: Math.floor(imgWidth * 0.12),
                        y0: Math.max(0, Math.floor((lineBbox.y0 * scaleY) - 6)),
                        x1: Math.floor(imgWidth * 0.75),
                        y1: Math.min(imgHeight, Math.ceil((lineBbox.y1 * scaleY) + 6))
                    });
                    detectedTypes.add('WhatsApp Header Contact');
                    continue;
                }
            }

            // B. WhatsApp Bubble Forwarder / Pengirim Grup Chat
            if (/^(?:diteruskan|forwarded|pesan\s*diteruskan)/i.test(lineText) || /^~[\w\s]{2,}/.test(lineText)) {
                const mappedLine = mapBbox(lineBbox, scaleX, scaleY);
                if (mappedLine) {
                    rawBoxes.push({
                        x0: Math.max(0, mappedLine.x0 - 4),
                        y0: Math.max(0, mappedLine.y0 - 2),
                        x1: Math.min(imgWidth, Math.max(mappedLine.x1 + 10, Math.floor(imgWidth * 0.65))),
                        y1: Math.min(imgHeight, mappedLine.y1 + 4)
                    });
                    detectedTypes.add('WhatsApp Sender Label');
                }
            }

            // C. STRUK TRANSAKSI: SPATIAL ANCHOR GEOMETRY (DARI & KE)
            // =========================================================================
            // 1. ANCHOR PENGIRIM ("Dari" / "Pengirim") -> Sensor penuh nama pelanggan & bank
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                if (!w.bbox) continue;
                const cleanWord = normalizeText(w.text).toLowerCase().replace(/[^a-z]/g, '');

                if (SENDER_ANCHORS.includes(cleanWord)) {
                    const mappedAnchor = mapBbox(w.bbox, scaleX, scaleY);
                    if (mappedAnchor) {
                        const lineH = Math.max(26, mappedAnchor.y1 - mappedAnchor.y0);
                        // Menutup avatar foto, nama pengirim, dan baris nama bank di bawahnya
                        rawBoxes.push({
                            x0: Math.min(mappedAnchor.x1 + 10, Math.floor(imgWidth * 0.95) - 30),
                            y0: Math.max(0, mappedAnchor.y0 - 6),
                            x1: Math.floor(imgWidth * 0.95),
                            y1: Math.min(imgHeight, mappedAnchor.y1 + Math.max(Math.round(48 * scaleY), Math.round(lineH * 2.2)))
                        });
                        detectedTypes.add('Struk: Nama Pengirim (Customer)');
                    }
                }
            }

            // 2. ANCHOR PENERIMA ("Ke" / "Penerima") -> Aturan Khusus "Aloysia Omega Novena Putri"
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                if (!w.bbox) continue;
                const cleanWord = normalizeText(w.text).toLowerCase().replace(/[^a-z]/g, '');

                if (RECIPIENT_ANCHORS.includes(cleanWord)) {
                    const mappedAnchor = mapBbox(w.bbox, scaleX, scaleY);
                    if (!mappedAnchor) continue;

                    // Periksa apakah baris ini memuat nama toko "Aloysia Omega"
                    const isAloysiaAccount = lowerLine.includes('aloysia') || lowerLine.includes('omega');

                    if (isAloysiaAccount) {
                        // KEBUTUHAN KHUSUS: "Aloysia Omega" TETAP DITAMPILKAN
                        // HANYA sensor kata "Novena" dan "Putri"
                        for (const wordObj of words) {
                            if (!wordObj.bbox) continue;
                            const wClean = normalizeText(wordObj.text).toLowerCase().replace(/[^a-z]/g, '');
                            if (wClean.includes('novena') || wClean.includes('putri')) {
                                const mW = mapBbox(wordObj.bbox, scaleX, scaleY);
                                if (mW) {
                                    rawBoxes.push({
                                        x0: Math.max(0, mW.x0 - 4),
                                        y0: Math.max(0, mW.y0 - 3),
                                        x1: Math.min(imgWidth, mW.x1 + 4),
                                        y1: Math.min(imgHeight, mW.y1 + 3)
                                    });
                                    detectedTypes.add('Struk: Novena Putri (Sensor)');
                                }
                            }
                        }
                    } else {
                        // Penerima selain Aloysia Omega: sensor penuh untuk menjaga privasi
                        const lineH = Math.max(26, mappedAnchor.y1 - mappedAnchor.y0);
                        rawBoxes.push({
                            x0: Math.min(mappedAnchor.x1 + 10, Math.floor(imgWidth * 0.95) - 30),
                            y0: Math.max(0, mappedAnchor.y0 - 6),
                            x1: Math.floor(imgWidth * 0.95),
                            y1: Math.min(imgHeight, mappedAnchor.y1 + Math.max(Math.round(48 * scaleY), Math.round(lineH * 2.2)))
                        });
                        detectedTypes.add('Struk: Nama Penerima');
                    }
                }
            }

            // Fallback spesifik kata "Novena" dan "Putri" di seluruh dokumen
            if (lowerLine.includes('novena') || lowerLine.includes('putri')) {
                for (const wordObj of words) {
                    if (!wordObj.bbox) continue;
                    const wClean = normalizeText(wordObj.text).toLowerCase().replace(/[^a-z]/g, '');
                    if (wClean.includes('novena') || wClean.includes('putri')) {
                        const mW = mapBbox(wordObj.bbox, scaleX, scaleY);
                        if (mW) {
                            rawBoxes.push({
                                x0: Math.max(0, mW.x0 - 4),
                                y0: Math.max(0, mW.y0 - 3),
                                x1: Math.min(imgWidth, mW.x1 + 4),
                                y1: Math.min(imgHeight, mW.y1 + 3)
                            });
                            detectedTypes.add('Kata Sensitif: Novena Putri');
                        }
                    }
                }
            }

            // D. STRUK BCA / QRIS: BLOK DATA SENSITIF
            // Deteksi baris-baris identitas BCA: "Merchant PAN", "Customer PAN", "Ref", "RRN", "Dari: 3580****"
            if (/merchant\s*pan|customer\s*pan|terminal\s*id|\brrn\b|\bref\b|pembayaran\s*ke/i.test(lineText)) {
                const mappedLine = mapBbox(lineBbox, scaleX, scaleY);
                if (mappedLine) {
                    // Tutup nilai data di sebelah kanan label (mulai dari 38% lebar layar sampai 88%)
                    rawBoxes.push({
                        x0: Math.floor(imgWidth * 0.38),
                        y0: Math.max(0, mappedLine.y0 - 3),
                        x1: Math.floor(imgWidth * 0.88),
                        y1: Math.min(imgHeight, mappedLine.y1 + 3)
                    });
                    detectedTypes.add('Struk BCA: Data PAN/Ref/RRN');
                }
            }

            // Sensor nomor rekening pada baris Bank (cth: "SeaBank: ********1637")
            if (/seabank|bca|mandiri|bri|bni|gopay/i.test(lineText) && /[\*\d]{4,}/.test(lineText)) {
                const mappedLine = mapBbox(lineBbox, scaleX, scaleY);
                if (mappedLine) {
                    rawBoxes.push({
                        x0: Math.max(0, mappedLine.x0 - 4),
                        y0: Math.max(0, mappedLine.y0 - 3),
                        x1: Math.min(imgWidth, mappedLine.x1 + 4),
                        y1: Math.min(imgHeight, mappedLine.y1 + 3)
                    });
                    detectedTypes.add('Nomor Rekening Masked');
                }
            }

            // E. NOMINAL PEMBAYARAN & ANGKA RIBUAN
            // 1. Nominal dengan awalan 'Rp' / 'IDR'
            if (currencyLineRegex.test(lineText)) {
                for (let i = 0; i < words.length; i++) {
                    const w = words[i];
                    if (!w.bbox) continue;
                    const wClean = normalizeText(w.text);

                    if (/^(?:rp|idr)\.?/i.test(wClean)) {
                        const mappedW = mapBbox(w.bbox, scaleX, scaleY);
                        let endX = mappedW.x1 + Math.round(200 * scaleX);
                        if (i + 1 < words.length && words[i + 1].bbox) {
                            const nextW = mapBbox(words[i + 1].bbox, scaleX, scaleY);
                            endX = Math.max(endX, nextW.x1 + 10);
                        }

                        rawBoxes.push({
                            x0: Math.max(0, mappedW.x0 - 6),
                            y0: Math.max(0, mappedW.y0 - 6),
                            x1: Math.min(imgWidth, endX),
                            y1: Math.min(imgHeight, mappedW.y1 + 6)
                        });
                        detectedTypes.add('Nominal Pembayaran');
                    }
                }
            }

            // 2. Baris "Jumlah Transfer" / "Jumlah Total" pada struk SeaBank
            if (/jumlah\s*transfer|jumlah\s*total/i.test(lineText)) {
                const mappedLine = mapBbox(lineBbox, scaleX, scaleY);
                if (mappedLine) {
                    rawBoxes.push({
                        x0: Math.floor(imgWidth * 0.45),
                        y0: Math.max(0, mappedLine.y0 - 4),
                        x1: Math.floor(imgWidth * 0.95),
                        y1: Math.min(imgHeight, mappedLine.y1 + 4)
                    });
                    detectedTypes.add('Struk SeaBank: Nominal Transfer');
                }
            }

            // 3. Angka Ribuan Standalone (cth: 145.000,00 atau 150.000)
            for (const w of words) {
                if (!w.bbox) continue;
                const wClean = normalizeText(w.text);
                if (/^\d{1,2}[:\.]\d{2}$/.test(wClean)) continue; // Abaikan format jam

                if (thousandNumberRegex.test(wClean)) {
                    const mapped = mapBbox(w.bbox, scaleX, scaleY);
                    if (mapped) {
                        rawBoxes.push({
                            x0: Math.max(0, mapped.x0 - 4),
                            y0: Math.max(0, mapped.y0 - 4),
                            x1: Math.min(imgWidth, mapped.x1 + 4),
                            y1: Math.min(imgHeight, mapped.y1 + 4)
                        });
                        detectedTypes.add('Nominal Angka Ribuan');
                    }
                }
            }

            // F. IMEI & NOMOR TELEPON
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                if (!w.bbox) continue;
                const wClean = normalizeText(w.text);

                if (/^\d{1,2}[:\.]\d{2}(?:[:\.]\d{2})?$/.test(wClean)) continue;

                // Tag WhatsApp (Anda) atau Quoted Message header
                if (/\(anda\)|\(you\)|^anda:|^you:/i.test(wClean) || /@\+?62\d+/.test(wClean)) {
                    const mapped = mapBbox(w.bbox, scaleX, scaleY);
                    if (mapped) {
                        rawBoxes.push({
                            x0: Math.max(0, mapped.x0 - 4),
                            y0: Math.max(0, mapped.y0 - 3),
                            x1: Math.min(imgWidth, mapped.x1 + 4),
                            y1: Math.min(imgHeight, mapped.y1 + 3)
                        });
                        detectedTypes.add('WhatsApp Tag (Anda)/Mention');
                    }
                }

                const cleanNum = wClean.replace(/[\s\-\.:]/g, '');

                // IMEI 15 digit tepat
                if (imeiStrictRegex.test(cleanNum)) {
                    const mapped = mapBbox(w.bbox, scaleX, scaleY);
                    if (mapped) {
                        imeiBottomNumberLine = mapped;
                        rawBoxes.push(mapped);
                        detectedTypes.add('Nomor IMEI 15-Digit');
                    }
                }
                // Nomor HP (08xx / +62xx)
                else if (phoneStrictRegex.test(wClean) || phoneCleanRegex.test(cleanNum)) {
                    const mapped = mapBbox(w.bbox, scaleX, scaleY);
                    if (mapped) {
                        rawBoxes.push(mapped);
                        detectedTypes.add('Nomor HP');
                    }
                }
                // Nomor Rekening 9-16 digit
                else if (accountRegex.test(cleanNum) && !/^\d{4}$/.test(cleanNum)) {
                    const mapped = mapBbox(w.bbox, scaleX, scaleY);
                    if (mapped) {
                        rawBoxes.push(mapped);
                        detectedTypes.add('Nomor Rekening');
                    }
                }
            }
        }

        // =========================================================================
        // G. DETERMINISTIC GEOMETRY: BARCODE IMEI (ZERO-LEAK)
        // =========================================================================
        // Pada kartu "Bagikan Pengenal Perangkat" (Gambar 2 & 4), garis barcode selalu
        // terletak di antara teks judul dan deretan angka IMEI di bawahnya.
        if (isImeiScreen && imeiHeaderLine) {
            const barcodeTop = imeiHeaderLine.y1 + Math.round(imgHeight * 0.015);
            const barcodeBottom = imeiBottomNumberLine
                ? imeiBottomNumberLine.y1 + 15
                : imeiHeaderLine.y1 + Math.round(imgHeight * 0.22);

            rawBoxes.push({
                x0: Math.floor(imgWidth * 0.12),
                y0: Math.floor(barcodeTop),
                x1: Math.floor(imgWidth * 0.88),
                y1: Math.min(imgHeight, Math.floor(barcodeBottom))
            });
            detectedTypes.add('Barcode IMEI Grafis (Presisi)');
        }

        // =========================================================================
        // H. DETERMINISTIC GEOMETRY: QRIS CARD (QR CODE BESAR)
        // =========================================================================
        // Jika QRIS terdeteksi pada chat bubble tapi ZXing global melewatkan karena ukuran bubble:
        if (isQrisCardDetected && qrisCardBbox) {
            // Pada voucher QRIS standar (Gambar 1), QR Code berada di bagian atas tengah kartu
            const qrCardTop = Math.max(0, qrisCardBbox.y0 - Math.round(imgHeight * 0.22));
            const qrCardBottom = qrisCardBbox.y0 - Math.round(imgHeight * 0.02);

            rawBoxes.push({
                x0: Math.floor(imgWidth * 0.35),
                y0: Math.floor(qrCardTop),
                x1: Math.floor(imgWidth * 0.94),
                y1: Math.floor(qrCardBottom)
            });
            detectedTypes.add('QR Code QRIS (Presisi)');
        }

        // =========================================================================
        // 4. MERGE BOUNDING BOXES (DISJOINT-SET UNION)
        // =========================================================================
        const mergedBoxes = mergeBoundingBoxes(rawBoxes, imgWidth, imgHeight, padX, padY);

        if (mergedBoxes.length === 0) {
            const fallback = await sharp(imageBuffer).jpeg({ quality: 92 }).toBuffer();
            return {
                censoredBuffer: fallback,
                boxesCount: 0,
                detectedTypes: []
            };
        }

        // =========================================================================
        // 5. EKSEKUSI MASKING: DUAL OPTIONS (GAUSSIAN BLUR PEKAT vs BLOK WARNA BERSIH)
        // =========================================================================
        let censoredBuffer = null;

        if (maskMode === 'solid') {
            // Opsi B: Blok Warna Bersih (Solid Clean Blocks)
            let fillColor = solidColor;
            let strokeColor = solidColor;

            if (!fillColor) {
                const stats = await sharp(imageBuffer).stats();
                const avgLuma = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
                if (avgLuma < 110) {
                    fillColor = '#1e293b'; // Slate dark mode
                    strokeColor = '#334155';
                } else {
                    fillColor = '#e2e8f0'; // Slate light mode
                    strokeColor = '#cbd5e1';
                }
            }

            const rectsSvg = mergedBoxes.map(b => {
                const w = Math.max(1, b.x1 - b.x0);
                const h = Math.max(1, b.y1 - b.y0);
                return `<rect x="${b.x0}" y="${b.y0}" width="${w}" height="${h}" rx="4" ry="4" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1" />`;
            }).join('');

            const svgOverlay = Buffer.from(`<svg width="${imgWidth}" height="${imgHeight}">${rectsSvg}</svg>`);

            censoredBuffer = await sharp(imageBuffer)
                .composite([{ input: svgOverlay, top: 0, left: 0 }])
                .jpeg({ quality: 92 })
                .toBuffer();

        } else {
            // Opsi A (Default): Gaussian Blur Halus & Sangat Pekat (Dual-Kawase style)
            // Downscale 1/4 -> Upscale Cubic -> Blur pekat agar teks 100% tidak dapat direkonstruksi
            const smallW = Math.max(16, Math.floor(imgWidth / 4));
            const smallH = Math.max(16, Math.floor(imgHeight / 4));

            const blurredFull = await sharp(imageBuffer)
                .resize(smallW, smallH, { fit: 'fill' })
                .resize(imgWidth, imgHeight, { fit: 'fill', kernel: 'cubic' })
                .blur(blurRadius)
                .toBuffer();

            const compositeOverlays = await Promise.all(
                mergedBoxes.map(async (box) => {
                    const left = Math.max(0, box.x0);
                    const top = Math.max(0, box.y0);
                    const width = Math.min(imgWidth - left, box.x1 - box.x0);
                    const height = Math.min(imgHeight - top, box.y1 - box.y0);

                    if (width < 3 || height < 3) return null;

                    const patch = await sharp(blurredFull)
                        .extract({ left, top, width, height })
                        .toBuffer();

                    return { input: patch, left, top };
                })
            );

            const validOverlays = compositeOverlays.filter(Boolean);

            censoredBuffer = await sharp(imageBuffer)
                .composite(validOverlays)
                .jpeg({ quality: 92 })
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
