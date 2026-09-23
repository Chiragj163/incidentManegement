import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats } from "../services/api";
import type { DashboardStats, DashboardIncident, DashboardDateFilter } from "../services/api";
import "./Dashboard.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  Warning: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Calendar: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  )
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

  const loadDashboard = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
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

  // ── Render Helpers ──────────────────────────────────────────────────
  const renderIncidentCard = (incident: DashboardIncident) => (
    <div
      key={incident.id}
      className="board-card"
      onClick={() => navigate(`/incidents/${incident.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          navigate(`/incidents/${incident.id}`);
        }
      }}
    >
      <div className="card-top-row">
        <span className="card-id">#{incident.incident_no}</span>
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

  const renderBoardColumn = (
    id: string,
    title: string,
    subtitle: string,
    icon: ReactNode,
    incidents: DashboardIncident[]
  ) => (
    <div className="board-column">
      <div className="column-header">
        <div className="column-title-group">
          <div className={`column-status-icon icon-${id}`}>{icon}</div>
          <div>
            <h3>{title}</h3>
            <span>{subtitle}</span>
          </div>
        </div>
        <span className="column-badge">{incidents.length}</span>
      </div>
      <div className="column-card-list">
        {incidents.length === 0 ? (
          <div className="column-empty-state">
            <span>No incidents in this status</span>
          </div>
        ) : (
          incidents.map(renderIncidentCard)
        )}
      </div>
    </div>
  );

  // ── Skeleton Loader ─────────────────────────────────────────────────
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

  // ── Error State ─────────────────────────────────────────────────────
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
          {/* <h1 className="header-title">Incident Dashboard</h1> */}
          {/* <p className="header-subtitle">Real-time facility tracking and department metrics</p> */}
        </div>

        <div className="dashboard-controls-row">
          {/* Segmented Filter Pills */}
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

          {/* Refresh Action */}
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

          {customFromDate && customToDate && customFromDate > customToDate && (
            <span className="filter-validation-error">
              "From Date" cannot be later than "To Date".
            </span>
          )}
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
                <strong className="kpi-number">{stats.assigned}</strong>
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

          {/* ── Kanban Workflow Board ── */}
          <div className="dashboard-section">
            <div className="section-title-row">
              <div>
                <h2>Incident Board</h2>
                {/* <p>Live status distribution across operational resolution stages</p> */}
              </div>
            </div>

            <div className="kanban-scroll-wrapper">
              <div className="kanban-board-grid">
                {renderBoardColumn("report", "Reported", "Awaiting review/assignee", <Icons.Report />, stats.board.report)}
                {renderBoardColumn("working", "Working", "Action underway", <Icons.Working />, stats.board.working)}
                {renderBoardColumn("review", "Review", "Pending verification", <Icons.Review />, stats.board.review)}
                {renderBoardColumn("finished", "Finished", "Resolved & archived", <Icons.Finished />, stats.board.finished)}
              </div>
            </div>
          </div>

          {/* ── Distribution & Breakdown Cards ── */}
          <div className="breakdown-grid">
            {/* Status Details */}
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

            {/* Priority Details */}
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
    </div>
  );
};

export default Dashboard;