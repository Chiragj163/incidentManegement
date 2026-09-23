import { query } from "../config/database";

interface AuditLogParams {
    userId?: number | null;
    action: string;
    entityType?: string | null;
    entityId?: number | null;
    oldData?: unknown;
    newData?: unknown;
    ipAddress?: string | null;
}

export const createAuditLog = async ({
    userId = null,
    action,
    entityType = null,
    entityId = null,
    oldData = null,
    newData = null,
    ipAddress = null,
}: AuditLogParams): Promise<void> => {
    try {
        await query(
            `
            INSERT INTO audit_logs (
                user_id,
                action,
                entity_type,
                entity_id,
                old_data,
                new_data,
                ip_address
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5::jsonb,
                $6::jsonb,
                $7
            )
            `,
            [
                userId,
                action,
                entityType,
                entityId,
                oldData === null
                    ? null
                    : JSON.stringify(oldData),
                newData === null
                    ? null
                    : JSON.stringify(newData),
                ipAddress,
            ]
        );
    } catch (error) {
        /*
         * Audit logging must never break the
         * main business operation.
         */
        console.error(
            "Audit log creation failed:",
            error
        );
    }
};