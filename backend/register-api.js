const crypto = require("crypto");
const db = require("./db");

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto.scryptSync(
        password,
        salt,
        64
    ).toString("hex");

    return `${salt}:${hash}`;
}

function registerUser(data) {
    console.log("بيانات التسجيل:", { username: data.username, deviceId: data.deviceId, browserFingerprint: data.browserFingerprint });

    const required = [
        "username",
        "password",
        "gender",
        "firstName",
        "lastName",
        "email",
        "phoneCountry",
        "phone",
        "nationality",
        "residenceCountry",
        "city",
        "birthDate",
        "height",
        "weight",
        "religion",
        "skinColor",
        "aboutMe",
        "partnerDescription",
        "profileImage"
    ];

    for (const field of required) {
        if (
            data[field] === undefined ||
            data[field] === null ||
            String(data[field]).trim() === ""
        ) {
            throw new Error(`الحقل ناقص: ${field}`);
        }
    }

    if (!data.deviceId || String(data.deviceId).trim() === "") {
        throw new Error("تعذر التعرف على الجهاز");
    }

    if (!data.browserFingerprint || String(data.browserFingerprint).trim() === "") {
        throw new Error("تعذر التعرف على المتصفح");
    }

    const deviceId = String(data.deviceId).trim();
    const browserFingerprint = String(data.browserFingerprint).trim();

    console.log("فحص جهاز التسجيل:", { deviceId, browserFingerprint });
    const deviceExisting = db.prepare(`
        SELECT id, username
        FROM users
        WHERE device_id = ?
        LIMIT 1
    `).get(deviceId);

    if (deviceExisting) {
        throw new Error("لديك حساب على هذا الجهاز بالفعل");
    }

    const fingerprintExisting = db.prepare(`
        SELECT id, username
        FROM users
        WHERE browser_fingerprint = ?
        LIMIT 1
    `).get(browserFingerprint);

    if (fingerprintExisting) {
        throw new Error("لديك حساب مرتبط بهذا المتصفح بالفعل");
    }

    if (!["male", "female"].includes(data.gender)) {
        throw new Error("نوع الحساب غير صحيح");
    }

    if (!["سني", "شيعي"].includes(data.religion)) {
        throw new Error("المذهب غير صحيح");
    }

    const password = String(data.password);

    if (password.length < 8) {
        throw new Error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    }

    const existing = db.prepare(`
        SELECT id, username, email, phone_number
        FROM users
        WHERE username = ?
           OR email = ?
           OR phone_number = ?
        LIMIT 1
    `).get(
        data.username.trim(),
        data.email.trim().toLowerCase(),
        data.phone.trim()
    );

    if (existing) {
        if (existing.username === data.username.trim()) {
            throw new Error("اسم المستخدم مستخدم بالفعل");
        }

        if (existing.email === data.email.trim().toLowerCase()) {
            throw new Error("البريد الإلكتروني مستخدم بالفعل");
        }

        throw new Error("رقم الهاتف مستخدم بالفعل");
    }

    const passwordHash = hashPassword(password);

    const result = db.prepare(`
        INSERT INTO users (
            username,
            password_hash,
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
            device_id,
            browser_fingerprint
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        data.username.trim(),
        passwordHash,
        data.gender,
        data.firstName.trim(),
        data.lastName.trim(),
        data.email.trim().toLowerCase(),
        data.phoneCountry,
        data.phone.trim(),
        data.nationality,
        data.residenceCountry,
        data.city.trim(),
        data.birthDate,
        Number(data.height),
        Number(data.weight),
        data.religion,
        data.skinColor,
        data.aboutMe.trim(),
        data.partnerDescription.trim(),
        data.profileImage,
        deviceId,
        browserFingerprint
    );

    return {
        id: Number(result.lastInsertRowid),
        username: data.username.trim()
    };
}

module.exports = {
    registerUser
};
