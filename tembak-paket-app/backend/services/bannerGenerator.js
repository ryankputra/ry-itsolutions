/**
 * Apple-style price banner generator for WhatsApp broadcast.
 * Renders an SVG layout (San Francisco-like system stack) to PNG via @resvg/resvg-js.
 * ponytail: text width measured via approximation; if labels overflow, widen CARD_W.
 */
const path = require('path');
const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const CARD_W = 1080;
const PAD = 64;
const CONTENT_W = CARD_W - PAD * 2;

const SPEED_LABEL = { fast: 'Fast', semi: 'Semi', slow: 'Slow' };
const SPEED_DESC = {
    fast: 'Prioritas Kilat',
    semi: 'Standar',
    slow: 'Paling Hemat'
};

function rupiah(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeParseSpeedPrices(raw) {
    if (!raw) return {};
    try {
        if (typeof raw === 'string') {
            const v = JSON.parse(raw);
            return (v && typeof v === 'object') ? v : {};
        }
        if (typeof raw === 'object') return raw;
    } catch (e) { /* malformed json */ }
    return {};
}

/**
 * @param {Object} opts
 * @param {Array}  opts.packages   - [{ duration, price, allowed_speeds, speed_prices }]
 * @param {String} opts.storeName  - default 'Ry-ITSolutions'
 * @returns {Buffer} PNG buffer
 */
function generatePriceBanner({ packages, storeName = 'Ry-ITSolutions' }) {
    const pkgs = (packages || []).map(p => {
        const sp = safeParseSpeedPrices(p.speed_prices);
        const allowed = Array.isArray(p.allowed_speeds) && p.allowed_speeds.length
            ? p.allowed_speeds
            : (Array.isArray(sp.allowed_speeds) && sp.allowed_speeds.length ? sp.allowed_speeds : ['fast', 'semi', 'slow']);
        return { ...p, _sp: sp, _allowed: allowed };
    });

    const items = [];
    pkgs.forEach(p => {
        let any = false;
        p._allowed.forEach(id => {
            const price = Number(p._sp[id]);
            if (!price) return;
            any = true;
            const ws = p._sp.wholesale_prices && p._sp.wholesale_prices[id];
            items.push({
                duration: p.duration,
                speedId: id,
                price,
                wholesale: (ws && Number(ws) > 0 && Number(ws) < price) ? Number(ws) : null,
                wsQty: Number(p._sp.wholesale_min_qty) || 2
            });
        });
        if (!any) {
            items.push({
                duration: p.duration,
                speedId: 'slow',
                price: Number(p.price) || 0,
                wholesale: null,
                wsQty: 2
            });
        }
    });

    // Layout constants (Apple-style: generous whitespace, SF-like stack)
    const HEADER_H = 150;
    const SUB_H = 46;
    const ITEM_H = 132;
    const FOOTER_H = 210;
    const listH = items.length * ITEM_H + 32;
    const CARD_H = HEADER_H + SUB_H + listH + FOOTER_H;

    let y = 0;
    const parts = [];

    // Background — deep space gradient like Apple keynote slides
    parts.push(`<defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#000000"/>
            <stop offset="55%" stop-color="#0A0A0F"/>
            <stop offset="100%" stop-color="#14141C"/>
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#0A84FF"/>
            <stop offset="100%" stop-color="#5E5CE6"/>
        </linearGradient>
    </defs>`);

    parts.push(`<rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="48" fill="url(#bg)"/>`);

    // Subtle top accent line
    parts.push(`<rect x="${PAD}" y="34" width="72" height="6" rx="3" fill="url(#accent)"/>`);

    // Header
    y = HEADER_H - 18;
    parts.push(`<text x="${PAD}" y="${y}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-size="58" font-weight="800" fill="#FFFFFF" letter-spacing="-1.5">ADD ROAMER</text>`);
    y = HEADER_H + SUB_H - 6;
    parts.push(`<text x="${PAD}" y="${y}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" font-size="30" font-weight="500" fill="#8E8E93">Tarif &amp; Harga Terbaru</text>`);

    // Divider
    y = HEADER_H + SUB_H + 8;
    parts.push(`<rect x="${PAD}" y="${y}" width="${CONTENT_W}" height="1" fill="#2C2C2E"/>`);

    // Price rows — Apple stacked product card style
    y = HEADER_H + SUB_H + 40;
    items.forEach((it, i) => {
        const rowY = y + i * ITEM_H;

        // Row card
        parts.push(`<rect x="${PAD}" y="${rowY}" width="${CONTENT_W}" height="104" rx="28" fill="#1C1C1E"/>`);

        // Left: duration + speed
        parts.push(`<text x="${PAD + 40}" y="${rowY + 46}" font-family="-apple-system, 'SF Pro Display', Arial, sans-serif" font-size="34" font-weight="700" fill="#FFFFFF">${esc(it.duration)}</text>`);
        parts.push(`<text x="${PAD + 40}" y="${rowY + 84}" font-family="-apple-system, 'SF Pro Text', Arial, sans-serif" font-size="24" font-weight="500" fill="#0A84FF">${esc(SPEED_LABEL[it.speedId])} <tspan fill="#8E8E93" font-weight="400">· ${esc(SPEED_DESC[it.speedId])}</tspan></text>`);

        // Right: price
        const priceX = PAD + CONTENT_W - 40;
        parts.push(`<text x="${priceX}" y="${rowY + 62}" font-family="-apple-system, 'SF Pro Display', Arial, sans-serif" font-size="40" font-weight="800" fill="#FFFFFF" text-anchor="end">${esc(rupiah(it.price))}</text>`);

        if (it.wholesale) {
            const wsW = 250;
            const wsX = priceX - wsW;
            const wsY = rowY + 6;
            parts.push(`<rect x="${wsX - wsW - 14}" y="${wsY}" width="${wsW}" height="34" rx="17" fill="#0A84FF" opacity="0.16"/>`);
            parts.push(`<text x="${wsX - 14 - wsW / 2}" y="${wsY + 23}" font-family="-apple-system, 'SF Pro Text', Arial, sans-serif" font-size="20" font-weight="700" fill="#64D2FF" text-anchor="middle">Grosir ≥${it.wsQty} ${esc(rupiah(it.wholesale))}</text>`);
        }

        if (i < items.length - 1) {
            parts.push(`<rect x="${PAD + 20}" y="${rowY + 108}" width="${CONTENT_W - 40}" height="1" fill="#2C2C2E" opacity="0.6"/>`);
        }
    });

    // Footer — CTA
    y = CARD_H - FOOTER_H + 40;
    parts.push(`<rect x="${PAD}" y="${y}" width="${CONTENT_W}" height="1" fill="#2C2C2E"/>`);

    y += 52;
    parts.push(`<text x="${PAD}" y="${y}" font-family="-apple-system, 'SF Pro Display', Arial, sans-serif" font-size="32" font-weight="700" fill="#FFFFFF">Pesan sekarang</text>`);
    y += 42;
    parts.push(`<text x="${PAD}" y="${y}" font-family="-apple-system, 'SF Pro Text', Arial, sans-serif" font-size="26" font-weight="500" fill="#0A84FF">ry-itsolutionts.web.id/add-roamer</text>`);

    // Store name footer
    y += 62;
    parts.push(`<text x="${PAD}" y="${y}" font-family="-apple-system, 'SF Pro Text', Arial, sans-serif" font-size="22" font-weight="500" fill="#636366">${esc(storeName)} · Official Store</text>`);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">${parts.join('')}</svg>`;

    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: CARD_W },
        background: '#000000'
    });
    return resvg.render().asPng();
}

module.exports = { generatePriceBanner, safeParseSpeedPrices };
