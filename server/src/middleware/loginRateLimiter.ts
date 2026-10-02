import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,

    limit: 5,

    keyGenerator: (req) => {
        const userId = req.body?.userId;

        return userId
            ? String(userId).trim().toUpperCase()
            : "UNKNOWN";
    },

    standardHeaders: "draft-8",
    legacyHeaders: false,

    // Successful login attempts do not consume the limit.
    skipSuccessfulRequests: true,

    handler: (req, res) => {
        const resetTime = res.getHeader("RateLimit-Reset");

        let retryAfterSeconds = 5 * 60;

        if (resetTime) {
            const resetValue = Number(resetTime);

            if (!Number.isNaN(resetValue)) {
                retryAfterSeconds = Math.max(
                    1,
                    resetValue
                );
            }
        }

        res.status(429).json({
            success: false,
            message: "Too many incorrect password attempts.",
            retryAfterSeconds,
        });
    },
});