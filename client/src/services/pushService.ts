import {
    savePushSubscription,
} from "./api";

const VAPID_PUBLIC_KEY =
    "BIYml5gA3S6djA7MK6iyBv8x57qyrVdkalXjdoEKqnXTb4cXs2kh-8r7_lc5_7-sO1BeS8G8O5NG6_yWyR0prRM";

function urlBase64ToUint8Array(
    base64String: string
): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat(
        (4 - (base64String.length % 4)) % 4
    );

    const base64 = (
        base64String + padding
    )
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);

    const buffer = new ArrayBuffer(rawData.length);
    const output = new Uint8Array(buffer);

    for (let i = 0; i < rawData.length; i++) {
        output[i] = rawData.charCodeAt(i);
    }

    return output;
}

export const enablePushNotifications =
    async (): Promise<boolean> => {
        try {
            if (
                !("serviceWorker" in navigator) ||
                !("PushManager" in window) ||
                !("Notification" in window)
            ) {
                console.warn(
                    "Push notifications are not supported"
                );

                return false;
            }

            const permission =
                await Notification.requestPermission();

            if (permission !== "granted") {
                console.warn(
                    "Notification permission denied"
                );

                return false;
            }

            const registration =
                await navigator.serviceWorker.ready;

            let subscription =
                await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription =
                    await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey:
                            urlBase64ToUint8Array(
                                VAPID_PUBLIC_KEY
                            ),
                    });
            }

            await savePushSubscription(
                subscription
            );

            console.log(
                "Push notifications enabled"
            );

            return true;
        } catch (error) {
            console.error(
                "Enable push notifications error:",
                error
            );

            return false;
        }
    };