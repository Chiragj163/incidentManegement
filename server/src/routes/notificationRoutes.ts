import { Router } from "express";

import {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../controllers/notificationController";

import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateToken);

router.get("/", getNotifications);

router.get(
    "/unread-count",
    getUnreadNotificationCount
);

router.patch(
    "/read-all",
    markAllNotificationsAsRead
);

router.patch(
    "/:id/read",
    markNotificationAsRead
);

export default router;