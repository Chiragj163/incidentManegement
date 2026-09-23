import { Router } from "express";

import { authenticateToken } from "../middleware/authMiddleware";

import { getAuditLogs } from "../controllers/auditController";

const router = Router();

router.use(authenticateToken);

router.get(
    "/",
    getAuditLogs
);

export default router;
