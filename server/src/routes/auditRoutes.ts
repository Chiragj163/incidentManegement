import { Router } from "express";

import { getAuditLogs } from "../controllers/auditController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get(
    "/",
    authenticateToken,
    getAuditLogs
);

export default router;