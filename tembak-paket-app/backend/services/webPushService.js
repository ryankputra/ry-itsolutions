/**
 * Web Push Notification Service (VAPID & Push API)
 * Sends native-style status bar notifications to subscribers on mobile and desktop.
 */

const webpush = require('web-push');
const { dbGet, dbRun, dbAll } = require('../config/db');

let vapidPublicKey = '';
let vapidPrivateKey = '';
let isInitialized = false;
let initPromise = null;

/**
 * Initialize VAPID Keys from SQLite settings or generate new ones
 */
async function initVapidKeys() {
    if (isInitialized && vapidPublicKey && vapidPrivateKey) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            const pubRow = await dbGet("SELECT value FROM settings WHERE key = 'vapid_public_key'");
            const privRow = await dbGet("SELECT value FROM settings WHERE key = 'vapid_private_key'");

            if (pubRow?.value && privRow?.value) {
                vapidPublicKey = pubRow.value;
                vapidPrivateKey = privRow.value;
            } else {
                // Generate robust VAPID keypair
                const newKeys = webpush.generateVAPIDKeys();
                vapidPublicKey = newKeys.publicKey;
                vapidPrivateKey = newKeys.privateKey;

                await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('vapid_public_key', ?)", [vapidPublicKey]);
                await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('vapid_private_key', ?)", [vapidPrivateKey]);
                console.log('[WebPush] Generated and saved new VAPID keys to database.');
            }

            webpush.setVapidDetails(
                'mailto:admin@ry-itsolutionts.web.id',
                vapidPublicKey,
                vapidPrivateKey
            );
            isInitialized = true;
        } catch (e) {
            console.error('[WebPush] Failed to initialize VAPID keys:', e.message);
        } finally {
            initPromise = null;
        }
    })();

    return initPromise;
}

// Auto init on module load
initVapidKeys().catch(() => {});

/**
 * Get Public VAPID Key for client subscription
 */
async function getVapidPublicKey() {
    if (!isInitialized || !vapidPublicKey) {
        await initVapidKeys();
    }
    return vapidPublicKey;
}

/**
 * Send push notification to a single subscriber
 */
async function sendPushNotification(subObj, payload) {
    if (!isInitialized) await initVapidKeys();

    const pushSubscription = {
        endpoint: subObj.endpoint,
        keys: {
            p256dh: subObj.keys_p256dh || subObj.keys?.p256dh,
            auth: subObj.keys_auth || subObj.keys?.auth
        }
    };

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
        await webpush.sendNotification(pushSubscription, payloadString);
        return { success: true };
    } catch (err) {
        // Subscription is expired, unregistered, or invalid (HTTP 410 or 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
            try {
                await dbRun("DELETE FROM push_subscriptions WHERE endpoint = ?", [subObj.endpoint]);
                console.log(`[WebPush] Removed expired subscription endpoint: ${subObj.endpoint.slice(0, 30)}...`);
            } catch (delErr) {}
        }
        return { success: false, error: err.message, statusCode: err.statusCode };
    }
}

/**
 * Broadcast push notification to all subscribed user devices
 */
async function broadcastPushNotification({ title, body, icon = '/logo.png', url = '/', tag = 'ry-notification', badge = '/icon.svg' }) {
    if (!isInitialized) await initVapidKeys();

    try {
        const subscribers = await dbAll("SELECT id, endpoint, keys_p256dh, keys_auth, userId FROM push_subscriptions");
        if (!subscribers || subscribers.length === 0) {
            console.warn('[WebPush] Broadcast skipped: Belum ada perangkat HP/browser pelanggan yang terdaftar.');
            return { totalSent: 0, successCount: 0, failureCount: 0, message: 'Tidak ada perangkat terdaftar' };
        }

        const payload = JSON.stringify({
            title: title || 'Ry-ITSolutions',
            body: body || 'Ada pembaruan layanan & promo baru!',
            icon: icon || '/logo.png',
            badge: badge || '/icon.svg',
            url: url || '/',
            tag: tag || ('ry-' + Date.now()),
            timestamp: Date.now()
        });

        let successCount = 0;
        let failureCount = 0;

        // Send concurrently in chunks of 20
        const chunkSize = 20;
        for (let i = 0; i < subscribers.length; i += chunkSize) {
            const chunk = subscribers.slice(i, i + chunkSize);
            const results = await Promise.allSettled(
                chunk.map(sub => sendPushNotification(sub, payload))
            );

            results.forEach(res => {
                if (res.status === 'fulfilled' && res.value?.success) {
                    successCount++;
                } else {
                    failureCount++;
                }
            });
        }

        console.log(`[WebPush] Broadcast complete: ${successCount} sukses, ${failureCount} gagal dari total ${subscribers.length} perangkat.`);

        return {
            totalSent: subscribers.length,
            successCount,
            failureCount,
            message: `Berhasil mengirim ke ${successCount} perangkat (${failureCount} gagal/kedaluwarsa).`
        };
    } catch (e) {
        console.error('[WebPush] Broadcast error:', e);
        return { totalSent: 0, successCount: 0, failureCount: 0, error: e.message };
    }
}

module.exports = {
    initVapidKeys,
    getVapidPublicKey,
    sendPushNotification,
    broadcastPushNotification
};
