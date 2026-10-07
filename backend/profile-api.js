const db = require("./db");

function getProfile(userId) {

    const user = db.prepare(`
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
        WHERE id = ?
        LIMIT 1
    `).get(userId);

    if (!user) {
        return null;
    }

    return {
        ...user,
        age: calculateAge(user.birth_date)
    };
}

function calculateAge(birthDate) {

    const birth = new Date(birthDate);
    const today = new Date();

    let age =
        today.getFullYear() -
        birth.getFullYear();

    const month =
        today.getMonth() -
        birth.getMonth();

    if (
        month < 0 ||
        (
            month === 0 &&
            today.getDate() < birth.getDate()
        )
    ) {
        age--;
    }

    return age;
}

module.exports = {
    getProfile
};
