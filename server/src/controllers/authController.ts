import bcrypt from "bcrypt";
import { Request, Response } from "express";

import { loginUser } from "../services/authService";
import { query } from "../config/database";
import {
    AuthenticatedRequest,
} from "../middleware/authMiddleware";
import { createAuditLog } from "../services/auditService";


// ============================================================
// LOGIN
// ============================================================

export const login = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            res.status(400).json({
                success: false,
                message: "SAP ID and password are required",
            });
            return;
        }

        const result = await loginUser(
            userId,
            password
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: result,
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(401).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Login failed",
        });
    }
};


// ============================================================
// GET MY PROFILE
// ============================================================

export const getMyProfile = async (
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

        const result = await query(
            `
            SELECT
                u.id,
                u.user_id,
                u.employee_code,
                u.full_name,
                u.email,
                u.mobile,
                u.designation,
                u.status,

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
                sd.sub_department_name

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

            LIMIT 1
            `,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User profile not found",
            });
            return;
        }

        const user = result.rows[0];

        res.status(200).json({
            success: true,
            data: user,
        });

    } catch (error) {
        console.error(
            "Get my profile error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load profile",
        });
    }
};


// ============================================================
// UPDATE MY PROFILE
// ============================================================

export const updateMyProfile = async (
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

        const { email, mobile } = req.body;

        // ----------------------------------------------------
        // Normalize values
        // ----------------------------------------------------

        const normalizedEmail =
            typeof email === "string" && email.trim()
                ? email.trim().toLowerCase()
                : null;

        const normalizedMobile =
            typeof mobile === "string" && mobile.trim()
                ? mobile.trim()
                : null;


        // ----------------------------------------------------
        // Validate email
        // ----------------------------------------------------

        if (
            normalizedEmail &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                normalizedEmail
            )
        ) {
            res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
            return;
        }


        // ----------------------------------------------------
        // Validate mobile
        // ----------------------------------------------------

        if (
            normalizedMobile &&
            !/^\d{10,15}$/.test(
                normalizedMobile
            )
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Mobile number must contain 10 digits",
            });
            return;
        }


        // ----------------------------------------------------
        // Get old profile
        // ----------------------------------------------------

        const oldResult = await query(
            `
            SELECT
                email,
                mobile
            FROM users
            WHERE id = $1
            `,
            [req.user.userId]
        );

        if (oldResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User profile not found",
            });
            return;
        }

        const oldProfile = oldResult.rows[0];


        // ----------------------------------------------------
        // Update profile
        // ----------------------------------------------------

        const result = await query(
            `
            UPDATE users
            SET
                email = $1,
                mobile = $2,
                updated_at = NOW()
            WHERE id = $3

            RETURNING
                id,
                user_id,
                employee_code,
                full_name,
                email,
                mobile,
                designation,
                status,
                updated_at
            `,
            [
                normalizedEmail,
                normalizedMobile,
                req.user.userId,
            ]
        );

        const updatedProfile = result.rows[0];


        // ----------------------------------------------------
        // Audit
        // ----------------------------------------------------

        await createAuditLog({
            userId: req.user.userId,
            action: "UPDATE_MY_PROFILE",
            entityType: "USER",
            entityId: req.user.userId,
            oldData: {
                email: oldProfile.email,
                mobile: oldProfile.mobile,
            },
            newData: {
                email: updatedProfile.email,
                mobile: updatedProfile.mobile,
            },
        });


        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedProfile,
        });

    } catch (error) {
        console.error(
            "Update my profile error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update profile",
        });
    }
};


// ============================================================
// CHANGE MY PASSWORD
// ============================================================

export const changeMyPassword = async (
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
            currentPassword,
            newPassword,
            confirmPassword,
        } = req.body;


        // ----------------------------------------------------
        // Required fields
        // ----------------------------------------------------

        if (
            !currentPassword ||
            !newPassword ||
            !confirmPassword
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Current password, new password and confirm password are required",
            });
            return;
        }


        // ----------------------------------------------------
        // Password length
        // ----------------------------------------------------

        if (newPassword.length < 8) {
            res.status(400).json({
                success: false,
                message:
                    "New password must be at least 8 characters long",
            });
            return;
        }


        // ----------------------------------------------------
        // Confirm password
        // ----------------------------------------------------

        if (newPassword !== confirmPassword) {
            res.status(400).json({
                success: false,
                message:
                    "New password and confirm password do not match",
            });
            return;
        }


        // ----------------------------------------------------
        // Get current password
        // ----------------------------------------------------

        const result = await query(
            `
            SELECT
                password_hash
            FROM users
            WHERE id = $1
            `,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        const user = result.rows[0];


        // ----------------------------------------------------
        // Verify current password
        // ----------------------------------------------------

        const isPasswordValid =
            await bcrypt.compare(
                currentPassword,
                user.password_hash
            );

        if (!isPasswordValid) {
            res.status(400).json({
                success: false,
                message: "Current password is incorrect",
            });
            return;
        }


        // ----------------------------------------------------
        // Prevent same password
        // ----------------------------------------------------

        const isSamePassword =
            await bcrypt.compare(
                newPassword,
                user.password_hash
            );

        if (isSamePassword) {
            res.status(400).json({
                success: false,
                message:
                    "New password must be different from current password",
            });
            return;
        }


        // ----------------------------------------------------
        // Hash new password
        // ----------------------------------------------------

        const newPasswordHash =
            await bcrypt.hash(
                newPassword,
                12
            );


        // ----------------------------------------------------
        // Update password
        // ----------------------------------------------------

        await query(
            `
            UPDATE users
            SET
                password_hash = $1,
                updated_at = NOW()
            WHERE id = $2
            `,
            [
                newPasswordHash,
                req.user.userId,
            ]
        );


        // ----------------------------------------------------
        // Audit
        // ----------------------------------------------------

        await createAuditLog({
            userId: req.user.userId,
            action: "CHANGE_MY_PASSWORD",
            entityType: "USER",
            entityId: req.user.userId,
        });


        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });

    } catch (error) {
        console.error(
            "Change password error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to change password",
        });
    }
};