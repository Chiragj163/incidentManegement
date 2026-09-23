import { Router } from "express";

import {
    authenticateToken,
} from "../middleware/authMiddleware";

import {
    authorizeRoles,
} from "../middleware/roleMiddleware";

import {
    createSubDepartment,
    getSubDepartments,
    getSubDepartmentById,
    updateSubDepartment,
    updateSubDepartmentStatus,
} from "../controllers/subDepartmentController";

const router = Router();


// Authentication required
router.use(authenticateToken);


// Create - Super Admin
router.post(
    "/",
    authorizeRoles("SUPER_ADMIN"),
    createSubDepartment
);


// List
router.get(
    "/",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN",
        "USER"
    ),
    getSubDepartments
);


// Get one
router.get(
    "/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN",
        "USER"
    ),
    getSubDepartmentById
);


// Update - Super Admin
router.put(
    "/:id",
    authorizeRoles("SUPER_ADMIN"),
    updateSubDepartment
);


// Activate / deactivate - Super Admin
router.patch(
    "/:id/status",
    authorizeRoles("SUPER_ADMIN"),
    updateSubDepartmentStatus
);

export default router;