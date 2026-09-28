import { Router } from "express";

import {
    login,
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
} from "../controllers/authController";

import {
    authenticateToken,
} from "../middleware/authMiddleware";

const router = Router();

// Login
router.post("/login", login);

// Authenticated user settings
router.get(
    "/me",
    authenticateToken,
    getMyProfile
);

router.put(
    "/profile",
    authenticateToken,
    updateMyProfile
);

router.put(
    "/change-password",
    authenticateToken,
    changeMyPassword
);
export default router;
