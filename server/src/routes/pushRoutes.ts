import { Router } from "express";

import {
    subscribeToPush,
    unsubscribeFromPush,
} from "../controllers/pushController";

import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateToken);

router.post("/subscribe", subscribeToPush);

router.post("/unsubscribe", unsubscribeFromPush);

export default router;