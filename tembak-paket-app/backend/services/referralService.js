/**
 * Referral Commission & Reward Processing Service
 */
const { dbGet, dbAll, dbRun } = require('../config/db');

async function processReferralReward(trxId) {
    try {
        if (!trxId) return null;

        const trx = await dbGet('SELECT id, userId, platformFee, originalPrice, status FROM transactions WHERE id = ?', [trxId]);
        if (!trx || !trx.userId) return null;

        // Ensure user was referred
        const buyer = await dbGet('SELECT id, name, referred_by FROM users WHERE id = ?', [trx.userId]);
        if (!buyer || !buyer.referred_by) return null;

        // Prevent self-referral
        if (buyer.referred_by === buyer.id) return null;

        // Prevent duplicate reward for the same transaction
        const existingReward = await dbGet('SELECT id FROM referral_rewards WHERE trx_id = ?', [trxId]);
        if (existingReward) return null;

        // Check settings
        const settingsRows = await dbAll("SELECT key, value FROM settings WHERE key LIKE 'referral_%'");
        const settings = settingsRows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

        if (settings.referral_enabled === 'false') return null;

        const commType = settings.referral_commission_type || 'fixed';
        const commVal = Number(settings.referral_commission_value || 5000);
        const basePrice = Number(trx.platformFee || trx.originalPrice || 0);

        let rewardAmount = 0;
        if (commType === 'percent' || commType === 'percentage') {
            rewardAmount = Math.round((basePrice * commVal) / 100);
        } else {
            rewardAmount = commVal;
        }

        if (rewardAmount <= 0) return null;

        const rewardId = `ref_rew_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await dbRun(`
            INSERT INTO referral_rewards (id, referrer_id, referee_id, trx_id, amount, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'completed', ?)
        `, [rewardId, buyer.referred_by, buyer.id, trxId, rewardAmount, new Date().toISOString()]);

        // Credit referrer balance
        await dbRun('UPDATE users SET balance = balance + ? WHERE id = ?', [rewardAmount, buyer.referred_by]);

        const referrer = await dbGet('SELECT id, name, balance, verifiedPhone FROM users WHERE id = ?', [buyer.referred_by]);
        console.log(`[Referral] Successfully credited Rp ${rewardAmount} to referrer ${buyer.referred_by} (${referrer?.name}) for trx ${trxId}`);

        // Send WhatsApp notification to referrer if phone is verified
        if (referrer && referrer.verifiedPhone) {
            try {
                const waBot = require('./waBot');
                const cleanPhone = referrer.verifiedPhone.replace(/[^0-9]/g, '');
                if (cleanPhone.length >= 9 && typeof waBot.sendTextMessage === 'function') {
                    const waMsg = `*KOMISI REFERRAL DITERIMA*
──────────────────────
Halo Kak *${referrer.name}*,

Selamat! Anda menerima komisi referral sebesar *Rp ${rewardAmount.toLocaleString('id-ID')}* dari pesanan downline Anda (*${buyer.name}*).

Saldo akun Anda saat ini: *Rp ${Number(referrer.balance).toLocaleString('id-ID')}*.

Terima kasih telah merekomendasikan Ry-ITSolutions!`;
                    waBot.sendTextMessage(cleanPhone, waMsg).catch(() => {});
                }
            } catch (err) {}
        }

        return { rewardId, rewardAmount, referrerId: buyer.referred_by };
    } catch (e) {
        console.error('[Referral Error] Failed to process referral reward:', e.message);
        return null;
    }
}

module.exports = {
    processReferralReward
};
