import { Response } from "express";

import {
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

import { query } from "../config/database";
import { createAuditLog } from "../services/auditService";


// Create Sub Department
export const createSubDepartment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const {
            departmentId,
            subDepartmentCode,
            subDepartmentName,
            subDepartmentHead,
            description,
        } = req.body;

        if (
            !departmentId ||
            !subDepartmentCode ||
            !subDepartmentName
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Department ID, sub-department code and sub-department name are required",
            });
            return;
        }

        // Verify department exists and is active
        const departmentResult = await query(
            `
            SELECT
                d.id,
                d.site_id,
                d.status AS department_status,
                s.status AS site_status
            FROM departments d
            INNER JOIN sites s
                ON s.id = d.site_id
            WHERE d.id = $1
            LIMIT 1
            `,
            [departmentId]
        );

        if (departmentResult.rows.length === 0) {
            res.status(400).json({
                success: false,
                message:
                    "Department not found",
            });
            return;
        }

        const department =
            departmentResult.rows[0];

        if (
            department.department_status !==
            "ACTIVE"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Cannot create sub-department under an inactive department",
            });
            return;
        }

        if (
            department.site_status !==
            "ACTIVE"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Cannot create sub-department under a department whose site is inactive",
            });
            return;
        }

        // Check duplicate code/name within department
        const duplicateResult = await query(
            `
            SELECT id
            FROM sub_departments
            WHERE department_id = $1
              AND (
                  sub_department_code = $2
                  OR sub_department_name = $3
              )
            LIMIT 1
            `,
            [
                departmentId,
                subDepartmentCode,
                subDepartmentName,
            ]
        );

        if (duplicateResult.rows.length > 0) {
            res.status(409).json({
                success: false,
                message:
                    "Sub-department code or name already exists in this department",
            });
            return;
        }

        const result = await query(
            `
            INSERT INTO sub_departments (
                department_id,
                sub_department_code,
                sub_department_name,
                head_name,
                description,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                'ACTIVE'
            )
            RETURNING
                id,
                department_id,
                sub_department_code,
                sub_department_name,
                head_name,
                description,
                status,
                created_at
            `,
            [
                departmentId,
                subDepartmentCode,
                subDepartmentName,
                subDepartmentHead || null,
                description || null,
            ]
        );

        const createdSubDepartment =
            result.rows[0];

        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "CREATE_SUB_DEPARTMENT",
            entityType: "SUB_DEPARTMENT",
            entityId: createdSubDepartment.id,
            newData: createdSubDepartment,
            ipAddress: req.ip,
        });

        res.status(201).json({
            success: true,
            message:
                "Sub-department created successfully",
            data: createdSubDepartment,
        });
    } catch (error) {
        console.error(
            "Create sub-department error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to create sub-department",
        });
    }
};


// Get All Sub Departments
export const getSubDepartments = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const {
            departmentId,
            siteId,
        } = req.query;

        let result;

        if (departmentId) {
            result = await query(
                `
                SELECT
                    sd.id,
                    sd.department_id,
                    d.site_id,
                    s.site_code,
                    s.site_name,
                    d.department_code,
                    d.department_name,
                    sd.sub_department_code,
                    sd.sub_department_name,
                    sd.head_name,
                    sd.description,
                    sd.status,
                    sd.created_at,
                    sd.updated_at
                FROM sub_departments sd
                INNER JOIN departments d
                    ON d.id = sd.department_id
                INNER JOIN sites s
                    ON s.id = d.site_id
                WHERE sd.department_id = $1
                ORDER BY
                    sd.sub_department_name ASC
                `,
                [departmentId]
            );
        } else if (siteId) {
            result = await query(
                `
                SELECT
                    sd.id,
                    sd.department_id,
                    d.site_id,
                    s.site_code,
                    s.site_name,
                    d.department_code,
                    d.department_name,
                    sd.sub_department_code,
                    sd.sub_department_name,
                    sd.head_name,
                    sd.description,
                    sd.status,
                    sd.created_at,
                    sd.updated_at
                FROM sub_departments sd
                INNER JOIN departments d
                    ON d.id = sd.department_id
                INNER JOIN sites s
                    ON s.id = d.site_id
                WHERE d.site_id = $1
                ORDER BY
                    d.department_name ASC,
                    sd.sub_department_name ASC
                `,
                [siteId]
            );
        } else {
            result = await query(
                `
                SELECT
                    sd.id,
                    sd.department_id,
                    d.site_id,
                    s.site_code,
                    s.site_name,
                    d.department_code,
                    d.department_name,
                    sd.sub_department_code,
                    sd.sub_department_name,
                    sd.head_name,
                    sd.description,
                    sd.status,
                    sd.created_at,
                    sd.updated_at
                FROM sub_departments sd
                INNER JOIN departments d
                    ON d.id = sd.department_id
                INNER JOIN sites s
                    ON s.id = d.site_id
                ORDER BY
                    s.site_name ASC,
                    d.department_name ASC,
                    sd.sub_department_name ASC
                `
            );
        }

        res.status(200).json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error(
            "Get sub-departments error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch sub-departments",
        });
    }
};


