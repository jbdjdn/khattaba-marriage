(() => {
    const token = localStorage.getItem("session_token");
    if (!token) return;

    let lastUnreadCount = null;
    let notificationPermissionAsked = false;

    function authHeaders() {
        return {
            "Authorization": `Bearer ${token}`
        };
    }

    function ensureToast() {
        let toast = document.getElementById("globalMessageToast");

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "globalMessageToast";
            toast.style.cssText = `
                position:fixed;
                top:18px;
                left:50%;
                transform:translateX(-50%);
                z-index:99999;
                display:none;
                background:#5a3f2b;
                color:#fff;
                padding:11px 18px;
                border-radius:18px;
                box-shadow:0 6px 20px rgba(0,0,0,.2);
                font-size:14px;
                cursor:pointer;
                direction:rtl;
            `;

            toast.addEventListener("click", () => {
                window.location.href = "chat.html";
            });

            document.body.appendChild(toast);
        }

        return toast;
    }

    function showGlobalNotification(count) {
        const toast = ensureToast();

        toast.textContent =
            count === 1
                ? "💌 لديك رسالة جديدة"
                : `💌 لديك ${count} رسائل جديدة`;

        toast.style.display = "block";

        clearTimeout(window.__globalMessageToastTimer);

        window.__globalMessageToastTimer = setTimeout(() => {
            toast.style.display = "none";
        }, 5000);
    }

    function updateChatBadges(count) {
        document
            .querySelectorAll('[data-chat-badge], #chatBadge')
            .forEach(badge => {
                if (count > 0) {
                    badge.textContent = count > 99 ? "99+" : count;
                    badge.style.display = "inline-block";
                } else {
                    badge.style.display = "none";
                }
            });
    }

    function askNotificationPermission() {
        if (
            notificationPermissionAsked ||
            !("Notification" in window)
        ) {
            return;
        }

        notificationPermissionAsked = true;

        if (Notification.permission !== "default") {
            return;
        }

        const box = document.createElement("div");

        box.style.cssText = `
            position:fixed;
            right:12px;
            left:12px;
            bottom:75px;
            z-index:99998;
            background:#fff;
            color:#5a3f2b;
            border:1px solid #e8ddd0;
            border-radius:18px;
            padding:16px;
            box-shadow:0 8px 30px rgba(0,0,0,.18);
            direction:rtl;
            text-align:right;
        `;

        box.innerHTML = `
            <div style="font-weight:bold;font-size:15px;margin-bottom:6px;">
                🔔 هل تريد تلقي إشعارات الرسائل؟
            </div>
            <div style="font-size:13px;color:#8b796a;margin-bottom:12px;">
                سنخبرك عند وصول رسالة جديدة حتى لو كنت تستخدم صفحة أخرى.
            </div>
            <div style="display:flex;gap:8px;">
                <button id="allowMessageNotifications"
                    style="flex:1;border:0;border-radius:12px;padding:10px;background:#8b6548;color:#fff;">
                    السماح بالإشعارات
                </button>
                <button id="laterMessageNotifications"
                    style="flex:1;border:0;border-radius:12px;padding:10px;background:#f0e8df;color:#5a3f2b;">
                    لاحقًا
                </button>
            </div>
        `;

        document.body.appendChild(box);

        document
            .getElementById("allowMessageNotifications")
            .addEventListener("click", async () => {
                try {
                    const permission =
                        await Notification.requestPermission();

                    if (permission === "granted") {
                        window.dispatchEvent(
                            new Event("messageNotificationsGranted")
                        );
                    }
                } catch (error) {
                    console.error("notification permission error:", error);
                }

                box.remove();
            });

        document
            .getElementById("laterMessageNotifications")
            .addEventListener("click", () => {
                box.remove();
            });
    }

    async function checkMessages() {
        try {
            const response = await fetch(
                "/api/chat/unread-count",
                {
                    headers: authHeaders(),
                    cache: "no-store"
                }
            );

            if (!response.ok) return;

            const data = await response.json();
            const count = Number(data.count || 0);

            updateChatBadges(count);

            if (
                lastUnreadCount !== null &&
                count > lastUnreadCount
            ) {
                const newMessages = count - lastUnreadCount;

                showGlobalNotification(newMessages);

                if (
                    "Notification" in window &&
                    Notification.permission === "granted"
                ) {
                    new Notification("خطابة لزواج", {
                        body:
                            newMessages === 1
                                ? "💌 لديك رسالة جديدة"
                                : `💌 لديك ${newMessages} رسائل جديدة`,
                        icon: "/favicon.ico"
                    });
                }
            }

            lastUnreadCount = count;

        } catch (error) {
            console.error("global notification error:", error);
        }
    }

    function start() {
        askNotificationPermission();
        checkMessages();

        setInterval(checkMessages, 5000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
