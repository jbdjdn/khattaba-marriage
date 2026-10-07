self.addEventListener("push", event => {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = {
            title: "خطابة لزواج",
            body: "💌 لديك رسالة جديدة"
        };
    }

    const title = data.title || "خطابة لزواج";

    const options = {
        body: data.body || "💌 لديك رسالة جديدة",
        icon: data.icon || "/assets/default-avatar.png",
        badge: data.badge || "/assets/default-avatar.png",
        data: {
            url: data.url || "/chat.html"
        },
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener("notificationclick", event => {
    event.notification.close();

    const targetUrl =
        event.notification.data &&
        event.notification.data.url
            ? event.notification.data.url
            : "/chat.html";

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(clientList => {

            for (const client of clientList) {
                if ("focus" in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
