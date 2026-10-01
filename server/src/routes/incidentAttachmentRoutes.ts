import { Router } from "express";
import { MulterError } from "multer";

import {
  authenticateToken,
} from "../middleware/authMiddleware";
import {downloadIncidentAttachment,} from "../controllers/incidentAttachmentController"

import {
  uploadIncidentAttachment,
  saveIncidentAttachment,
} from "../controllers/incidentAttachmentController";

const router = Router();

router.post(
  "/:id/attachments",
  authenticateToken,
  (req, res, next) => {
    uploadIncidentAttachment(req, res, (err) => {
      if (err instanceof MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            success: false,
            message: "File size must not exceed 10 MB.",
          });
          return;
        }

        res.status(400).json({
          success: false,
          message: err.message,
        });
        return;
      }

      if (err) {
        res.status(400).json({
          success: false,
          message: err.message || "Invalid file upload.",
        });
        return;
      }

      next();
    });
  },
  saveIncidentAttachment
);
router.get(
    "/attachments/:id",
    authenticateToken,
    downloadIncidentAttachment
);

export default router;