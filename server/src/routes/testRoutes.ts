import { Router, Response } from "express";

import {
    authenticateToken,
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

import {
    authorizeRoles,
} from "../middleware/roleMiddleware";

const router = Router();

router.get(
    "/protected",
    authenticateToken,
    (
        req: AuthenticatedRequest,
        res: Response
    ) => {
        res.json({
            success: true,
            message: "You accessed a protected API",
            user: req.user,
        });
    }
);

router.get(
    "/admin-only",
    authenticateToken,
    authorizeRoles("SUPER_ADMIN"),
    (
        req: AuthenticatedRequest,
        res: Response
    ) => {
        res.json({
            success: true,
            message: "Super Admin access granted",
            user: req.user,
        });
    }
);

router.get(
    "/department-admin",
    authenticateToken,
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN"
    ),
    (
        req: AuthenticatedRequest,
        res: Response
    ) => {
        res.json({
            success: true,
            message:
                "Super Admin / Department Admin access granted",
            user: req.user,
        });
    }
);

export default router;