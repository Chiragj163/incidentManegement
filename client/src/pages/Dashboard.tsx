import { useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDashboardStats,
  startIncidentWork,
  completeIncident,
  reviewIncident,
  getCurrentUser
} from "../services/api";
import type { DashboardStats, DashboardIncident, DashboardDateFilter } from "../services/api";
import "./Dashboard.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Refresh: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  Warning: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Total: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  Report: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Assigned: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  ),
  Working: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Review: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  Finished: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Grip: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  ),
  Close: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
};

type BoardColumnKey = "report" | "assigned" | "working" | "review" | "finished";

const COLUMN_STATUS_MAP: Record<BoardColumnKey, string> = {
  report: "REPORTED",
  assigned: "ASSIGNED",
  working: "WORKING",
  review: "REVIEW",
  finished: "FINISHED"
};

const DATE_OPTIONS: Array<{ key: DashboardDateFilter; label: string }> = [
  { key: "TODAY", label: "Today" },
  { key: "THIS_WEEK", label: "This Week" },
  { key: "THIS_MONTH", label: "This Month" },
  { key: "CUSTOM", label: "Custom" }
];

const formatRelativeDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffHours < 24) {
    return diffHours <= 0 ? "Just now" : `${diffHours}h ago`;
  }
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [dateFilter, setDateFilter] = useState<DashboardDateFilter>("TODAY");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  // ── Drag & Drop States ──────────────────────────────────────────────
  const [draggedItem, setDraggedItem] = useState<{
    incident: DashboardIncident;
    sourceColumn: BoardColumnKey;
  } | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<BoardColumnKey | null>(null);
  const isDraggingRef = useRef(false);

  // ── Feedback Banner ─────────────────────────────────────────────────
  const [actionError, setActionError] = useState("");

  // ── Modals State ────────────────────────────────────────────────────
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionIncident, setCompletionIncident] = useState<DashboardIncident | null>(null);
  const [workPerformed, setWorkPerformed] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewIncidentData, setReviewIncidentData] = useState<DashboardIncident | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const currentUser = getCurrentUser();

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCompleteModal && !isSubmittingCompletion) handleCancelCompletion();
        if (showReviewModal && !isSubmittingReview) handleCancelReview();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCompleteModal, showReviewModal, isSubmittingCompletion, isSubmittingReview]);

  const loadDashboard = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setIsRefreshing(true);
        else setLoading(true);
        setError("");

        if (dateFilter === "CUSTOM" && (!customFromDate || !customToDate)) {
          setStats(null);
          return;
        }

        const data = await getDashboardStats({
          dateFilter,
          fromDate: dateFilter === "CUSTOM" ? customFromDate : undefined,
          toDate: dateFilter === "CUSTOM" ? customToDate : undefined
        });

        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateFilter, customFromDate, customToDate]
  );

  useEffect(() => {
    if (dateFilter !== "CUSTOM") {
      loadDashboard();
    }
  }, [dateFilter, loadDashboard]);

  // ── Drag & Drop Handlers ────────────────────────────────────────────
  const handleDragStart = (
    e: DragEvent<HTMLDivElement>,
    incident: DashboardIncident,
    sourceColumn: BoardColumnKey
  ) => {
    const canStartWork =
      sourceColumn === "assigned" &&
      incident.status === "ASSIGNED" &&
      Number(incident.assigned_to) === Number(currentUser?.id);

    const canSubmitForReview =
      sourceColumn === "working" &&
      incident.status === "WORKING" &&
      Number(incident.assigned_to) === Number(currentUser?.id);

    const canReview =
      sourceColumn === "review" &&
      incident.status === "REVIEW" &&
      Number(incident.reported_by) === Number(currentUser?.id);

    if (!canStartWork && !canSubmitForReview && !canReview) {
      e.preventDefault();
      setActionError("You are not authorized to transition this incident.");
      return;
    }

    isDraggingRef.current = true;
    setActionError("");
    setDraggedItem({ incident, sourceColumn });

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(incident.id));
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setActiveDropColumn(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, targetCol: BoardColumnKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDropColumn !== targetCol) {
      setActiveDropColumn(targetCol);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>, targetCol: BoardColumnKey) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (activeDropColumn === targetCol) {
      setActiveDropColumn(null);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetColumn: BoardColumnKey) => {
    e.preventDefault();
    setActiveDropColumn(null);

    if (!draggedItem) return;
    const { incident, sourceColumn } = draggedItem;

    if (sourceColumn === targetColumn) {
      setDraggedItem(null);
      return;
    }

    // 1. ASSIGNED → WORKING
    if (incident.status === "ASSIGNED" && sourceColumn === "assigned" && targetColumn === "working") {
      if (Number(incident.assigned_to) !== Number(currentUser?.id)) {
        setDraggedItem(null);
        setActionError("Only the assigned personnel can initiate work on this incident.");
        await loadDashboard(true);
        return;
      }

      setDraggedItem(null);
      try {
        await startIncidentWork(incident.id);
        await loadDashboard(true);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to start incident work.");
        await loadDashboard(true);
      }
      return;
    }

    // 2. WORKING → REVIEW
    if (incident.status === "WORKING" && sourceColumn === "working" && targetColumn === "review") {
      setDraggedItem(null);
      setCompletionIncident(incident);
      setWorkPerformed("");
      setResolutionDetails("");
      setActionError("");
      setShowCompleteModal(true);
      return;
    }

    // 3. REVIEW → FINISHED
    if (incident.status === "REVIEW" && sourceColumn === "review" && targetColumn === "finished") {
      if (Number(incident.reported_by) !== Number(currentUser?.id)) {
        setDraggedItem(null);
        setActionError("Only the original reporter is permitted to review and close this incident.");
        await loadDashboard(true);
        return;
      }

      setDraggedItem(null);
      setReviewIncidentData(incident);
      setReviewRemarks("");
      setActionError("");
      setShowReviewModal(true);
      return;
    }

    // Invalid Transition
    setDraggedItem(null);
    setActionError(
      `Invalid workflow transition: Cannot move incident from ${incident.status} to ${COLUMN_STATUS_MAP[targetColumn]}.`
    );
    await loadDashboard(true);
  };

  // ── Completion Modal Submission ─────────────────────────────────────
  const handleSubmitCompletion = async () => {
    if (!completionIncident) return;
    const trimmedWork = workPerformed.trim();
    const trimmedRes = resolutionDetails.trim();

    if (!trimmedWork) {
      setActionError("Please describe the work performed.");
      return;
    }
    if (!trimmedRes) {
      setActionError("Please provide resolution details.");
      return;
    }

    try {
      setIsSubmittingCompletion(true);
      setActionError("");

      await completeIncident(completionIncident.id, {
        workPerformed: trimmedWork,
        resolutionDetails: trimmedRes
      });

      setShowCompleteModal(false);
      setCompletionIncident(null);
      setWorkPerformed("");
      setResolutionDetails("");
      await loadDashboard(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to submit incident for review.");
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const handleCancelCompletion = () => {
    if (isSubmittingCompletion) return;
    setShowCompleteModal(false);
    setCompletionIncident(null);
    setWorkPerformed("");
    setResolutionDetails("");
    setActionError("");
    loadDashboard(true);
  };

  // ── Review Modal Submission ─────────────────────────────────────────
  const handleSubmitReview = async (reviewResult: "APPROVED" | "REOPENED") => {
    if (!reviewIncidentData) return;

    try {
      setIsSubmittingReview(true);
      setActionError("");

      await reviewIncident(reviewIncidentData.id, {
        reviewResult,
        remarks: reviewRemarks.trim() || undefined
      });

      setShowReviewModal(false);
      setReviewIncidentData(null);
      setReviewRemarks("");
      await loadDashboard(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCancelReview = () => {
    if (isSubmittingReview) return;
    setShowReviewModal(false);
    setReviewIncidentData(null);
    setReviewRemarks("");
    setActionError("");
    loadDashboard(true);
  };

  // ── Render Helpers ──────────────────────────────────────────────────
  const renderIncidentCard = (incident: DashboardIncident, columnKey: BoardColumnKey) => {
    const isBeingDragged = draggedItem?.incident.id === incident.id;

    return (
      <div
        key={incident.id}
        className={`board-card ${isBeingDragged ? "is-dragging" : ""}`}
        draggable
        onDragStart={(e) => handleDragStart(e, incident, columnKey)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (!isDraggingRef.current) {
            navigate(`/incidents/${incident.id}`);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="card-top-row">
          <div className="card-drag-handle" title="Drag to advance status">
            <Icons.Grip />
            <span className="card-id">#{incident.incident_no}</span>
          </div>
          <span className={`priority-pill priority-${incident.priority.toLowerCase()}`}>
            {incident.priority}
          </span>
        </div>

        <h4 className="card-subject" title={incident.subject}>
          {incident.subject}
        </h4>

        <div className="card-route-strip">
          <div className="route-step">
            <strong className="truncate-text">{incident.from_site_name || "Source Site"}</strong>
            <span className="truncate-text">{incident.from_department_name || "Department"}</span>
          </div>
          <div className="route-arrow">
            <Icons.ArrowRight />
          </div>
          <div className="route-step">
            <strong className="truncate-text">{incident.to_site_name || "Target Site"}</strong>
            <span className="truncate-text">{incident.to_department_name || "Department"}</span>
          </div>
        </div>

        <div className="card-footer-meta">
          <div className="meta-assignee">
            <span className="meta-caption">Assigned</span>
            <strong className="truncate-text">{incident.assigned_to_name || "Unassigned"}</strong>
          </div>
          <span className="meta-time">
            {formatRelativeDate(incident.updated_at || incident.created_at)}
          </span>
        </div>
      </div>
    );
  };

  const renderBoardColumn = (
    id: BoardColumnKey,
    title: string,
    subtitle: string,
    icon: ReactNode,
    incidents: DashboardIncident[]
  ) => {
    const isTargeted = activeDropColumn === id;

    return (
      <div
        className={`board-column ${isTargeted ? "column-drop-active" : ""}`}
        onDragOver={(e) => handleDragOver(e, id)}
        onDragEnter={(e) => handleDragOver(e, id)}
        onDragLeave={(e) => handleDragLeave(e, id)}
        onDrop={(e) => handleDrop(e, id)}
      >
        <div className="column-header">
          <div className="column-title-group">
            <div className={`column-status-icon icon-${id}`}>{icon}</div>
            <div>
              <h3>{title}</h3>
              <span>{subtitle}</span>
            </div>
          </div>
          <span className="column-badge">{incidents?.length || 0}</span>
        </div>

        <div className="column-card-list">
          {!incidents || incidents.length === 0 ? (
            <div className={`column-empty-state ${isTargeted ? "empty-state-active" : ""}`}>
              <span>{isTargeted ? "Drop to transition" : "No incidents"}</span>
            </div>
          ) : (
            incidents.map((inc) => renderIncidentCard(inc, id))
          )}
        </div>
      </div>
    );
  };

  // ── Skeletons & Errors ──────────────────────────────────────────────
  if (loading && !stats) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header-skeleton" />
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card skeleton-block" />
          ))}
        </div>
        <div className="kanban-skeleton skeleton-block" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error-state">
          <div className="error-icon-box">
            <Icons.Warning />
          </div>
          <h2>Unable to Connect to Metrics</h2>
          <p>{error}</p>
          <button type="button" className="btn-retry" onClick={() => loadDashboard(true)}>
            <Icons.Refresh /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* ── Top Header Toolbar ── */}
      <div className="dashboard-header-bar">
        <div className="header-meta">
          {/* <h1 className="header-title">Incident Dashboard</h1>
          <p className="header-subtitle">Real-time facility tracking and department metrics</p> */}
        </div>

        <div className="dashboard-controls-row">
          <div className="filter-pill-group">
            {DATE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`filter-pill-btn ${dateFilter === opt.key ? "active" : ""}`}
                onClick={() => setDateFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`btn-icon-action ${isRefreshing ? "spin" : ""}`}
            onClick={() => loadDashboard(true)}
            title="Refresh dashboard data"
            aria-label="Refresh dashboard data"
          >
            <Icons.Refresh />
          </button>
        </div>
      </div>

      {/* ── Global Action Error / Toast Alert ── */}
      {actionError && !showCompleteModal && !showReviewModal && (
        <div className="dashboard-action-toast" role="alert">
          <div className="toast-content">
            <Icons.Warning />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            className="toast-dismiss"
            onClick={() => setActionError("")}
            aria-label="Dismiss alert"
          >
            <Icons.Close />
          </button>
        </div>
      )}

      {/* ── Custom Date Range Expanded Bar ── */}
      {dateFilter === "CUSTOM" && (
        <div className="custom-date-bar">
          <div className="custom-date-inputs">
            <div className="date-field">
              <label>From Date</label>
              <div className="input-with-icon">
                <Icons.Calendar />
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                />
              </div>
            </div>

            <span className="date-range-separator">to</span>

            <div className="date-field">
              <label>To Date</label>
              <div className="input-with-icon">
                <Icons.Calendar />
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn-apply-filter"
              onClick={() => loadDashboard(true)}
              disabled={!customFromDate || !customToDate || customFromDate > customToDate}
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {stats && (
        <div className="dashboard-view-content">
          {/* ── Primary KPI Metrics ── */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-box kpi-primary">
                <Icons.Total />
              </div>
              <div className="kpi-details">
                <span className="kpi-label">Total Incidents</span>
                <strong className="kpi-number">{stats.total}</strong>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box kpi-warning">
                <Icons.Report />
              </div>
              <div className="kpi-details">
                <span className="kpi-label">Reported</span>
                <strong className="kpi-number">{stats.reported}</strong>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box kpi-info">
                <Icons.Working />
              </div>
              <div className="kpi-details">
                <span className="kpi-label">In Progress</span>
                <strong className="kpi-number">{stats.working}</strong>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box kpi-success">
                <Icons.Finished />
              </div>
              <div className="kpi-details">
                <span className="kpi-label">Resolved</span>
                <strong className="kpi-number">{stats.finished}</strong>
              </div>
            </div>
          </div>

          {/* ── 5-Column Kanban Workflow Board ── */}
          <div className="dashboard-section">
            <div className="section-title-row">
              <div>
                <h2>Incident Board</h2>
                {/* <p>Drag and drop cards across stages to advance resolution lifecycle</p> */}
              </div>
            </div>

            <div className="kanban-scroll-wrapper">
              <div className="kanban-board-grid">
                {renderBoardColumn("report", "Reported", "Awaiting triage", <Icons.Report />, stats.board.report)}
                {renderBoardColumn("assigned", "Assigned", "Ready to start", <Icons.Assigned />, stats.board.assigned)}
                {renderBoardColumn("working", "Working", "Action underway", <Icons.Working />, stats.board.working)}
                {renderBoardColumn("review", "Review", "Pending approval", <Icons.Review />, stats.board.review)}
                {renderBoardColumn("finished", "Finished", "Resolved & closed", <Icons.Finished />, stats.board.finished)}
              </div>
            </div>
          </div>

          {/* ── Distribution & Breakdown Cards ── */}
          <div className="breakdown-grid">
            <div className="breakdown-card">
              <div className="breakdown-header">
                <h3>Lifecycle Status Distribution</h3>
              </div>
              <div className="breakdown-list">
                <div className="breakdown-row">
                  <span className="breakdown-label">
                    <span className="status-dot dot-assigned" /> Assigned
                  </span>
                  <strong className="breakdown-val">{stats.assigned}</strong>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">
                    <span className="status-dot dot-review" /> Pending Review
                  </span>
                  <strong className="breakdown-val">{stats.review}</strong>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">
                    <span className="status-dot dot-reopened" /> Reopened
                  </span>
                  <strong className="breakdown-val">{stats.reopened}</strong>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">
                    <span className="status-dot dot-cancelled" /> Cancelled
                  </span>
                  <strong className="breakdown-val">{stats.cancelled}</strong>
                </div>
              </div>
            </div>

            <div className="breakdown-card">
              <div className="breakdown-header">
                <h3>Severity & Priority Distribution</h3>
              </div>
              <div className="breakdown-list">
                <div className="breakdown-row">
                  <span className="breakdown-label">
                    <span className="priority-pill priority-critical">Critical</span>
                  </span>
                  <strong className="breakdown-val">{stats.critical}</strong>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">
                    <span className="priority-pill priority-high">High</span>
                  </span>
                  <strong className="breakdown-val">{stats.high}</strong>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">
                    <span className="priority-pill priority-medium">Medium</span>
                  </span>
                  <strong className="breakdown-val">{stats.medium}</strong>
                </div>
                <div className="breakdown-row">
                  <span className="breakdown-label">
                    <span className="priority-pill priority-low">Low</span>
                  </span>
                  <strong className="breakdown-val">{stats.low}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Work Modal ── */}
      {showCompleteModal && completionIncident && (
        <div
          className="dash-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelCompletion();
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="dash-modal-card">
            <div className="dash-modal-header">
              <div>
                <h2>Submit Work for Review</h2>
                <p>
                  #{completionIncident.incident_no} — {completionIncident.subject}
                </p>
              </div>
              <button
                type="button"
                className="dash-btn-close"
                onClick={handleCancelCompletion}
                disabled={isSubmittingCompletion}
                aria-label="Close dialog"
              >
                <Icons.Close />
              </button>
            </div>

            {actionError && (
              <div className="dash-modal-alert" role="alert">
                <Icons.Warning />
                <span>{actionError}</span>
              </div>
            )}

            <div className="dash-modal-body">
              <div className="dash-form-field">
                <label htmlFor="workPerformed">
                  Work Performed <span>*</span>
                </label>
                <textarea
                  id="workPerformed"
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  placeholder="Detail physical checks, equipment adjustments, or software diagnostics executed..."
                  rows={4}
                  disabled={isSubmittingCompletion}
                />
              </div>

              <div className="dash-form-field">
                <label htmlFor="resolutionDetails">
                  Resolution Details <span>*</span>
                </label>
                <textarea
                  id="resolutionDetails"
                  value={resolutionDetails}
                  onChange={(e) => setResolutionDetails(e.target.value)}
                  placeholder="Summarize root cause fix, verification benchmarks, or operational changes..."
                  rows={4}
                  disabled={isSubmittingCompletion}
                />
              </div>
            </div>

            <div className="dash-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={handleCancelCompletion}
                disabled={isSubmittingCompletion}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleSubmitCompletion}
                disabled={
                  isSubmittingCompletion || !workPerformed.trim() || !resolutionDetails.trim()
                }
              >
                {isSubmittingCompletion ? "Submitting..." : "Submit for Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Incident Modal ── */}
      {showReviewModal && reviewIncidentData && (
        <div
          className="dash-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelReview();
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="dash-modal-card">
            <div className="dash-modal-header">
              <div>
                <h2>Review Resolution Assessment</h2>
                <p>
                  #{reviewIncidentData.incident_no} — {reviewIncidentData.subject}
                </p>
              </div>
              <button
                type="button"
                className="dash-btn-close"
                onClick={handleCancelReview}
                disabled={isSubmittingReview}
                aria-label="Close dialog"
              >
                <Icons.Close />
              </button>
            </div>

            {actionError && (
              <div className="dash-modal-alert" role="alert">
                <Icons.Warning />
                <span>{actionError}</span>
              </div>
            )}

            <div className="dash-modal-body">
              <div className="dash-form-field">
                <label htmlFor="reviewRemarks">Reviewer Remarks (Optional on Approval)</label>
                <textarea
                  id="reviewRemarks"
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="State evaluation findings, or specify what remains unaddressed if reopening..."
                  rows={4}
                  disabled={isSubmittingReview}
                />
              </div>
            </div>

            <div className="dash-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                disabled={isSubmittingReview}
                onClick={handleCancelReview}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-danger"
                disabled={isSubmittingReview}
                onClick={() => handleSubmitReview("REOPENED")}
              >
                Reopen Incident
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                disabled={isSubmittingReview}
                onClick={() => handleSubmitReview("APPROVED")}
              >
                {isSubmittingReview ? "Submitting..." : "Approve & Finish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;