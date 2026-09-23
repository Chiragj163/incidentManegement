import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { query } from "../config/database";

/**
 * Get notifications for the logged-in user.
 */
export const getNotifications = async (
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

        const limit = Math.min(
            Math.max(Number(req.query.limit) || 50, 1),
            100
        );

        const result = await query(
            `
            SELECT
                n.id,
                n.user_id,
                n.incident_id,
                n.title,
                n.message,
                n.notification_type,
                n.is_read,
                n.created_at,
                n.read_at,

                i.incident_no,
                i.subject AS incident_subject

            FROM notifications n

            LEFT JOIN incidents i
                ON i.id = n.incident_id

            WHERE n.user_id = $1

            ORDER BY n.created_at DESC

            LIMIT $2
            `,
            [userId, limit]
        );

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get notifications error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
        });
    }
};

/**
 * Get unread notification count.
 */
export const getUnreadNotificationCount = async (
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
            SELECT COUNT(*)::int AS count
            FROM notifications
            WHERE user_id = $1
              AND is_read = false
            `,
            [userId]
        );

        res.json({
            success: true,
            data: {
                count: result.rows[0].count,
            },
        });
    } catch (error) {
        console.error(
            "Get unread notification count error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch unread notification count",
        });
    }
};

/**
 * Mark one notification as read.
 */
export const markNotificationAsRead = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const notificationId = Number(req.params.id);

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }

        if (!Number.isInteger(notificationId) || notificationId <= 0) {
            res.status(400).json({
                success: false,
                message: "Invalid notification ID",
            });
            return;
        }

        const result = await query(
            `
            UPDATE notifications
            SET
                is_read = true,
                read_at = COALESCE(read_at, NOW())
            WHERE id = $1
              AND user_id = $2
            RETURNING *
            `,
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Notification not found",
            });
            return;
        }

        res.json({
            success: true,
            message: "Notification marked as read",
            data: result.rows[0],
        });
    } catch (error) {
        console.error(
            "Mark notification as read error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
        });
    }
};

/**
 * Mark all notifications as read.
 */
export const markAllNotificationsAsRead = async (
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
            UPDATE notifications
            SET
                is_read = true,
                read_at = COALESCE(read_at, NOW())
            WHERE user_id = $1
              AND is_read = false
            `,
            [userId]
        );

        res.json({
            success: true,
            message: "All notifications marked as read",
            data: {
                updatedCount: result.rowCount ?? 0,
            },
        });
    } catch (error) {
        console.error(
            "Mark all notifications as read error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to mark notifications as read",
        });
    }
};