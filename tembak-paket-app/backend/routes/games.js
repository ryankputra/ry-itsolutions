/**
 * Games & Rewards Routes
 * Daily Check-in, Lucky Spin, Mystery Box, Scratch Card, and Daily Tech Trivia
 */

const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

function getWIBDate(date = new Date()) {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
}

function getYesterdayWIBDate(todayWIBStr) {
    const [y, m, d] = todayWIBStr.split('-').map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1));
    return yesterday.toISOString().split('T')[0];
}

// Trivia Question Bank (10 curated questions, no emojis)
const TRIVIA_QUESTIONS = [
    {
        id: "q1",
        question: "Apa kepanjangan resmi dari singkatan IMEI pada perangkat seluler?",
        options: [
            "International Mobile Equipment Identity",
            "Internet Mobile Electronic Identifier",
            "Internal Modem Equipment Indicator",
            "Integrated Mobile Electronic Interface"
        ],
        answer: 0,
        explanation: "IMEI merupakan identitas 15-digit unik berskala internasional untuk setiap slot modem seluler."
    },
    {
        id: "q2",
        question: "Berapa digit standar nomor IMEI resmi pada perangkat smartphone?",
        options: ["15 Digit", "12 Digit", "16 Digit", "14 Digit"],
        answer: 0,
        explanation: "Format standar internasional IMEI terdiri dari tepat 15 digit angka."
    },
    {
        id: "q3",
        question: "Kode panggilan cepat (USSD) universal untuk memeriksa nomor IMEI adalah...",
        options: ["*#06#", "*#0000#", "*123#", "*#21#"],
        answer: 0,
        explanation: "Mengetikkan *#06# pada papan tombol telepon akan langsung memunculkan nomor IMEI perangkat."
    },
    {
        id: "q4",
        question: "Sistem basis data terpadu nasional di Indonesia untuk verifikasi IMEI resmi adalah...",
        options: [
            "CEIR (Central Equipment Identity Register)",
            "KOMINFO Central Registry",
            "Kemenperin Cloud Gate",
            "Dukcapil Device Portal"
        ],
        answer: 0,
        explanation: "CEIR mengintegrasikan database Kemenperin, Bea Cukai, Kominfo, dan operator seluler nasional."
    },
    {
        id: "q5",
        question: "Generasi jaringan seluler manakah yang pertama kali mendukung kecepatan nirkabel gigabit?",
        options: ["5G (New Radio)", "4G LTE", "3G HSDPA", "EDGE"],
        answer: 0,
        explanation: "Jaringan 5G dirancang untuk latensi ultra-rendah dan throughput melampaui 1 Gbps."
    },
    {
        id: "q6",
        question: "Apakah proses pemutihan/unblock IMEI resmi memerlukan rooting atau bongkar fisik mesin?",
        options: [
            "Tidak, pemrosesan legal berbasis pendaftaran server database operator",
            "Ya, harus mengganti motherboard mesin",
            "Ya, wajib melakukan rooting sistem operasi",
            "Ya, wajib membuka segel garansi pabrik"
        ],
        answer: 0,
        explanation: "Aktivasi IMEI legal bekerja murni di level pendaftaran database jaringan tanpa menyentuh hardware."
    },
    {
        id: "q7",
        question: "Perangkat smartphone dengan dukungan Dual SIM fisik umumnya dibekali...",
        options: [
            "2 Nomor IMEI berbeda (IMEI 1 dan IMEI 2)",
            "1 Nomor IMEI tunggal yang dibagi bersama",
            "3 Nomor IMEI",
            "Nomor seri serial tanpa IMEI"
        ],
        answer: 0,
        explanation: "Setiap slot modem seluler mandiri wajib memiliki nomor IMEI unik masing-masing."
    },
    {
        id: "q8",
        question: "Protokol keamanan Wi-Fi modern yang memiliki standar enkripsi paling tangguh saat ini adalah...",
        options: ["WPA3-Personal", "WEP 64-bit", "WPA-TKIP", "WPA2-Default"],
        answer: 0,
        explanation: "WPA3 menggunakan enkripsi Simultaneous Authentication of Equals (SAE) yang kebal terhadap dictionary attack."
    },
    {
        id: "q9",
        question: "Apa keunggulan utama teknologi eSIM (Embedded SIM) dibanding kartu fisik tradisional?",
        options: [
            "Profil nomor terpasang secara digital tanpa perlu kartu plastik",
            "Menggantikan memori penyimpanan internal",
            "Meningkatkan resolusi kamera HP",
            "Mencegah radiasi layar ponsel"
        ],
        answer: 0,
        explanation: "eSIM adalah cip terintegrasi di papan induk yang dapat diprogram secara over-the-air tanpa kartu SIM fisik."
    },
    {
        id: "q10",
        question: "Berapa banyak Koin Ry yang dapat digunakan sebagai potongan belanja pada transaksi Anda?",
        options: [
            "1 Koin bernilai Rp 1 potongan langsung",
            "1 Koin bernilai Rp 0.1",
            "10 Koin bernilai Rp 1",
            "Koin hanya untuk pajangan profil"
        ],
        answer: 0,
        explanation: "Koin Ry dapat langsung digunakan sebagai diskon saldo dengan konversi 1 Koin = Rp 1."
    }
];

