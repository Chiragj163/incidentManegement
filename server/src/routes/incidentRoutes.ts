import { Router } from "express";
import { createIncident ,getIncidents,getIncidentById,getDashboardStats, assignIncident,startIncidentWork,completeIncident,reviewIncident} from "../controllers/incidentController";
import { authenticateToken } from "../middleware/authMiddleware";
import { getIncidentReport } from "../controllers/reportController";

const router = Router();

/*
 * Create a new incident
 */
router.post("/", authenticateToken, createIncident);
router.get("/", authenticateToken, getIncidents);
router.get("/dashboard", authenticateToken, getDashboardStats);
router.get("/reports",authenticateToken,getIncidentReport);
router.get("/:id", authenticateToken, getIncidentById);
router.post( "/:id/assign", authenticateToken, assignIncident);
router.post( "/:id/start", authenticateToken, startIncidentWork);
router.post( "/:id/complete", authenticateToken, completeIncident);
router.post( "/:id/review", authenticateToken, reviewIncident);

export default router;