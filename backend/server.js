const express = require("express");
const path = require("path");

const { registerUser } = require("./register-api");
const { loginUser } = require("./login-api");
const { getSuggestions } = require("./discover-api");
const { searchUsers } = require("./search-api");
const { getProfile } = require("./profile-api");
const {
    getOrCreateConversation,
    sendMessage,
    getMessages,
    markConversationRead,
    getUnreadCount,
    getConversations
} = require("./chat-api");
const { skipProfile, undoSkip, getActiveSkippedIds } = require("./skip-api");
const { saveSubscription, getPublicKey } = require("./push-api");
const { sendPushToUser } = require("./push-api");
const { updateProfile } = require("./edit-profile-api");
const {
    createSession,
    getUserFromSession,
    deleteSession
} = require("./session");

const app = express();
const PORT = 3000;

const frontendPath = path.join(__dirname, "..", "frontend");

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(frontendPath));


/* =========================
   إنشاء حساب
========================= */

app.post("/api/register", (req, res) => {
    try {

        console.log("طلب إنشاء حساب وصل:", { username: req.body.username, deviceId: req.body.deviceId, browserFingerprint: req.body.browserFingerprint });
        const user = registerUser(req.body);

        const token = createSession(user.id);

        res.status(201).json({
            success: true,
            message: "تم إنشاء الحساب بنجاح",
            user,
            token
        });

    } catch (error) {

        console.error("خطأ في التسجيل:", error.message);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});


/* =========================
   تسجيل الدخول
========================= */

app.post("/api/login", (req, res) => {
    try {

        const {
            username,
            password,
            deviceId,
            browserFingerprint
        } = req.body;

        const result = loginUser(
            username,
            password,
            deviceId,
            browserFingerprint
        );

        res.json({
            success: true,
            message: "تم تسجيل الدخول بنجاح",
            token: result.token,
            user: result.user
        });

    } catch (error) {

        console.error(
            "خطأ في تسجيل الدخول:",
            error.message
        );

        res.status(401).json({
            success: false,
            message: error.message
        });
    }
});


/* =========================
   اقتراحات الزواج
========================= */

app.get("/api/search", (req, res) => {
    try {
        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        const results = searchUsers(
            user.id,
            req.query
        );

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error("خطأ في البحث:", error.message);

        res.status(400).json({
            success: false,
            message: error.message || "تعذر تنفيذ البحث"
        });
    }
});

app.get("/api/discover", (req, res) => {

    try {

        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);

        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        const suggestions = getSuggestions(user.id);

        res.json({
            success: true,
            suggestions
        });

    } catch (error) {

        console.error(
            "خطأ في الاقتراحات:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "حدث خطأ في جلب الاقتراحات"
        });
    }

});


/* =========================
   المستخدم الحالي
========================= */

