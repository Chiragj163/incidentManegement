import { Router } from "express";

import {
    authenticateToken,
} from "../middleware/authMiddleware";

import {
    authorizeRoles,
} from "../middleware/roleMiddleware";

import {
    createDepartment,
    getDepartments,
    getDepartmentById,
    updateDepartment,
    updateDepartmentStatus,
} from "../controllers/departmentController";

const router = Router();


// Every department API requires authentication
router.use(authenticateToken);


// Create - Super Admin only
router.post(
    "/",
    authorizeRoles("SUPER_ADMIN"),
    createDepartment
);


// View
router.get(
    "/",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN",
        "USER"
    ),
    getDepartments
);


// View one
router.get(
    "/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN",
        "USER"
    ),
    getDepartmentById
);


// Update - Super Admin only
router.put(
    "/:id",
    authorizeRoles("SUPER_ADMIN"),
    updateDepartment
);


// Activate / deactivate - Super Admin only
router.patch(
    "/:id/status",
    authorizeRoles("SUPER_ADMIN"),
    updateDepartmentStatus
);

export default router;