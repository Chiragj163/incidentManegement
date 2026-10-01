import {
    NextFunction,
    Request,
    Response,
} from "express";

import {
    verifyToken,
    JwtPayload,
} from "../utils/jwt";

import { query } from "../config/database";


export interface AuthenticatedRequest
    extends Request {
    user?: JwtPayload;
}


export const authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {

    try {

        // --------------------------------------------------
        // GET AUTHORIZATION HEADER
        // --------------------------------------------------

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({
                success: false,
                message:
                    "Authentication token is required",
            });
            return;
        }


        // --------------------------------------------------
        // CHECK BEARER FORMAT
        // --------------------------------------------------

        if (
            !authHeader.startsWith("Bearer ")
        ) {
            res.status(401).json({
                success: false,
                message:
                    "Invalid authentication format",
            });
            return;
        }


        const token =
            authHeader.substring(7);


        if (!token) {
            res.status(401).json({
                success: false,
                message:
                    "Authentication token is required",
            });
            return;
        }


        // --------------------------------------------------
        // VERIFY JWT
        // --------------------------------------------------

        const decoded =
            verifyToken(token);

        // --------------------------------------------------
        // VERIFY USER STILL EXISTS
        // AND IS ACTIVE
        // --------------------------------------------------

        const result = await query(
            `
            SELECT
                id,
                status
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [decoded.userId]
        );
        

        if (result.rows.length === 0) {
            res.status(401).json({
                success: false,
                message:
                    "User account is no longer available",
            });
            return;
        }


        const user =
            result.rows[0];


        // --------------------------------------------------
        // BLOCK INACTIVE USERS
        // --------------------------------------------------

        if (user.status !== "ACTIVE") {
            res.status(401).json({
                success: false,
                message:
                    "User account is inactive",
            });
            return;
        }


        // --------------------------------------------------
        // AUTHENTICATION SUCCESS
        // --------------------------------------------------

        req.user = decoded;

        next();

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        res.status(401).json({
            success: false,
            message:
                "Invalid or expired authentication token",
        });

    }
};