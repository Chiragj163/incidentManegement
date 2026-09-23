import { Response } from "express";

import {
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

import { query } from "../config/database";
import { createAuditLog } from "../services/auditService";

// Create Department
export const createDepartment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const {
            siteId,
            departmentCode,
            departmentName,
            departmentHead,
        } = req.body;

        if (
            !siteId ||
            !departmentCode ||
            !departmentName
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Site ID, department code and department name are required",
            });
            return;
        }

        // Verify site exists and is active
        const siteResult = await query(
            `
            SELECT id
            FROM sites
            WHERE id = $1
              AND status = 'ACTIVE'
            LIMIT 1
            `,
            [siteId]
        );

        if (siteResult.rows.length === 0) {
            res.status(400).json({
                success: false,
                message:
                    "Active site not found",
            });
            return;
        }

        // Check duplicate department code/name within same site
        const duplicateResult = await query(
            `
            SELECT id
            FROM departments
            WHERE site_id = $1
              AND (
                  department_code = $2
                  OR department_name = $3
              )
            LIMIT 1
            `,
            [
                siteId,
                departmentCode,
                departmentName,
            ]
        );

        if (duplicateResult.rows.length > 0) {
            res.status(409).json({
                success: false,
                message:
                    "Department code or name already exists in this site",
            });
            return;
        }

        const result = await query(
            `
            INSERT INTO departments (
                site_id,
                department_code,
                department_name,
                department_head_name,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                'ACTIVE'
            )
            RETURNING
                id,
                site_id,
                department_code,
                department_name,
                department_head_name,
                status,
                created_at
            `,
            [
                siteId,
                departmentCode,
                departmentName,
                departmentHead || null,
            ]
        );

        const createdDepartment = result.rows[0];

        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "CREATE_DEPARTMENT",
            entityType: "DEPARTMENT",
            entityId: createdDepartment.id,
            newData: createdDepartment,
            ipAddress: req.ip,
        });

        res.status(201).json({
            success: true,
            message:
                "Department created successfully",
            data: createdDepartment,
        });
    } catch (error) {
        console.error(
            "Create department error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to create department",
        });
    }
};


// Get All Departments
export const getDepartments = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { siteId } = req.query;

        let result;

        if (siteId) {
            result = await query(
                `
                SELECT
                    d.id,
                    d.site_id,
                    s.site_code,
                    s.site_name,
                    d.department_code,
                    d.department_name,
                    d.department_head_name
,
                    d.status,
                    d.created_at,
                    d.updated_at
                FROM departments d
                INNER JOIN sites s
                    ON s.id = d.site_id
                WHERE d.site_id = $1
                ORDER BY d.department_name ASC
                `,
                [siteId]
            );
        } else {
            result = await query(
                `
                SELECT
                    d.id,
                    d.site_id,
                    s.site_code,
                    s.site_name,
                    d.department_code,
                    d.department_name,
                    d.department_head_name
,
                    d.status,
                    d.created_at,
                    d.updated_at
                FROM departments d
                INNER JOIN sites s
                    ON s.id = d.site_id
                ORDER BY
                    s.site_name ASC,
                    d.department_name ASC
                `
            );
        }

        res.status(200).json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error(
            "Get departments error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch departments",
        });
    }
};


