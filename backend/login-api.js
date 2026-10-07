const crypto = require("crypto");
const db = require("./db");
const { createSession } = require("./session");

function verifyPassword(password, storedHash) {

    const parts = storedHash.split(":");

    if (parts.length !== 2) {
        return false;
    }

    const salt = parts[0];
    const originalHash = parts[1];

    const newHash = crypto.scryptSync(
        password,
        salt,
        64
    ).toString("hex");

    const a = Buffer.from(originalHash, "hex");
    const b = Buffer.from(newHash, "hex");

    if (a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(a, b);
}


function loginUser(username, password, deviceId, browserFingerprint) {

    if (!username || !password) {
        throw new Error("أدخل اسم المستخدم وكلمة المرور");
    }

    const user = db.prepare(`
        SELECT *
        FROM users
        WHERE username = ?
        LIMIT 1
    `).get(username.trim());

    if (!user) {
        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
    }

    const validPassword = verifyPassword(
        password,
        user.password_hash
    );

    if (!validPassword) {
        throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة");
    }

    const cleanDeviceId =
        deviceId ? String(deviceId).trim() : "";

    const cleanFingerprint =
        browserFingerprint ? String(browserFingerprint).trim() : "";

    if (cleanDeviceId || cleanFingerprint) {
        db.prepare(`
            UPDATE users
            SET
                device_id = COALESCE(NULLIF(device_id, ''), ?),
                browser_fingerprint = COALESCE(NULLIF(browser_fingerprint, ''), ?)
            WHERE id = ?
        `).run(
            cleanDeviceId || null,
            cleanFingerprint || null,
            user.id
        );
    }

    const token = createSession(user.id);

    delete user.password_hash;

    return {
        token,
        user
    };
}


module.exports = {
    loginUser
};
