import { Request, Response } from "express";
import { loginUser } from "../services/authService";

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