import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getIncidentReport,
  getSites,
  getDepartments
} from "../services/api";
import type {
  IncidentReport,
  IncidentReportResponse,
  Site,
  Department
} from "../services/api";
import "./Reports.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  BarChart: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Download: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Filter: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Refresh: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Spinner: () => (
    <svg className="rp-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

const Reports = () => {
  const [report, setReport] = useState<IncidentReportResponse | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filter States
  const [siteId, setSiteId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  const generateReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getIncidentReport({
        siteId: siteId ? Number(siteId) : undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        status: status || undefined,
        priority: priority || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      });

      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compile report metrics.");
    } finally {
      setLoading(false);
    }
  }, [siteId, departmentId, status, priority, fromDate, toDate]);

  const loadInitialData = useCallback(async () => {
    try {
      setInitialLoading(true);
      setError("");

      const [siteList, departmentList, initialReport] = await Promise.all([
        getSites(),
        getDepartments(),
        getIncidentReport()
      ]);

      setSites(siteList);
      setDepartments(departmentList);
      setReport(initialReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize analytics reporting.");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const resetFilters = async () => {
    setSiteId("");
    setDepartmentId("");
    setStatus("");
    setPriority("");
    setFromDate("");
    setToDate("");
    setError("");

    try {
      setLoading(true);
      const data = await getIncidentReport();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset report data.");
    } finally {
      setLoading(false);
    }
  };

  // ── CSV Export Engine ────────────────────────────────────────────────
  const exportToCSV = () => {
    if (!report || report.incidents.length === 0) return;

    const headers = [
      "Incident Number",
      "Subject",
      "Facility Site",
      "Originating Department",
      "Resolving Department",
      "Priority",
      "Status",
      "Reported By",
      "Assigned To",
      "Created Timestamp"
    ];

    const rows = report.incidents.map((inc) => [
      inc.incident_no,
      `"${(inc.subject || "").replace(/"/g, '""')}"`,
      `"${(inc.site_name || "").replace(/"/g, '""')}"`,
      `"${(inc.from_department_name || "").replace(/"/g, '""')}"`,
      `"${(inc.to_department_name || "").replace(/"/g, '""')}"`,
      inc.priority,
      inc.status,
      `"${(inc.reported_by_name || "").replace(/"/g, '""')}"`,
      `"${(inc.assigned_to_name || "Unassigned").replace(/"/g, '""')}"`,
      `"${formatDate(inc.created_at)}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Incident_Analytics_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatStatus = (val: string) =>
    val ? val.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ") : "";

  // Cascading site -> departments
  const availableDepartments = useMemo(() => {
    if (!siteId) return departments;
    return departments.filter((d) => d.site_id === Number(siteId));
  }, [departments, siteId]);

  if (initialLoading) {
    return (
      <div className="reports-container">
        <div className="rp-skeleton-header" />
        <div className="rp-skeleton-kpi" />
        <div className="rp-skeleton-block" />
      </div>
    );
  }

  const totalIncidents = report?.summary.total || 0;

  return (
    <div className="reports-container">
      {/* ── Top Header Bar ── */}
      <div className="rp-header-bar">
        <div>
          {/* <div className="rp-title-row">
            <span className="rp-title-icon" aria-hidden="true">
              <Icons.BarChart />
            </span>
            <h1>Incident Analytics & Reports</h1>
          </div>
          <p className="rp-header-subtitle">
            Audit operational load, lifecycle throughput, and cross-department trends
          </p> */}
        </div>

        <div className="rp-header-actions">
          <button
            type="button"
            className="btn-export"
            onClick={exportToCSV}
            disabled={!report || report.incidents.length === 0 || loading}
            title="Download report data as CSV spreadsheet"
          >
            <Icons.Download />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Notification Feedback ── */}
      {error && (
        <div className="rp-alert-banner" role="alert">
          <Icons.AlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filter Workbench ── */}
      <section className="rp-card rp-filters-card">
        <div className="rp-card-header">
          <div className="header-with-icon">
            <Icons.Filter />
            <h2>Report Query Parameters</h2>
          </div>
          {(siteId || departmentId || status || priority || fromDate || toDate) && (
            <span className="active-filter-tag">Filters Active</span>
          )}
        </div>

        <div className="rp-filter-grid">
          <div className="rp-field">
            <label htmlFor="filter-site">Facility Site</label>
            <select
              id="filter-site"
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setDepartmentId("");
              }}
            >
              <option value="">All Sites ({sites.length})</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site_name}
                </option>
              ))}
            </select>
          </div>

          <div className="rp-field">
            <label htmlFor="filter-dept">Department</label>
            <select
              id="filter-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">
                {siteId ? "All Departments at Site" : "All Departments"}
              </option>
              {availableDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>

          <div className="rp-field">
            <label htmlFor="filter-status">Lifecycle Status</label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="WORKING">Working</option>
              <option value="DONE_FROM_MY_SIDE">Done From My Side</option>
              <option value="REVIEW">Review</option>
              <option value="REOPENED">Reopened</option>
              <option value="FINISHED">Finished</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="rp-field">
            <label htmlFor="filter-priority">Severity Priority</label>
            <select
              id="filter-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="rp-field">
            <label htmlFor="filter-from">From Date</label>
            <input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="rp-field">
            <label htmlFor="filter-to">To Date</label>
            <input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="rp-filter-actions">
          <button
            type="button"
            className="btn-reset"
            onClick={resetFilters}
            disabled={loading}
          >
            <Icons.Refresh />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="btn-apply"
            onClick={generateReport}
            disabled={loading || (Boolean(fromDate) && Boolean(toDate) && fromDate > toDate)}
          >
            {loading ? (
              <>
                <Icons.Spinner />
                <span>Compiling Analytics...</span>
              </>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>
      </section>

      {report && (
        <div className="rp-results-body">
          {/* ── Summary KPI Tiles ── */}
          <section className="rp-summary-grid">
            <div className="rp-kpi-card kpi-total">
              <span className="kpi-label">Total Volume</span>
              <strong className="kpi-value">{report.summary.total}</strong>
            </div>
            <div className="rp-kpi-card kpi-reported">
              <span className="kpi-label">Reported</span>
              <strong className="kpi-value">{report.summary.reported}</strong>
            </div>
            <div className="rp-kpi-card kpi-working">
              <span className="kpi-label">In Progress</span>
              <strong className="kpi-value">{report.summary.working}</strong>
            </div>
            <div className="rp-kpi-card kpi-reopened">
              <span className="kpi-label">Reopened</span>
              <strong className="kpi-value">{report.summary.reopened}</strong>
            </div>
            <div className="rp-kpi-card kpi-finished">
              <span className="kpi-label">Completed</span>
              <strong className="kpi-value">{report.summary.finished}</strong>
            </div>
          </section>

          {/* ── Visual Breakdown Meters ── */}
          <div className="rp-breakdown-grid">
            {/* Status Distribution */}
            <div className="rp-card">
              <div className="rp-card-header">
                <h2>Status Distribution</h2>
              </div>
              <div className="breakdown-meter-list">
                {Object.entries(report.statusCounts).map(([key, count]) => {
                  const pct = totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0;
                  return (
                    <div key={key} className="breakdown-meter-row">
                      <div className="meter-label-row">
                        <span className="meter-name">{formatStatus(key)}</span>
                        <span className="meter-count">
                          <strong>{count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="meter-track">
                        <div
                          className={`meter-bar meter-status-${key.toLowerCase()}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(report.statusCounts).length === 0 && (
                  <p className="empty-quiet">No status telemetry available.</p>
                )}
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="rp-card">
              <div className="rp-card-header">
                <h2>Priority Breakdown</h2>
              </div>
              <div className="breakdown-meter-list">
                {Object.entries(report.priorityCounts).map(([key, count]) => {
                  const pct = totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0;
                  return (
                    <div key={key} className="breakdown-meter-row">
                      <div className="meter-label-row">
                        <span className={`priority-pill priority-${key.toLowerCase()}`}>
                          {key}
                        </span>
                        <span className="meter-count">
                          <strong>{count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="meter-track">
                        <div
                          className={`meter-bar meter-p-${key.toLowerCase()}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(report.priorityCounts).length === 0 && (
                  <p className="empty-quiet">No priority telemetry available.</p>
                )}
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="rp-card">
              <div className="rp-card-header">
                <h2>Resolving Department Load</h2>
              </div>
              <div className="breakdown-meter-list">
                {Object.entries(report.departmentCounts).map(([deptName, count]) => {
                  const pct = totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0;
                  return (
                    <div key={deptName} className="breakdown-meter-row">
                      <div className="meter-label-row">
                        <span className="meter-name truncate-text" title={deptName}>
                          {deptName}
                        </span>
                        <span className="meter-count">
                          <strong>{count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="meter-track">
                        <div className="meter-bar meter-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(report.departmentCounts).length === 0 && (
                  <p className="empty-quiet">No department load available.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Granular Incident Records Table & Cards ── */}
          <section className="rp-card rp-table-section">
            <div className="rp-card-header header-between">
              <div>
                <h2>Incident Ledger</h2>
                <p>
                  Showing {report.incidents.length} record
                  {report.incidents.length !== 1 ? "s" : ""} matching criteria
                </p>
              </div>
            </div>

            {report.incidents.length === 0 ? (
              <div className="rp-empty-state">
                <p>No incident records correspond to the chosen filter parameters.</p>
              </div>
            ) : (
              <>
                {/* Desktop View Table (> 1024px) */}
                <div className="rp-desktop-view">
                  <div className="rp-table-wrapper">
                    <table className="rp-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Subject</th>
                          <th>Facility Site</th>
                          <th>Routing Pathway</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Reporter</th>
                          <th>Assignee</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.incidents.map((inc: IncidentReport) => (
                          <tr key={inc.id}>
                            <td className="cell-id">
                              <strong>#{inc.incident_no}</strong>
                            </td>
                            <td className="cell-subject">
                              <span className="truncate-text" title={inc.subject}>
                                {inc.subject}
                              </span>
                            </td>
                            <td>
                              <span className="truncate-text">{inc.site_name}</span>
                            </td>
                            <td>
                              <div className="pathway-stack">
                                <span className="path-node truncate-text" title={inc.from_department_name || ""}>
                                  {inc.from_department_name || "—"}
                                </span>
                                <Icons.ArrowRight />
                                <span className="path-node path-target truncate-text" title={inc.to_department_name || ""}>
                                  {inc.to_department_name || "—"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`priority-pill priority-${inc.priority.toLowerCase()}`}>
                                {inc.priority}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill status-${inc.status.toLowerCase()}`}>
                                {formatStatus(inc.status)}
                              </span>
                            </td>
                            <td>
                              <span className="cell-meta truncate-text">{inc.reported_by_name || "—"}</span>
                            </td>
                            <td>
                              <span className="cell-meta truncate-text">{inc.assigned_to_name || "Unassigned"}</span>
                            </td>
                            <td className="cell-date">{formatDate(inc.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile View Cards (<= 1024px) */}
                <div className="rp-mobile-view">
                  <div className="rp-card-stack">
                    {report.incidents.map((inc: IncidentReport) => (
                      <div key={inc.id} className="rp-mobile-item">
                        <div className="rp-mitem-top">
                          <span className="rp-mitem-id">#{inc.incident_no}</span>
                          <div className="rp-mitem-badges">
                            <span className={`priority-pill priority-${inc.priority.toLowerCase()}`}>
                              {inc.priority}
                            </span>
                            <span className={`status-pill status-${inc.status.toLowerCase()}`}>
                              {formatStatus(inc.status)}
                            </span>
                          </div>
                        </div>

                        <h4 className="rp-mitem-subject">{inc.subject}</h4>
                        <span className="rp-mitem-site">{inc.site_name}</span>

                        <div className="rp-mitem-route">
                          <div className="route-segment">
                            <small>From</small>
                            <span className="truncate-text">{inc.from_department_name || "—"}</span>
                          </div>
                          <Icons.ArrowRight />
                          <div className="route-segment">
                            <small>To</small>
                            <span className="truncate-text">{inc.to_department_name || "—"}</span>
                          </div>
                        </div>

                        <div className="rp-mitem-footer">
                          <div className="footer-meta">
                            <small>Assignee</small>
                            <span>{inc.assigned_to_name || "Unassigned"}</span>
                          </div>
                          <div className="footer-meta text-right">
                            <small>Logged On</small>
                            <span>{formatDate(inc.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Reports;