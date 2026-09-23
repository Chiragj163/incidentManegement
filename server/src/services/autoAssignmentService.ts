import  pool from "../config/database";
import { createNotification } from "./notificationService";

const getPriorityMinutes = (
    priority: string
): number => {
    switch (priority) {
        case "LOW":
            return 30;

        case "MEDIUM":
            return 15;

        case "HIGH":
            return 10;

        case "CRITICAL":
            return 5;

        default:
            return 30;
    }
};

export const setIncidentAssignmentDeadline = async (
    client: any,
    incidentId: number,
    priority: string
): Promise<void> => {
    const minutes = getPriorityMinutes(priority);

    await client.query(
        `
        UPDATE incidents
        SET assignment_deadline_at =
            created_at + ($2 * INTERVAL '1 minute'),
            updated_at = NOW()
        WHERE id = $1
        `,
        [
            incidentId,
            minutes,
        ]
    );
};

const findEmployeeForAutomaticAssignment = async (
    client: any,
    siteId: number,
    departmentId: number,
    subDepartmentId: number
) => {
    const result = await client.query(
        `
        SELECT
            u.id,
            u.user_id,
            u.full_name,

            COUNT(
                CASE
                    WHEN i.status IN (
                        'ASSIGNED',
                        'WORKING',
                        'REOPENED'
                    )
                    THEN i.id
                END
            ) AS open_incidents

        FROM users u

        INNER JOIN roles r
            ON r.id = u.role_id

        LEFT JOIN incidents i
            ON i.assigned_to = u.id

        WHERE u.site_id = $1
          AND u.department_id = $2
          AND u.sub_department_id = $3
          AND u.status = 'ACTIVE'
          AND r.role_code = 'USER'

        GROUP BY
            u.id,
            u.user_id,
            u.full_name

        ORDER BY
            open_incidents ASC,
            u.id ASC

        LIMIT 1
        `,
        [
            siteId,
            departmentId,
            subDepartmentId,
        ]
    );

    if (result.rowCount === 0) {
        return null;
    }

    return result.rows[0];
};

const assignAutomatically = async (
    client: any,
    incident: any,
    employee: any
): Promise<void> => {

    /*
     * Update incident.
     */
    await client.query(
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
     * Assignment history.
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
            incident.to_department_id,
            incident.to_sub_department_id,
            "Automatically assigned after assignment timeout",
        ]
    );

    /*
     * Status history.
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
        VALUES (
            $1,
            $2,
            'ASSIGNED',
            1,
            $3
        )
        `,
        [
            incident.id,
            incident.status,
            `Automatically assigned to ${employee.full_name} after ${incident.priority} priority timeout`,
        ]
    );
};

export const processAutomaticAssignments =
    async (): Promise<void> => {

    const client = await pool.connect();

    try {

        /*
         * Find incidents whose assignment deadline
         * has expired and are still waiting for assignment.
         */
        const incidentsResult = await client.query(
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
                i.subject,
                i.priority,
                i.status,
                i.assignment_deadline_at

            FROM incidents i

            WHERE i.assigned_to IS NULL

              AND i.status IN (
                  'REPORTED',
                  'REOPENED'
              )

              AND i.assignment_deadline_at IS NOT NULL

              AND i.assignment_deadline_at <= NOW()

            ORDER BY
                i.assignment_deadline_at ASC

            LIMIT 50
            `
        );

        console.log(
            `Automatic assignment: found ${incidentsResult.rowCount} overdue incident(s)`
        );

        for (const incident of incidentsResult.rows) {

            console.log(
                `Processing incident ${incident.incident_no} ` +
                `(ID: ${incident.id}, priority: ${incident.priority})`
            );

            /*
             * Automatic assignment requires
             * a destination sub-department.
             */
            if (incident.to_sub_department_id === null) {

                console.warn(
                    `Skipping ${incident.incident_no}: ` +
                    `no destination sub-department`
                );

                continue;
            }

            /*
             * Find the employee with the lowest
             * number of open incidents.
             */
            const employee =
                await findEmployeeForAutomaticAssignment(
                    client,
                    Number(incident.to_site_id),
                    Number(incident.to_department_id),
                    Number(incident.to_sub_department_id)
                );

            /*
             * No active employee available.
             */
            if (!employee) {

                console.warn(
                    `No active employee available for automatic assignment: ` +
                    `${incident.incident_no}`
                );

                continue;
            }

            console.log(
                `Selected employee: ${employee.full_name} ` +
                `(ID: ${employee.id}, User ID: ${employee.user_id}, ` +
                `Open incidents: ${employee.open_incidents})`
            );

            /*
             * Start transaction for the assignment itself.
             */
            await client.query("BEGIN");

            try {

                /*
                 * Lock the incident again so that
                 * another process cannot assign it
                 * simultaneously.
                 */
                const lockedIncidentResult =
                    await client.query(
                        `
                        SELECT
                            id,
                            incident_no,
                            status,
                            assigned_to,
                            to_department_id,
                            to_sub_department_id,
                            priority,
                            subject
                        FROM incidents
                        WHERE id = $1
                        FOR UPDATE
                        `,
                        [incident.id]
                    );

                if (lockedIncidentResult.rowCount === 0) {

                    await client.query("ROLLBACK");

                    console.warn(
                        `Incident ${incident.incident_no} no longer exists`
                    );

                    continue;
                }

                const lockedIncident =
                    lockedIncidentResult.rows[0];

                /*
                 * Check again after locking.
                 */
                if (
                    lockedIncident.assigned_to !== null ||
                    ![
                        "REPORTED",
                        "REOPENED"
                    ].includes(lockedIncident.status)
                ) {

                    await client.query("ROLLBACK");

                    console.log(
                        `Skipping ${incident.incident_no}: ` +
                        `already assigned or status changed`
                    );

                    continue;
                }

                /*
                 * Perform automatic assignment.
                 */
                await assignAutomatically(
                    client,
                    lockedIncident,
                    employee
                );

                /*
                 * Commit assignment BEFORE notification.
                 */
                await client.query("COMMIT");

                console.log(
                    `SUCCESS: ${incident.incident_no} automatically ` +
                    `assigned to ${employee.full_name} ` +
                    `(User ID: ${employee.user_id})`
                );

            } catch (assignmentError) {

                await client.query("ROLLBACK");

                console.error(
                    `Failed automatic assignment for ${incident.incident_no}:`,
                    assignmentError
                );

                continue;
            }

            /*
             * Send notification only AFTER successful COMMIT.
             */
            try {

                await createNotification({
                    userId: Number(employee.id),
                    incidentId: Number(incident.id),
                    title: "Incident Assigned",
                    message:
                        `Incident ${incident.incident_no} has been automatically assigned to you: ${incident.subject}`,
                    notificationType:
                        "INCIDENT_ASSIGNED",
                });

                console.log(
                    `Assignment notification sent to ${employee.full_name}`
                );

            } catch (notificationError) {

                console.error(
                    `Assignment succeeded but notification failed for ${incident.incident_no}:`,
                    notificationError
                );
            }
        }

    } catch (error) {

        console.error(
            "Automatic assignment worker error:",
            error
        );

    } finally {

        client.release();
    }
};