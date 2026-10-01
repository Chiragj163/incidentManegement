import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { query } from "../config/database";
import webpush from "web-push";

export const subscribeToPush = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }

        const { endpoint, keys } = req.body;

        if (
            !endpoint ||
            !keys ||
            !keys.p256dh ||
            !keys.auth
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid push subscription",
            });
            return;
        }

        await query(
            `
            INSERT INTO push_subscriptions (
                user_id,
                endpoint,
                p256dh,
                auth
            )
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (endpoint)
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth,
                updated_at = NOW()
            `,
            [
                userId,
                endpoint,
                keys.p256dh,
                keys.auth,
            ]
        );

        res.json({
            success: true,
            message: "Push subscription saved",
        });
    } catch (error) {
        console.error("Subscribe to push error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save push subscription",
        });
    }
};

export const unsubscribeFromPush = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { endpoint } = req.body;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }

        if (!endpoint) {
            res.status(400).json({
                success: false,
                message: "Push endpoint is required",
            });
            return;
        }

        await query(
            `
            DELETE FROM push_subscriptions
            WHERE user_id = $1
              AND endpoint = $2
            `,
            [userId, endpoint]
        );

        res.json({
            success: true,
            message: "Push subscription removed",
        });
    } catch (error) {
        console.error(
            "Unsubscribe from push error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to remove push subscription",
        });
    }
};
export const sendTestPush = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }

        const result = await query(
            `
            SELECT
                id,
                endpoint,
                p256dh,
                auth
            FROM push_subscriptions
            WHERE user_id = $1
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "No push subscription found for this user",
            });
            return;
        }

        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT!,
            process.env.VAPID_PUBLIC_KEY!,
            process.env.VAPID_PRIVATE_KEY!
        );

        const payload = JSON.stringify({
            title: "Incident Management",
            body: "🔔 This is a test push notification.",
            data: {
                url: "/notifications",
            },
        });

        const results = [];

        for (const subscription of result.rows) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth,
                        },
                    },
                    payload
                );

                results.push({
                    id: subscription.id,
                    success: true,
                });
            } catch (error: any) {
                console.error(
                    `Test push failed for subscription ${subscription.id}:`,
                    error
                );

                results.push({
                    id: subscription.id,
                    success: false,
                    statusCode: error?.statusCode,
                    message: error?.message,
                });
            }
        }

        res.json({
            success: true,
            message: "Test push sent",
            results,
        });
    } catch (error) {
        console.error("Test push error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to send test push",
        });
    }
};