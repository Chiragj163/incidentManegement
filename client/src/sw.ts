/// <reference lib="webworker" />

import { precacheAndRoute } from "workbox-precaching";

const sw = self as unknown as ServiceWorkerGlobalScope;
const APP_VERSION = "2026-10-16-1600";

console.log("SW VERSION:", APP_VERSION);

// Workbox injects the generated precache manifest here.
precacheAndRoute(
    (self as unknown as { __WB_MANIFEST: string[] }).__WB_MANIFEST
);
sw.addEventListener("message", (event: ExtendableMessageEvent) => {
    if (event.data?.type === "SKIP_WAITING") {
        sw.skipWaiting();
    }
});

sw.addEventListener("push", (event: PushEvent) => {
    if (!event.data) {
        return;
    }

    const data = event.data.json();

    const title =
        data.title || "Incident Management";

    const options: NotificationOptions = {
        body:
            data.body ||
            "You have a new notification.",
        icon: "/incidentManagement/pwa-192x192.png",
        badge: "/incidentManagement/pwa-192x192.png",
        data: data.data || {},
    };

    event.waitUntil(
        sw.registration.showNotification(
            title,
            options
        )
    );
});

sw.addEventListener(
    "notificationclick",
    (event: NotificationEvent) => {
        event.notification.close();

        const notificationData =
            event.notification.data || {};

        const url =
            notificationData.url ||
            "/incidentManagement/notifications";

        event.waitUntil(
            sw.clients
                .matchAll({
                    type: "window",
                    includeUncontrolled: true,
                })
                .then((clientList) => {
                    for (const client of clientList) {
                        if ("focus" in client) {
                            client.navigate(url);
                            return client.focus();
                        }
                    }

                    return sw.clients.openWindow(url);
                })
        );
    }
);