const crypto = require("crypto");
const db = require("./db");

function createSession(userId) {
    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    db.prepare(`
        INSERT INTO sessions (
            token_hash,
            user_id,
            expires_at
        )
        VALUES (?, ?, ?)
    `).run(
        tokenHash,
        userId,
        expiresAt
    );

    return token;
}

function getUserFromSession(token) {
    if (!token) return null;

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const session = db.prepare(`
        SELECT
            sessions.user_id,
            sessions.expires_at
        FROM sessions
        WHERE sessions.token_hash = ?
        LIMIT 1
    `).get(tokenHash);

    if (!session) return null;

    if (new Date(session.expires_at) <= new Date()) {
        db.prepare(`
            DELETE FROM sessions
            WHERE token_hash = ?
        `).run(tokenHash);

        return null;
    }

    return db.prepare(`
        SELECT
            id,
            username,
            gender,
            first_name,
            last_name,
            email,
            phone_country_code,
            phone_number,
            nationality,
            residence_country,
            city,
            birth_date,
            height,
            weight,
            religion,
            skin_color,
            about_me,
            partner_description,
            profile_image,
            created_at,
            updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
    `).get(session.user_id);
}

function deleteSession(token) {
    if (!token) return;

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    db.prepare(`
        DELETE FROM sessions
        WHERE token_hash = ?
    `).run(tokenHash);
}

module.exports = {
    createSession,
    getUserFromSession,
    deleteSession
};
