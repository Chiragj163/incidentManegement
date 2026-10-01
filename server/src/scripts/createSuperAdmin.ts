import bcrypt from "bcrypt";
import { query } from "../config/database";

const createSuperAdmin = async () => {
    try {
        const sapId = "100000";
        const fullName = "System Administrator";
        const password = process.env.SUPER_ADMIN_PASSWORD;

        if (!password) {
            throw new Error(
                "SUPER_ADMIN_PASSWORD is not configured"
            );
        }

        // Check whether Super Admin already exists
        const existingUser = await query(
            `
            SELECT u.id, u.user_id, r.role_name
            FROM users u
            INNER JOIN roles r ON r.id = u.role_id
            WHERE u.user_id = $1
            LIMIT 1
            `,
            [sapId]
        );

        if (existingUser.rows.length > 0) {
            console.log(
                `User with SAP ID ${sapId} already exists.`
            );
            process.exit(0);
        }

        // Get SUPER_ADMIN role
        const roleResult = await query(
            `
            SELECT id
            FROM roles
            WHERE role_code = 'SUPER_ADMIN'
            LIMIT 1
            `
        );

        if (roleResult.rows.length === 0) {
            throw new Error(
                "SUPER_ADMIN role was not found."
            );
        }

        const roleId = roleResult.rows[0].id;

        // Hash password
        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        // Create Super Admin
        const result = await query(
            `
            INSERT INTO users (
                user_id,
                full_name,
                password_hash,
                role_id,
                status
            )
            VALUES ($1, $2, $3, $4, 'ACTIVE')
            RETURNING
                id,
                user_id,
                full_name,
                role_id,
                status
            `,
            [
                sapId,
                fullName,
                passwordHash,
                roleId,
            ]
        );

        console.log("\nSuper Admin created successfully:");
        console.log(result.rows[0]);

        console.log("\nLogin credentials:");
        console.log("SAP ID:", sapId);
        console.log("Password:", password);
    } catch (error) {
        console.error(
            "Failed to create Super Admin:",
            error
        );
        process.exit(1);
    }
};

createSuperAdmin();