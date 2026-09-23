import { NextFunction, Request, Response } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt";

export interface AuthenticatedRequest
    extends Request {
    user?: JwtPayload;
}

export const authenticateToken = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader =
            req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({
                success: false,
                message: "Authentication token is required",
            });
            return;
        }

        if (!authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Invalid authentication format",
            });
            return;
        }

        const token =
            authHeader.substring(7);

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Authentication token is required",
            });
            return;
        }

        const decoded =
            verifyToken(token);

        req.user = decoded;

        next();
    } catch (error) {
        console.error(
            "Authentication error:",
            error
        );

        res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token",
        });
    }
};