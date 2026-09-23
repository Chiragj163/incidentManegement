import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { query } from "../config/database";

export const getIncidentReport = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const {
            siteId,
            departmentId,
            status,
            priority,
            fromDate,
            toDate,
        } = req.query;

        const conditions: string[] = [];
        const params: any[] = [];

        const addParam = (value: any) => {
            params.push(value);
            return `$${params.length}`;
        };

        /*
         * Role-based visibility
         */
        if (req.user?.role === "SUPER_ADMIN") {
            // Super Admin can see everything.
        } else if (req.user?.role === "DEPARTMENT_ADMIN") {
            if (!req.user.siteId || !req.user.departmentId) {
                res.status(403).json({
                    success: false,
                    message: "Department Admin is not properly configured",
                });
                return;
            }

            const siteParam = addParam(req.user.siteId);
            const deptParam = addParam(req.user.departmentId);

            conditions.push(`
                i.site_id = ${siteParam}
                AND (
                    i.from_department_id = ${deptParam}
                    OR i.to_department_id = ${deptParam}
                )
            `);
        } else {
            /*
             * Normal users see incidents relevant to them.
             */
            const userParam = addParam(req.user?.userId);

            conditions.push(`
                (
                    i.reported_by = ${userParam}
                    OR i.assigned_to = ${userParam}
                )
            `);
        }

        if (siteId) {
            conditions.push(`i.site_id = ${addParam(Number(siteId))}`);
        }

        if (departmentId) {
            const deptParam = addParam(Number(departmentId));

            conditions.push(`
                (
                    i.from_department_id = ${deptParam}
                    OR i.to_department_id = ${deptParam}
                )
            `);
        }

        if (status) {
            conditions.push(`i.status = ${addParam(String(status))}`);
        }

        if (priority) {
            conditions.push(`i.priority = ${addParam(String(priority))}`);
        }

        if (fromDate) {
            conditions.push(
                `i.created_at >= ${addParam(String(fromDate))}::date`
            );
        }

        if (toDate) {
            conditions.push(
                `i.created_at < (${addParam(String(toDate))}::date + INTERVAL '1 day')`
            );
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
                i.subject,
                i.priority,
                i.status,
                i.created_at,
                i.closed_at,

                s.site_name,

                fd.department_name AS from_department_name,
                fsd.sub_department_name AS from_sub_department_name,

                td.department_name AS to_department_name,
                tsd.sub_department_name AS to_sub_department_name,

                reporter.full_name AS reported_by_name,
                assignee.full_name AS assigned_to_name

            FROM incidents i

            LEFT JOIN sites s
                ON s.id = i.site_id

            LEFT JOIN departments fd
                ON fd.id = i.from_department_id

            LEFT JOIN sub_departments fsd
                ON fsd.id = i.from_sub_department_id

            LEFT JOIN departments td
                ON td.id = i.to_department_id

            LEFT JOIN sub_departments tsd
                ON tsd.id = i.to_sub_department_id

            LEFT JOIN users reporter
                ON reporter.id = i.reported_by

            LEFT JOIN users assignee
                ON assignee.id = i.assigned_to

            ${whereClause}

            ORDER BY i.created_at DESC
            `,
            params
        );

        const incidents = result.rows;

        /*
         * Summary
         */
        const total = incidents.length;

        const statusCounts: Record<string, number> = {};
        const priorityCounts: Record<string, number> = {};
        const departmentCounts: Record<string, number> = {};
        const siteCounts: Record<string, number> = {};

        for (const incident of incidents) {
            statusCounts[incident.status] =
                (statusCounts[incident.status] || 0) + 1;

            priorityCounts[incident.priority] =
                (priorityCounts[incident.priority] || 0) + 1;

            const department =
                incident.to_department_name || "Unknown";

            departmentCounts[department] =
                (departmentCounts[department] || 0) + 1;

            const site = incident.site_name || "Unknown";

            siteCounts[site] =
                (siteCounts[site] || 0) + 1;
        }

        res.json({
            success: true,
            data: {
                summary: {
                    total,
                    reported: statusCounts.REPORTED || 0,
                    assigned: statusCounts.ASSIGNED || 0,
                    working: statusCounts.WORKING || 0,
                    doneFromMySide:
                        statusCounts.DONE_FROM_MY_SIDE || 0,
                    review: statusCounts.REVIEW || 0,
                    reopened: statusCounts.REOPENED || 0,
                    finished: statusCounts.FINISHED || 0,
                    cancelled: statusCounts.CANCELLED || 0,
                },

                statusCounts,
                priorityCounts,
                departmentCounts,
                siteCounts,

                incidents,
            },
        });
    } catch (error) {
        console.error("Get incident report error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to generate incident report",
        });
    }
};