function getTodayTriviaIndices(todayWIBStr) {
    const parts = todayWIBStr.split('-').map(Number);
    const seed = parts[0] * 365 + parts[1] * 31 + parts[2];
    const total = TRIVIA_QUESTIONS.length;
    const i1 = seed % total;
    const i2 = (seed + 3) % total;
    const i3 = (seed + 7) % total;
    return [i1, i2 !== i1 ? i2 : (i1 + 1) % total, i3 !== i1 && i3 !== i2 ? i3 : (i1 + 2) % total];
}

// 1. GET /api/games/status
router.get('/games/status', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayWIB = getWIBDate();

        const user = await dbGet("SELECT coins FROM users WHERE id = ?", [userId]);
        const userCoins = user?.coins || 0;

        // Checkin status
        const todayCheckin = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_checkin' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        const lastCheckin = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_checkin'
            ORDER BY datetime(claimed_at) DESC LIMIT 1
        `, [userId]);

        let streak = 1;
        if (lastCheckin) {
            const lastDate = lastCheckin.claim_date || getWIBDate(lastCheckin.claimed_at);
            const yesterdayWIB = getYesterdayWIBDate(todayWIB);

            if (lastDate === todayWIB) {
                streak = lastCheckin.streak_count || 1;
            } else if (lastDate === yesterdayWIB) {
                streak = ((lastCheckin.streak_count || 1) % 7) + 1;
            } else {
                streak = 1;
            }
        }

        // Lucky Spin status
        const todaySpin = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'lucky_spin' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        // Mystery Box status
        const todayMysteryBox = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'mystery_box' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        // Scratch Card status
        const todayScratch = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'scratch_card' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        // Daily Trivia status
        const todayTrivia = await dbGet(`
            SELECT * FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_trivia' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        const rewards = [15, 25, 35, 50, 65, 80, 150];
        const gamePayload = {
            coins: userCoins,
            can_checkin: !todayCheckin,
            current_streak: streak,
            today_checkin_done: !!todayCheckin,
            can_spin: !todaySpin,
            can_mystery_box: !todayMysteryBox,
            can_scratch: !todayScratch,
            can_trivia: !todayTrivia,
            today_trivia_done: !!todayTrivia,
            trivia_coins_earned: todayTrivia?.coins_amount || 0,
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
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

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
            const lastDate = lastCheckin.claim_date || getWIBDate(lastCheckin.claimed_at);
            const yesterdayWIB = getYesterdayWIBDate(todayWIB);

            if (lastDate === yesterdayWIB) {
                streak = ((lastCheckin.streak_count || 1) % 7) + 1;
            } else {
                streak = 1;
            }
        }

        const rewards = [15, 25, 35, 50, 65, 80, 150];
        const coinBonus = rewards[streak - 1] || 100;

        await dbRun("UPDATE users SET coins = MIN(25000, COALESCE(coins, 0) + ?) WHERE id = ?", [coinBonus, userId]);
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
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        if (todaySpin) {
            return res.status(400).json({ status: false, message: "Tiket putar gratis hari ini sudah terpakai. Coba lagi besok ya!" });
        }

        const prizeOptions = [
            { index: 0, amount: 10, weight: 65 },
            { index: 1, amount: 20, weight: 25 },
            { index: 2, amount: 35, weight: 7 },
            { index: 3, amount: 50, weight: 2 },
            { index: 4, amount: 75, weight: 0.8 },
            { index: 5, amount: 150, weight: 0.2 },
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

        await dbRun("UPDATE users SET coins = MIN(25000, COALESCE(coins, 0) + ?) WHERE id = ?", [wonCoins, userId]);
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

// 5. POST /api/games/mystery-box
router.post('/games/mystery-box', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayWIB = getWIBDate();
        const chosenBox = Number(req.body.box_index) || 0; // 0, 1, or 2

        const todayClaim = await dbGet(`
            SELECT id FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'mystery_box' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        if (todayClaim) {
            return res.status(400).json({ status: false, message: "Tiket Kotak Misteri hari ini sudah terpakai. Coba lagi besok ya!" });
        }

        const prizePool = [
            { amount: 15, weight: 60, label: "15 Koin" },
            { amount: 25, weight: 28, label: "25 Koin" },
            { amount: 40, weight: 9, label: "40 Koin" },
            { amount: 75, weight: 2.5, label: "75 Koin" },
            { amount: 150, weight: 0.5, label: "150 Koin Grand Prize" },
        ];

        function pickRandomPrize() {
            const total = prizePool.reduce((acc, p) => acc + p.weight, 0);
            let rnd = Math.random() * total;
            for (const p of prizePool) {
                if (rnd < p.weight) return p;
                rnd -= p.weight;
            }
            return prizePool[0];
        }

        const wonPrize = pickRandomPrize();
        const wonCoins = wonPrize.amount;

        // Pick alternative prizes for the remaining 2 unselected boxes
        const otherPool = prizePool.filter(p => p.amount !== wonCoins);
        const alt1 = otherPool[Math.floor(Math.random() * otherPool.length)] || prizePool[0];
        const alt2 = otherPool.filter(p => p.amount !== alt1.amount)[0] || prizePool[1];

        const boxesContent = [];
        let altIdx = 0;
        const alts = [alt1, alt2];
        for (let i = 0; i < 3; i++) {
            if (i === chosenBox) {
                boxesContent.push(wonPrize);
            } else {
                boxesContent.push(alts[altIdx++] || prizePool[0]);
            }
        }

        await dbRun("UPDATE users SET coins = MIN(25000, COALESCE(coins, 0) + ?) WHERE id = ?", [wonCoins, userId]);
        const claimId = `box_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await dbRun(`
            INSERT INTO user_coin_claims (id, userId, claim_type, coins_amount, streak_count, claim_date, claimed_at)
            VALUES (?, ?, 'mystery_box', ?, 1, ?, ?)
        `, [claimId, userId, wonCoins, todayWIB, new Date().toISOString()]);

        const updatedUser = await dbGet("SELECT coins FROM users WHERE id = ?", [userId]);

        res.json({
            status: true,
            chosen_box: chosenBox,
            coins_earned: wonCoins,
            won_label: wonPrize.label,
            boxes_content: boxesContent,
            message: `Luar biasa! Kotak Misteri #${chosenBox + 1} berisi +${wonCoins.toLocaleString('id-ID')} Koin Ry!`,
            new_coins_balance: updatedUser?.coins || 0
        });
    } catch (e) {
        console.error("Error in mystery box:", e);
        res.status(500).json({ status: false, message: "Gagal membuka kotak misteri." });
    }
});

// 6. POST /api/games/scratch-card
router.post('/games/scratch-card', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayWIB = getWIBDate();

        const todayClaim = await dbGet(`
            SELECT id FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'scratch_card' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        if (todayClaim) {
            return res.status(400).json({ status: false, message: "Tiket Kartu Gores hari ini sudah terpakai. Coba lagi besok ya!" });
        }

        const scratchOptions = [
            { amount: 10, weight: 60 },
            { amount: 20, weight: 26 },
            { amount: 35, weight: 10 },
            { amount: 50, weight: 3.5 },
            { amount: 100, weight: 0.5 },
        ];

        const totalWeight = scratchOptions.reduce((acc, p) => acc + p.weight, 0);
        let rnd = Math.random() * totalWeight;
        let wonOption = scratchOptions[0];
        for (const opt of scratchOptions) {
            if (rnd < opt.weight) {
                wonOption = opt;
                break;
            }
            rnd -= opt.weight;
        }

        const wonCoins = wonOption.amount;

        // Build 6 tiles: exactly 3 matching wonCoins, 3 distractors
        const otherOptions = scratchOptions.filter(o => o.amount !== wonCoins);
        const distractors = [
            otherOptions[0]?.amount || 5,
            otherOptions[1]?.amount || 15,
            otherOptions[2]?.amount || 25,
        ];

        const tiles = [wonCoins, wonCoins, wonCoins, distractors[0], distractors[1], distractors[2]];
        // Fisher-Yates Shuffle
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }

        await dbRun("UPDATE users SET coins = MIN(25000, COALESCE(coins, 0) + ?) WHERE id = ?", [wonCoins, userId]);
        const claimId = `scratch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await dbRun(`
            INSERT INTO user_coin_claims (id, userId, claim_type, coins_amount, streak_count, claim_date, claimed_at)
            VALUES (?, ?, 'scratch_card', ?, 1, ?, ?)
        `, [claimId, userId, wonCoins, todayWIB, new Date().toISOString()]);

        const updatedUser = await dbGet("SELECT coins FROM users WHERE id = ?", [userId]);

        res.json({
            status: true,
            coins_earned: wonCoins,
            tiles: tiles,
            message: `Hebat! 3 petak cocok terungkap! Anda mendapatkan +${wonCoins.toLocaleString('id-ID')} Koin Ry!`,
            new_coins_balance: updatedUser?.coins || 0
        });
    } catch (e) {
        console.error("Error in scratch card:", e);
        res.status(500).json({ status: false, message: "Gagal mengklaim kartu gores." });
    }
});