// Get Sub Department By ID
export const getSubDepartmentById =
    async (
        req: AuthenticatedRequest,
        res: Response
    ): Promise<void> => {
        try {
            const { id } = req.params;

            const result = await query(
                `
                SELECT
                    sd.id,
                    sd.department_id,
                    d.site_id,
                    s.site_code,
                    s.site_name,
                    d.department_code,
                    d.department_name,
                    sd.sub_department_code,
                    sd.sub_department_name,
                    sd.head_name,
                    sd.description,
                    sd.status,
                    sd.created_at,
                    sd.updated_at
                FROM sub_departments sd
                INNER JOIN departments d
                    ON d.id = sd.department_id
                INNER JOIN sites s
                    ON s.id = d.site_id
                WHERE sd.id = $1
                LIMIT 1
                `,
                [id]
            );

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message:
                        "Sub-department not found",
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: result.rows[0],
            });
        } catch (error) {
            console.error(
                "Get sub-department error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch sub-department",
            });
        }
    };


// Update Sub Department
export const updateSubDepartment =
    async (
        req: AuthenticatedRequest,
        res: Response
    ): Promise<void> => {
        try {
            const { id } = req.params;

            const {
                departmentId,
                subDepartmentCode,
                subDepartmentName,
                subDepartmentHead,
                description,
            } = req.body;

            if (
                !departmentId ||
                !subDepartmentCode ||
                !subDepartmentName
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Department ID, sub-department code and sub-department name are required",
                });
                return;
            }

            // Verify department exists and is active
            const departmentResult = await query(
                `
                SELECT
                    d.id,
                    d.status AS department_status,
                    s.status AS site_status
                FROM departments d
                INNER JOIN sites s
                    ON s.id = d.site_id
                WHERE d.id = $1
                LIMIT 1
                `,
                [departmentId]
            );

            if (
                departmentResult.rows.length ===
                0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Department not found",
                });
                return;
            }

            const department =
                departmentResult.rows[0];

            if (
                department.department_status !==
                "ACTIVE"
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Cannot assign sub-department to an inactive department",
                });
                return;
            }

            if (
                department.site_status !==
                "ACTIVE"
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Cannot assign sub-department to an inactive site",
                });
                return;
            }

            // Duplicate check
            const duplicateResult = await query(
                `
                SELECT id
                FROM sub_departments
                WHERE department_id = $1
                  AND id <> $4
                  AND (
                      sub_department_code = $2
                      OR sub_department_name = $3
                  )
                LIMIT 1
                `,
                [
                    departmentId,
                    subDepartmentCode,
                    subDepartmentName,
                    id,
                ]
            );

            if (
                duplicateResult.rows.length > 0
            ) {
                res.status(409).json({
                    success: false,
                    message:
                        "Sub-department code or name already exists in this department",
                });
                return;
            }

            const oldSubDepartmentResult = await query(
                `
                SELECT
                    id,
                    department_id,
                    sub_department_code,
                    sub_department_name,
                    head_name,
                    description,
                    status,
                    created_at,
                    updated_at
                FROM sub_departments
                WHERE id = $1
                LIMIT 1
                `,
                [id]
            );

            if (oldSubDepartmentResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message:
                        "Sub-department not found",
                });
                return;
            }

            const oldSubDepartment =
                oldSubDepartmentResult.rows[0];

            const result = await query(
                `
                UPDATE sub_departments
                SET
                    department_id = $1,
                    sub_department_code = $2,
                    sub_department_name = $3,
                    head_name = $4,
                    description = $5,
                    updated_at = NOW()
                WHERE id = $6
                RETURNING
                    id,
                    department_id,
                    sub_department_code,
                    sub_department_name,
                    head_name,
                    description,
                    status,
                    updated_at
                `,
                [
                    departmentId,
                    subDepartmentCode,
                    subDepartmentName,
                    subDepartmentHead || null,
                    description || null,
                    id,
                ]
            );

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message:
                        "Sub-department not found",
                });
                return;
            }

                const updatedSubDepartment = result.rows[0];

                await createAuditLog({
                    userId: req.user?.userId ?? null,
                    action: "UPDATE_SUB_DEPARTMENT",
                    entityType: "SUB_DEPARTMENT",
                    entityId: updatedSubDepartment.id,
                    oldData: oldSubDepartment,
                    newData: updatedSubDepartment,
                    ipAddress: req.ip,
                });

                res.status(200).json({
                    success: true,
                    message:
                        "Sub-department updated successfully",
                    data: updatedSubDepartment,
                });
        } catch (error) {
            console.error(
                "Update sub-department error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update sub-department",
            });
        }
    };


// Change Sub Department Status
export const updateSubDepartmentStatus =
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
            const oldSubDepartmentResult = await query(
                `
                SELECT
                    id,
                    department_id,
                    sub_department_code,
                    sub_department_name,
                    status
                FROM sub_departments
                WHERE id = $1
                LIMIT 1
                `,
                [id]
            );

            if (oldSubDepartmentResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message:
                        "Sub-department not found",
                });
                return;
            }

            const oldSubDepartment =
                oldSubDepartmentResult.rows[0];
            const result = await query(
                `
                UPDATE sub_departments
                SET
                    status = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING
                    id,
                    department_id,
                    sub_department_code,
                    sub_department_name,
                    status,
                    updated_at
                `,
                [status, id]
            );

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message:
                        "Sub-department not found",
                });
                return;
            }

            res.status(200).json({
                success: true,
                message:
                    `Sub-department ${status.toLowerCase()} successfully`,
                data: result.rows[0],
            });
        } catch (error) {
            console.error(
                "Update sub-department status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update sub-department status",
            });
        }
    };