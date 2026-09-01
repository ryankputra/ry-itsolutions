/**
 * Telegram Bot Service - Production Ready
 * 
 * Features:
 * 1. HTML Sanitization (Prevents 400 Bad Request entity parsing errors)
 * 2. Message Queue & Rate Limiter (Max ~22 msg/s to prevent 429 Too Many Requests)
 * 3. Telegram WebApp Data (initData) HMAC Validation
 * 4. Local media storage (Downloads photos to server to prevent TELEGRAM_BOT_TOKEN leaks)
 * 5. Admin chat & sender authorization helper
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '');
const TELEGRAM_GROUP_CHAT_ID = String(process.env.TELEGRAM_GROUP_CHAT_ID || '');
const TELEGRAM_CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '');
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'ry-secret-tg-token-2026';

// --- 1. HTML SANITIZATION ---
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// --- 2. MESSAGE QUEUE & RATE LIMITER ---
const messageQueue = [];
let isProcessingQueue = false;

async function processQueue() {
    if (isProcessingQueue || messageQueue.length === 0) return;
    isProcessingQueue = true;

    while (messageQueue.length > 0) {
        const item = messageQueue.shift();
        try {
            const res = await fetch(item.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.payload),
                timeout: 15000
            });
            const data = await res.json();
            if (!data.ok && data.error_code === 429) {
                const retryAfter = (data.parameters?.retry_after || 2) * 1000;
                console.warn(`[Telegram Queue] Rate limited (429). Retrying after ${retryAfter}ms`);
                messageQueue.unshift(item); // Put back to front of queue
                await new Promise(r => setTimeout(r, retryAfter));
            }
        } catch (err) {
            console.error('[Telegram Queue] Error sending request:', err.message);
        }
        await new Promise(r => setTimeout(r, 45)); // ~22 reqs/second max
    }

    isProcessingQueue = false;
}

function queueTelegramRequest(method, payload) {
    if (!TELEGRAM_BOT_TOKEN) return;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
    messageQueue.push({ url, payload });
    processQueue();
}

// --- 3. SAFE TELEGRAM NOTIFICATIONS ---
function sendTelegramNotification(message, target = 'group') {
    let targetChatId = TELEGRAM_GROUP_CHAT_ID || TELEGRAM_CHAT_ID || TELEGRAM_ADMIN_CHAT_ID;
    if (target === 'admin') {
        targetChatId = TELEGRAM_ADMIN_CHAT_ID || TELEGRAM_CHAT_ID || TELEGRAM_GROUP_CHAT_ID;
    }

    if (!TELEGRAM_BOT_TOKEN || !targetChatId) {
        return;
    }

    queueTelegramRequest('sendMessage', {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
    });
}

// --- 4. TELEGRAM WEBAPP INITDATA HMAC VALIDATION ---
function validateTelegramInitData(initData) {
    if (!TELEGRAM_BOT_TOKEN || !initData) return false;
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        if (!hash) return false;
        urlParams.delete('hash');

        const params = [];
        for (const [key, value] of urlParams.entries()) {
            params.push(`${key}=${value}`);
        }
        params.sort();
        const dataCheckString = params.join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        return calculatedHash === hash;
    } catch {
        return false;
    }
}

// --- 5. DOWNLOAD TELEGRAM PHOTO TO LOCAL STORAGE (PREVENT TOKEN LEAK) ---
async function downloadTelegramPhoto(fileId) {
    if (!TELEGRAM_BOT_TOKEN || !fileId) return null;
    try {
        const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`, { timeout: 10000 });
        if (!fileRes.ok) return null;
        const fileData = await fileRes.json();
        if (!fileData.ok || !fileData.result?.file_path) return null;

        const remoteUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
        const downloadRes = await fetch(remoteUrl, { timeout: 15000 });
        if (!downloadRes.ok) return null;

        const ext = path.extname(fileData.result.file_path) || '.jpg';
        const filename = `tg_rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const dir = path.join(__dirname, 'public', 'uploads', 'reviews');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const localPath = path.join(dir, filename);
        const buffer = await downloadRes.buffer();
        fs.writeFileSync(localPath, buffer);

        return `/public/uploads/reviews/${filename}`;
    } catch (e) {
        console.error('[Telegram Photo Download Error]', e.message);
        return null;
    }
}

// --- 6. AUTHORIZATION HELPER ---
function isTelegramAdmin(chatId, fromId) {
    const validIds = [TELEGRAM_ADMIN_CHAT_ID, TELEGRAM_CHAT_ID].filter(Boolean).map(String);
    return validIds.includes(String(chatId)) || (fromId && validIds.includes(String(fromId)));
}

module.exports = {
    escapeHtml,
    sendTelegramNotification,
    queueTelegramRequest,
    validateTelegramInitData,
    downloadTelegramPhoto,
    isTelegramAdmin,
    TELEGRAM_WEBHOOK_SECRET
};
