import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { testDatabaseConnection } from "./config/database";
import authRoutes from "./routes/authRoutes";
import siteRoutes from "./routes/siteRoutes";
import departmentRoutes from "./routes/departmentRoutes";
import subDepartmentRoutes from "./routes/subDepartmentRoutes";
import userRoutes from "./routes/userRoutes";
import incidentRoutes from "./routes/incidentRoutes";
import testRoutes from "./routes/testRoutes";
import incidentAttachmentRoutes from "./routes/incidentAttachmentRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import auditRoutes from "./routes/auditRoutes";
import pushRoutes from "./routes/pushRoutes";
import { processAutomaticAssignments } from "./services/autoAssignmentService";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------

app.use(helmet());

const allowedOrigins = [
    "http://localhost:5173",
    "http://192.168.100.186:5173",
    "https://localhost:5173",
    "https://192.168.100.186:5173",
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests without an Origin header,
            // such as curl/server-to-server requests.
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);

app.use(express.json());

app.use((req, res, next) => {
    if (
        req.method !== "GET" &&
        req.method !== "HEAD" &&
        req.method !== "OPTIONS" &&
        req.path.startsWith("/api/incidents") &&
        !req.is("application/json") &&
        !req.is("multipart/form-data")
    ) {
        res.status(415).json({
            success: false,
            message: "Unsupported Content-Type",
        });
        return;
    }

    next();
});

app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------
// API Routes
// ------------------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/sub-departments", subDepartmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/test", testRoutes);

// Public static uploads are intentionally disabled.
// Attachments must be accessed through the authenticated
// attachment API route.
app.use("/api/incidents", incidentAttachmentRoutes);

app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/push", pushRoutes);

// ------------------------------------------------------------
// Health Check
// ------------------------------------------------------------

app.get("/api/health", async (_req, res) => {
    res.json({
        success: true,
        message: "Incident Management API is running",
    });
});

// ------------------------------------------------------------
// API 404 Handler
// ------------------------------------------------------------

app.use("/api", (_req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found",
    });
});

// ------------------------------------------------------------
// Global Error Handler
// ------------------------------------------------------------

app.use(
    (
        err: any,
        _req: Request,
        res: Response,
        _next: NextFunction
    ) => {
        console.error("Server error:", err.message);

        // Malformed JSON body
        if (err instanceof SyntaxError && "body" in err) {
            res.status(400).json({
                success: false,
                message: "Invalid JSON request body",
            });
            return;
        }

        // CORS rejection
        if (err.message === "Not allowed by CORS") {
            res.status(403).json({
                success: false,
                message: "Origin not allowed",
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
);

// ------------------------------------------------------------
// Start Server
// ------------------------------------------------------------

const startServer = async () => {
    try {
        await testDatabaseConnection();

        app.listen(
            PORT,
            "127.0.0.1",
            () => {
                console.log(
                    `Incident Management API running on http://127.0.0.1:${PORT}`
                );

                console.log(
                    "Running automatic assignment check..."
                );

                processAutomaticAssignments();

                setInterval(
                    () => {
                        console.log(
                            "Running automatic assignment check..."
                        );

                        processAutomaticAssignments();
                    },
                    30 * 1000
                );

                console.log(
                    "Automatic incident assignment worker started"
                );
            }
        );
    } catch (error) {
        console.error(
            "Failed to start server:",
            error
        );

        process.exit(1);
    }
};

startServer();
