import webpush from "web-push";
import { query } from "../config/database";

interface CreateNotificationParams {
    userId: number;
    incidentId?: number | null;
    title: string;
    message: string;
    notificationType?: string;
}

interface PushSubscriptionRow {
    id: number;
    endpoint: string;
    p256dh: string;
    auth: string;
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

if (
    VAPID_PUBLIC_KEY &&
    VAPID_PRIVATE_KEY &&
    VAPID_SUBJECT
) {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );

    console.log("Web Push initialized");
} else {
    console.warn(
        "Web Push disabled: VAPID environment variables are missing"
    );
}

/**
 * Send a push notification to all registered devices
 * belonging to a user.
 */
const sendPushNotification = async ({
    userId,
    incidentId,
    title,
    message,
}: CreateNotificationParams): Promise<void> => {
    if (
        !VAPID_PUBLIC_KEY ||
        !VAPID_PRIVATE_KEY ||
        !VAPID_SUBJECT
    ) {
        return;
    }

    try {
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
            return;
        }

        const payload = JSON.stringify({
            title,
            body: message,
            data: {
                incidentId: incidentId ?? null,
                url: incidentId
                    ? `/incidents/${incidentId}`
                    : "/notifications",
            },
        });

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

                console.log(
                    `Push notification sent to user ${userId}`
                );
            } catch (error: any) {
                const statusCode = error?.statusCode;

                console.error(
                    `Push notification failed for subscription ${subscription.id}:`,
                    statusCode || error?.message || error
                );

                /*
                 * 404 / 410 means the browser subscription is no
                 * longer valid. Remove it from the database.
                 */
                if (
                    statusCode === 404 ||
                    statusCode === 410
                ) {
                    await query(
                        `
                        DELETE FROM push_subscriptions
                        WHERE id = $1
                        `,
                        [subscription.id]
                    );

                    console.log(
                        `Removed expired push subscription ${subscription.id}`
                    );
                }
            }
        }
    } catch (error) {
        /*
         * Push notification failure must never break the
         * main incident/notification workflow.
         */
        console.error(
            "Push notification service error:",
            error
        );
    }
};

/**
 * Create one notification.
 */
export const createNotification = async ({
    userId,
    incidentId = null,
    title,
    message,
    notificationType = "INCIDENT",
}: CreateNotificationParams): Promise<void> => {
    /*
     * 1. Save notification in PostgreSQL.
     */
    await query(
        `
        INSERT INTO notifications (
            user_id,
            incident_id,
            title,
            message,
            notification_type
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
            userId,
            incidentId,
            title,
            message,
            notificationType,
        ]
    );

    /*
     * 2. Send Android/Web Push.
     *
     * Do not await this. A push failure should not cause
     * the incident operation itself to fail.
     */
    void sendPushNotification({
        userId,
        incidentId,
        title,
        message,
        notificationType,
    });
};

/**
 * Create notifications for multiple users.
 */
export const createNotifications = async (
    userIds: number[],
    params: Omit<CreateNotificationParams, "userId">
): Promise<void> => {
    const uniqueUserIds = [
        ...new Set(
            userIds.filter(
                (id) => Number.isInteger(id) && id > 0
            )
        ),
    ];

    if (uniqueUserIds.length === 0) {
        return;
    }

    for (const userId of uniqueUserIds) {
        await createNotification({
            userId,
            ...params,
        });
    }
};