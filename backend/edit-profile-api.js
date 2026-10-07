const db = require("./db");

function updateProfile(userId, data) {

    const {
        firstName,
        lastName,
        nationality,
        residenceCountry,
        city,
        height,
        weight,
        religion,
        skinColor,
        aboutMe,
        partnerDescription,
        profileImage
    } = data;

    if (!firstName || !lastName) {
        throw new Error("الاسم الأول واسم العائلة مطلوبان");
    }

    if (!nationality || !residenceCountry || !city) {
        throw new Error("الجنسية وبلد الإقامة والمدينة مطلوبة");
    }

    if (!height || !weight) {
        throw new Error("الطول والوزن مطلوبان");
    }

    if (!religion || !["سني", "شيعي"].includes(religion)) {
        throw new Error("الدين غير صحيح");
    }

    if (!skinColor) {
        throw new Error("لون البشرة مطلوب");
    }

    if (!aboutMe || !partnerDescription) {
        throw new Error("يرجى إكمال النبذة عنك وعن شريك الحياة");
    }

    const user = db.prepare(`
        SELECT id, profile_image
        FROM users
        WHERE id = ?
        LIMIT 1
    `).get(userId);

    if (!user) {
        throw new Error("المستخدم غير موجود");
    }

    const image =
        profileImage || user.profile_image;

    db.prepare(`
        UPDATE users
        SET
            first_name = ?,
            last_name = ?,
            nationality = ?,
            residence_country = ?,
            city = ?,
            height = ?,
            weight = ?,
            religion = ?,
            skin_color = ?,
            about_me = ?,
            partner_description = ?,
            profile_image = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        firstName.trim(),
        lastName.trim(),
        nationality.trim(),
        residenceCountry.trim(),
        city.trim(),
        Number(height),
        Number(weight),
        religion,
        skinColor.trim(),
        aboutMe.trim(),
        partnerDescription.trim(),
        image,
        userId
    );

    return true;
}

module.exports = {
    updateProfile
};
