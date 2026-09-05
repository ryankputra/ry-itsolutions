/**
 * Telegram Webhook, Callback, and Command Routing
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const { dbGet, dbAll, dbRun } = require('../config/db');
const {
    escapeHtml,
    sendTelegramNotification,
    queueTelegramRequest,
    downloadTelegramPhoto,
    isTelegramAdmin,
    TELEGRAM_WEBHOOK_SECRET
} = require('../telegramService');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const APP_START_TIME = Date.now();

let tgLastUpdateId = 0;

function getInlineKeyboard(trxId) {
    return {
        inline_keyboard: [
            [
                { text: "⏳ Pending", callback_data: `manual_pending_${trxId}` },
                { text: "⚙️ Proses", callback_data: `manual_processing_${trxId}` }
            ],
            [
                { text: "✅ Sukses", callback_data: `manual_success_${trxId}` },
                { text: "❌ Gagal", callback_data: `manual_failed_${trxId}` }
            ]
        ]
    };
}

async function sendManualOrderNotification(message, trxId, imageLocalPath) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;

    let photoSent = false;
    try {
        if (imageLocalPath && fs.existsSync(imageLocalPath)) {
            const form = new FormData();
            form.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
            form.append('photo', fs.createReadStream(imageLocalPath));
            // Caption must be <= 1024 chars in Telegram sendPhoto
            const safeCaption = message.length > 1000 ? message.slice(0, 997) + '...' : message;
            form.append('caption', safeCaption);
            form.append('parse_mode', 'HTML');
            form.append('reply_markup', JSON.stringify(getInlineKeyboard(trxId)));

            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                headers: form.getHeaders(),
                body: form,
                timeout: 15000
            });
            const d = await res.json();
            if (d && d.ok) {
                photoSent = true;
                console.log(`[Telegram] Notifikasi foto order ${trxId} berhasil dikirim ke Admin.`);
            } else {
                console.warn(`[Telegram] Gagal kirim foto order ${trxId} (${d?.description || 'unknown'}), fallback ke text message.`);
            }
        }
    } catch (e) {
        console.error('[Telegram] Error sendManualOrderNotification (photo):', e.message);
    }

    // Always fallback to sendMessage text if photo was not sent or failed
    if (!photoSent) {
        queueTelegramRequest('sendMessage', {
            chat_id: TELEGRAM_ADMIN_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            reply_markup: getInlineKeyboard(trxId)
        });
    }
}

async function pollTelegramUpdates() {
    if (!TELEGRAM_BOT_TOKEN) return;
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${tgLastUpdateId + 1}&timeout=25`;
        const res = await fetch(url, { timeout: 35000 });
        if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
                for (const update of data.result) {
                    tgLastUpdateId = update.update_id;
                    if (update.callback_query) {
                        await handleTelegramCallbackQuery(update.callback_query);
                    }
                    if (update.message) {
                        await handleTelegramMessage(update.message);
                    }
                }
            }
        }
    } catch (e) { }
    setTimeout(pollTelegramUpdates, 3000);
}

async function sendTelegramButtons(chatId, text, inlineKeyboard) {
    if (!TELEGRAM_BOT_TOKEN) return;
    queueTelegramRequest('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
    });
}

async function sendTelegramText(chatId, text) {
    if (!TELEGRAM_BOT_TOKEN) return;
    queueTelegramRequest('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
    });
}

async function answerCallback(callbackQueryId, text) {
    queueTelegramRequest('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text
    });
}

const telegramReviewMainMenu = [
    [
        { text: "➕ Tambah Ulasan Cepat", callback_data: "tg_rev_add_guide" },
        { text: "📸 Petunjuk Foto + Caption", callback_data: "tg_rev_photo_guide" }
    ],
    [
        { text: "📋 Lihat 5 Ulasan Terbaru", callback_data: "tg_rev_list" },
        { text: "🗑️ Hapus Ulasan Terakhir", callback_data: "tg_rev_delete_latest" }
    ]
];

// Message / Command Handler
async function handleTelegramMessage(msg) {
    if (!msg || !msg.chat) return;
    const chatId = String(msg.chat.id);
    const fromId = String(msg.from?.id || '');
    const text = (msg.text || msg.caption || '').trim();

    // Verify Admin Authorization for Admin Commands
    if (!isTelegramAdmin(chatId, fromId)) {
        return;
    }

    // 1. Command /start, /menu
    if (text === '/start' || text === '/menu') {
        await sendTelegramButtons(
            chatId,
            `⭐ <b>PANEL KONTROL BOT RY-ITSOLUTIONS</b> ⭐\n\nSelamat datang di Bot Admin Ry-ITSolutions. Silakan pilih menu di bawah atau ketik <code>/help</code> untuk panduan lengkap:`,
            telegramReviewMainMenu
        );
        return;
    }

    // 2. Command /help, /bantuan
    if (text === '/help' || text === '/bantuan') {
        const helpText = `📖 <b>PANDUAN PERINTAH BOT TELEGRAM RY-ITSOLUTIONS</b>\n\n` +
            `🔹 <code>/status</code> : Cek status server, database, dan transaksi aktif\n` +
            `🔹 <code>/balance</code> atau <code>/saldo</code> : Cek saldo KMSP & ringkasan saldo pengguna\n` +
            `🔹 <code>/profile</code> atau <code>/me</code> : Informasi akun Telegram & otorisasi\n` +
            `🔹 <code>/cek [TRX_ID]</code> : Cek detail transaksi berdasarkan ID\n` +
            `🔹 <code>/broadcast [Pesan]</code> : Kirim pesan broadcast ke grup notifikasi\n` +
            `🔹 <code>/ulasan [Nama|Rating|Komentar|Variasi]</code> : Tambah ulasan dummy cepat\n` +
            `🔹 <code>/menu</code> : Buka panel tombol ulasan & navigasi`;
        await sendTelegramText(chatId, helpText);
        return;
    }

    // 3. Command /status
    if (text === '/status') {
        try {
            const pendingTrx = await dbGet("SELECT COUNT(*) as total FROM transactions WHERE status IN ('pending', 'processing', 'menunggu_saldo_provider')");
            const successTrx = await dbGet("SELECT COUNT(*) as total FROM transactions WHERE status IN ('success', 'completed')");
            const totalUsers = await dbGet("SELECT COUNT(*) as total FROM users");
            const uptimeMinutes = Math.floor((Date.now() - APP_START_TIME) / 60000);

            const statusText = `🖥️ <b>STATUS SISTEM RY-ITSOLUTIONS</b>\n\n` +
                `🟢 <b>Server:</b> Online (Uptime: ${uptimeMinutes} menit)\n` +
                `🗄️ <b>Database:</b> SQLite3 (Terhubung & Terverifikasi)\n` +
                `👥 <b>Total Pengguna:</b> ${totalUsers?.total || 0} akun\n` +
                `⏳ <b>Transaksi Antrean:</b> ${pendingTrx?.total || 0} pesanan\n` +
                `✅ <b>Transaksi Sukses:</b> ${successTrx?.total || 0} pesanan\n` +
                `🛡️ <b>Webhook Mode:</b> Aktif (Secret Token Protected)`;
            await sendTelegramText(chatId, statusText);
        } catch (e) {
            await sendTelegramText(chatId, `❌ Gagal mengambil status sistem: ${escapeHtml(e.message)}`);
        }
        return;
    }

    // 4. Command /balance, /saldo
    if (text === '/balance' || text === '/saldo') {
        try {
            const userTotalBalance = await dbGet("SELECT SUM(balance) as total FROM users");
            const totalBalanceFormatted = Number(userTotalBalance?.total || 0).toLocaleString('id-ID');

            const balanceText = `💰 <b>INFORMASI SALDO SISTEM</b>\n\n` +
                `👥 <b>Total Saldo Seluruh Pengguna:</b> Rp ${totalBalanceFormatted}\n` +
                `⏰ <b>Diperbarui:</b> ${new Date().toLocaleTimeString('id-ID')}`;
            await sendTelegramText(chatId, balanceText);
        } catch (e) {
            await sendTelegramText(chatId, `❌ Gagal mengambil info saldo: ${escapeHtml(e.message)}`);
        }
        return;
    }

    // 5. Command /profile, /me
    if (text === '/profile' || text === '/me') {
        const profileText = `👤 <b>PROFIL TELEGRAM ANDA</b>\n\n` +
            `🆔 <b>Chat ID:</b> <code>${chatId}</code>\n` +
            `👤 <b>Sender ID:</b> <code>${fromId || chatId}</code>\n` +
            `🔰 <b>Status Role:</b> 🛡️ <b>ADMIN TERVERIFIKASI</b>\n` +
            `✅ <b>Akses:</b> Kontrol Transaksi, Ulasan & Notifikasi Penuh`;
        await sendTelegramText(chatId, profileText);
        return;
    }

    // 6. Command /cek [TRX_ID] or /trx [TRX_ID]
    if (text.startsWith('/cek') || text.startsWith('/trx')) {
        const parts = text.split(/\s+/);
        const queryTrxId = parts[1]?.trim();
        if (!queryTrxId) {
            await sendTelegramText(chatId, `⚠️ <b>Format salah.</b>\nContoh penggunaan: <code>/cek TRX123456</code>`);
            return;
        }

        try {
            const trx = await dbGet("SELECT * FROM transactions WHERE id = ? OR id LIKE ?", [queryTrxId, `%${queryTrxId}%`]);
            if (!trx) {
                await sendTelegramText(chatId, `🔍 Transaksi dengan ID <code>${escapeHtml(queryTrxId)}</code> tidak ditemukan di database.`);
                return;
            }

            const fee = Number(trx.platformFee || trx.originalPrice || 0).toLocaleString('id-ID');
            const trxDetailText = `📦 <b>DETAIL TRANSAKSI</b>\n\n` +
                `🆔 <b>ID:</b> <code>${escapeHtml(trx.id)}</code>\n` +
                `👤 <b>User:</b> ${escapeHtml(trx.userName || trx.userId || '-')}\n` +
                `🏷️ <b>Layanan/Paket:</b> ${escapeHtml(trx.packageName || trx.service_type || '-')}\n` +
                `💵 <b>Nominal:</b> Rp ${fee}\n` +
                `⚡ <b>Status:</b> <b>${escapeHtml(String(trx.status).toUpperCase())}</b>\n` +
                `📅 <b>Waktu:</b> ${escapeHtml(trx.createdAt || '-')}\n` +
                `📝 <b>Catatan:</b> ${escapeHtml(trx.admin_note || trx.api_response || '-')}`;

            const buttons = [
                [
                    { text: "✅ Set Sukses", callback_data: `manual_success_${trx.id}` },
                    { text: "❌ Set Gagal (Refund)", callback_data: `manual_failed_${trx.id}` }
                ]
            ];
            await sendTelegramButtons(chatId, trxDetailText, buttons);
        } catch (e) {
            await sendTelegramText(chatId, `❌ Gagal mengecek transaksi: ${escapeHtml(e.message)}`);
        }
        return;
    }

    // 7. Command /broadcast [Pesan]
    if (text.startsWith('/broadcast')) {
        const broadcastMsg = text.replace(/^\/broadcast\s*/i, '').trim();
        if (!broadcastMsg) {
            await sendTelegramText(chatId, `⚠️ <b>Pesan broadcast kosong.</b>\nContoh: <code>/broadcast Server sedang dalam pemeliharaan berkala selama 10 menit.</code>`);
            return;
        }

        const formattedBroadcast = `📢 <b>PENGUMUMAN / BROADCAST RY-ITSOLUTIONS</b>\n──────────────────────\n${escapeHtml(broadcastMsg)}\n──────────────────────\n<i>Dikirim oleh Admin</i>`;
        sendTelegramNotification(formattedBroadcast, 'group');
        await sendTelegramText(chatId, `✅ <b>Broadcast berhasil dikirim ke grup/saluran notifikasi!</b>`);
        return;
    }

    // 8. Command /ulasan or review photo
    if (text.startsWith('/ulasan') || text.includes('|') || (msg.photo && msg.photo.length > 0)) {
        let cleanText = text.replace(/^\/ulasan\s*/i, '').trim();
        if (!cleanText && (!msg.photo || msg.photo.length === 0)) return;

        const parts = cleanText.split('|').map(s => s.trim());
        const userName = parts[0] || 'Rahul Pramudia';
        const ratingNum = Math.min(5, Math.max(1, Number(parts[1]) || 5));
        const comment = parts[2] || parts[0] || 'Layanan sinyal terbukti aktif kilat garansi resmi terpampang rapi!';
        const variation = parts[3] || 'GARANSI 3 BULAN (MASA AKTIF SINYAL)';

        let imageUrls = [];

        if (msg.photo && msg.photo.length > 0) {
            try {
                const largestPhoto = msg.photo[msg.photo.length - 1];
                const localImgPath = await downloadTelegramPhoto(largestPhoto.file_id);
                if (localImgPath) {
                    imageUrls.push(localImgPath);
                }
            } catch (e) { console.error('Telegram photo download error:', e); }
        }

        const reviewId = `rev_tg_${Date.now()}`;
        const nameClean = userName;
        const dummyUserId = `usr_tg_${Date.now()}`;
        const avatarClean = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameClean)}&backgroundColor=0066cc&textColor=ffffff`;
        const imagesJson = JSON.stringify(imageUrls);

        await dbRun(
            `INSERT OR IGNORE INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [dummyUserId, nameClean, `${dummyUserId}@buyer.local`, 'bot_gen_user', 'user', '2026-01-15T08:30:00.000Z']
        );

        await dbRun(
            `INSERT INTO reviews (id, userId, userName, userAvatar, orderId, productId, serviceType, variation, rating, comment, images, likesCount, transactionDate, userJoinedAt, userTotalOrders, userRole, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [reviewId, dummyUserId, nameClean, avatarClean, `trx_tg_${Date.now()}`, 'unblock-imei', 'imei', variation, ratingNum, comment, imagesJson, 5, new Date().toISOString(), '2026-01-15T08:30:00.000Z', 14, 'Pembeli Terverifikasi', new Date().toISOString()]
        );

        const successButtons = [
            [
                { text: "🗑️ Hapus Ulasan Ini", callback_data: `tg_rev_del_${reviewId}` },
                { text: "📋 Lihat Semua Ulasan", callback_data: "tg_rev_list" }
            ],
            [
                { text: "🔙 Kembali ke Menu Utama", callback_data: "tg_rev_main_menu" }
            ]
        ];

        await sendTelegramButtons(
            chatId,
            `✅ <b>Ulasan Dummy Berhasil Ditambahkan!</b>\n\n👤 <b>Nama:</b> ${escapeHtml(nameClean)}\n⭐ <b>Rating:</b> ${ratingNum} Bintang\n💬 <b>Komentar:</b> ${escapeHtml(comment)}\n🛡️ <b>Variasi:</b> ${escapeHtml(variation)}\n🖼️ <b>Foto Bukti:</b> ${imageUrls.length > 0 ? 'Foto Disimpan Aman di Server' : 'Tanpa Foto'}\n\n<i>Ulasan sudah aktif secara otomatis di website Ry-ITSolutions.</i>`,
            successButtons
        );
    }
}

// Callback Query Handler
async function handleTelegramCallbackQuery(cb) {
    if (!cb || !cb.message) return;
    const data = cb.data;
    const chatId = String(cb.message.chat?.id || '');
    const fromId = String(cb.from?.id || '');
    const messageId = cb.message.message_id;
    const cbId = cb.id;

    if (!isTelegramAdmin(chatId, fromId)) {
        await answerCallback(cbId, "⛔ Akses Ditolak: Anda bukan Admin.");
        return;
    }

    if (data.startsWith('tg_rev_')) {
        if (data === 'tg_rev_main_menu') {
            await answerCallback(cbId, "Menu Utama Ulasan");
            await sendTelegramButtons(
                chatId,
                `⭐ <b>MENU MANAJEMEN ULASAN DUMMY TELKOMSEL / IMEI</b> ⭐\n\nSilakan pilih tombol aksi di bawah:`,
                telegramReviewMainMenu
            );
            return;
        }

        if (data === 'tg_rev_add_guide') {
            await answerCallback(cbId, "Format Ulasan Cepat");
            await sendTelegramText(
                chatId,
                `📝 <b>CARA TAMBAH ULASAN TEKS CEPAT:</b>\n\nKetik dan kirim pesan format berikut:\n<code>Nama Pengguna | Rating Bintang (1-5) | Komentar Ulasan | Variasi Garansi</code>\n\n<b>Contoh:</b>\n<code>Rian Pratama | 5 | iPhone 13 Pro sinyal Telkomsel 5G aktif kilat 2 jam! | GARANSI 3 BULAN (MASA AKTIF SINYAL)</code>`
            );
            return;
        }

        if (data === 'tg_rev_photo_guide') {
            await answerCallback(cbId, "Format Foto + Caption");
            await sendTelegramText(
                chatId,
                `📸 <b>CARA TAMBAH ULASAN + FOTO BUKTI:</b>\n\n1. Lampirkan/Pilih <b>Foto Sinyal</b> di Telegram.\n2. Di kolom <b>Caption</b>, tulis format berikut:\n<code>Nama Pengguna | Rating | Komentar | Variasi</code>\n\n<b>Contoh Caption:</b>\n<code>Rahul | 5 | All Operator terpasang lancar jaya garansi resmi!</code>`
            );
            return;
        }

        if (data === 'tg_rev_list') {
            await answerCallback(cbId, "Memuat 5 Ulasan Terbaru...");
            try {
                const reviews = await dbAll("SELECT * FROM reviews ORDER BY createdAt DESC LIMIT 5");
                if (!reviews || reviews.length === 0) {
                    await sendTelegramText(chatId, "📭 <b>Belum ada ulasan terdaftar di database.</b>");
                    return;
                }

                let listMsg = `📋 <b>5 ULASAN TERBARU DI DATABASE:</b>\n\n`;
                const listButtons = [];

                reviews.forEach((r, idx) => {
                    listMsg += `${idx + 1}. 👤 <b>${escapeHtml(r.userName)}</b> (★ ${r.rating})\n💬 "${escapeHtml(r.comment)}"\n🏷️ ${escapeHtml(r.variation)}\n\n`;
                    listButtons.push([
                        { text: `🗑️ Hapus #${idx + 1} (${r.userName})`, callback_data: `tg_rev_del_${r.id}` }
                    ]);
                });

                listButtons.push([{ text: "🔙 Kembali ke Menu", callback_data: "tg_rev_main_menu" }]);

                await sendTelegramButtons(chatId, listMsg, listButtons);
            } catch (e) {
                await answerCallback(cbId, "Gagal memuat ulasan.");
            }
            return;
        }

        if (data === 'tg_rev_delete_latest') {
            try {
                const latest = await dbGet("SELECT * FROM reviews ORDER BY createdAt DESC LIMIT 1");
                if (!latest) {
                    await answerCallback(cbId, "Tidak ada ulasan untuk dihapus.");
                    return;
                }

                await dbRun("DELETE FROM reviews WHERE id = ?", [latest.id]);
                await answerCallback(cbId, "Ulasan terbaru berhasil dihapus!");
                await sendTelegramButtons(
                    chatId,
                    `🗑️ <b>Ulasan Terbaru Berhasil Dihapus!</b>\n\n👤 <b>Nama:</b> ${escapeHtml(latest.userName)}\n💬 "${escapeHtml(latest.comment)}"`,
                    telegramReviewMainMenu
                );
            } catch (e) {
                await answerCallback(cbId, "Gagal menghapus ulasan.");
            }
            return;
        }

        if (data.startsWith('tg_rev_del_')) {
            const revId = data.replace('tg_rev_del_', '');
            try {
                const revObj = await dbGet("SELECT userName FROM reviews WHERE id = ?", [revId]);
                await dbRun("DELETE FROM reviews WHERE id = ?", [revId]);
                await answerCallback(cbId, "Ulasan berhasil dihapus!");
                await sendTelegramText(chatId, `🗑️ <b>Ulasan milik "${escapeHtml(revObj?.userName || revId)}" berhasil dihapus dari website.</b>`);
            } catch (e) {
                await answerCallback(cbId, "Gagal menghapus ulasan.");
            }
            return;
        }
    }

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
            if (['success', 'failed'].includes(trx.status)) {
                if (trx.status !== status) {
                    await answerCallback(cbId, `Transaksi sudah final (${trx.status}). Tidak bisa diubah lagi.`);
                    return;
                }
            }

            let apiRes = 'Pesanan diproses';
            if (status === 'success') apiRes = 'Pesanan berhasil diselesaikan';
            if (status === 'failed') apiRes = 'Pesanan dibatalkan/ditolak';
            if (status === 'pending') apiRes = 'Menunggu Proses';
            if (status === 'processing') apiRes = 'Sedang diproses';

            await dbRun("UPDATE transactions SET status = ?, admin_note = ?, api_response = ? WHERE id = ?",
                [status, `Status diperbarui menjadi ${status.toUpperCase()} via Telegram`, apiRes, trxId]);

            // Refund if failed and previously was pending/processing
            if (status === 'failed' && (trx.status === 'pending' || trx.status === 'processing' || trx.status === 'menunggu_saldo_provider')) {
                const refundAmount = Number(trx.platformFee || trx.originalPrice || 0);
                if (refundAmount > 0) {
                    await dbRun("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, trx.userId]);
                }
            }

            await answerCallback(cbId, `Pesanan ${trxId} diubah menjadi ${status}!`);

            const originalText = (cb.message.text || '').split('\n\n<b>Status Diupdate:')[0];
            const isFinal = (status === 'success' || status === 'failed');
            queueTelegramRequest('editMessageText', {
                chat_id: chatId,
                message_id: messageId,
                text: originalText + `\n\n<b>Status Diupdate: ${status.toUpperCase()}</b>`,
                parse_mode: 'HTML',
                reply_markup: isFinal ? { inline_keyboard: [] } : getInlineKeyboard(trxId)
            });

        } catch (e) {
            console.error('Callback error', e);
            await answerCallback(cbId, "Terjadi kesalahan server.");
        }
    }
}

// Telegram Official Webhook Handler
router.post('/telegram/webhook', async (req, res) => {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (!secret || secret !== TELEGRAM_WEBHOOK_SECRET) {
        return res.status(403).json({ ok: false, error: 'Unauthorized secret token' });
    }

    res.json({ ok: true });

    try {
        const update = req.body;
        if (update && update.message) {
            await handleTelegramMessage(update.message);
        } else if (update && update.callback_query) {
            await handleTelegramCallbackQuery(update.callback_query);
        }
    } catch (e) {
        console.error('[Telegram Webhook Async Error]', e);
    }
});

module.exports = {
    router,
    sendManualOrderNotification,
    pollTelegramUpdates
};
