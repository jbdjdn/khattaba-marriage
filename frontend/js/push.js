(async () => {
    const token = localStorage.getItem("session_token");

    if (!token) return;

    if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
    ) {
        console.log("Push غير مدعوم في هذا المتصفح");
        return;
    }

    async function registerPush() {
        try {
            const registration =
                await navigator.serviceWorker.register("/sw.js");

            const keyResponse = await fetch(
                "/api/push/public-key",
                {
                    cache: "no-store"
                }
            );

            if (!keyResponse.ok) {
                throw new Error("تعذر تحميل مفتاح Push");
            }

            const keyData = await keyResponse.json();

            if (!keyData.publicKey) {
                throw new Error("مفتاح Push غير موجود");
            }

            let subscription =
                await registration.pushManager.getSubscription();

            if (!subscription) {
                if (Notification.permission !== "granted") {
                    return;
                }

                subscription =
                    await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(
                            keyData.publicKey
                        )
                    });
            }

            const response = await fetch(
                "/api/push/subscribe",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        subscription
                    })
                }
            );

            if (!response.ok) {
                throw new Error("تعذر حفظ اشتراك Push");
            }

            console.log("تم تسجيل Push بنجاح");

        } catch (error) {
            console.error("Push registration error:", error);
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding =
            "=".repeat((4 - base64String.length % 4) % 4);

        const base64 =
            (base64String + padding)
                .replace(/-/g, "+")
                .replace(/_/g, "/");

        const rawData =
            window.atob(base64);

        return Uint8Array.from(
            [...rawData].map(char => char.charCodeAt(0))
        );
    }

    if (Notification.permission === "granted") {
        registerPush();
    }

    window.addEventListener(
        "messageNotificationsGranted",
        registerPush
    );
})();