// 7. GET /api/games/trivia/today
router.get('/games/trivia/today', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayWIB = getWIBDate();

        const todayClaim = await dbGet(`
            SELECT coins_amount FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_trivia' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        const indices = getTodayTriviaIndices(todayWIB);
        // Return questions without the answer field to prevent client inspection
        const questions = indices.map((idx, qNum) => {
            const q = TRIVIA_QUESTIONS[idx];
            return {
                number: qNum + 1,
                id: q.id,
                question: q.question,
                options: q.options
            };
        });

        res.json({
            status: true,
            can_play: !todayClaim,
            already_played: !!todayClaim,
            coins_earned: todayClaim?.coins_amount || 0,
            questions: questions
        });
    } catch (e) {
        console.error("Error in trivia today:", e);
        res.status(500).json({ status: false, message: "Gagal mengambil pertanyaan kuis harian." });
    }
});

// 8. POST /api/games/trivia/submit
router.post('/games/trivia/submit', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const todayWIB = getWIBDate();

        const todayClaim = await dbGet(`
            SELECT id FROM user_coin_claims 
            WHERE userId = ? AND claim_type = 'daily_trivia' 
              AND (claim_date = ? OR date(claimed_at, '+7 hours') = ?)
        `, [userId, todayWIB, todayWIB]);

        if (todayClaim) {
            return res.status(400).json({ status: false, message: "Kuis hari ini sudah pernah diselesaikan. Kembali lagi besok ya!" });
        }

        const userAnswers = req.body.answers || []; // array of selected option indices [0..3]
        const indices = getTodayTriviaIndices(todayWIB);

        let correctCount = 0;
        const feedback = indices.map((qIdx, i) => {
            const q = TRIVIA_QUESTIONS[qIdx];
            const isCorrect = userAnswers[i] === q.answer;
            if (isCorrect) correctCount++;
            return {
                id: q.id,
                question: q.question,
                selected_answer: userAnswers[i],
                correct_answer: q.answer,
                is_correct: isCorrect,
                explanation: q.explanation
            };
        });

        // Reward calculation:
        // 3 correct: 350 coins
        // 2 correct: 200 coins
        // 1 correct: 100 coins
        // 0 correct: 50 coins consolation
        let wonCoins = 5;
        if (correctCount === 3) wonCoins = 45;
        else if (correctCount === 2) wonCoins = 25;
        else if (correctCount === 1) wonCoins = 15;

        await dbRun("UPDATE users SET coins = MIN(25000, COALESCE(coins, 0) + ?) WHERE id = ?", [wonCoins, userId]);
        const claimId = `trivia_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await dbRun(`
            INSERT INTO user_coin_claims (id, userId, claim_type, coins_amount, streak_count, claim_date, claimed_at)
            VALUES (?, ?, 'daily_trivia', ?, ?, ?, ?)
        `, [claimId, userId, wonCoins, correctCount, todayWIB, new Date().toISOString()]);

        const updatedUser = await dbGet("SELECT coins FROM users WHERE id = ?", [userId]);

        res.json({
            status: true,
            score: correctCount,
            total: 3,
            coins_earned: wonCoins,
            feedback: feedback,
            message: `Kuis selesai! Skor Anda: ${correctCount}/3 Benar. +${wonCoins.toLocaleString('id-ID')} Koin Ry ditambahkan ke dompet!`,
            new_coins_balance: updatedUser?.coins || 0
        });
    } catch (e) {
        console.error("Error in trivia submit:", e);
        res.status(500).json({ status: false, message: "Gagal mengirim jawaban kuis." });
    }
});

module.exports = router;