app.get("/api/me", (req, res) => {

    try {

        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);

        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {

        console.error("خطأ في جلب المستخدم:", error.message);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
});


/* =========================
   تسجيل الخروج
========================= */

app.post("/api/logout", (req, res) => {

    try {

        const auth = req.headers.authorization || "";

        if (auth.startsWith("Bearer ")) {

            const token = auth.slice(7);

            deleteSession(token);
        }

        res.json({
            success: true,
            message: "تم تسجيل الخروج"
        });

    } catch (error) {

        console.error("خطأ في تسجيل الخروج:", error.message);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
});


/* =========================
   الصفحة الرئيسية
========================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(frontendPath, "index.html")
    );
});


app.post("/api/chat/open", (req, res) => {
    try {
        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        const conversation = getOrCreateConversation(
            user.id,
            req.body.otherUserId
        );

        res.json({
            success: true,
            conversation
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});


app.get("/api/push/public-key", (req, res) => {
    try {
        res.json({
            success: true,
            publicKey: getPublicKey()
        });
    } catch (error) {
        console.error("push public key error:", error);
        res.status(500).json({
            success: false,
            message: "تعذر تحميل مفتاح الإشعارات"
        });
    }
});

app.post("/api/push/subscribe", (req, res) => {
    try {
        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        saveSubscription(
            user.id,
            req.body.subscription
        );

        res.json({
            success: true,
            message: "تم تسجيل جهاز الإشعارات"
        });
    } catch (error) {
        console.error("push subscribe error:", error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/chat/send", (req, res) => {
    try {
        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        const message = sendMessage(
            user.id,
            req.body.otherUserId,
            req.body.message
        );

        sendPushToUser(
            Number(req.body.otherUserId),
            {
                title: "خطابة لزواج",
                body: `💌 ${user.first_name || "لديك"} أرسل لك رسالة جديدة`,
                url: `/chat.html?user=${encodeURIComponent(user.id)}`
            }
        ).catch(error => {
            console.error("push message error:", error);
        });

        res.json({
            success: true,
            message
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

app.get("/api/chat/list", (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ error: "غير مسجل الدخول" });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({ error: "انتهت الجلسة أو أنها غير صالحة" });
        }

        const conversations = getConversations(user.id);

        res.json({ conversations });
    } catch (error) {
        console.error("chat list error:", error);
        res.status(500).json({ error: "تعذر تحميل المحادثات" });
    }
});

app.get("/api/chat/unread-count", (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ error: "غير مسجل الدخول" });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({ error: "انتهت الجلسة أو أنها غير صالحة" });
        }

        const count = getUnreadCount(user.id);

        res.json({ count });
    } catch (error) {
        console.error("unread count error:", error);
        res.status(500).json({ error: "تعذر تحميل عدد الرسائل" });
    }
});

app.post("/api/chat/read/:otherUserId", (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ error: "غير مسجل الدخول" });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({ error: "انتهت الجلسة أو أنها غير صالحة" });
        }

        markConversationRead(
            user.id,
            Number(req.params.otherUserId)
        );

        res.json({ success: true });
    } catch (error) {
        console.error("mark read error:", error);
        res.status(500).json({ error: "تعذر تحديث حالة الرسائل" });
    }
});

app.get("/api/chat/messages/:otherUserId", (req, res) => {
    try {
        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        const messages = getMessages(
            user.id,
            req.params.otherUserId
        );

        res.json({
            success: true,
            messages
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/discover/skip", (req, res) => {
    try {
        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        skipProfile(
            user.id,
            req.body.userId
        );

        res.json({
            success: true,
            message: "تم التخطي مؤقتًا"
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

app.post("/api/discover/undo", (req, res) => {
    try {
        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);
        const user = getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        const skippedUserId = undoSkip(user.id);

        res.json({
            success: true,
            skippedUserId
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `خطابة لزواج يعمل على http://localhost:${PORT}`
    );

});



app.put("/api/profile", (req, res) => {

    try {

        const auth =
            req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);

        const user =
            getUserFromSession(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        updateProfile(
            user.id,
            req.body
        );

        res.json({
            success: true,
            message: "تم تحديث ملفك بنجاح"
        });

    } catch (error) {

        console.error(
            "خطأ في تحديث الملف:",
            error.message
        );

        res.status(400).json({
            success: false,
            message: error.message ||
                "تعذر تحديث الملف"
        });
    }
});

app.get("/api/profile/:id", (req, res) => {
    try {
        const auth = req.headers.authorization || "";

        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "غير مسجل الدخول"
            });
        }

        const token = auth.slice(7);
        const currentUser = getUserFromSession(token);

        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: "انتهت الجلسة أو أنها غير صالحة"
            });
        }

        const profileId = Number(req.params.id);

        if (!Number.isInteger(profileId) || profileId <= 0) {
            return res.status(400).json({
                success: false,
                message: "رقم الملف غير صحيح"
            });
        }

        const profile = getProfile(profileId);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "الملف غير موجود"
            });
        }

        res.json({
            success: true,
            profile
        });

    } catch (error) {
        console.error(
            "خطأ في جلب الملف:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "حدث خطأ في جلب الملف"
        });
    }
});

