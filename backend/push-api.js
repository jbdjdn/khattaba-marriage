const fs = require("fs");
const path = require("path");
const webpush = require("web-push");
const db = require("./db");

const vapidPath = path.join(__dirname, "data", "vapid.json");
const vapid = JSON.parse(fs.readFileSync(vapidPath, "utf8"));

webpush.setVapidDetails(
    "mailto:admin@example.com",
    vapid.publicKey,
    vapid.privateKey
);

function saveSubscription(userId, subscription) {
    if (!userId || !subscription || !subscription.endpoint) {
        throw new Error("بيانات الاشتراك غير مكتملة");
    }

    db.exec(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            endpoint TEXT NOT NULL UNIQUE,
            subscription_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.prepare(`
        INSERT INTO push_subscriptions (
            user_id,
            endpoint,
            subscription_json
        )
        VALUES (?, ?, ?)
        ON CONFLICT(endpoint)
        DO UPDATE SET
            user_id = excluded.user_id,
            subscription_json = excluded.subscription_json,
            updated_at = CURRENT_TIMESTAMP
    `).run(
        Number(userId),
        subscription.endpoint,
        JSON.stringify(subscription)
    );

    return true;
}

async function sendPushToUser(userId, payload) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            endpoint TEXT NOT NULL UNIQUE,
            subscription_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    const subscriptions = db.prepare(`
        SELECT id, endpoint, subscription_json
        FROM push_subscriptions
        WHERE user_id = ?
    `).all(Number(userId));

    for (const row of subscriptions) {
        try {
            await webpush.sendNotification(
                JSON.parse(row.subscription_json),
                JSON.stringify(payload)
            );
        } catch (error) {
            if (error.statusCode === 404 || error.statusCode === 410) {
                db.prepare(`
                    DELETE FROM push_subscriptions
                    WHERE id = ?
                `).run(row.id);
            } else {
                console.error("push send error:", error.message);
            }
        }
    }
}

function getPublicKey() {
    return vapid.publicKey;
}

module.exports = {
    saveSubscription,
    sendPushToUser,
    getPublicKey
};
