const db = require("./db");
const { getActiveSkippedIds } = require("./skip-api");

function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();

    const month = today.getMonth() - birth.getMonth();

    if (
        month < 0 ||
        (month === 0 && today.getDate() < birth.getDate())
    ) {
        age--;
    }

    return age;
}

function getSuggestions(userId) {

    const currentUser = db.prepare(`
        SELECT id, gender
        FROM users
        WHERE id = ?
        LIMIT 1
    `).get(userId);

    if (!currentUser) {
        throw new Error("المستخدم غير موجود");
    }

    const oppositeGender =
        currentUser.gender === "male"
            ? "female"
            : "male";

    const skippedIds = getActiveSkippedIds(userId);

    const users = db.prepare(`
        SELECT
            id,
            username,
            gender,
            first_name,
            last_name,
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
            profile_image
        FROM users
        WHERE id != ?
          AND gender = ?
          AND id NOT IN (
              SELECT skipped_user_id
              FROM skipped_profiles
              WHERE user_id = ?
          )
        ORDER BY id DESC
    `).all(
        userId,
        oppositeGender,
        userId
    );

    return users.map(user => ({
        ...user,
        age: calculateAge(user.birth_date)
    }));

}

module.exports = {
    getSuggestions
};
