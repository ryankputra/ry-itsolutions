const fs = require('fs');
let content = fs.readFileSync('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/backend/server.js', 'utf8');

const regex = /\/\/ --- TELEGRAM INTERACTIVE NOTIFICATION ---[\s\S]*?\/\/ --- END TELEGRAM INTERACTIVE NOTIFICATION ---/;

const newBlock = `// --- TELEGRAM INTERACTIVE NOTIFICATION ---
let tgLastUpdateId = 0;

function getInlineKeyboard(trxId) {
    return {
        inline_keyboard: [
            [
                { text: "⏳ Pending", callback_data: \`manual_pending_\${trxId}\` },
                { text: "⚙️ Proses", callback_data: \`manual_processing_\${trxId}\` }
            ],
            [
                { text: "✅ Sukses", callback_data: \`manual_success_\${trxId}\` },
                { text: "❌ Gagal", callback_data: \`manual_failed_\${trxId}\` }
            ]
        ]
    };
}

async function sendManualOrderNotification(message, trxId) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;
    const url = \`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/sendMessage\`;
    const body = {
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: getInlineKeyboard(trxId)
    };
    try {
        await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }});
    } catch (e) { console.error('Error sendManualOrderNotification', e); }
}

async function pollTelegramUpdates() {
    if (!TELEGRAM_BOT_TOKEN) return;
    try {
        const url = \`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/getUpdates?offset=\${tgLastUpdateId + 1}&timeout=30\`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    tgLastUpdateId = update.update_id;
                    if (update.callback_query) {
                        await handleTelegramCallbackQuery(update.callback_query);
                    }
                }
            }
        }
    } catch(e) {}
    setTimeout(pollTelegramUpdates, 2000);
}

async function handleTelegramCallbackQuery(cb) {
    const data = cb.data; 
    const chatId = cb.message.chat.id;
    const messageId = cb.message.message_id;
    const cbId = cb.id;

    if (data.startsWith('manual_')) {
        const parts = data.split('_');
        const status = parts[1]; 
        const trxId = parts.slice(2).join('_');

        try {
            const trx = await dbGet("SELECT * FROM transactions WHERE id = ?", [trxId]);
            if (!trx) {
                await answerCallback(cbId, "Transaksi tidak ditemukan.");
                return;
            }
            if (trx.status === 'success' || trx.status === 'failed') {
                // If it's already final, prevent changes to prevent double refund bugs
                if (trx.status !== status) {
                    await answerCallback(cbId, \`Transaksi sudah final (\${trx.status}). Tidak bisa diubah lagi via bot.\`);
                    return;
                }
            }

            let apiRes = 'Diproses via Telegram';
            if (status === 'success') apiRes = 'Selesai via Telegram';
            if (status === 'failed') apiRes = 'Gagal / Ditolak Admin';
            if (status === 'pending') apiRes = 'Menunggu Proses';
            if (status === 'processing') apiRes = 'Sedang Diproses Admin';

            await dbRun("UPDATE transactions SET status = ?, admin_note = ?, api_response = ? WHERE id = ?", 
                [status, \`Diupdate ke \${status.toUpperCase()} via Telegram\`, apiRes, trxId]);

            // Only refund if it is transitioning to failed from pending/processing
            if (status === 'failed' && (trx.status === 'pending' || trx.status === 'processing')) {
                await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [trx.platformFee, trx.userId]);
            }

            await answerCallback(cbId, \`Pesanan \${trxId} diubah menjadi \${status}!\`);

            const originalText = cb.message.text.split('\\n\\n<b>Status Diupdate:')[0];
            const isFinal = (status === 'success' || status === 'failed');
            const editUrl = \`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/editMessageText\`;
            await fetch(editUrl, {
                method: 'POST',
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: originalText + \`\\n\\n<b>Status Diupdate: \${status.toUpperCase()}</b>\`,
                    parse_mode: 'HTML',
                    reply_markup: isFinal ? { inline_keyboard: [] } : getInlineKeyboard(trxId)
                }),
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (e) {
            console.error('Callback error', e);
            await answerCallback(cbId, "Terjadi kesalahan server.");
        }
    }
}

async function answerCallback(callbackQueryId, text) {
    const url = \`https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/answerCallbackQuery\`;
    await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
        headers: { 'Content-Type': 'application/json' }
    });
}
// --- END TELEGRAM INTERACTIVE NOTIFICATION ---`;

if (content.match(regex)) {
  content = content.replace(regex, newBlock);
  fs.writeFileSync('c:/Users/Ryan/Documents/webtembak/tembak-paket-app/backend/server.js', content);
  console.log('Replaced telegram blocks successfully');
} else {
  console.log('Regex did not match');
}
