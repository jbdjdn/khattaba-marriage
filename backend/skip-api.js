const db = require("./db");

function skipProfile(userId, skippedUserId) {

    if (!userId || !skippedUserId) {
        throw new Error("بيانات التخطي غير مكتملة");
    }

    if (Number(userId) === Number(skippedUserId)) {
        throw new Error("لا يمكنك تخطي نفسك");
    }

    const otherUser = db.prepare(`
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
    `).get(skippedUserId);

    if (!otherUser) {
        throw new Error("المستخدم غير موجود");
    }

    db.prepare(`
        DELETE FROM skipped_profiles
        WHERE user_id = ?
          AND skipped_user_id = ?
    `).run(userId, skippedUserId);

    db.prepare(`
        INSERT INTO skipped_profiles (
            user_id,
            skipped_user_id
        )
        VALUES (?, ?)
    `).run(userId, skippedUserId);

    return true;
}

function undoSkip(userId) {

    const skipped = db.prepare(`
        SELECT
            id,
            skipped_user_id
        FROM skipped_profiles
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
    `).get(userId);

    if (!skipped) {
        return null;
    }

    db.prepare(`
        DELETE FROM skipped_profiles
        WHERE id = ?
    `).run(skipped.id);

    return skipped.skipped_user_id;
}

function getActiveSkippedIds(userId) {

    db.prepare(`
        DELETE FROM skipped_profiles
        WHERE datetime(skipped_at, '+10 minutes') <= CURRENT_TIMESTAMP
    `).run();

    const rows = db.prepare(`
        SELECT skipped_user_id
        FROM skipped_profiles
        WHERE user_id = ?
    `).all(userId);

    return rows.map(row => row.skipped_user_id);
}

module.exports = {
    skipProfile,
    undoSkip,
    getActiveSkippedIds
};
