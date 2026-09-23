import { query } from "../config/database";

interface CreateNotificationParams {
    userId: number;
    incidentId?: number | null;
    title: string;
    message: string;
    notificationType?: string;
}

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