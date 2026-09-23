import { Router } from "express";

import {
    authenticateToken,
} from "../middleware/authMiddleware";

import {
    authorizeRoles,
} from "../middleware/roleMiddleware";

import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    updateUserStatus,
} from "../controllers/userController";

const router = Router();


// Authentication required
router.use(authenticateToken);


// Create user
router.post(
    "/",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN"
    ),
    createUser
);


// List users
router.get(
    "/",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN"
    ),
    getUsers
);


// Get user
router.get(
    "/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN"
    ),
    getUserById
);


// Update user
router.put(
    "/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN"
    ),
    updateUser
);


// Activate / deactivate
router.patch(
    "/:id/status",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN"
    ),
    updateUserStatus
);


export default router;