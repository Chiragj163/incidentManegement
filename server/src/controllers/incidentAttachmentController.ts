import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import multer, { MulterError } from "multer";
import { query } from "../config/database";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { fileTypeFromFile } from "file-type";

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
        message: "Attachment file is required.",
      });
    }

    const detectedType = await fileTypeFromFile(req.file.path);

    const allowedFileTypes = [
      {
        mime: "image/jpeg",
        extensions: ["jpg", "jpeg"],
      },
      {
        mime: "application/pdf",
        extensions: ["pdf"],
      },
    ];

    const isValidFile = detectedType
      ? allowedFileTypes.some(
          (type) =>
            type.mime === detectedType.mime &&
            type.extensions.includes(detectedType.ext)
        )
      : false;

    if (!isValidFile) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(400).json({
        success: false,
        message: "Invalid file content. Only genuine JPEG and PDF files are allowed.",
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
export const downloadIncidentAttachment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const attachmentId = Number(req.params.id);

        if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
            res.status(400).json({
                success: false,
                message: "Invalid attachment ID",
            });
            return;
        }

        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const result = await query(
            `
            SELECT
                ia.id,
                ia.incident_id,
                ia.file_name,
                ia.stored_file_name,
                ia.file_path,
                ia.mime_type,
                ia.file_size
            FROM incident_attachments ia
            WHERE ia.id = $1
            LIMIT 1
            `,
            [attachmentId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Attachment not found",
            });
            return;
        }

        const attachment = result.rows[0];

        /*
         * Check whether the logged-in user can view
         * the incident to which this attachment belongs.
         */
        const accessResult = await query(
            `
            SELECT id
            FROM incidents
            WHERE id = $1
              AND (
                    reported_by = $2
                    OR assigned_to = $2
                    OR EXISTS (
                        SELECT 1
                        FROM users u
                        WHERE u.id = $2
                          AND u.role_id = (
                              SELECT id
                              FROM roles
                              WHERE role_code = 'SUPER_ADMIN'
                              LIMIT 1
                          )
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM users u
                        JOIN roles r ON r.id = u.role_id
                        WHERE u.id = $2
                          AND r.role_code = 'DEPARTMENT_ADMIN'
                          AND u.department_id = incidents.to_department_id
                    )
              )
            LIMIT 1
            `,
            [attachment.incident_id, req.user.userId]
        );

        if (accessResult.rows.length === 0) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to access this attachment",
            });
            return;
        }

        const uploadDir = path.resolve(
            process.env.UPLOAD_DIR || "uploads"
        );

        const filePath = path.resolve(
            uploadDir,
            attachment.stored_file_name ||
                path.basename(attachment.file_path)
        );

        /*
         * Prevent path traversal outside the uploads directory.
         */
        if (
            filePath !== uploadDir &&
            !filePath.startsWith(uploadDir + path.sep)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid attachment path",
            });
            return;
        }

        if (!fs.existsSync(filePath)) {
            res.status(404).json({
                success: false,
                message: "Attachment file not found",
            });
            return;
        }

        res.setHeader(
            "Content-Type",
            attachment.mime_type || "application/octet-stream"
        );

        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(attachment.file_name)}"`
        );

        res.sendFile(filePath);
    } catch (error) {
        console.error("Download attachment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to download attachment",
        });
    }
};