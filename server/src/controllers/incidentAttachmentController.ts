import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { query } from "../config/database";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}${ext}`;

    cb(null, uniqueName);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PDF files are allowed."));
  }
};

export const uploadIncidentAttachment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
}).single("attachment");


export const saveIncidentAttachment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const incidentId = Number(req.params.id);

    if (!Number.isInteger(incidentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid incident ID.",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No attachment uploaded.",
      });
    }

    const incidentResult = await query(
      `
      SELECT
        id,
        site_id,
        reported_by,
        assigned_to,
        from_department_id,
        to_department_id,
        status
      FROM incidents
      WHERE id = $1
      `,
      [incidentId]
    );

    if (incidentResult.rows.length === 0) {
      fs.unlinkSync(req.file.path);

      return res.status(404).json({
        success: false,
        message: "Incident not found.",
      });
    }

    const incident = incidentResult.rows[0];

    // Permission check
    const role = req.user.role;

    const canUpload =
      role === "SUPER_ADMIN" ||
      incident.reported_by === req.user.userId ||
      incident.assigned_to === req.user.userId ||
      (
        role === "DEPARTMENT_ADMIN" &&
        (
          incident.from_department_id === req.user.departmentId ||
          incident.to_department_id === req.user.departmentId
        )
      );

    if (!canUpload) {
      fs.unlinkSync(req.file.path);

      return res.status(403).json({
        success: false,
        message: "You do not have permission to upload an attachment.",
      });
    }

    const relativePath = path
      .relative(process.cwd(), req.file.path)
      .replace(/\\/g, "/");

    const result = await query(
      `
      INSERT INTO incident_attachments
      (
        incident_id,
        file_name,
        stored_file_name,
        file_path,
        mime_type,
        file_size,
        uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        incidentId,
        req.file.originalname,
        req.file.filename,
        relativePath,
        req.file.mimetype,
        req.file.size,
        req.user.userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Upload attachment error:", error);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to upload attachment.",
    });
  }
};