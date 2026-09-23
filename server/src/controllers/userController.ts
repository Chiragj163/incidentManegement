import bcrypt from "bcrypt";
import { Response } from "express";

import {
    AuthenticatedRequest,
} from "../middleware/authMiddleware";

import { query } from "../config/database";
import { createAuditLog } from "../services/auditService";


// Create User
export const createUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const {
            userId,
            employeeCode,
            fullName,
            email,
            mobile,
            password,
            roleCode,
            siteId,
            departmentId,
            subDepartmentId,
            designation,
        } = req.body;

        const isSuperAdmin =
            req.user.role === "SUPER_ADMIN";

        const isDepartmentAdmin =
            req.user.role === "DEPARTMENT_ADMIN";

        // Required fields
        if (
            !userId ||
            !fullName ||
            !password ||
            !roleCode
        ) {
            res.status(400).json({
                success: false,
                message:
                    "SAP ID, full name, password and role are required",
            });
            return;
        }

        // --------------------------------------------------
        // DEPARTMENT ADMIN SCOPE
        // --------------------------------------------------

        if (isDepartmentAdmin) {
            // Department Admin must have a site and department
            if (
                req.user.siteId === null ||
                req.user.departmentId === null
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin is not assigned to a site and department",
                });
                return;
            }

            // Department Admin can create only normal users
            if (roleCode !== "USER") {
                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin can create only normal users",
                });
                return;
            }

            // Force the user to Department Admin's site
            // and department.
            if (
                String(siteId) !==
                String(req.user.siteId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You can create users only in your own site",
                });
                return;
            }

            if (
                String(departmentId) !==
                String(req.user.departmentId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You can create users only in your own department",
                });
                return;
            }
        }

        // Only Super Admin and Department Admin
        // should reach this controller.
        if (!isSuperAdmin && !isDepartmentAdmin) {
            res.status(403).json({
                success: false,
                message:
                    "You do not have permission to create users",
            });
            return;
        }

        // --------------------------------------------------
        // VALIDATE ROLE
        // --------------------------------------------------

        const roleResult = await query(
            `
            SELECT id, role_code, role_name
            FROM roles
            WHERE role_code = $1
            LIMIT 1
            `,
            [roleCode]
        );

        if (roleResult.rows.length === 0) {
            res.status(400).json({
                success: false,
                message: "Invalid role",
            });
            return;
        }

        const role = roleResult.rows[0];

        // --------------------------------------------------
        // SITE VALIDATION
        // --------------------------------------------------

        if (!siteId) {
            res.status(400).json({
                success: false,
                message:
                    "Site is required for this user",
            });
            return;
        }

        const siteResult = await query(
            `
            SELECT id, status
            FROM sites
            WHERE id = $1
            LIMIT 1
            `,
            [siteId]
        );

        if (siteResult.rows.length === 0) {
            res.status(400).json({
                success: false,
                message: "Site not found",
            });
            return;
        }

        if (
            siteResult.rows[0].status !==
            "ACTIVE"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Cannot create user under an inactive site",
            });
            return;
        }

        // --------------------------------------------------
        // DEPARTMENT VALIDATION
        // --------------------------------------------------

        if (
            roleCode === "USER" ||
            roleCode === "DEPARTMENT_ADMIN"
        ) {
            if (!departmentId) {
                res.status(400).json({
                    success: false,
                    message:
                        "Department is required for this role",
                });
                return;
            }
        }

        if (departmentId) {
            const departmentResult =
                await query(
                    `
                    SELECT
                        id,
                        site_id,
                        status
                    FROM departments
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [departmentId]
                );

            if (
                departmentResult.rows.length === 0
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
                String(department.site_id) !==
                String(siteId)
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Department does not belong to the selected site",
                });
                return;
            }

            if (
                department.status !==
                "ACTIVE"
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Cannot create user under an inactive department",
                });
                return;
            }
        }

        // --------------------------------------------------
        // SUB-DEPARTMENT VALIDATION
        // --------------------------------------------------

        if (
            roleCode === "USER" &&
            !subDepartmentId
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Sub-department is required for a normal user",
            });
            return;
        }

        if (subDepartmentId) {
            const subDepartmentResult =
                await query(
                    `
                    SELECT
                        sd.id,
                        sd.department_id,
                        sd.status,
                        d.site_id
                    FROM sub_departments sd
                    INNER JOIN departments d
                        ON d.id = sd.department_id
                    WHERE sd.id = $1
                    LIMIT 1
                    `,
                    [subDepartmentId]
                );

            if (
                subDepartmentResult.rows.length ===
                0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Sub-department not found",
                });
                return;
            }

            const subDepartment =
                subDepartmentResult.rows[0];

            if (
                String(subDepartment.site_id) !==
                String(siteId)
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Sub-department does not belong to the selected site",
                });
                return;
            }

            if (
                departmentId &&
                String(
                    subDepartment.department_id
                ) !== String(departmentId)
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Sub-department does not belong to the selected department",
                });
                return;
            }

            if (
                subDepartment.status !==
                "ACTIVE"
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Cannot create user under an inactive sub-department",
                });
                return;
            }
        }

        // --------------------------------------------------
        // DUPLICATE SAP ID
        // --------------------------------------------------

        const existingUser = await query(
            `
            SELECT id
            FROM users
            WHERE user_id = $1
            LIMIT 1
            `,
            [userId]
        );

        if (existingUser.rows.length > 0) {
            res.status(409).json({
                success: false,
                message:
                    "A user with this SAP ID already exists",
            });
            return;
        }

        // --------------------------------------------------
        // DUPLICATE EMAIL
        // --------------------------------------------------

        if (email) {
            const existingEmail = await query(
                `
                SELECT id
                FROM users
                WHERE email = $1
                LIMIT 1
                `,
                [email]
            );

            if (
                existingEmail.rows.length > 0
            ) {
                res.status(409).json({
                    success: false,
                    message:
                        "A user with this email already exists",
                });
                return;
            }
        }

        // --------------------------------------------------
        // HASH PASSWORD
        // --------------------------------------------------

        const passwordHash =
            await bcrypt.hash(password, 12);

        // --------------------------------------------------
        // INSERT USER
        // --------------------------------------------------

        const result = await query(
            `
            INSERT INTO users (
                user_id,
                employee_code,
                full_name,
                email,
                mobile,
                password_hash,
                role_id,
                site_id,
                department_id,
                sub_department_id,
                designation,
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
                $8,
                $9,
                $10,
                $11,
                'ACTIVE'
            )
            RETURNING
                id,
                user_id,
                employee_code,
                full_name,
                email,
                mobile,
                role_id,
                site_id,
                department_id,
                sub_department_id,
                designation,
                status,
                created_at
            `,
            [
                userId,
                employeeCode || null,
                fullName,
                email || null,
                mobile || null,
                passwordHash,
                role.id,
                siteId,
                departmentId || null,
                subDepartmentId || null,
                designation || null,
            ]
        );

        const createdUser = {
            ...result.rows[0],
            roleCode: role.role_code,
            roleName: role.role_name,
        };

        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "CREATE_USER",
            entityType: "USER",
            entityId: createdUser.id,
            newData: createdUser,
            ipAddress: req.ip,
        });

        res.status(201).json({
            success: true,
            message:
                "User created successfully",
            data: createdUser,
        });
    } catch (error) {
        console.error(
            "Create user error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to create user",
        });
    }
};


// Get Users
export const getUsers = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }
        const {
            siteId,
            departmentId,
            subDepartmentId,
        } = req.query;

        const isSuperAdmin = req.user.role === "SUPER_ADMIN";
        const isDepartmentAdmin =
            req.user.role === "DEPARTMENT_ADMIN";

        // Only Super Admin and Department Admin
        // can access user management.
        if (!isSuperAdmin && !isDepartmentAdmin) {
            res.status(403).json({
                success: false,
                message:
                    "You do not have permission to access users",
            });
            return;
        }

        /*
         * SUPER ADMIN
         * Can filter users by any site/department/sub-department.
         */
        if (isSuperAdmin) {
            const result = await query(
                `
                SELECT
                    u.id,
                    u.user_id,
                    u.employee_code,
                    u.full_name,
                    u.email,
                    u.mobile,
                    r.role_code,
                    r.role_name,
                    u.site_id,
                    s.site_code,
                    s.site_name,
                    u.department_id,
                    d.department_code,
                    d.department_name,
                    u.sub_department_id,
                    sd.sub_department_code,
                    sd.sub_department_name,
                    u.designation,
                    u.status,
                    u.last_login_at,
                    u.created_at,
                    u.updated_at
                FROM users u
                INNER JOIN roles r
                    ON r.id = u.role_id
                LEFT JOIN sites s
                    ON s.id = u.site_id
                LEFT JOIN departments d
                    ON d.id = u.department_id
                LEFT JOIN sub_departments sd
                    ON sd.id = u.sub_department_id
                WHERE
                    ($1::bigint IS NULL OR u.site_id = $1)
                    AND
                    ($2::bigint IS NULL OR u.department_id = $2)
                    AND
                    ($3::bigint IS NULL OR u.sub_department_id = $3)
                ORDER BY
                    u.full_name ASC
                `,
                [
                    siteId || null,
                    departmentId || null,
                    subDepartmentId || null,
                ]
            );

            res.status(200).json({
                success: true,
                data: result.rows,
            });

            return;
        }

        /*
         * DEPARTMENT ADMIN
         *
         * Ignore siteId / departmentId supplied by the client.
         *
         * The scope MUST come from the JWT:
         *
         * req.user.siteId
         * req.user.departmentId
         *
         * This prevents a Department Admin from requesting
         * another site's or department's users.
         */
        if (isDepartmentAdmin) {
            if (
                req.user.siteId === null ||
                req.user.departmentId === null
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin is not assigned to a site and department",
                });
                return;
            }

            const result = await query(
                `
                SELECT
                    u.id,
                    u.user_id,
                    u.employee_code,
                    u.full_name,
                    u.email,
                    u.mobile,
                    r.role_code,
                    r.role_name,
                    u.site_id,
                    s.site_code,
                    s.site_name,
                    u.department_id,
                    d.department_code,
                    d.department_name,
                    u.sub_department_id,
                    sd.sub_department_code,
                    sd.sub_department_name,
                    u.designation,
                    u.status,
                    u.last_login_at,
                    u.created_at,
                    u.updated_at
                FROM users u
                INNER JOIN roles r
                    ON r.id = u.role_id
                LEFT JOIN sites s
                    ON s.id = u.site_id
                LEFT JOIN departments d
                    ON d.id = u.department_id
                LEFT JOIN sub_departments sd
                    ON sd.id = u.sub_department_id
                WHERE
                    u.site_id = $1
                    AND
                    u.department_id = $2
                ORDER BY
                    u.full_name ASC
                `,
                [
                    req.user.siteId,
                    req.user.departmentId,
                ]
            );

            res.status(200).json({
                success: true,
                data: result.rows,
            });

            return;
        }
    } catch (error) {
        console.error(
            "Get users error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch users",
        });
    }
};
// Get User By ID
export const getUserById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        // Authentication check
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { id } = req.params;

        const isSuperAdmin =
            req.user.role === "SUPER_ADMIN";

        const isDepartmentAdmin =
            req.user.role === "DEPARTMENT_ADMIN";

        // Only Super Admin and Department Admin
        // should access this endpoint.
        if (!isSuperAdmin && !isDepartmentAdmin) {
            res.status(403).json({
                success: false,
                message:
                    "You do not have permission to view users",
            });
            return;
        }

        /*
         * Department Admin must have a site
         * and department assigned.
         */
        if (isDepartmentAdmin) {
            if (
                req.user.siteId === null ||
                req.user.departmentId === null
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin is not assigned to a site and department",
                });
                return;
            }
        }

        /*
         * Build query.
         *
         * Super Admin:
         *     Can view any user.
         *
         * Department Admin:
         *     Can view only users belonging to
         *     their own site + department.
         */
        let sql = `
            SELECT
                u.id,
                u.user_id,
                u.employee_code,
                u.full_name,
                u.email,
                u.mobile,
                r.role_code,
                r.role_name,
                u.site_id,
                s.site_code,
                s.site_name,
                u.department_id,
                d.department_code,
                d.department_name,
                u.sub_department_id,
                sd.sub_department_code,
                sd.sub_department_name,
                u.designation,
                u.status,
                u.last_login_at,
                u.created_at,
                u.updated_at
            FROM users u
            INNER JOIN roles r
                ON r.id = u.role_id
            LEFT JOIN sites s
                ON s.id = u.site_id
            LEFT JOIN departments d
                ON d.id = u.department_id
            LEFT JOIN sub_departments sd
                ON sd.id = u.sub_department_id
            WHERE u.id = $1
        `;

        const params: unknown[] = [id];

        if (isDepartmentAdmin) {
            sql += `
                AND u.site_id = $2
                AND u.department_id = $3
            `;

            params.push(
                req.user.siteId,
                req.user.departmentId
            );
        }

        sql += `
            LIMIT 1
        `;

        const result = await query(
            sql,
            params
        );

        if (result.rows.length === 0) {
            /*
             * Do not reveal whether a user exists
             * outside the Department Admin's scope.
             *
             * For Department Admin, an out-of-scope
             * user appears as "not found".
             */
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get user error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch user",
        });
    }
};


// Update User
export const updateUser = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const { id } = req.params;

        const {
            userId,
            employeeCode,
            fullName,
            email,
            mobile,
            roleCode,
            siteId,
            departmentId,
            subDepartmentId,
            designation,
        } = req.body;

        const isSuperAdmin =
            req.user.role === "SUPER_ADMIN";

        const isDepartmentAdmin =
            req.user.role === "DEPARTMENT_ADMIN";

        // Only Super Admin and Department Admin
        // can update users.
        if (!isSuperAdmin && !isDepartmentAdmin) {
            res.status(403).json({
                success: false,
                message:
                    "You do not have permission to update users",
            });
            return;
        }

        // Required fields
        if (
            !userId ||
            !fullName ||
            !roleCode
        ) {
            res.status(400).json({
                success: false,
                message:
                    "SAP ID, full name and role are required",
            });
            return;
        }

        // --------------------------------------------------
        // GET EXISTING USER
        // --------------------------------------------------

        const existingResult = await query(
            `
            SELECT
                u.id,
                u.user_id,
                u.employee_code,
                u.full_name,
                u.email,
                u.mobile,
                u.role_id,
                r.role_code,
                r.role_name,
                u.site_id,
                u.department_id,
                u.sub_department_id,
                u.designation,
                u.status,
                u.created_at,
                u.updated_at
            FROM users u
            INNER JOIN roles r
                ON r.id = u.role_id
            WHERE u.id = $1
            LIMIT 1
            `,
            [id]
        );

        if (existingResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        const existingUser =
            existingResult.rows[0];

        // --------------------------------------------------
        // DEPARTMENT ADMIN SCOPE
        // --------------------------------------------------

        if (isDepartmentAdmin) {
            // Department Admin must have a scope
            if (
                req.user.siteId === null ||
                req.user.departmentId === null
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin is not assigned to a site and department",
                });
                return;
            }

            // Target user must belong to the
            // Department Admin's site.
            if (
                String(existingUser.site_id) !==
                String(req.user.siteId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You can update users only in your own site",
                });
                return;
            }

            // Target user must belong to the
            // Department Admin's department.
            if (
                String(existingUser.department_id) !==
                String(req.user.departmentId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You can update users only in your own department",
                });
                return;
            }

            // Department Admin can update only
            // normal USER accounts.
            if (
                existingUser.role_code !== "USER"
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin can update only normal users",
                });
                return;
            }

            // Department Admin cannot change
            // the user's role.
            if (roleCode !== "USER") {
                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin cannot change user role",
                });
                return;
            }

            // Department Admin cannot move the
            // user to another site.
            if (
                String(siteId) !==
                String(req.user.siteId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You cannot move a user to another site",
                });
                return;
            }

            // Department Admin cannot move the
            // user to another department.
            if (
                String(departmentId) !==
                String(req.user.departmentId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You cannot move a user to another department",
                });
                return;
            }
        }

        // --------------------------------------------------
        // VERIFY ROLE
        // --------------------------------------------------

        const roleResult = await query(
            `
            SELECT
                id,
                role_code,
                role_name
            FROM roles
            WHERE role_code = $1
            LIMIT 1
            `,
            [roleCode]
        );

        if (roleResult.rows.length === 0) {
            res.status(400).json({
                success: false,
                message: "Invalid role",
            });
            return;
        }

        // --------------------------------------------------
        // SITE VALIDATION
        // --------------------------------------------------

        if (!siteId) {
            res.status(400).json({
                success: false,
                message:
                    "Site is required",
            });
            return;
        }

        const siteResult = await query(
            `
            SELECT
                id,
                status
            FROM sites
            WHERE id = $1
            LIMIT 1
            `,
            [siteId]
        );

        if (siteResult.rows.length === 0) {
            res.status(400).json({
                success: false,
                message:
                    "Site not found",
            });
            return;
        }

        if (
            siteResult.rows[0].status !==
            "ACTIVE"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Cannot assign user to an inactive site",
            });
            return;
        }

        // --------------------------------------------------
        // DEPARTMENT VALIDATION
        // --------------------------------------------------

        if (
            roleCode === "USER" ||
            roleCode === "DEPARTMENT_ADMIN"
        ) {
            if (!departmentId) {
                res.status(400).json({
                    success: false,
                    message:
                        "Department is required for this role",
                });
                return;
            }
        }

        if (departmentId) {
            const departmentResult =
                await query(
                    `
                    SELECT
                        id,
                        site_id,
                        status
                    FROM departments
                    WHERE id = $1
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
                String(department.site_id) !==
                String(siteId)
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Department does not belong to selected site",
                });
                return;
            }

            if (
                department.status !==
                "ACTIVE"
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Department is inactive",
                });
                return;
            }
        }

        // --------------------------------------------------
        // SUB-DEPARTMENT VALIDATION
        // --------------------------------------------------

        if (
            roleCode === "USER" &&
            !subDepartmentId
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Sub-department is required for a normal user",
            });
            return;
        }

        if (subDepartmentId) {
            const subDepartmentResult =
                await query(
                    `
                    SELECT
                        sd.id,
                        sd.department_id,
                        sd.status,
                        d.site_id
                    FROM sub_departments sd
                    INNER JOIN departments d
                        ON d.id = sd.department_id
                    WHERE sd.id = $1
                    LIMIT 1
                    `,
                    [subDepartmentId]
                );

            if (
                subDepartmentResult.rows.length ===
                0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Sub-department not found",
                });
                return;
            }

            const subDepartment =
                subDepartmentResult.rows[0];

            if (
                String(subDepartment.site_id) !==
                String(siteId)
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Sub-department does not belong to selected site",
                });
                return;
            }

            if (
                departmentId &&
                String(
                    subDepartment.department_id
                ) !== String(departmentId)
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Sub-department does not belong to selected department",
                });
                return;
            }

            if (
                subDepartment.status !==
                "ACTIVE"
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Sub-department is inactive",
                });
                return;
            }

            // Department Admin can only select
            // a sub-department inside their own
            // department.
            if (
                isDepartmentAdmin &&
                String(
                    subDepartment.department_id
                ) !==
                    String(req.user.departmentId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You can assign only sub-departments from your own department",
                });
                return;
            }
        }

        // --------------------------------------------------
        // SAP ID UNIQUENESS
        // --------------------------------------------------

        const duplicateUser = await query(
            `
            SELECT id
            FROM users
            WHERE user_id = $1
              AND id <> $2
            LIMIT 1
            `,
            [userId, id]
        );

        if (
            duplicateUser.rows.length > 0
        ) {
            res.status(409).json({
                success: false,
                message:
                    "Another user already has this SAP ID",
            });
            return;
        }

        // --------------------------------------------------
        // EMAIL UNIQUENESS
        // --------------------------------------------------

        if (email) {
            const duplicateEmail =
                await query(
                    `
                    SELECT id
                    FROM users
                    WHERE email = $1
                      AND id <> $2
                    LIMIT 1
                    `,
                    [email, id]
                );

            if (
                duplicateEmail.rows.length > 0
            ) {
                res.status(409).json({
                    success: false,
                    message:
                        "Another user already has this email",
                });
                return;
            }
        }

        // --------------------------------------------------
        // UPDATE USER
        // --------------------------------------------------

        const result = await query(
            `
            UPDATE users
            SET
                user_id = $1,
                employee_code = $2,
                full_name = $3,
                email = $4,
                mobile = $5,
                role_id = $6,
                site_id = $7,
                department_id = $8,
                sub_department_id = $9,
                designation = $10,
                updated_at = NOW()
            WHERE id = $11
            RETURNING
                id,
                user_id,
                employee_code,
                full_name,
                email,
                mobile,
                role_id,
                site_id,
                department_id,
                sub_department_id,
                designation,
                status,
                updated_at
            `,
            [
                userId,
                employeeCode || null,
                fullName,
                email || null,
                mobile || null,
                roleResult.rows[0].id,
                siteId,
                departmentId || null,
                subDepartmentId || null,
                designation || null,
                id,
            ]
        );

        const updatedUser = {
            ...result.rows[0],
            roleCode:
                roleResult.rows[0].role_code,
            roleName:
                roleResult.rows[0].role_name,
        };

        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "UPDATE_USER",
            entityType: "USER",
            entityId: updatedUser.id,
            oldData: existingUser,
            newData: updatedUser,
            ipAddress: req.ip,
        });

        res.status(200).json({
            success: true,
            message:
                "User updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        console.error(
            "Update user error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to update user",
        });
    }
};
// Change User Status
export const updateUserStatus =
    async (
        req: AuthenticatedRequest,
        res: Response
    ): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message:
                        "Authentication required",
                });
                return;
            }

            const { id } = req.params;
            const { status } = req.body;

            const isSuperAdmin =
                req.user.role === "SUPER_ADMIN";

            const isDepartmentAdmin =
                req.user.role === "DEPARTMENT_ADMIN";

            // Only Super Admin and Department Admin
            // can change user status.
            if (
                !isSuperAdmin &&
                !isDepartmentAdmin
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You do not have permission to change user status",
                });
                return;
            }

            // Validate status
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

            // --------------------------------------------------
            // GET TARGET USER
            // --------------------------------------------------

            const existingResult = await query(
                `
                SELECT
                    u.id,
                    u.user_id,
                    u.site_id,
                    u.department_id,
                    r.role_code
                FROM users u
                INNER JOIN roles r
                    ON r.id = u.role_id
                WHERE u.id = $1
                LIMIT 1
                `,
                [id]
            );

            if (
                existingResult.rows.length === 0
            ) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });
                return;
            }

            const existingUser =
                existingResult.rows[0];

            // --------------------------------------------------
            // SUPER ADMIN PROTECTION
            // --------------------------------------------------

            // Prevent Super Admin from changing
            // their own account status.
            if (
                isSuperAdmin &&
                String(req.user.userId) ===
                    String(id)
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "You cannot change the status of your own Super Admin account",
                });
                return;
            }

            // --------------------------------------------------
            // DEPARTMENT ADMIN SCOPE
            // --------------------------------------------------

            if (isDepartmentAdmin) {
                // Department Admin must have
                // a site and department.
                if (
                    req.user.siteId === null ||
                    req.user.departmentId === null
                ) {
                    res.status(403).json({
                        success: false,
                        message:
                            "Department Admin is not assigned to a site and department",
                    });
                    return;
                }

                // Target user must belong to
                // Department Admin's site.
                if (
                    String(
                        existingUser.site_id
                    ) !==
                    String(req.user.siteId)
                ) {
                    res.status(403).json({
                        success: false,
                        message:
                            "You can change status only for users in your own site",
                    });
                    return;
                }

                // Target user must belong to
                // Department Admin's department.
                if (
                    String(
                        existingUser.department_id
                    ) !==
                    String(
                        req.user.departmentId
                    )
                ) {
                    res.status(403).json({
                        success: false,
                        message:
                            "You can change status only for users in your own department",
                    });
                    return;
                }

                // Department Admin can change
                // status only for normal users.
                if (
                    existingUser.role_code !==
                    "USER"
                ) {
                    res.status(403).json({
                        success: false,
                        message:
                            "Department Admin can change status only for normal users",
                    });
                    return;
                }
            }
            // Get old user before changing status
            const oldUserResult = await query(
                `
                SELECT
                    u.id,
                    u.user_id,
                    u.employee_code,
                    u.full_name,
                    u.email,
                    u.mobile,
                    r.role_code,
                    r.role_name,
                    u.site_id,
                    u.department_id,
                    u.sub_department_id,
                    u.designation,
                    u.status
                FROM users u
                INNER JOIN roles r
                    ON r.id = u.role_id
                WHERE u.id = $1
                LIMIT 1
                `,
                [id]
            );

            if (oldUserResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: "User not found",
                });
                return;
            }

            const oldUser = oldUserResult.rows[0];

            // Update status
            const result = await query(
                `
                UPDATE users
                SET
                    status = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING
                    id,
                    user_id,
                    employee_code,
                    full_name,
                    email,
                    mobile,
                    role_id,
                    site_id,
                    department_id,
                    sub_department_id,
                    designation,
                    status,
                    updated_at
                `,
                [status, id]
            );

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: "User not found",
                });
                return;
            }

            const updatedUser = result.rows[0];

            const auditAction =
                status === "ACTIVE"
                    ? "ACTIVATE_USER"
                    : "DEACTIVATE_USER";

            await createAuditLog({
                userId: req.user?.userId ?? null,
                action: auditAction,
                entityType: "USER",
                entityId: updatedUser.id,
                oldData: oldUser,
                newData: updatedUser,
                ipAddress: req.ip,
            });

            res.status(200).json({
                success: true,
                message:
                    `User ${status.toLowerCase()} successfully`,
                data: updatedUser,
            });
        } catch (error) {
            console.error(
                "Update user status error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update user status",
            });
        }
    };