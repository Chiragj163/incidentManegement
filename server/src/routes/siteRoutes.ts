import { Router } from "express";

import {
    authenticateToken,
} from "../middleware/authMiddleware";

import {
    authorizeRoles,
} from "../middleware/roleMiddleware";

import {
    createSite,
    getSites,
    getSiteById,
    updateSite,
    updateSiteStatus,
} from "../controllers/siteController";

const router = Router();


// All site APIs require authentication
router.use(authenticateToken);


// Only Super Admin can manage sites
router.post(
    "/",
    authorizeRoles("SUPER_ADMIN"),
    createSite
);

router.get(
    "/",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN",
        "USER"
    ),
    getSites
);

router.get(
    "/:id",
    authorizeRoles(
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN",
        "USER"
    ),
    getSiteById
);

router.put(
    "/:id",
    authorizeRoles("SUPER_ADMIN"),
    updateSite
);

router.patch(
    "/:id/status",
    authorizeRoles("SUPER_ADMIN"),
    updateSiteStatus
);


export default router;