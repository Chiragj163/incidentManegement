import { useRegisterSW } from "virtual:pwa-register/react";

export default function PWAUpdatePrompt() {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(
            swUrl: string,
            registration: ServiceWorkerRegistration | undefined
        ) {
            console.log(
                "PWA Service Worker registered:",
                swUrl
            );

            if (registration) {
                console.log(
                    "PWA update checking enabled"
                );
            }
        },

        onRegisterError(error: Error) {
            console.error(
                "PWA Service Worker registration error:",
                error
            );
        },
    });

    if (!needRefresh) {
        return null;
    }

    return (
        <div className="pwa-update-overlay">
            <div className="pwa-update-card">
                <h3>New version available</h3>

                <p>
                    A new version of Incident Management
                    is available. Update now to get the
                    latest changes.
                </p>

                <div className="pwa-update-actions">
                    <button
                        onClick={() => window.location.reload()}
                        className="pwa-update-later"
                    >
                        Later
                    </button>

                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="pwa-update-now"
                    >
                        Update now
                    </button>
                </div>
            </div>
        </div>
    );
}