// Get Department By ID
export const getDepartmentById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await query(
            `
            SELECT
                d.id,
                d.site_id,
                s.site_code,
                s.site_name,
                d.department_code,
                d.department_name,
                d.department_head_name,
                d.status,
                d.created_at,
                d.updated_at
            FROM departments d
            INNER JOIN sites s
                ON s.id = d.site_id
            WHERE d.id = $1
            LIMIT 1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message:
                    "Department not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get department error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch department",
        });
    }
};


// Update Department
export const updateDepartment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;

        const {
            siteId,
            departmentCode,
            departmentName,
            departmentHead,
        } = req.body;

        if (
            !siteId ||
            !departmentCode ||
            !departmentName
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Site ID, department code and department name are required",
            });
            return;
        }

        // Verify site exists and is active
        const siteResult = await query(
            `
            SELECT id
            FROM sites
            WHERE id = $1
              AND status = 'ACTIVE'
            LIMIT 1
            `,
            [siteId]
        );

        if (siteResult.rows.length === 0) {
            res.status(400).json({
                success: false,
                message:
                    "Active site not found",
            });
            return;
        }

        // Check duplicate code/name excluding current department
        const duplicateResult = await query(
            `
            SELECT id
            FROM departments
            WHERE site_id = $1
              AND id <> $4
              AND (
                  department_code = $2
                  OR department_name = $3
              )
            LIMIT 1
            `,
            [
                siteId,
                departmentCode,
                departmentName,
                id,
            ]
        );

        if (duplicateResult.rows.length > 0) {
            res.status(409).json({
                success: false,
                message:
                    "Department code or name already exists in this site",
            });
            return;
        }

        const oldDepartmentResult = await query(
            `
            SELECT
                id,
                site_id,
                department_code,
                department_name,
                department_head_name,
                status,
                created_at,
                updated_at
            FROM departments
            WHERE id = $1
            LIMIT 1
            `,
            [id]
        );

        if (oldDepartmentResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message:
                    "Department not found",
            });
            return;
        }

        const oldDepartment =
            oldDepartmentResult.rows[0];

        const result = await query(
            `
            UPDATE departments
            SET
                site_id = $1,
                department_code = $2,
                department_name = $3,
                department_head_name = $4,
                updated_at = NOW()
            WHERE id = $5
            RETURNING
                id,
                site_id,
                department_code,
                department_name,
                department_head_name,
                status,
                updated_at
            `,
            [
                siteId,
                departmentCode,
                departmentName,
                departmentHead || null,
                id,
            ]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message:
                    "Department not found",
            });
            return;
        }

        const updatedDepartment = result.rows[0];

        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "UPDATE_DEPARTMENT",
            entityType: "DEPARTMENT",
            entityId: updatedDepartment.id,
            oldData: oldDepartment,
            newData: updatedDepartment,
            ipAddress: req.ip,
        });

        res.status(200).json({
            success: true,
            message:
                "Department updated successfully",
            data: updatedDepartment,
        });
    } catch (error) {
        console.error(
            "Update department error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to update department",
        });
    }
};


// Change Department Status
export const updateDepartmentStatus =
    async (
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

            const oldDepartmentResult = await query(
                `
                SELECT
                    id,
                    site_id,
                    department_code,
                    department_name,
                    status
                FROM departments
                WHERE id = $1
                LIMIT 1
                `,
                [id]
            );

            if (oldDepartmentResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message:
                        "Department not found",
                });
                return;
            }

            const oldDepartment =
                oldDepartmentResult.rows[0];

            const result = await query(
                `
                UPDATE departments
                SET
                    status = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING
                    id,
                    site_id,
                    department_code,
                    department_name,
                    status,
                    updated_at
                `,
                [status, id]
            );

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message:
                        "Department not found",
                });
                return;
            }

            const updatedDepartment = result.rows[0];

            const auditAction =
                status === "ACTIVE"
                    ? "ACTIVATE_DEPARTMENT"
                    : "DEACTIVATE_DEPARTMENT";

            await createAuditLog({
                userId: req.user?.userId ?? null,
                action: auditAction,
                entityType: "DEPARTMENT",
                entityId: updatedDepartment.id,
                oldData: oldDepartment,
                newData: updatedDepartment,
                ipAddress: req.ip,
            });

            res.status(200).json({
                success: true,
                message:
                    `Department ${status.toLowerCase()} successfully`,
                data: updatedDepartment,
            }); 
        } catch (error) {
            console.error(
                "Update department status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update department status",
            });
        }
    };