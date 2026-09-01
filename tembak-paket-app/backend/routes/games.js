/**
 * Games & Rewards Routes (Daily Check-in, Lucky Spin, Coins)
 */

const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

function getWIBDate(date = new Date()) {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
}

// 1. GET /api/games/status
router.get('/games/status', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayWIB = getWIBDate();

        const user = await dbGet("SELECT coins FROM users WHERE id = ?", [userId]);
        const userCoins = user?.coins || 0;

        const todayCheckin = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_checkin' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ? OR substr(claimed_at, 1, 10) = ?)
        `, [userId, todayWIB, todayWIB, todayWIB]);

        const lastCheckin = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_checkin'
            ORDER BY datetime(claimed_at) DESC LIMIT 1
        `, [userId]);

        let streak = 1;
        if (lastCheckin) {
            const lastDate = lastCheckin.claim_date || lastCheckin.claimed_at.split('T')[0];
            const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const yesterdayWIB = getWIBDate(yesterdayDate);

            if (lastDate === todayWIB) {
                streak = lastCheckin.streak_count || 1;
            } else if (lastDate === yesterdayWIB) {
                streak = ((lastCheckin.streak_count || 1) % 7) + 1;
            } else {
                streak = 1;
            }
        }

        const todaySpin = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'lucky_spin' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ? OR substr(claimed_at, 1, 10) = ?)
        `, [userId, todayWIB, todayWIB, todayWIB]);

        const rewards = [100, 200, 300, 400, 500, 750, 1000];
        const gamePayload = {
            coins: userCoins,
            can_checkin: !todayCheckin,
            current_streak: streak,
            today_checkin_done: !!todayCheckin,
            can_spin: !todaySpin,
            rewards
        };

        res.json({
            status: true,
            data: gamePayload,
            ...gamePayload
        });
    } catch (e) {
        console.error("Error in /api/games/status:", e);
        res.status(500).json({ status: false, message: "Gagal memuat status game." });
    }
});

// 2. GET /api/games/history
router.get('/games/history', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const history = await dbAll(`
            SELECT id, claim_type, coins_amount, streak_count, claimed_at
            FROM user_coin_claims
            WHERE userId = ?
            ORDER BY datetime(claimed_at) DESC
            LIMIT 50
        `, [userId]);

        res.json({
            status: true,
            data: history
        });
    } catch (e) {
        console.error("Error in /api/games/history:", e);
        res.status(500).json({ status: false, message: "Gagal mengambil riwayat koin." });
    }
});

// 3. POST /api/games/daily-checkin
router.post('/games/daily-checkin', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayWIB = getWIBDate();

        const todayCheckin = await dbGet(`
            SELECT id FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_checkin' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ? OR substr(claimed_at, 1, 10) = ?)
        `, [userId, todayWIB, todayWIB, todayWIB]);

        if (todayCheckin) {
            return res.status(400).json({ status: false, message: "Anda sudah melakukan check-in hari ini! Coba lagi besok ya." });
        }

        const lastCheckin = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_checkin'
            ORDER BY datetime(claimed_at) DESC LIMIT 1
        `, [userId]);

        let streak = 1;
        if (lastCheckin) {
            const lastDate = lastCheckin.claim_date || lastCheckin.claimed_at.split('T')[0];
            const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const yesterdayWIB = getWIBDate(yesterdayDate);

            if (lastDate === yesterdayWIB) {
                streak = ((lastCheckin.streak_count || 1) % 7) + 1;
            } else {
                streak = 1;
            }
        }

        const rewards = [100, 200, 300, 400, 500, 750, 1000];
        const coinBonus = rewards[streak - 1] || 100;

        await dbRun("UPDATE users SET coins = MIN(50000, COALESCE(coins, 0) + ?) WHERE id = ?", [coinBonus, userId]);
        const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await dbRun(`
            INSERT INTO user_coin_claims (id, userId, claim_type, coins_amount, streak_count, claim_date, claimed_at)
            VALUES (?, ?, 'daily_checkin', ?, ?, ?, ?)
        `, [claimId, userId, coinBonus, streak, todayWIB, new Date().toISOString()]);

        const updatedUser = await dbGet("SELECT coins FROM users WHERE id = ?", [userId]);

        res.json({
            status: true,
            message: `Hore! Anda mendapatkan +${coinBonus} Koin Ry (Hari ke-${streak})!`,
            coins_earned: coinBonus,
            streak,
            new_coins_balance: updatedUser?.coins || 0
        });
    } catch (e) {
        console.error("Error in daily checkin:", e);
        res.status(500).json({ status: false, message: "Gagal memproses check-in harian." });
    }
});

// 4. POST /api/games/lucky-spin
router.post('/games/lucky-spin', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayWIB = getWIBDate();

        const todaySpin = await dbGet(`
            SELECT id FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'lucky_spin' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ? OR substr(claimed_at, 1, 10) = ?)
        `, [userId, todayWIB, todayWIB, todayWIB]);

        if (todaySpin) {
            return res.status(400).json({ status: false, message: "Tiket putar gratis hari ini sudah terpakai. Coba lagi besok ya!" });
        }

        const prizeOptions = [
            { index: 0, amount: 250, weight: 50 },
            { index: 1, amount: 500, weight: 28 },
            { index: 2, amount: 750, weight: 12 },
            { index: 3, amount: 1000, weight: 6 },
            { index: 4, amount: 1500, weight: 3 },
            { index: 5, amount: 2500, weight: 1 },
        ];

        const totalWeight = prizeOptions.reduce((acc, p) => acc + p.weight, 0);
        let randomNum = Math.random() * totalWeight;
        let selectedPrize = prizeOptions[0];

        for (const prize of prizeOptions) {
            if (randomNum < prize.weight) {
                selectedPrize = prize;
                break;
            }
            randomNum -= prize.weight;
        }

        const randomIndex = selectedPrize.index;
        const wonCoins = selectedPrize.amount;

        await dbRun("UPDATE users SET coins = MIN(50000, COALESCE(coins, 0) + ?) WHERE id = ?", [wonCoins, userId]);
        const claimId = `spin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await dbRun(`
            INSERT INTO user_coin_claims (id, userId, claim_type, coins_amount, streak_count, claim_date, claimed_at)
            VALUES (?, ?, 'lucky_spin', ?, 1, ?, ?)
        `, [claimId, userId, wonCoins, todayWIB, new Date().toISOString()]);

        const updatedUser = await dbGet("SELECT coins FROM users WHERE id = ?", [userId]);

        res.json({
            status: true,
            prize_index: randomIndex,
            coins_earned: wonCoins,
            message: `Selamat! Anda memenangkan +${wonCoins.toLocaleString('id-ID')} Koin Ry dari Roda Hoki!`,
            new_coins_balance: updatedUser?.coins || 0
        });
    } catch (e) {
        console.error("Error in lucky spin:", e);
        res.status(500).json({ status: false, message: "Gagal memutar roda hoki." });
    }
});

module.exports = router;
