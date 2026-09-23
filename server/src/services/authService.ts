import bcrypt from "bcrypt";

import { query } from "../config/database";
import { generateToken } from "../utils/jwt";

interface UserRow {
    id: number;
    user_id: string;
    full_name: string;
    password_hash: string;
    role_code: string;
    role_name: string;
    site_id: number | null;
    department_id: number | null;
    sub_department_id: number | null;
    status: string;
}

export const loginUser = async (
    userId: string,
    password: string
) => {
    const result = await query(
        `
        SELECT
            u.id,
            u.user_id,
            u.full_name,
            u.password_hash,
            u.site_id,
            u.department_id,
            u.sub_department_id,
            u.status,
            r.role_code,
            r.role_name
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.user_id = $1
          AND u.status = 'ACTIVE'
        LIMIT 1
        `,
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error(
            "Invalid SAP ID or password"
        );
    }

    const user = result.rows[0] as UserRow;

    const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatch) {
        throw new Error(
            "Invalid SAP ID or password"
        );
    }

    await query(
        `
        UPDATE users
        SET last_login_at = NOW()
        WHERE id = $1
        `,
        [user.id]
    );

    const token = generateToken({
        userId: user.id,
        userCode: user.user_id,
        role: user.role_code,
        siteId: user.site_id,
        departmentId: user.department_id,
        subDepartmentId: user.sub_department_id,
    });

    return {
        user: {
            id: user.id,
            userId: user.user_id,
            fullName: user.full_name,
            role: user.role_code,
            roleName: user.role_name,
            siteId: user.site_id,
            departmentId: user.department_id,
            subDepartmentId: user.sub_department_id,
        },
        token,
    };
};