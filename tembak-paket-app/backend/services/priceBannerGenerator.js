const sharp = require('sharp');

/**
 * Generate a dynamic modern AI-styled banner image (PNG) for price updates.
 * @param {Object} options
 * @param {string} options.title - Main header title (e.g. "UPDATE HARGA UNBLOCK IMEI")
 * @param {string} options.subtitle - Subtitle / category (e.g. "Layanan Aktif & Garansi Sinyal Resmi")
 * @param {Array<{name: string, price: string|number, note?: string, highlight?: boolean}>} options.items - List of price items
 * @param {string} [options.footerNote] - Optional footer note
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generatePriceUpdateBanner({
    title = 'UPDATE HARGA TERBARU',
    subtitle = 'Ry-ITSolutions Official Services',
    items = [],
    footerNote = 'Harga terbaru berlaku mulai sekarang • Garansi Sinyal Stabil'
}) {
    const width = 1200;
    const height = 675;

    // Sanitize text for XML/SVG escaping
    const escapeXml = (str) => String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const safeTitle = escapeXml(title);
    const safeSubtitle = escapeXml(subtitle);
    const safeFooter = escapeXml(footerNote);

    // Limit displayed items to 6 for optimum visual hierarchy
    const displayItems = items.slice(0, 6);

    // Build SVG items markup
    let itemsSvg = '';
    const cols = displayItems.length > 3 ? 2 : 1;
    const rowHeight = cols === 2 ? 115 : 100;
    const itemsPerCol = Math.ceil(displayItems.length / cols);

    displayItems.forEach((item, index) => {
        const colIndex = cols === 2 ? (index >= itemsPerCol ? 1 : 0) : 0;
        const rowIndex = cols === 2 ? (index >= itemsPerCol ? index - itemsPerCol : index) : index;

        const x = cols === 2 ? (colIndex === 0 ? 80 : 620) : 120;
        const cardWidth = cols === 2 ? 500 : 960;
        const y = 205 + rowIndex * rowHeight;

        const itemName = escapeXml(item.name || 'Layanan');
        const itemPrice = typeof item.price === 'number' 
            ? `Rp ${item.price.toLocaleString('id-ID')}`
            : escapeXml(item.price || 'Rp 0');
        const itemNote = escapeXml(item.note || '');

        const isHighlight = item.highlight || false;
        const cardBg = isHighlight ? '#f0fdf4' : '#ffffff';
        const borderColor = isHighlight ? '#86efac' : '#e2e8f0';
        const pillBg = isHighlight ? '#059669' : '#0f172a';
        const pillText = '#ffffff';
        const accentColor = isHighlight ? '#10b981' : '#2563eb';

        itemsSvg += `
            <g transform="translate(${x}, ${y})">
                <!-- Card Background -->
                <rect width="${cardWidth}" height="85" rx="20" fill="${cardBg}" stroke="${borderColor}" stroke-width="1.5" />
                
                <!-- Left Accent Pill -->
                <rect x="0" y="0" width="8" height="85" rx="4" fill="${accentColor}" />

                <!-- Item Name & Note -->
                <text x="28" y="38" fill="#0f172a" font-size="22" font-weight="800" font-family="-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, sans-serif">${itemName}</text>
                ${itemNote ? `<text x="28" y="62" fill="#64748b" font-size="14" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, SF Pro Text, sans-serif">${itemNote}</text>` : ''}

                <!-- Price Tag Pill -->
                <g transform="translate(${cardWidth - 210}, 18)">
                    <rect width="190" height="48" rx="14" fill="${pillBg}" />
                    <text x="95" y="31" fill="${pillText}" font-size="20" font-weight="800" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif">${itemPrice}</text>
                </g>
            </g>
        `;
    });

    const svgMarkup = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="50%" stop-color="#f8fafc" />
                <stop offset="100%" stop-color="#f1f5f9" />
            </linearGradient>
            <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0f172a" />
                <stop offset="100%" stop-color="#1e293b" />
            </linearGradient>
        </defs>

        <!-- Base Background -->
        <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

        <!-- Subtle Top Accent Line -->
        <rect width="${width}" height="6" fill="#0f172a" />

        <!-- Header Badge -->
        <g transform="translate(80, 48)">
            <rect width="250" height="34" rx="17" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
            <circle cx="20" cy="17" r="5" fill="#2563eb" />
            <text x="36" y="22" fill="#0f172a" font-size="12" font-weight="800" letter-spacing="1" font-family="-apple-system, BlinkMacSystemFont, SF Pro Text, sans-serif">RY-ITSOLUTIONS OFFICIAL</text>
        </g>

        <!-- Top Right Apple-style Watermark -->
        <g transform="translate(980, 45)">
            <rect width="140" height="40" rx="20" fill="#0f172a" />
            <text x="70" y="25" fill="#ffffff" font-size="13" font-weight="800" letter-spacing="1" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif">RY-STORE</text>
        </g>

        <!-- Main Title & Subtitle -->
        <text x="80" y="128" fill="url(#titleGrad)" font-size="36" font-weight="900" font-family="-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, sans-serif">${safeTitle}</text>
        <text x="80" y="164" fill="#64748b" font-size="17" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, SF Pro Text, sans-serif">${safeSubtitle}</text>

        <!-- Price Cards -->
        ${itemsSvg}

        <!-- Footer Bar -->
        <g transform="translate(0, 595)">
            <rect width="${width}" height="80" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
            <text x="80" y="46" fill="#64748b" font-size="15" font-weight="500" font-family="-apple-system, BlinkMacSystemFont, SF Pro Text, sans-serif">${safeFooter}</text>
            <g transform="translate(880, 22)">
                <rect width="240" height="38" rx="19" fill="#0f172a" />
                <text x="120" y="24" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif">ry-itsolutionts.web.id</text>
            </g>
        </g>
    </svg>
    `;

    return await sharp(Buffer.from(svgMarkup)).png().toBuffer();
}

/**
 * Generate a visual PNG banner for CeirGO Query Log result.
 * @param {Object} options
 * @param {string} options.orderId - Transaction ID
 * @param {string} options.imei - IMEI number
 * @param {string} options.serviceName - Name of CeirGO service
 * @param {string} options.statusText - E.g. "TERDAFTAR RESMI DI CEIR"
 * @param {Array<{no: number|string, date: string, action: string, note: string}>} options.rows - Log rows
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateCeirLogBanner({
    orderId = '',
    imei = '',
    serviceName = 'Cek Status CEIR',
    statusText = 'TERDAFTAR RESMI DI CEIR',
    rows = []
}) {
    const width = 1200;
    const height = 675;

    const escapeXml = (str) => String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const safeTitle = escapeXml(serviceName);
    const safeSubtitle = escapeXml(`ORDER ID: #${orderId} • IMEI: ${imei}`);
    const safeStatus = escapeXml(statusText);

    const displayRows = rows.length > 0 ? rows.slice(0, 5) : [{
        no: 1,
        date: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        action: 'CEIR_VERIFIED',
        note: 'Data IMEI terdaftar resmi pada server CEIR Nasional.'
    }];

    let rowsSvg = '';
    displayRows.forEach((r, idx) => {
        const y = 200 + idx * 75;
        const no = escapeXml(r.no || idx + 1);
        const date = escapeXml(r.date || '-');
        const action = escapeXml(r.action || 'CEIR_EVENT');
        const note = escapeXml(r.note || '-');

        rowsSvg += `
            <g transform="translate(80, ${y})">
                <rect width="1040" height="65" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1" />
                <rect x="0" y="0" width="6" height="65" rx="3" fill="#38bdf8" />
                <text x="24" y="38" fill="#38bdf8" font-size="16" font-weight="800" font-family="sans-serif">#${no}</text>
                <text x="75" y="38" fill="#94a3b8" font-size="14" font-family="sans-serif">${date}</text>
                
                <rect x="320" y="16" width="180" height="32" rx="8" fill="#0284c7" fill-opacity="0.3" stroke="#0284c7" stroke-width="1" />
                <text x="410" y="37" fill="#38bdf8" font-size="13" font-weight="700" text-anchor="middle" font-family="sans-serif">${action}</text>
                
                <text x="520" y="38" fill="#f8fafc" font-size="14" font-weight="600" font-family="sans-serif">${note}</text>
            </g>
        `;
    });

    const svgMarkup = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#090d16" />
                <stop offset="50%" stop-color="#0f172a" />
                <stop offset="100%" stop-color="#1e1b4b" />
            </linearGradient>

            <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#34d399" />
            </linearGradient>
        </defs>

        <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

        <!-- Header -->
        <g transform="translate(80, 45)">
            <rect width="250" height="30" rx="15" fill="#065f46" stroke="#10b981" stroke-width="1" />
            <circle cx="18" cy="15" r="5" fill="#10b981" />
            <text x="32" y="20" fill="#34d399" font-size="12" font-weight="800" letter-spacing="1" font-family="sans-serif">HASIL VERIFIKASI RESMI</text>
        </g>

        <text x="80" y="115" fill="url(#titleGrad)" font-size="34" font-weight="900" font-family="sans-serif">${safeTitle}</text>
        <text x="80" y="148" fill="#94a3b8" font-size="16" font-weight="600" font-family="sans-serif">${safeSubtitle}</text>

        <!-- Status Badge Top Right -->
        <g transform="translate(800, 45)">
            <rect width="320" height="50" rx="14" fill="#064e3b" stroke="#10b981" stroke-width="1.5" />
            <text x="160" y="31" fill="#34d399" font-size="16" font-weight="900" text-anchor="middle" font-family="sans-serif">${safeStatus}</text>
        </g>

        <!-- Log Rows -->
        ${rowsSvg}

        <!-- Footer -->
        <g transform="translate(0, 605)">
            <rect width="${width}" height="70" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
            <text x="80" y="42" fill="#94a3b8" font-size="14" font-weight="500" font-family="sans-serif">Laporan resmi terverifikasi server CEIR &amp; Bea Cukai • Ry-ITSolutions</text>
            <g transform="translate(880, 18)">
                <rect width="240" height="34" rx="17" fill="#0284c7" />
                <text x="120" y="22" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle" font-family="sans-serif">ry-itsolutionts.web.id</text>
            </g>
        </g>
    </svg>
    `;

    return await sharp(Buffer.from(svgMarkup)).png().toBuffer();
}

module.exports = {
    generatePriceUpdateBanner,
    generateCeirLogBanner
};
