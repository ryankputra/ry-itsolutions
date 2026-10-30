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
 * Menggunakan kombinasi bahasa 'ind+eng' untuk presisi struk lokal & teks global
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
 * 1. Deteksi Barcode & QR Code Grafis menggunakan @zxing/library (MultiFormatReader)
 * Membaca buffer grayscale secara langsung tanpa menebak posisi dari teks.
 */
async function detectBarcodesWithZXing(grayBuffer, width, height, scaleX = 1, scaleY = 1) {
    const detectedBoxes = [];
    let reader = null;
    const oldWarn = console.warn;

    try {
        // Redam console.warn internal zxing saat barcode tidak ditemukan pada frame
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
                const xs = rawPoints.map(p => (typeof p.getX === 'function' ? p.getX() : p.x) * scaleX);
                const ys = rawPoints.map(p => (typeof p.getY === 'function' ? p.getY() : p.y) * scaleY);

                let minX = Math.min(...xs);
                let maxX = Math.max(...xs);
                let minY = Math.min(...ys);
                let maxY = Math.max(...ys);

                const boxW = maxX - minX;
                const boxH = maxY - minY;

                // Untuk barcode 1D (misal Code128/EAN), titik hanya mendeteksi garis transversal tipis
                if (boxH < 30) {
                    const expandH = Math.max(45, Math.round(width * scaleX * 0.08));
                    minY = Math.max(0, minY - Math.round(expandH / 2));
                    maxY = maxY + Math.round(expandH / 2);
                }

                // Untuk QR Code, titik mewakili pusat pola pencari (finder pattern), beri margin ekstra
                const pad = Math.max(10, Math.round(Math.max(boxW, boxH) * 0.08));

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
function mergeBoundingBoxes(boxes, imgW, imgH, padX = 10, padY = 8) {
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
 * Fungsi Utama: Sensor Screenshot secara menyeluruh
 * @param {Buffer} imageBuffer - Buffer input gambar (JPEG/PNG/WebP)
 * @param {Object} options - Pengaturan opsional:
 *   - maskMode: 'blur' (default Gaussian Blur pekat) | 'solid' (Blok Warna Bersih)
 *   - solidColor: string warna hex untuk solid mask (default: auto-detect dark/light)
 *   - blurRadius: tingkat kepekatan Gaussian blur (default: 14)
 *   - padX: padding horizontal penggabungan kotak (default: 10)
 *   - padY: padding vertikal penggabungan kotak (default: 8)
 */
async function censorScreenshot(imageBuffer, options = {}) {
    const {
        maskMode = 'blur',
        solidColor = null,
        blurRadius = 14,
        padX = 10,
        padY = 8
    } = options;

    try {
        if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
            throw new Error('Buffer gambar kosong atau tidak valid.');
        }

        const metadata = await sharp(imageBuffer).metadata();
        const imgWidth = metadata.width || 800;
        const imgHeight = metadata.height || 1200;

        let scaleX = 1;
        let scaleY = 1;
        let scaledW = imgWidth;
        let scaledH = imgHeight;

        if (imgWidth > 720) {
            scaledW = 720;
            scaledH = Math.round((imgHeight * scaledW) / imgWidth);
            scaleX = imgWidth / scaledW;
            scaleY = imgHeight / scaledH;
        }

        // Pipeline optimal untuk ARM: ekstrak raw grayscale 1 channel untuk ZXing
        // dan JPEG buffer teroptimasi untuk Tesseract OCR secara simultan
        const basePipeline = sharp(imageBuffer)
            .resize(scaledW, scaledH, { fit: 'fill' })
            .grayscale();

        const [rawGrayObj, ocrBuffer] = await Promise.all([
            basePipeline.clone().raw().toBuffer({ resolveWithObject: true }),
            basePipeline.clone().jpeg({ quality: 90 }).toBuffer()
        ]);

        const rawBoxes = [];
        const detectedTypes = new Set();

        // =========================================================================
        // 1. DETEKSI BARCODE & QR CODE SECARA GRAFIS DENGAN @zxing/library
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
                detectedTypes.add('Barcode/QR Code (ZXing)');
                for (const b of zxingBoxes) {
                    rawBoxes.push(b);
                }
            }
        } catch (zxingErr) {
            // Lanjutkan jika ZXing gagal pada frame tertentu
        }

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
        if (ocrData && ocrData.blocks) {
            for (const block of ocrData.blocks) {
                for (const para of block.paragraphs || []) {
                    for (const line of para.lines || []) {
                        lines.push(line);
                    }
                }
            }
        }

        // =========================================================================
        // 3. ANALISIS SPATIAL ANCHOR GEOMETRY & POLA DATA SENSITIF
        // =========================================================================
        const isMobileAspect = imgHeight > imgWidth;
        const headerTopLimit = isMobileAspect ? (imgHeight / scaleY) * 0.035 : 0;
        const headerBottomLimit = isMobileAspect ? (imgHeight / scaleY) * 0.115 : 0;
        const systemStatusRegex = /^(online|daring|terakhir dilihat|last seen|mengetik|typing|ketuk di sini|info kontak|\d{1,2}[:\.]\d{2}|\d{1,3}%)$/i;

        // Token kata acuan struk transaksi
        const RECEIPT_ANCHORS = ['dari', 'ke', 'penerima', 'pengirim', 'kepada', 'tujuan', 'penerlma', 'penglrlm'];

        // Regex angka nominal & ribuan
        const currencyLineRegex = /(?:rp|idr)\.?\s*[\d.,\s]+/i;
        const thousandNumberRegex = /\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\b/;

        // Regex IMEI, Telepon & Rekening
        const imeiStrictRegex = /\b\d{15}\b/;
        const imeiLabelRegex = /(?:imei(?:1|2)?|sn|serial\s*number)[:\s]*([a-z0-9]{8,20})/i;
        const phoneStrictRegex = /^(?:\+?62|08)[\d\s-]{8,14}$/;
        const phoneCleanRegex = /^(?:08|628|\+628)\d{7,12}$/;
        const accountRegex = /^\d{9,16}$/;

        let imeiFound = false;
        let imeiLastLineBox = null;

        for (const line of lines) {
            const rawLineText = line.text || '';
            const lineText = normalizeText(rawLineText);
            const lowerLine = lineText.toLowerCase();
            const words = line.words || [];
            const lineBbox = line.bbox || {};

            // A. WhatsApp Chat Header Name (Anchor Bar Navigasi Atas)
            if (isMobileAspect && lineBbox.y0 >= headerTopLimit && lineBbox.y1 <= headerBottomLimit) {
                if (!systemStatusRegex.test(lineText) && lineText.length >= 2) {
                    rawBoxes.push({
                        x0: Math.floor(imgWidth * 0.13),
                        y0: Math.max(0, Math.floor((lineBbox.y0 * scaleY) - 4)),
                        x1: Math.floor(imgWidth * 0.72),
                        y1: Math.min(imgHeight, Math.ceil((lineBbox.y1 * scaleY) + 4))
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

            // C. Struk Transaksi: SPATIAL ANCHOR GEOMETRY
            // Cari token kata acuan: ["dari", "ke", "penerima", "pengirim", "kepada"]
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                if (!w.bbox) continue;
                const cleanWord = normalizeText(w.text).toLowerCase().replace(/[^a-z]/g, '');

                if (RECEIPT_ANCHORS.includes(cleanWord)) {
                    const mappedAnchor = mapBbox(w.bbox, scaleX, scaleY);
                    if (mappedAnchor) {
                        const startX = Math.min(mappedAnchor.x1 + 10, Math.floor(imgWidth * 0.95) - 20);
                        const endX = Math.floor(imgWidth * 0.95);
                        const startY = Math.max(0, mappedAnchor.y0 - 4);
                        // Menutup 1-2 baris teks nama dan nomor rekening/bank di sampingnya
                        const lineH = Math.max(24, mappedAnchor.y1 - mappedAnchor.y0);
                        const endY = Math.min(imgHeight, mappedAnchor.y1 + Math.max(Math.round(35 * scaleY), Math.round(lineH * 1.8)));

                        rawBoxes.push({
                            x0: Math.max(0, startX),
                            y0: startY,
                            x1: Math.max(startX + 30, endX),
                            y1: endY
                        });
                        detectedTypes.add('Spatial Anchor: ' + cleanWord);
                    }
                }
            }

            // D. Nominal Pembayaran & Angka Ribuan
            if (currencyLineRegex.test(lineText)) {
                for (let i = 0; i < words.length; i++) {
                    const w = words[i];
                    if (!w.bbox) continue;
                    const wClean = normalizeText(w.text);

                    if (/^(?:rp|idr)\.?$/i.test(wClean)) {
                        const mappedW = mapBbox(w.bbox, scaleX, scaleY);
                        // Ambil kata 'Rp' beserta kata nominal berikutnya di baris yang sama
                        let endX = mappedW.x1 + Math.round(180 * scaleX);
                        if (i + 1 < words.length && words[i + 1].bbox) {
                            const nextW = mapBbox(words[i + 1].bbox, scaleX, scaleY);
                            endX = Math.max(endX, nextW.x1 + 10);
                        }

                        rawBoxes.push({
                            x0: Math.max(0, mappedW.x0 - 4),
                            y0: Math.max(0, mappedW.y0 - 4),
                            x1: Math.min(imgWidth, endX),
                            y1: Math.min(imgHeight, mappedW.y1 + 4)
                        });
                        detectedTypes.add('Nominal Pembayaran');
                    }
                }
            }

            // E. Angka Ribuan Standalone (cth: 150.000 / 1.500.000,00)
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

            // F. IMEI & Nomor Seri Perangkat
            if (/imei/i.test(lineText) && !/bagikan|pengenalan|perangkat|status/i.test(lineText)) {
                imeiFound = true;
                const mappedLine = mapBbox(lineBbox, scaleX, scaleY);
                if (mappedLine) {
                    imeiLastLineBox = mappedLine;
                    rawBoxes.push(mappedLine);
                    detectedTypes.add('Teks IMEI');
                }
            }

            // G. Nomor HP, Rekening & Mention (Anda) / Quoted Sender
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                if (!w.bbox) continue;
                const wClean = normalizeText(w.text);

                // Abaikan pola jam
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
                    imeiFound = true;
                    const mapped = mapBbox(w.bbox, scaleX, scaleY);
                    if (mapped) {
                        imeiLastLineBox = mapped;
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

                // Window 2 kata berturutan untuk nomor telepon yang terpisah spasi (cth: +62 812xxxx)
                if (i + 1 < words.length && words[i + 1].bbox) {
                    const nextW = words[i + 1];
                    const combined = (wClean + normalizeText(nextW.text)).replace(/[\s\-\.:]/g, '');
                    if (phoneCleanRegex.test(combined)) {
                        const m1 = mapBbox(w.bbox, scaleX, scaleY);
                        const m2 = mapBbox(nextW.bbox, scaleX, scaleY);
                        if (m1 && m2) {
                            rawBoxes.push({
                                x0: Math.min(m1.x0, m2.x0) - 4,
                                y0: Math.min(m1.y0, m2.y0) - 3,
                                x1: Math.max(m1.x1, m2.x1) + 4,
                                y1: Math.max(m1.y1, m2.y1) + 3
                            });
                            detectedTypes.add('Nomor HP Split');
                        }
                    }
                }
            }
        }

        // =========================================================================
        // FALLBACK HEURISTIC: Barcode IMEI jika ZXing tidak mendeteksi garis grafis
        // =========================================================================
        if (!barcodeDetected && imeiFound && imeiLastLineBox) {
            const dynamicHeight = Math.max(80, Math.round(imgHeight * 0.08));
            rawBoxes.push({
                x0: Math.floor(imgWidth * 0.10),
                y0: Math.floor(imeiLastLineBox.y1 + Math.round(imgHeight * 0.01)),
                x1: Math.floor(imgWidth * 0.90),
                y1: Math.min(imgHeight, Math.floor(imeiLastLineBox.y1 + dynamicHeight))
            });
            detectedTypes.add('Fallback Heuristic Barcode IMEI');
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
                // Auto-detect kecerahan gambar untuk kontras warna optimal
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

            // Ekstrak patch blur secara paralel
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
