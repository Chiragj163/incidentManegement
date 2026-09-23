import { Response } from "express";

import {
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

import { query } from "../config/database";
import { createAuditLog } from "../services/auditService";

// Create Site
export const createSite = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const {
            siteCode,
            siteName,
            siteLead,
            address,
            city,
            district,
            state,
        } = req.body;

        if (!siteCode || !siteName) {
            res.status(400).json({
                success: false,
                message:
                    "Site code and site name are required",
            });
            return;
        }

        const existingSite = await query(
            `
            SELECT id
            FROM sites
            WHERE site_code = $1
            LIMIT 1
            `,
            [siteCode]
        );

        if (existingSite.rows.length > 0) {
            res.status(409).json({
                success: false,
                message:
                    "A site with this site code already exists",
            });
            return;
        }

        const result = await query(
            `
            INSERT INTO sites (
                site_code,
                site_name,
                site_lead,
                address,
                city,
                district,
                state,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                'ACTIVE'
            )
            RETURNING
                id,
                site_code,
                site_name,
                site_lead,
                address,
                city,
                district,
                state,
                status,
                created_at
            `,
            [
                siteCode,
                siteName,
                siteLead || null,
                address || null,
                city || null,
                district || null,
                state || null,
            ]
        );

       const createdSite = result.rows[0];

        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "CREATE_SITE",
            entityType: "SITE",
            entityId: createdSite.id,
            newData: createdSite,
            ipAddress: req.ip,
        });

        res.status(201).json({
            success: true,
            message: "Site created successfully",
            data: createdSite,
        });
    } catch (error) {
        console.error(
            "Create site error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create site",
        });
    }
};


// Get All Sites
export const getSites = async (
    _req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const result = await query(
            `
            SELECT
                id,
                site_code,
                site_name,
                site_lead,
                address,
                city,
                district,
                state,
                status,
                created_at,
                updated_at
            FROM sites
            ORDER BY site_name ASC
            `
        );

        res.status(200).json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error(
            "Get sites error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch sites",
        });
    }
};


// Get Site By ID
export const getSiteById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await query(
            `
            SELECT
                id,
                site_code,
                site_name,
                site_lead,
                address,
                city,
                district,
                state,
                status,
                created_at,
                updated_at
            FROM sites
            WHERE id = $1
            LIMIT 1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Site not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get site error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch site",
        });
    }
};


// Update Site
// Update Site
export const updateSite = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const {
            siteCode,
            siteName,
            siteLead,
            address,
            city,
            district,
            state,
        } = req.body;

        if (!siteCode || !siteName) {
            res.status(400).json({
                success: false,
                message:
                    "Site code and site name are required",
            });
            return;
        }

        // Get existing site before update
        const oldSiteResult = await query(
            `
            SELECT
                id,
                site_code,
                site_name,
                site_lead,
                address,
                city,
                district,
                state,
                status,
                created_at,
                updated_at
            FROM sites
            WHERE id = $1
            LIMIT 1
            `,
            [id]
        );

        if (oldSiteResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Site not found",
            });
            return;
        }

        const oldSite = oldSiteResult.rows[0];

        // Update site
        const result = await query(
            `
            UPDATE sites
            SET
                site_code = $1,
                site_name = $2,
                site_lead = $3,
                address = $4,
                city = $5,
                district = $6,
                state = $7,
                updated_at = NOW()
            WHERE id = $8
            RETURNING
                id,
                site_code,
                site_name,
                site_lead,
                address,
                city,
                district,
                state,
                status,
                updated_at
            `,
            [
                siteCode,
                siteName,
                siteLead || null,
                address || null,
                city || null,
                district || null,
                state || null,
                id,
            ]
        );

        const updatedSite = result.rows[0];

        // Create audit log
        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "UPDATE_SITE",
            entityType: "SITE",
            entityId: updatedSite.id,
            oldData: oldSite,
            newData: updatedSite,
            ipAddress: req.ip,
        });

        res.status(200).json({
            success: true,
            message: "Site updated successfully",
            data: updatedSite,
        });

    } catch (error) {
        console.error(
            "Update site error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update site",
        });
    }
};


// Change Site Status
export const updateSiteStatus = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (
            status !== "ACTIVE" &&
            status !== "INACTIVE"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Status must be ACTIVE or INACTIVE",
            });
            return;
        }

        // Get old status
        const oldSiteResult = await query(
            `
            SELECT
                id,
                site_code,
                site_name,
                status
            FROM sites
            WHERE id = $1
            LIMIT 1
            `,
            [id]
        );

        if (oldSiteResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Site not found",
            });
            return;
        }

        const oldSite = oldSiteResult.rows[0];

        // Update status
        const result = await query(
            `
            UPDATE sites
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING
                id,
                site_code,
                site_name,
                status,
                updated_at
            `,
            [status, id]
        );

        const updatedSite = result.rows[0];

        // Determine audit action
        const auditAction =
            status === "ACTIVE"
                ? "ACTIVATE_SITE"
                : "DEACTIVATE_SITE";

        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: auditAction,
            entityType: "SITE",
            entityId: updatedSite.id,
            oldData: oldSite,
            newData: updatedSite,
            ipAddress: req.ip,
        });

        res.status(200).json({
            success: true,
            message:
                `Site ${status.toLowerCase()} successfully`,
            data: updatedSite,
        });

    } catch (error) {
        console.error(
            "Update site status error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to update site status",
        });
    }
};