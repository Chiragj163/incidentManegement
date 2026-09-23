import { Router } from "express";

import {
  authenticateToken,
} from "../middleware/authMiddleware";

import {
  uploadIncidentAttachment,
  saveIncidentAttachment,
} from "../controllers/incidentAttachmentController";

const router = Router();

router.post(
  "/:id/attachments",
  authenticateToken,
  uploadIncidentAttachment,
  saveIncidentAttachment
);

export default router;