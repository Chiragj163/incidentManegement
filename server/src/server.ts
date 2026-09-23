import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
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
import { processAutomaticAssignments,} from "./services/autoAssignmentService";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------

app.use(helmet());

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/sub-departments", subDepartmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/test", testRoutes);
app.use(
  "/uploads",
  express.static(path.resolve(process.env.UPLOAD_DIR || "uploads"))
);
app.use("/api/incidents", incidentAttachmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditRoutes);

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
// Start Server
// ------------------------------------------------------------

const startServer = async () => {
    try {
        await testDatabaseConnection();

        app.listen(PORT, () => {
            console.log(
                `Incident Management API running on http://localhost:${PORT}`
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
        });
    } catch (error) {
        console.error(
            "Failed to start server:",
            error
        );

        process.exit(1);
    }
};

startServer();