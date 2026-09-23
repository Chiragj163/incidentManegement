import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
}

export interface JwtPayload {
    userId: number;
    userCode: string;
    role: string;
    siteId: number | null;
    departmentId: number | null;
    subDepartmentId: number | null;
}

export const generateToken = (
    payload: JwtPayload
): string => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "1d",
    });
};

export const verifyToken = (
    token: string
): JwtPayload => {
    return jwt.verify(
        token,
        JWT_SECRET
    ) as JwtPayload;
};