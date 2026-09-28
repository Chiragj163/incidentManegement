import { Request, Response } from "express";
import { query, default as pool } from "../config/database";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { createNotification } from "../services/notificationService";
import { createAuditLog } from "../services/auditService";


const ALLOWED_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const generateIncidentNo = async (client: any): Promise<string> => {
    const now = new Date();

    const datePart =
        `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    /*
     * Lock incident-number generation so two users cannot
     * receive the same number at the same time.
     */
    await client.query(
        `SELECT pg_advisory_xact_lock(hashtext($1))`,
        [`incident-number-${datePart}`]
    );

    const result = await client.query(
        `
        SELECT COALESCE(
            MAX(
                CAST(
                    RIGHT(incident_no, 6) AS INTEGER
                )
            ),
            0
        ) + 1 AS next_number
        FROM incidents
        WHERE incident_no LIKE $1
        `,
        [`INC-${datePart}-%`]
    );

    const nextNumber = result.rows[0].next_number;

    return `INC-${datePart}-${String(nextNumber).padStart(6, "0")}`;
};

export const createIncident = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const client = await pool.connect();

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
            fromSiteId,
            fromDepartmentId,
            fromSubDepartmentId,
            toSiteId,
            toDepartmentId,
            toSubDepartmentId,
            subject,
            description,
            priority = "MEDIUM",
        } = req.body;

        // --------------------------------------------------
        // REQUIRED FIELDS
        // --------------------------------------------------

        if (
            !siteId ||
            !fromSiteId ||
            !fromDepartmentId ||
            !toSiteId ||
            !toDepartmentId ||
            !subject ||
            !description
        ) {
            res.status(400).json({
                success: false,
                message:
                    "siteId, fromSiteId, fromDepartmentId, toSiteId, toDepartmentId, subject and description are required",
            });
            return;
        }

        // --------------------------------------------------
        // PRIORITY
        // --------------------------------------------------

        if (!ALLOWED_PRIORITIES.includes(priority)) {
            res.status(400).json({
                success: false,
                message: "Invalid priority",
            });
            return;
        }

        // --------------------------------------------------
        // INCIDENT SITE MUST MATCH DESTINATION SITE
        // --------------------------------------------------

        if (Number(siteId) !== Number(toSiteId)) {
            res.status(400).json({
                success: false,
                message:
                    "Incident site must be the same as destination site",
            });
            return;
        }

        // --------------------------------------------------
        // SOURCE SITE PERMISSION
        // --------------------------------------------------

        /*
         * Normal users and Department Admins can report
         * only from their own site.
         *
         * Super Admin is allowed to select the source site.
         */
        if (req.user.role !== "SUPER_ADMIN") {
            if (
                req.user.siteId === null ||
                Number(req.user.siteId) !== Number(fromSiteId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You can report an incident only from your own site",
                });
                return;
            }
        }

        // --------------------------------------------------
        // SOURCE DEPARTMENT PERMISSION
        // --------------------------------------------------

        /*
         * Normal users and Department Admins can report
         * only from their own department.
         */
        if (req.user.role !== "SUPER_ADMIN") {
            if (
                req.user.departmentId === null ||
                Number(req.user.departmentId) !==
                    Number(fromDepartmentId)
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You can report an incident only from your own department",
                });
                return;
            }

            /*
             * If the user belongs to a sub-department,
             * force the source sub-department to be theirs.
             */
            if (
                req.user.subDepartmentId !== null
            ) {
                if (
                    fromSubDepartmentId === undefined ||
                    fromSubDepartmentId === null ||
                    Number(req.user.subDepartmentId) !==
                        Number(fromSubDepartmentId)
                ) {
                    res.status(403).json({
                        success: false,
                        message:
                            "You can report an incident only from your own sub department",
                    });
                    return;
                }
            }
        }

        await client.query("BEGIN");

        // --------------------------------------------------
        // VALIDATE SOURCE SITE
        // --------------------------------------------------

        const sourceSite = await client.query(
            `
            SELECT
                id,
                status
            FROM sites
            WHERE id = $1
            LIMIT 1
            `,
            [fromSiteId]
        );

        if (sourceSite.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message: "Source site not found",
            });
            return;
        }

        if (sourceSite.rows[0].status !== "ACTIVE") {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    "Source site is inactive",
            });
            return;
        }

        // --------------------------------------------------
        // VALIDATE DESTINATION SITE
        // --------------------------------------------------

        const destinationSite = await client.query(
            `
            SELECT
                id,
                status
            FROM sites
            WHERE id = $1
            LIMIT 1
            `,
            [toSiteId]
        );

        if (destinationSite.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    "Destination site not found",
            });
            return;
        }

        if (
            destinationSite.rows[0].status !==
            "ACTIVE"
        ) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    "Destination site is inactive",
            });
            return;
        }

        // --------------------------------------------------
        // VALIDATE SOURCE DEPARTMENT
        // --------------------------------------------------

        const sourceDepartment = await client.query(
            `
            SELECT
                id,
                site_id,
                status
            FROM departments
            WHERE id = $1
              AND site_id = $2
              AND status = 'ACTIVE'
            LIMIT 1
            `,
            [
                fromDepartmentId,
                fromSiteId,
            ]
        );

        if (sourceDepartment.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    "Invalid or inactive source department",
            });
            return;
        }

        // --------------------------------------------------
        // VALIDATE DESTINATION DEPARTMENT
        // --------------------------------------------------

        const destinationDepartment =
            await client.query(
                `
                SELECT
                    id,
                    site_id,
                    status
                FROM departments
                WHERE id = $1
                  AND site_id = $2
                  AND status = 'ACTIVE'
                LIMIT 1
                `,
                [
                    toDepartmentId,
                    toSiteId,
                ]
            );

        if (
            destinationDepartment.rowCount === 0
        ) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    "Invalid or inactive destination department",
            });
            return;
        }

        // --------------------------------------------------
        // VALIDATE SOURCE SUB DEPARTMENT
        // --------------------------------------------------

        if (
            fromSubDepartmentId !== undefined &&
            fromSubDepartmentId !== null
        ) {
            const sourceSubDepartment =
                await client.query(
                    `
                    SELECT
                        id,
                        department_id,
                        status
                    FROM sub_departments
                    WHERE id = $1
                      AND department_id = $2
                      AND status = 'ACTIVE'
                    LIMIT 1
                    `,
                    [
                        fromSubDepartmentId,
                        fromDepartmentId,
                    ]
                );

            if (
                sourceSubDepartment.rowCount === 0
            ) {
                await client.query("ROLLBACK");

                res.status(400).json({
                    success: false,
                    message:
                        "Invalid or inactive source sub department",
                });
                return;
            }
        }

        // --------------------------------------------------
        // VALIDATE DESTINATION SUB DEPARTMENT
        // --------------------------------------------------

        if (
            toSubDepartmentId !== undefined &&
            toSubDepartmentId !== null
        ) {
            const destinationSubDepartment =
                await client.query(
                    `
                    SELECT
                        id,
                        department_id,
                        status
                    FROM sub_departments
                    WHERE id = $1
                      AND department_id = $2
                      AND status = 'ACTIVE'
                    LIMIT 1
                    `,
                    [
                        toSubDepartmentId,
                        toDepartmentId,
                    ]
                );

            if (
                destinationSubDepartment.rowCount === 0
            ) {
                await client.query("ROLLBACK");

                res.status(400).json({
                    success: false,
                    message:
                        "Invalid or inactive destination sub department",
                });
                return;
            }
        }

        // --------------------------------------------------
        // GENERATE INCIDENT NUMBER
        // --------------------------------------------------

        const incidentNo =
            await generateIncidentNo(client);

        // --------------------------------------------------
        // CREATE INCIDENT
        // --------------------------------------------------

        const incidentResult =
            await client.query(
                `
                INSERT INTO incidents (
                    incident_no,
                    site_id,
                    from_site_id,
                    from_department_id,
                    from_sub_department_id,
                    reported_by,
                    to_site_id,
                    to_department_id,
                    to_sub_department_id,
                    subject,
                    description,
                    priority,
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
                    $12,
                    'REPORTED'
                )
                RETURNING *
                `,
                [
                    incidentNo,
                    siteId,
                    fromSiteId,
                    fromDepartmentId,
                    fromSubDepartmentId || null,
                    req.user.userId,
                    toSiteId,
                    toDepartmentId,
                    toSubDepartmentId || null,
                    subject,
                    description,
                    priority,
                ]
            );

        const incident =
            incidentResult.rows[0];
        
        // --------------------------------------------------
        // SET AUTOMATIC ASSIGNMENT DEADLINE
        // --------------------------------------------------

        const priorityMinutes: Record<string, number> = {
            LOW: 30,
            MEDIUM: 15,
            HIGH: 10,
            CRITICAL: 5,
        };

        const assignmentMinutes =
            priorityMinutes[priority] ?? 30;

        await client.query(
            `
            UPDATE incidents
            SET assignment_deadline_at =
                created_at + ($2 * INTERVAL '1 minute'),
                updated_at = NOW()
            WHERE id = $1
            `,
            [
                incident.id,
                assignmentMinutes,
            ]
        );

        // --------------------------------------------------
        // STATUS HISTORY
        // --------------------------------------------------

        await client.query(
            `
            INSERT INTO incident_status_history (
                incident_id,
                old_status,
                new_status,
                changed_by,
                remarks
            )
            VALUES (
                $1,
                NULL,
                'REPORTED',
                $2,
                $3
            )
            `,
            [
                incident.id,
                req.user.userId,
                "Incident reported",
            ]
        );

        // --------------------------------------------------
        // COMMIT
        // --------------------------------------------------

        await client.query("COMMIT");

        // --------------------------------------------------
        // CHECK FOR IMMEDIATE AUTO ASSIGNMENT
        // --------------------------------------------------

        let immediatelyAssigned = false;

        if (toSubDepartmentId) {
            const singleEmployeeResult =
                await query(
                    `
                    SELECT
                        u.id,
                        u.user_id,
                        u.full_name

                    FROM users u

                    INNER JOIN roles r
                        ON r.id = u.role_id

                    WHERE u.site_id = $1
                    AND u.department_id = $2
                    AND u.sub_department_id = $3
                    AND u.status = 'ACTIVE'
                    AND r.role_code = 'USER'

                    ORDER BY u.id
                    `,
                    [
                        toSiteId,
                        toDepartmentId,
                        toSubDepartmentId,
                    ]
                );

            /*
            * Exactly one active employee.
            */
            if (singleEmployeeResult.rowCount === 1) {

                const employee =
                    singleEmployeeResult.rows[0];

                const assignmentClient =
                    await pool.connect();

                try {
                    await assignmentClient.query("BEGIN");

                    /*
                    * Lock incident again.
                    */
                    const lockedIncidentResult =
                        await assignmentClient.query(
                            `
                            SELECT
                                id,
                                incident_no,
                                status,
                                assigned_to,
                                to_department_id,
                                to_sub_department_id
                            FROM incidents
                            WHERE id = $1
                            FOR UPDATE
                            `,
                            [incident.id]
                        );

                    if (
                        lockedIncidentResult.rowCount === 1
                    ) {
                        const lockedIncident =
                            lockedIncidentResult.rows[0];

                        /*
                        * Assign only if still unassigned.
                        */
                        if (
                            lockedIncident.assigned_to === null &&
                            lockedIncident.status === "REPORTED"
                        ) {

                            await assignmentClient.query(
                                `
                                UPDATE incidents
                                SET
                                    assigned_to = $1,
                                    status = 'ASSIGNED',
                                    auto_assigned_at = NOW(),
                                    updated_at = NOW()
                                WHERE id = $2
                                `,
                                [
                                    employee.id,
                                    incident.id,
                                ]
                            );

                            /*
                            * Assignment record.
                            */
                            await assignmentClient.query(
                                `
                                INSERT INTO incident_assignments (
                                    incident_id,
                                    assigned_to,
                                    assigned_department_id,
                                    assigned_sub_department_id,
                                    assigned_by,
                                    remarks
                                )
                                VALUES (
                                    $1,
                                    $2,
                                    $3,
                                    $4,
                                    1,
                                    $5
                                )
                                `,
                                [
                                    incident.id,
                                    employee.id,
                                    toDepartmentId,
                                    toSubDepartmentId,
                                    "Automatically assigned because destination sub department has only one active employee",
                                ]
                            );

                            /*
                            * Status history.
                            */
                            await assignmentClient.query(
                                `
                                INSERT INTO incident_status_history (
                                    incident_id,
                                    old_status,
                                    new_status,
                                    changed_by,
                                    remarks
                                )
                                VALUES (
                                    $1,
                                    'REPORTED',
                                    'ASSIGNED',
                                    1,
                                    $2
                                )
                                `,
                                [
                                    incident.id,
                                    `Automatically assigned to ${employee.full_name} because the destination sub department has only one active employee`,
                                ]
                            );

                            await assignmentClient.query(
                                "COMMIT"
                            );

                            immediatelyAssigned = true;

                            await createNotification({
                                userId:
                                    Number(employee.id),
                                incidentId:
                                    Number(incident.id),
                                title:
                                    "Incident Assigned",
                                message:
                                    `Incident ${incident.incident_no} has been automatically assigned to you: ${subject}`,
                                notificationType:
                                    "INCIDENT_ASSIGNED",
                            });
                        } else {
                            await assignmentClient.query(
                                "ROLLBACK"
                            );
                        }
                    } else {
                        await assignmentClient.query(
                            "ROLLBACK"
                        );
                    }

                } catch (error) {
                    await assignmentClient.query(
                        "ROLLBACK"
                    );

                    console.error(
                        "Immediate automatic assignment error:",
                        error
                    );
                } finally {
                    assignmentClient.release();
                }
            }
        }

        /*
        * Notify Super Admin and Department Admins.
        *
        * Normal users are NOT notified when an incident
        * is merely reported. They are notified only after
        * the incident is assigned to them.
        */
        const adminUsersResult = await query(
            `
            SELECT DISTINCT
                u.id
            FROM users u
            INNER JOIN roles r
                ON r.id = u.role_id
            WHERE u.status = 'ACTIVE'
            AND (
                r.role_code = 'SUPER_ADMIN'
                OR
                (
                    r.role_code = 'DEPARTMENT_ADMIN'
                    AND
                    (
                        (
                            u.site_id = $1
                            AND u.department_id = $2
                        )
                        OR
                        (
                            u.site_id = $3
                            AND u.department_id = $4
                        )
                    )
                )
            )
            `,
            [
                fromSiteId,
                fromDepartmentId,
                toSiteId,
                toDepartmentId,
            ]
        );

        for (const row of adminUsersResult.rows) {
            await createNotification({
                userId: Number(row.id),
                incidentId: Number(incident.id),
                title: "New Incident Reported",
                message:
                    `New incident ${incident.incident_no}: ${subject}`,
                notificationType: "NEW_INCIDENT",
            });
        }
        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        res.status(201).json({
            success: true,
            message:
                "Incident created successfully",
            incident,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Create incident error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to create incident",
        });
    } finally {
        client.release();
    }
};
export const getIncidents = async (
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
            status,
            priority,
            siteId,
            departmentId,
            search,
        } = req.query;

        const conditions: string[] = [];
        const params: unknown[] = [];

        /*
         * SUPER ADMIN
         * Can see all incidents.
         */
        if (req.user.role === "SUPER_ADMIN") {
            // No mandatory visibility restriction.
        }

        /*
         * DEPARTMENT ADMIN
         * Can see incidents where their department is either
         * the source or destination department.
         */
      
        else if (req.user.role === "DEPARTMENT_ADMIN") {
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

            params.push(req.user.siteId);
            const departmentSiteParam = params.length;

            params.push(req.user.departmentId);
            const departmentParam = params.length;

            conditions.push(`
                (
                    (
                        i.from_site_id = $${departmentSiteParam}
                        AND i.from_department_id = $${departmentParam}
                    )
                    OR
                    (
                        i.to_site_id = $${departmentSiteParam}
                        AND i.to_department_id = $${departmentParam}
                    )
                )
            `);
        }

        else if (req.user.role === "USER") {
            /*
            * NORMAL USER
            *
            * A normal user can see an incident on the
            * Dashboard/Kanban ONLY after it is assigned
            * directly to that user.
            *
            * Being the reporter or belonging to the
            * destination department does NOT grant visibility.
            */
            if (
                req.user.siteId === null ||
                req.user.siteId === undefined ||
                req.user.departmentId === null ||
                req.user.departmentId === undefined
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "User is not assigned to a site and department",
                });
                return;
            }

            params.push(req.user.userId);
            const userParam = params.length;

            conditions.push(`
                (
                i.reported_by = $${userParam}
                or
                i.assigned_to = $${userParam}
                )
            `);
        }  
        /*
         * Optional filters
         */

        if (siteId) {
            params.push(Number(siteId));
            conditions.push(`i.site_id = $${params.length}`);
        }

        if (departmentId) {
            params.push(Number(departmentId));

            conditions.push(`
                (
                    i.from_department_id = $${params.length}
                    OR i.to_department_id = $${params.length}
                )
            `);
        }

        if (status) {
            params.push(String(status).toUpperCase());
            conditions.push(`i.status = $${params.length}`);
        }

        if (priority) {
            params.push(String(priority).toUpperCase());
            conditions.push(`i.priority = $${params.length}`);
        }

        if (search) {
            params.push(`%${String(search).trim()}%`);

            const searchParam = params.length;

            conditions.push(`
                (
                    i.incident_no ILIKE $${searchParam}
                    OR i.subject ILIKE $${searchParam}
                    OR i.description ILIKE $${searchParam}

                    OR s.site_code ILIKE $${searchParam}
                    OR s.site_name ILIKE $${searchParam}

                    OR fd.department_code ILIKE $${searchParam}
                    OR fd.department_name ILIKE $${searchParam}

                    OR fsd.sub_department_code ILIKE $${searchParam}
                    OR fsd.sub_department_name ILIKE $${searchParam}

                    OR td.department_code ILIKE $${searchParam}
                    OR td.department_name ILIKE $${searchParam}

                    OR tsd.sub_department_code ILIKE $${searchParam}
                    OR tsd.sub_department_name ILIKE $${searchParam}

                    OR reporter.user_id ILIKE $${searchParam}
                    OR reporter.full_name ILIKE $${searchParam}

                    OR assigned.user_id ILIKE $${searchParam}
                    OR assigned.full_name ILIKE $${searchParam}
                )
            `);
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        const result = await query(
            `
            SELECT
                i.id,
                i.incident_no,
                i.site_id,
                i.from_site_id,
                i.to_site_id,
                s.site_code,
                s.site_name,

                i.from_department_id,
                fd.department_code AS from_department_code,
                fd.department_name AS from_department_name,

                i.from_sub_department_id,
                fsd.sub_department_code AS from_sub_department_code,
                fsd.sub_department_name AS from_sub_department_name,

                i.reported_by,
                reporter.user_id AS reporter_user_id,
                reporter.full_name AS reporter_name,

                i.to_department_id,
                td.department_code AS to_department_code,
                td.department_name AS to_department_name,

                i.to_sub_department_id,
                tsd.sub_department_code AS to_sub_department_code,
                tsd.sub_department_name AS to_sub_department_name,

                i.assigned_to,
                assigned.user_id AS assigned_user_id,
                assigned.full_name AS assigned_user_name,

                i.subject,
                i.description,
                i.priority,
                i.status,
                i.created_at,
                i.updated_at,
                i.closed_at

            FROM incidents i

            INNER JOIN sites s
                ON s.id = i.site_id

            INNER JOIN departments fd
                ON fd.id = i.from_department_id

            LEFT JOIN sub_departments fsd
                ON fsd.id = i.from_sub_department_id

            INNER JOIN users reporter
                ON reporter.id = i.reported_by

            INNER JOIN departments td
                ON td.id = i.to_department_id

            LEFT JOIN sub_departments tsd
                ON tsd.id = i.to_sub_department_id

            LEFT JOIN users assigned
                ON assigned.id = i.assigned_to

            ${whereClause}

            ORDER BY i.created_at DESC
            `,
            params
        );
        
        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows,
        });
    } catch (error) {
        console.error("Get incidents error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch incidents",
        });
    }
};
export const assignIncident = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const client = await pool.connect();

    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        /*
         * Only Super Admin and Department Admin can assign incidents.
         */
        if (
            req.user.role !== "SUPER_ADMIN" &&
            req.user.role !== "DEPARTMENT_ADMIN"
        ) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to assign incidents",
            });
            return;
        }

        const incidentId = Number(req.params.id);
        const { assignedTo, remarks } = req.body;

        if (!Number.isInteger(incidentId) || incidentId <= 0) {
            res.status(400).json({
                success: false,
                message: "Invalid incident ID",
            });
            return;
        }

        if (!assignedTo) {
            res.status(400).json({
                success: false,
                message: "assignedTo is required",
            });
            return;
        }

        await client.query("BEGIN");

        /*
         * Get incident and its destination hierarchy.
         */
        const incidentResult = await client.query(
            `
            SELECT
                i.id,
                i.incident_no,
                i.site_id,
                i.from_site_id,
                i.to_site_id,
                i.to_department_id,
                i.to_sub_department_id,
                i.assigned_to,
                i.status,
                i.subject
            FROM incidents i
            WHERE i.id = $1
            FOR UPDATE
            `,
            [incidentId]
        );

        if (incidentResult.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(404).json({
                success: false,
                message: "Incident not found",
            });
            return;
        }

        const incident = incidentResult.rows[0];

        
        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "CREATE_INCIDENT",
            entityType: "INCIDENT",
            entityId: incident.id,
            newData: incident,
            ipAddress: req.ip,
        });

        /*
         * Only incidents waiting for assignment can be assigned.
         */
        if (
            incident.status !== "REPORTED" &&
            incident.status !== "REOPENED"
        ) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    `Incident cannot be assigned while status is ${incident.status}`,
            });
            return;
        }

        /*
         * Department Admin can only assign incidents
         * belonging to their own department.
         */
        if (req.user.role === "DEPARTMENT_ADMIN") {
            if (
                req.user.siteId === null ||
                req.user.departmentId === null
            ) {
                await client.query("ROLLBACK");

                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin is not assigned to a site and department",
                });
                return;
            }

            if (
                Number(req.user.siteId) !== Number(incident.to_site_id) ||
                Number(req.user.departmentId) !==
                    Number(incident.to_department_id)
            ) {
                await client.query("ROLLBACK");

                res.status(403).json({
                    success: false,
                    message:
                        "You can assign only incidents sent to your department",
                });
                return;
            }
        }

        /*
         * The assigned user must be ACTIVE and belong to
         * the incident destination hierarchy.
         */
        const userResult = await client.query(
            `
            SELECT
                u.id,
                u.user_id,
                u.full_name,
                u.site_id,
                u.department_id,
                u.sub_department_id,
                u.status,
                r.role_code
            FROM users u
            INNER JOIN roles r
                ON r.id = u.role_id
            WHERE u.id = $1
              AND u.status = 'ACTIVE'
            LIMIT 1
            `,
            [assignedTo]
        );

        if (userResult.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message: "Assigned user not found or inactive",
            });
            return;
        }

        const assignedUser = userResult.rows[0];

        /*
         * We assign work only to normal users.
         */
        if (assignedUser.role_code !== "USER") {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message: "Incident can only be assigned to a normal user",
            });
            return;
        }

        /*
         * Assigned user must belong to destination site.
         */
        if (
            Number(assignedUser.site_id) !== Number(incident.to_site_id)
        ) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    "Assigned user does not belong to the destination site",
            });
            return;
        }

        /*
         * Assigned user must belong to destination department.
         */
        if (
            Number(assignedUser.department_id) !==
            Number(incident.to_department_id)
        ) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    "Assigned user does not belong to the destination department",
            });
            return;
        }

        /*
         * If incident has a destination sub-department,
         * assigned user must belong to that sub-department.
         */
        if (incident.to_sub_department_id !== null) {
            if (
                assignedUser.sub_department_id === null ||
                Number(assignedUser.sub_department_id) !==
                    Number(incident.to_sub_department_id)
            ) {
                await client.query("ROLLBACK");

                res.status(400).json({
                    success: false,
                    message:
                        "Assigned user does not belong to the destination sub department",
                });
                return;
            }
        }

        /*
         * Update incident.
         */
        const updatedIncidentResult = await client.query(
            `
            UPDATE incidents
            SET
                assigned_to = $1,
                status = 'ASSIGNED',
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
            `,
            [assignedUser.id, incidentId]
        );

        /*
         * Record assignment.
         */
        await client.query(
            `
            INSERT INTO incident_assignments (
                incident_id,
                assigned_to,
                assigned_department_id,
                assigned_sub_department_id,
                assigned_by,
                remarks
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                incidentId,
                assignedUser.id,
                incident.to_department_id,
                incident.to_sub_department_id,
                req.user.userId,
                remarks || null,
            ]
        );

        /*
         * Record status change.
         */
        await client.query(
            `
            INSERT INTO incident_status_history (
                incident_id,
                old_status,
                new_status,
                changed_by,
                remarks
            )
            VALUES ($1, $2, 'ASSIGNED', $3, $4)
            `,
            [
                incidentId,
                incident.status,
                req.user.userId,
                remarks || `Incident assigned to ${assignedUser.full_name}`,
            ]
        );

        await client.query("COMMIT");

        await createNotification({
            userId: assignedUser.id,
            incidentId: incidentId,
            title: "Incident Assigned",
            message: `Incident ${incident.incident_no} has been assigned to you: ${incident.subject}`,
            notificationType: "INCIDENT_ASSIGNED",
        });

        res.status(200).json({
            success: true,
            message: "Incident assigned successfully",
            data: {
                incident: updatedIncidentResult.rows[0],
                assignedUser: {
                    id: assignedUser.id,
                    userId: assignedUser.user_id,
                    fullName: assignedUser.full_name,
                },
            },
        });
        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "ASSIGN_INCIDENT",
            entityType: "INCIDENT",
            entityId: incidentId,
            newData: {
                assignedTo: assignedUser.id,
                assignedUserId: assignedUser.user_id,
                assignedUserName: assignedUser.full_name,
            },
            ipAddress: req.ip,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Assign incident error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to assign incident",
        });
    } finally {
        client.release();
    }
};
export const startIncidentWork = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const client = await pool.connect();

    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const incidentId = Number(req.params.id);

        if (!Number.isInteger(incidentId) || incidentId <= 0) {
            res.status(400).json({
                success: false,
                message: "Invalid incident ID",
            });
            return;
        }

        await client.query("BEGIN");

        /*
         * Lock the incident while starting work.
         */
        const incidentResult = await client.query(
            `
            SELECT
                id,
                incident_no,
                site_id,
                assigned_to,
                status
            FROM incidents
            WHERE id = $1
            FOR UPDATE
            `,
            [incidentId]
        );

        if (incidentResult.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(404).json({
                success: false,
                message: "Incident not found",
            });
            return;
        }

        const incident = incidentResult.rows[0];

        /*
         * Only the assigned user can start working.
         */
        if (
            Number(incident.assigned_to) !==
            Number(req.user.userId)
        ) {
            await client.query("ROLLBACK");

            res.status(403).json({
                success: false,
                message:
                    "Only the assigned user can start working on this incident",
            });
            return;
        }

        /*
         * Incident must currently be ASSIGNED.
         */
        if (incident.status !== "ASSIGNED") {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    `Incident cannot be started while status is ${incident.status}`,
            });
            return;
        }

        /*
         * Determine the next resolution cycle number.
         */
        const cycleResult = await client.query(
            `
            SELECT COALESCE(MAX(cycle_number), 0) + 1 AS next_cycle
            FROM incident_resolution_cycles
            WHERE incident_id = $1
            `,
            [incidentId]
        );

        const cycleNumber = cycleResult.rows[0].next_cycle;

        /*
         * Create a resolution cycle.
         */
        const resolutionResult = await client.query(
            `
            INSERT INTO incident_resolution_cycles (
                incident_id,
                cycle_number,
                started_at,
                resolved_by
            )
            VALUES ($1, $2, NOW(), $3)
            RETURNING *
            `,
            [
                incidentId,
                cycleNumber,
                req.user.userId,
            ]
        );

        /*
         * Update incident status.
         */
        const updatedIncidentResult = await client.query(
            `
            UPDATE incidents
            SET
                status = 'WORKING',
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [incidentId]
        );

        /*
         * Record work-start update.
         */
        await client.query(
            `
            INSERT INTO incident_updates (
                incident_id,
                user_id,
                update_text
            )
            VALUES ($1, $2, $3)
            `,
            [
                incidentId,
                req.user.userId,
                "Started working on the incident",
            ]
        );

        /*
         * Record status history.
         */
        await client.query(
            `
            INSERT INTO incident_status_history (
                incident_id,
                old_status,
                new_status,
                changed_by,
                remarks
            )
            VALUES ($1, 'ASSIGNED', 'WORKING', $2, $3)
            `,
            [
                incidentId,
                req.user.userId,
                `Started work on resolution cycle ${cycleNumber}`,
            ]
        );

        await client.query("COMMIT");
        

        res.status(200).json({
            success: true,
            message: "Incident work started successfully",
            data: {
                incident: updatedIncidentResult.rows[0],
                resolutionCycle: resolutionResult.rows[0],
            },
        });
        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "START_INCIDENT_WORK",
            entityType: "INCIDENT",
            entityId: incidentId,
            newData: {
                status: "WORKING",
            },
            ipAddress: req.ip,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Start incident work error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to start incident work",
        });
    } finally {
        client.release();
    }
};
export const completeIncident = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const client = await pool.connect();

    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const incidentId = Number(req.params.id);

        if (!Number.isInteger(incidentId) || incidentId <= 0) {
            res.status(400).json({
                success: false,
                message: "Invalid incident ID",
            });
            return;
        }

        const {
            workPerformed,
            resolutionDetails,
            remarks,
        } = req.body;

        if (!workPerformed || !String(workPerformed).trim()) {
            res.status(400).json({
                success: false,
                message: "workPerformed is required",
            });
            return;
        }

        if (!resolutionDetails || !String(resolutionDetails).trim()) {
            res.status(400).json({
                success: false,
                message: "resolutionDetails is required",
            });
            return;
        }

        await client.query("BEGIN");

        /*
         * Lock the incident while completing the work.
         */
        const incidentResult = await client.query(
            `
            SELECT
                id,
                incident_no,
                reported_by,
                assigned_to,
                status
            FROM incidents
            WHERE id = $1
            FOR UPDATE
            `,
            [incidentId]
        );

        if (incidentResult.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(404).json({
                success: false,
                message: "Incident not found",
            });
            return;
        }

        const incident = incidentResult.rows[0];

        /*
         * Only the currently assigned user can complete the work.
         */
        if (
            Number(incident.assigned_to) !==
            Number(req.user.userId)
        ) {
            await client.query("ROLLBACK");

            res.status(403).json({
                success: false,
                message:
                    "Only the assigned user can mark this incident as done",
            });
            return;
        }

        /*
         * Incident must currently be WORKING.
         */
        if (incident.status !== "WORKING") {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    `Incident cannot be completed while status is ${incident.status}`,
            });
            return;
        }

        /*
         * Find the active resolution cycle.
         */
        const cycleResult = await client.query(
            `
            SELECT
                id,
                cycle_number
            FROM incident_resolution_cycles
            WHERE incident_id = $1
              AND done_at IS NULL
            ORDER BY cycle_number DESC
            LIMIT 1
            FOR UPDATE
            `,
            [incidentId]
        );

        if (cycleResult.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message: "No active resolution cycle found",
            });
            return;
        }

        const cycle = cycleResult.rows[0];

        /*
         * Complete the resolution cycle.
         */
        const updatedCycleResult = await client.query(
            `
            UPDATE incident_resolution_cycles
            SET
                done_at = NOW(),
                work_performed = $1,
                resolution_details = $2,
                resolved_by = $3
            WHERE id = $4
            RETURNING *
            `,
            [
                String(workPerformed).trim(),
                String(resolutionDetails).trim(),
                req.user.userId,
                cycle.id,
            ]
        );

        /*
         * First record DONE_FROM_MY_SIDE in history.
         */
        await client.query(
            `
            INSERT INTO incident_status_history (
                incident_id,
                old_status,
                new_status,
                changed_by,
                remarks
            )
            VALUES ($1, 'WORKING', 'DONE_FROM_MY_SIDE', $2, $3)
            `,
            [
                incidentId,
                req.user.userId,
                remarks
                    ? String(remarks).trim()
                    : "Work completed from my side",
            ]
        );

        /*
         * Move incident to REVIEW.
         *
         * The reporter now needs to review the solution.
         */
        const updatedIncidentResult = await client.query(
            `
            UPDATE incidents
            SET
                status = 'REVIEW',
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [incidentId]
        );

        /*
         * Record REVIEW status history.
         */
        await client.query(
            `
            INSERT INTO incident_status_history (
                incident_id,
                old_status,
                new_status,
                changed_by,
                remarks
            )
            VALUES ($1, 'DONE_FROM_MY_SIDE', 'REVIEW', $2, $3)
            `,
            [
                incidentId,
                req.user.userId,
                "Resolution submitted for review",
            ]
        );

        /*
         * Record detailed update.
         */
        await client.query(
            `
            INSERT INTO incident_updates (
                incident_id,
                user_id,
                update_text
            )
            VALUES ($1, $2, $3)
            `,
            [
                incidentId,
                req.user.userId,
                `Work performed: ${String(workPerformed).trim()}\nResolution: ${String(resolutionDetails).trim()}${remarks ? `\nRemarks: ${String(remarks).trim()}` : ""}`,
            ]
        );

        await client.query("COMMIT");
        await createNotification({
            userId: Number(incident.reported_by),
            incidentId: Number(incident.id),
            title: "Incident Ready for Review",
            message: `Incident ${incident.incident_no} has been completed and is ready for your review.`,
            notificationType: "INCIDENT_READY_FOR_REVIEW",
        });

        res.status(200).json({
            success: true,
            message:
                "Incident marked as done and sent for review",
            data: {
                incident: updatedIncidentResult.rows[0],
                resolutionCycle: updatedCycleResult.rows[0],
            },
        });
        await createAuditLog({
            userId: req.user?.userId ?? null,
            action: "COMPLETE_INCIDENT",
            entityType: "INCIDENT",
            entityId: incidentId,
            newData: {
                status: "REVIEW",
                workPerformed,
                resolutionDetails,
            },
            ipAddress: req.ip,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Complete incident error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to complete incident",
        });
    } finally {
        client.release();
    }
};
export const reviewIncident = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const client = await pool.connect();

    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const incidentId = Number(req.params.id);

        if (!Number.isInteger(incidentId) || incidentId <= 0) {
            res.status(400).json({
                success: false,
                message: "Invalid incident ID",
            });
            return;
        }

        const { reviewResult, remarks } = req.body;

        if (!reviewResult) {
            res.status(400).json({
                success: false,
                message: "reviewResult is required",
            });
            return;
        }

        const normalizedResult = String(reviewResult).toUpperCase();

        if (!["APPROVED", "REOPENED"].includes(normalizedResult)) {
            res.status(400).json({
                success: false,
                message:
                    "reviewResult must be APPROVED or REOPENED",
            });
            return;
        }

        await client.query("BEGIN");

        /*
         * Lock the incident while reviewing.
         */
        const incidentResult = await client.query(
            `
            SELECT
                id,
                incident_no,
                reported_by,
                assigned_to,
                status
            FROM incidents
            WHERE id = $1
            FOR UPDATE
            `,
            [incidentId]
        );

        if (incidentResult.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(404).json({
                success: false,
                message: "Incident not found",
            });
            return;
        }

        const incident = incidentResult.rows[0];

        /*
         * Only the original reporter can review.
         */
        if (
            Number(incident.reported_by) !==
            Number(req.user.userId)
        ) {
            await client.query("ROLLBACK");

            res.status(403).json({
                success: false,
                message:
                    "Only the incident reporter can review the resolution",
            });
            return;
        }

        /*
         * Incident must be waiting for review.
         */
        if (incident.status !== "REVIEW") {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    `Incident cannot be reviewed while status is ${incident.status}`,
            });
            return;
        }

        /*
         * Get the most recent completed resolution cycle.
         */
        const cycleResult = await client.query(
            `
            SELECT
                id,
                cycle_number
            FROM incident_resolution_cycles
            WHERE incident_id = $1
              AND done_at IS NOT NULL
            ORDER BY cycle_number DESC
            LIMIT 1
            FOR UPDATE
            `,
            [incidentId]
        );

        if (cycleResult.rowCount === 0) {
            await client.query("ROLLBACK");

            res.status(400).json({
                success: false,
                message:
                    "No completed resolution cycle found",
            });
            return;
        }

        const cycle = cycleResult.rows[0];

        /*
         * Save review.
         */
        const reviewResultData = await client.query(
            `
            INSERT INTO incident_reviews (
                incident_id,
                resolution_cycle_id,
                reviewed_by,
                review_result,
                remarks
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                incidentId,
                cycle.id,
                req.user.userId,
                normalizedResult,
                remarks
                    ? String(remarks).trim()
                    : null,
            ]
        );

        if (normalizedResult === "APPROVED") {
            /*
             * APPROVED:
             * REVIEW → FINISHED
             */
            await client.query(
                `
                UPDATE incidents
                SET
                    status = 'FINISHED',
                    closed_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                `,
                [incidentId]
            );

            await client.query(
                `
                INSERT INTO incident_status_history (
                    incident_id,
                    old_status,
                    new_status,
                    changed_by,
                    remarks
                )
                VALUES ($1, 'REVIEW', 'FINISHED', $2, $3)
                `,
                [
                    incidentId,
                    req.user.userId,
                    remarks
                        ? String(remarks).trim()
                        : "Resolution approved and incident finished",
                ]
            );

            await client.query(
                `
                INSERT INTO incident_updates (
                    incident_id,
                    user_id,
                    update_text
                )
                VALUES ($1, $2, $3)
                `,
                [
                    incidentId,
                    req.user.userId,
                    `Resolution approved. ${remarks ? String(remarks).trim() : "Incident finished successfully."}`,
                ]
            );
        } else {
            /*
             * REOPENED:
             * REVIEW → REOPENED
             */
            await client.query(
                `
                UPDATE incidents
                SET
                    status = 'REOPENED',
                    assigned_to = NULL,
                    assignment_deadline_at = NOW() +
                        CASE priority
                            WHEN 'CRITICAL' THEN INTERVAL '5 minutes'
                            WHEN 'HIGH' THEN INTERVAL '10 minutes'
                            WHEN 'MEDIUM' THEN INTERVAL '15 minutes'
                            WHEN 'LOW' THEN INTERVAL '30 minutes'
                            ELSE INTERVAL '15 minutes'
                        END,
                    auto_assigned_at = NULL,
                    closed_at = NULL,
                    updated_at = NOW()
                WHERE id = $1
                `,
                [incidentId]
            );

            await client.query(
                `
                INSERT INTO incident_status_history (
                    incident_id,
                    old_status,
                    new_status,
                    changed_by,
                    remarks
                )
                VALUES ($1, 'REVIEW', 'REOPENED', $2, $3)
                `,
                [
                    incidentId,
                    req.user.userId,
                    remarks
                        ? String(remarks).trim()
                        : "Resolution rejected; incident reopened",
                ]
            );

            await client.query(
                `
                INSERT INTO incident_updates (
                    incident_id,
                    user_id,
                    update_text
                )
                VALUES ($1, $2, $3)
                `,
                [
                    incidentId,
                    req.user.userId,
                    `Resolution reopened. ${remarks ? String(remarks).trim() : "Additional work is required."}`,
                ]
            );
        }

        /*
         * Get final incident.
         */
        const updatedIncidentResult = await client.query(
            `
            SELECT *
            FROM incidents
            WHERE id = $1
            `,
            [incidentId]
        );

        await client.query("COMMIT");

        res.status(200).json({
            success: true,
            message:
                normalizedResult === "APPROVED"
                    ? "Incident approved and finished"
                    : "Incident reopened successfully",
            data: {
                incident: updatedIncidentResult.rows[0],
                review: reviewResultData.rows[0],
            },
        });
        if (reviewResult === "APPROVED") {
            await createNotification({
                userId: Number(incident.assigned_to),
                incidentId: Number(incident.id),
                title: "Incident Resolved",
                message: `Incident ${incident.incident_no} has been approved and marked as finished.`,
                notificationType: "INCIDENT_RESOLVED",
            });
        }

        if (reviewResult === "REOPENED") {
            await createNotification({
                userId: Number(incident.assigned_to),
                incidentId: Number(incident.id),
                title: "Incident Reopened",
                message: `Incident ${incident.incident_no} has been reopened for further work.`,
                notificationType: "INCIDENT_REOPENED",
            });
        }
        await createAuditLog({
            userId: req.user?.userId ?? null,
            action:
                reviewResult === "APPROVED"
                    ? "APPROVE_INCIDENT"
                    : "REOPEN_INCIDENT",
            entityType: "INCIDENT",
            entityId: incidentId,
            newData: {
                reviewResult,
                remarks,
            },
            ipAddress: req.ip,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Review incident error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to review incident",
        });
    } finally {
        client.release();
    }
};
export const getIncidentById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const incidentId = Number(req.params.id);

        if (!Number.isInteger(incidentId) || incidentId <= 0) {
            res.status(400).json({
                message: "Invalid incident ID",
            });
            return;
        }

        const user = req.user;

        if (!user) {
            res.status(401).json({
                message: "Unauthorized",
            });
            return;
        }

        // ---------------------------------------------------------
        // 1. Get incident
        // ---------------------------------------------------------
        const incidentResult = await query(
            `
            SELECT
                i.id,
                i.incident_no,
                i.site_id,
                i.from_site_id,
                i.to_site_id,
                s.site_code,
                s.site_name,


                i.from_department_id,
                fd.department_code AS from_department_code,
                fd.department_name AS from_department_name,

                i.from_sub_department_id,
                fsd.sub_department_code AS from_sub_department_code,
                fsd.sub_department_name AS from_sub_department_name,

                i.reported_by,
                reporter.user_id AS reporter_user_id,
                reporter.full_name AS reporter_name,
                reporter.designation AS reporter_designation,

                i.to_department_id,
                td.department_code AS to_department_code,
                td.department_name AS to_department_name,

                i.to_sub_department_id,
                tsd.sub_department_code AS to_sub_department_code,
                tsd.sub_department_name AS to_sub_department_name,

                i.assigned_to,
                assignee.user_id AS assigned_user_id,
                assignee.full_name AS assigned_user_name,
                assignee.designation AS assigned_user_designation,

                i.subject,
                i.description,
                i.priority,
                i.status,
                i.created_at,
                i.updated_at,
                i.closed_at

            FROM incidents i

            INNER JOIN sites s
                ON s.id = i.site_id

            INNER JOIN departments fd
                ON fd.id = i.from_department_id

            LEFT JOIN sub_departments fsd
                ON fsd.id = i.from_sub_department_id

            INNER JOIN users reporter
                ON reporter.id = i.reported_by

            INNER JOIN departments td
                ON td.id = i.to_department_id

            LEFT JOIN sub_departments tsd
                ON tsd.id = i.to_sub_department_id

            LEFT JOIN users assignee
                ON assignee.id = i.assigned_to

            WHERE i.id = $1
            `,
            [incidentId]
        );

        if (incidentResult.rows.length === 0) {
            res.status(404).json({
                message: "Incident not found",
            });
            return;
        }

        const incident = incidentResult.rows[0];

        // ---------------------------------------------------------
        // 2. Permission check
        // ---------------------------------------------------------

        const canView =
            user.role === "SUPER_ADMIN" ||
            (
                user.role === "DEPARTMENT_ADMIN" &&
                (
                    (
                        user.siteId === incident.from_site_id &&
                        user.departmentId === incident.from_department_id
                    ) ||
                    (
                        user.siteId === incident.to_site_id &&
                        user.departmentId === incident.to_department_id
                    )
                )
            ) ||
            (
                user.role === "USER" &&
                (
                    user.userId === incident.reported_by ||
                    user.userId === incident.assigned_to
                )
            );
            if (!canView) {
                res.status(403).json({
                    message: "You do not have permission to view this incident",
                });
                return;
            }

        // ---------------------------------------------------------
        // 3. Get attachments
        // ---------------------------------------------------------
        const attachmentsResult = await query(
            `
            SELECT
                ia.id,
                ia.file_name,
                ia.stored_file_name,
                ia.file_path,
                ia.mime_type,
                ia.file_size,
                ia.uploaded_by,
                u.user_id AS uploaded_by_user_id,
                u.full_name AS uploaded_by_name,
                ia.created_at
            FROM incident_attachments ia
            LEFT JOIN users u
                ON u.id = ia.uploaded_by
            WHERE ia.incident_id = $1
            ORDER BY ia.created_at ASC
            `,
            [incidentId]
        );

        // ---------------------------------------------------------
        // 4. Get incident updates
        // ---------------------------------------------------------
        const updatesResult = await query(
            `
            SELECT
                iu.id,
                iu.update_text,
                iu.user_id,
                u.user_id AS update_by_user_id,
                u.full_name AS update_by_name,
                u.designation AS update_by_designation,
                iu.created_at
            FROM incident_updates iu
            LEFT JOIN users u
                ON u.id = iu.user_id
            WHERE iu.incident_id = $1
            ORDER BY iu.created_at ASC
            `,
            [incidentId]
        );

        // ---------------------------------------------------------
        // 5. Get resolution cycles
        // ---------------------------------------------------------
        const cyclesResult = await query(
            `
            SELECT
                irc.id,
                irc.cycle_number,
                irc.started_at,
                irc.done_at,
                irc.work_performed,
                irc.resolution_details,
                irc.resolved_by,
                u.user_id AS resolved_by_user_id,
                u.full_name AS resolved_by_name,
                u.designation AS resolved_by_designation,
                irc.created_at
            FROM incident_resolution_cycles irc
            LEFT JOIN users u
                ON u.id = irc.resolved_by
            WHERE irc.incident_id = $1
            ORDER BY irc.cycle_number ASC
            `,
            [incidentId]
        );

        // ---------------------------------------------------------
        // 6. Get status history
        // ---------------------------------------------------------
        const historyResult = await query(
            `
            SELECT
                ish.id,
                ish.old_status,
                ish.new_status,
                ish.changed_by,
                u.user_id AS changed_by_user_id,
                u.full_name AS changed_by_name,
                u.designation AS changed_by_designation,
                ish.remarks,
                ish.created_at
            FROM incident_status_history ish
            LEFT JOIN users u
                ON u.id = ish.changed_by
            WHERE ish.incident_id = $1
            ORDER BY ish.created_at ASC
            `,
            [incidentId]
        );

        // ---------------------------------------------------------
        // 7. Get reviews
        // ---------------------------------------------------------
        const reviewsResult = await query(
            `
            SELECT
                ir.id,
                ir.resolution_cycle_id,
                ir.reviewed_by,
                u.user_id AS reviewed_by_user_id,
                u.full_name AS reviewed_by_name,
                u.designation AS reviewed_by_designation,
                ir.review_result,
                ir.remarks,
                ir.reviewed_at
            FROM incident_reviews ir
            LEFT JOIN users u
                ON u.id = ir.reviewed_by
            WHERE ir.incident_id = $1
            ORDER BY ir.reviewed_at ASC
            `,
            [incidentId]
        );

        // ---------------------------------------------------------
        // 8. Get assignment history
        // ---------------------------------------------------------
        const assignmentsResult = await query(
            `
            SELECT
                ia.id,
                ia.assigned_to,
                au.user_id AS assigned_user_id,
                au.full_name AS assigned_user_name,

                ia.assigned_department_id,
                ad.department_code AS assigned_department_code,
                ad.department_name AS assigned_department_name,

                ia.assigned_sub_department_id,
                asd.sub_department_code AS assigned_sub_department_code,
                asd.sub_department_name AS assigned_sub_department_name,

                ia.assigned_by,
                ab.user_id AS assigned_by_user_id,
                ab.full_name AS assigned_by_name,

                ia.remarks,
                ia.assigned_at,
                ia.unassigned_at
            FROM incident_assignments ia

            LEFT JOIN users au
                ON au.id = ia.assigned_to

            LEFT JOIN departments ad
                ON ad.id = ia.assigned_department_id

            LEFT JOIN sub_departments asd
                ON asd.id = ia.assigned_sub_department_id

            LEFT JOIN users ab
                ON ab.id = ia.assigned_by

            WHERE ia.incident_id = $1
            ORDER BY ia.assigned_at ASC
            `,
            [incidentId]
        );

        // ---------------------------------------------------------
        // 9. Return complete incident details
        // ---------------------------------------------------------
        res.status(200).json({
            incident,
            attachments: attachmentsResult.rows,
            updates: updatesResult.rows,
            resolutionCycles: cyclesResult.rows,
            statusHistory: historyResult.rows,
            reviews: reviewsResult.rows,
            assignments: assignmentsResult.rows,
        });

    } catch (error) {
        console.error("Get incident by ID error:", error);

        res.status(500).json({
            message: "Failed to fetch incident details",
        });
    }
};
export const getDashboardStats = async (
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
            dateFilter = "TODAY",
            fromDate,
            toDate,
        } = req.query;

        const selectedDateFilter = String(dateFilter);

        const allowedFilters = [
            "TODAY",
            "THIS_WEEK",
            "THIS_MONTH",
            "CUSTOM",
        ];

        if (!allowedFilters.includes(selectedDateFilter)) {
            res.status(400).json({
                success: false,
                message: "Invalid date filter",
            });
            return;
        }

        /*
         * =========================================================
         * QUERY CONDITIONS
         * =========================================================
         */

        const conditions: string[] = [];
        const params: unknown[] = [];

        /*
         * =========================================================
         * ROLE-BASED VISIBILITY
         * =========================================================
         */

        if (req.user.role === "SUPER_ADMIN") {
            // Super Admin can see all incidents.
        }

        else if (req.user.role === "DEPARTMENT_ADMIN") {
            if (
                req.user.siteId === null ||
                req.user.siteId === undefined ||
                req.user.departmentId === null ||
                req.user.departmentId === undefined
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Department Admin is not assigned to a site and department",
                });
                return;
            }

            params.push(req.user.siteId);
            const departmentSiteParam = params.length;

            params.push(req.user.departmentId);
            const departmentParam = params.length;

            conditions.push(`
                (
                    (
                        i.from_site_id = $${departmentSiteParam}
                        AND i.from_department_id = $${departmentParam}
                    )
                    OR
                    (
                        i.to_site_id = $${departmentSiteParam}
                        AND i.to_department_id = $${departmentParam}
                    )
                )
            `);
        }

        else if (req.user.role === "USER") {
            /*
            * Normal USER can see only incidents
            * assigned directly to that user.
            */
            if (
                req.user.siteId === null ||
                req.user.siteId === undefined ||
                req.user.departmentId === null ||
                req.user.departmentId === undefined
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "User is not assigned to a site and department",
                });
                return;
            }

            params.push(req.user.userId);
            const userParam = params.length;

            conditions.push(`
                i.reported_by = $${userParam}
                or
                i.assigned_to = $${userParam}
            `);
        }

        /*
         * =========================================================
         * DATE FILTER
         * =========================================================
         */

        if (selectedDateFilter === "TODAY") {
            conditions.push(`
                i.created_at >= CURRENT_DATE
                AND i.created_at < CURRENT_DATE + INTERVAL '1 day'
            `);
        }

        else if (selectedDateFilter === "THIS_WEEK") {
            conditions.push(`
                i.created_at >= date_trunc('week', CURRENT_DATE)
                AND i.created_at <
                    date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
            `);
        }

        else if (selectedDateFilter === "THIS_MONTH") {
            conditions.push(`
                i.created_at >= date_trunc('month', CURRENT_DATE)
                AND i.created_at <
                    date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
            `);
        }

        else if (selectedDateFilter === "CUSTOM") {
            if (!fromDate || !toDate) {
                res.status(400).json({
                    success: false,
                    message:
                        "fromDate and toDate are required for Custom filter",
                });
                return;
            }

            const from = String(fromDate);
            const to = String(toDate);

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
                !/^\d{4}-\d{2}-\d{2}$/.test(to)
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Custom dates must be in YYYY-MM-DD format",
                });
                return;
            }

            if (from > to) {
                res.status(400).json({
                    success: false,
                    message:
                        "fromDate cannot be greater than toDate",
                });
                return;
            }

            params.push(from);
            const fromParam = params.length;

            params.push(to);
            const toParam = params.length;

            conditions.push(`
                i.created_at >= $${fromParam}::date
                AND i.created_at <
                    ($${toParam}::date + INTERVAL '1 day')
            `);
        }

        /*
         * =========================================================
         * WHERE CLAUSE
         * =========================================================
         */

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        /*
         * =========================================================
         * KPI / STATISTICS
         * =========================================================
         */

        const statsResult = await query(
            `
            SELECT
                COUNT(*)::int AS total,

                COUNT(*) FILTER (
                    WHERE i.status = 'REPORTED'
                )::int AS reported,

                COUNT(*) FILTER (
                    WHERE i.status = 'ASSIGNED'
                )::int AS assigned,

                COUNT(*) FILTER (
                    WHERE i.status = 'WORKING'
                )::int AS working,

                COUNT(*) FILTER (
                    WHERE i.status = 'DONE_FROM_MY_SIDE'
                )::int AS done_from_my_side,

                COUNT(*) FILTER (
                    WHERE i.status = 'REVIEW'
                )::int AS review,

                COUNT(*) FILTER (
                    WHERE i.status = 'REOPENED'
                )::int AS reopened,

                COUNT(*) FILTER (
                    WHERE i.status = 'FINISHED'
                )::int AS finished,

                COUNT(*) FILTER (
                    WHERE i.status = 'CANCELLED'
                )::int AS cancelled,

                COUNT(*) FILTER (
                    WHERE i.priority = 'CRITICAL'
                )::int AS critical,

                COUNT(*) FILTER (
                    WHERE i.priority = 'HIGH'
                )::int AS high,

                COUNT(*) FILTER (
                    WHERE i.priority = 'MEDIUM'
                )::int AS medium,

                COUNT(*) FILTER (
                    WHERE i.priority = 'LOW'
                )::int AS low

            FROM incidents i
            ${whereClause}
            `,
            params
        );

        /*
         * =========================================================
         * KANBAN BOARD
         * =========================================================
         */

        const boardResult = await query(
            `
            SELECT
                i.id,
                i.incident_no,
                i.subject,
                i.priority,
                i.status,

                i.from_site_id,
                i.to_site_id,

                i.from_department_id,
                i.to_department_id,

                fs.site_name AS from_site_name,
                ts.site_name AS to_site_name,

                fd.department_name AS from_department_name,
                td.department_name AS to_department_name,

                i.reported_by,
                reporter.full_name AS reported_by_name,

                i.assigned_to,
                assignee.full_name AS assigned_to_name,

                i.created_at,
                i.updated_at

            FROM incidents i

            LEFT JOIN sites fs
                ON fs.id = i.from_site_id

            LEFT JOIN sites ts
                ON ts.id = i.to_site_id

            LEFT JOIN departments fd
                ON fd.id = i.from_department_id

            LEFT JOIN departments td
                ON td.id = i.to_department_id

            LEFT JOIN users reporter
                ON reporter.id = i.reported_by

            LEFT JOIN users assignee
                ON assignee.id = i.assigned_to

            ${whereClause}

            ORDER BY i.created_at DESC
            `,
            params
        );

        /*
         * =========================================================
         * KANBAN COLUMNS
         * =========================================================
         */

        const board = {
            report: boardResult.rows.filter(
                (incident) =>
                    incident.status === "REPORTED"
            ),

            assigned: boardResult.rows.filter(
                (incident) =>
                    incident.status === "ASSIGNED"
            ),

            working: boardResult.rows.filter(
                (incident) =>
                    incident.status === "WORKING" ||
                    incident.status === "REOPENED"
            ),

            review: boardResult.rows.filter(
                (incident) =>
                    incident.status === "DONE_FROM_MY_SIDE" ||
                    incident.status === "REVIEW"
            ),

            finished: boardResult.rows.filter(
                (incident) =>
                    incident.status === "FINISHED"
            ),
        };

        /*
         * =========================================================
         * RESPONSE
         * =========================================================
         */

        const stats = statsResult.rows[0];

        res.json({
            success: true,
            data: {
                total: Number(stats.total),
                reported: Number(stats.reported),
                assigned: Number(stats.assigned),
                working: Number(stats.working),
                done_from_my_side: Number(
                    stats.done_from_my_side
                ),
                review: Number(stats.review),
                reopened: Number(stats.reopened),
                finished: Number(stats.finished),
                cancelled: Number(stats.cancelled),

                critical: Number(stats.critical),
                high: Number(stats.high),
                medium: Number(stats.medium),
                low: Number(stats.low),

                board,
            },
        });
    } catch (error) {
        console.error(
            "Get dashboard stats error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch dashboard statistics",
        });
    }
};