const db = require("./db");

function getOrCreateConversation(userId, otherUserId) {
    if (!userId || !otherUserId) {
        throw new Error("بيانات المحادثة غير مكتملة");
    }

    if (Number(userId) === Number(otherUserId)) {
        throw new Error("لا يمكنك بدء محادثة مع نفسك");
    }

    const otherUser = db.prepare(`
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
    `).get(otherUserId);

    if (!otherUser) {
        throw new Error("المستخدم غير موجود");
    }

    const userOneId = Math.min(
        Number(userId),
        Number(otherUserId)
    );

    const userTwoId = Math.max(
        Number(userId),
        Number(otherUserId)
    );

    let conversation = db.prepare(`
        SELECT *
        FROM conversations
        WHERE user_one_id = ?
          AND user_two_id = ?
        LIMIT 1
    `).get(userOneId, userTwoId);

    if (!conversation) {
        db.prepare(`
            INSERT INTO conversations (
                user_one_id,
                user_two_id
            )
            VALUES (?, ?)
        `).run(
            userOneId,
            userTwoId
        );

        conversation = db.prepare(`
            SELECT *
            FROM conversations
            WHERE user_one_id = ?
              AND user_two_id = ?
            LIMIT 1
        `).get(
            userOneId,
            userTwoId
        );
    }

    return conversation;
}

function sendMessage(userId, otherUserId, message) {
    const text = String(message || "").trim();

    if (!text) {
        throw new Error("لا يمكن إرسال رسالة فارغة");
    }

    if (text.length > 2000) {
        throw new Error("الرسالة طويلة جدًا");
    }

    const conversation = getOrCreateConversation(
        userId,
        otherUserId
    );

    db.prepare(`
        INSERT INTO messages (
            conversation_id,
            sender_id,
            recipient_id,
            message
        )
        VALUES (?, ?, ?, ?)
    `).run(
        conversation.id,
        Number(userId),
        Number(otherUserId),
        text
    );

    db.prepare(`
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(conversation.id);

    return db.prepare(`
        SELECT
            id,
            conversation_id,
            sender_id,
            recipient_id,
            message,
            created_at,
            read_at
        FROM messages
        WHERE id = last_insert_rowid()
        LIMIT 1
    `).get();
}

function getMessages(userId, otherUserId) {
    const conversation = getOrCreateConversation(
        userId,
        otherUserId
    );

    return db.prepare(`
        SELECT
            id,
            conversation_id,
            sender_id,
            recipient_id,
            message,
            created_at,
            read_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
    `).all(conversation.id);
}

function markConversationRead(userId, otherUserId) {
    const conversation = getOrCreateConversation(
        userId,
        otherUserId
    );

    db.prepare(`
        UPDATE messages
        SET read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ?
          AND recipient_id = ?
          AND read_at IS NULL
    `).run(
        conversation.id,
        Number(userId)
    );

    return true;
}

function getUnreadCount(userId) {
    const result = db.prepare(`
        SELECT COUNT(*) AS count
        FROM messages
        WHERE recipient_id = ?
          AND read_at IS NULL
    `).get(Number(userId));

    return Number(result.count || 0);
}

function getConversations(userId) {
    const rows = db.prepare(`
        SELECT
            c.id AS conversation_id,

            CASE
                WHEN c.user_one_id = ?
                THEN c.user_two_id
                ELSE c.user_one_id
            END AS other_user_id,

            u.first_name,
            u.last_name,
            u.username,
            u.profile_image,
            u.city,
            u.nationality,
            u.residence_country,

            m.id AS last_message_id,
            m.sender_id AS last_sender_id,
            m.recipient_id AS last_recipient_id,
            m.message AS last_message,
            m.created_at AS last_message_at,

            (
                SELECT COUNT(*)
                FROM messages unread
                WHERE unread.conversation_id = c.id
                  AND unread.recipient_id = ?
                  AND unread.read_at IS NULL
            ) AS unread_count

        FROM conversations c

        JOIN users u
          ON u.id =
            CASE
                WHEN c.user_one_id = ?
                THEN c.user_two_id
                ELSE c.user_one_id
            END

        LEFT JOIN messages m
          ON m.id = (
              SELECT id
              FROM messages
              WHERE conversation_id = c.id
              ORDER BY id DESC
              LIMIT 1
          )

        WHERE c.user_one_id = ?
           OR c.user_two_id = ?

        ORDER BY
            CASE
                WHEN m.id IS NULL THEN c.id
                ELSE m.id
            END DESC
    `).all(
        Number(userId),
        Number(userId),
        Number(userId),
        Number(userId),
        Number(userId)
    );

    return rows;
}

module.exports = {
    getOrCreateConversation,
    sendMessage,
    getMessages,
    markConversationRead,
    getUnreadCount,
    getConversations
};
