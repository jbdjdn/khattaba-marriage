const db = require("./db");

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

function searchUsers(userId, filters = {}) {

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

    const {
        nationality,
        residenceCountry,
        city,
        religion,
        skinColor,
        minAge,
        maxAge,
        minHeight,
        maxHeight
    } = filters;

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
        ORDER BY id DESC
    `).all(
        userId,
        oppositeGender
    );

    return users
        .map(user => ({
            ...user,
            age: calculateAge(user.birth_date)
        }))
        .filter(user => {

            if (
                nationality &&
                user.nationality !== nationality
            ) {
                return false;
            }

            if (
                residenceCountry &&
                user.residence_country !== residenceCountry
            ) {
                return false;
            }

            if (
                city &&
                user.city !== city
            ) {
                return false;
            }

            if (
                religion &&
                user.religion !== religion
            ) {
                return false;
            }

            if (
                skinColor &&
                user.skin_color !== skinColor
            ) {
                return false;
            }

            if (
                minHeight &&
                user.height < Number(minHeight)
            ) {
                return false;
            }

            if (
                maxHeight &&
                user.height > Number(maxHeight)
            ) {
                return false;
            }

            return true;
        })
        .sort((a, b) => {

            const hasAgePreference =
                minAge || maxAge;

            if (!hasAgePreference) {
                return 0;
            }

            const min =
                minAge ? Number(minAge) : 0;

            const max =
                maxAge ? Number(maxAge) : 999;

            function ageDistance(age) {

                if (age < min) {
                    return min - age;
                }

                if (age > max) {
                    return age - max;
                }

                return 0;
            }

            return (
                ageDistance(a.age) -
                ageDistance(b.age)
            );
        });
}

module.exports = {
    searchUsers
};
