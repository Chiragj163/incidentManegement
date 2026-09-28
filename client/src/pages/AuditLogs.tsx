import { useCallback, useEffect, useState } from "react";
import {
  getAuditLogs,
  getUsers,
} from "../services/api";
import type {
  AuditLog,
  User,
} from "../services/api";
import "./AuditLogs.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
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
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Clock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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
    <svg className="al-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

const ACTION_GROUPS = [
  {
    category: "Incident Lifecycle",
    actions: [
      { key: "CREATE_INCIDENT", label: "Create Incident" },
      { key: "ASSIGN_INCIDENT", label: "Assign Incident" },
      { key: "START_INCIDENT_WORK", label: "Start Incident Work" },
      { key: "COMPLETE_INCIDENT", label: "Complete Incident" },
      { key: "APPROVE_INCIDENT", label: "Approve Incident" },
      { key: "REOPEN_INCIDENT", label: "Reopen Incident" }
    ]
  },
  {
    category: "Access & Personnel",
    actions: [
      { key: "CREATE_USER", label: "Create User" },
      { key: "UPDATE_USER", label: "Update User" },
      { key: "ACTIVATE_USER", label: "Activate User" },
      { key: "DEACTIVATE_USER", label: "Deactivate User" }
    ]
  },
  {
    category: "Infrastructure & Master Data",
    actions: [
      { key: "CREATE_SITE", label: "Create Site" },
      { key: "UPDATE_SITE", label: "Update Site" },
      { key: "ACTIVATE_SITE", label: "Activate Site" },
      { key: "DEACTIVATE_SITE", label: "Deactivate Site" },
      { key: "CREATE_DEPARTMENT", label: "Create Department" },
      { key: "UPDATE_DEPARTMENT", label: "Update Department" },
      { key: "ACTIVATE_DEPARTMENT", label: "Activate Department" },
      { key: "DEACTIVATE_DEPARTMENT", label: "Deactivate Department" },
      { key: "CREATE_SUB_DEPARTMENT", label: "Create Sub-Department" },
      { key: "UPDATE_SUB_DEPARTMENT", label: "Update Sub-Department" },
      { key: "ACTIVATE_SUB_DEPARTMENT", label: "Activate Sub-Department" },
      { key: "DEACTIVATE_SUB_DEPARTMENT", label: "Deactivate Sub-Department" }
    ]
  }
];

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filter criteria
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [logData, userData] = await Promise.all([
        getAuditLogs(),
        getUsers()
      ]);

      setLogs(logData);
      setUsers(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Modal keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedLog(null);
    };
    if (selectedLog) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedLog]);

  const generateReport = async () => {
    try {
      setIsFiltering(true);
      setError("");

      const data = await getAuditLogs({
        action: action || undefined,
        entityType: entityType || undefined,
        userId: userId ? Number(userId) : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      });

      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to filter audit logs.");
    } finally {
      setIsFiltering(false);
    }
  };

  const resetFilters = async () => {
    setAction("");
    setEntityType("");
    setUserId("");
    setFromDate("");
    setToDate("");
    setError("");

    try {
      setIsFiltering(true);
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset filters.");
    } finally {
      setIsFiltering(false);
    }
  };

  // ── CSV Export Function ──────────────────────────────────────────────
  const exportToCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      "Timestamp",
      "Actor Name",
      "Actor User ID",
      "Action Executed",
      "Target Entity",
      "Target Entity ID",
      "Associated Incident",
      "IP Address"
    ];

    const rows = logs.map((l) => [
      `"${formatDate(l.created_at)}"`,
      `"${(l.user_name || "System").replace(/"/g, '""')}"`,
      `"${(l.user_code || "—").replace(/"/g, '""')}"`,
      l.action,
      l.entity_type || "—",
      l.entity_id || "—",
      l.incident_no || "—",
      l.ip_address || "—"
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `System_Audit_Log_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Formatters ──────────────────────────────────────────────────────
  const formatDate = (value: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const formatAction = (value: string) =>
    value
      ? value
          .split("_")
          .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
          .join(" ")
      : "";

  const formatFieldName = (key: string) =>
    key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "True" : "False";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getActionBadgeClass = (act: string) => {
    if (act.startsWith("CREATE_")) return "badge-create";
    if (act.startsWith("UPDATE_")) return "badge-update";
    if (act.startsWith("DEACTIVATE_") || act.includes("REOPEN")) return "badge-danger";
    if (act.startsWith("ACTIVATE_") || act.includes("APPROVE") || act.includes("COMPLETE")) return "badge-success";
    return "badge-process";
  };

  const getAuditFields = (value: Record<string, unknown> | null) => {
    if (!value) return [];
    const hiddenFields = ["id", "created_at", "updated_at", "password_hash"];
    return Object.entries(value).filter(([key]) => !hiddenFields.includes(key));
  };

  // ── Diff Renderer ───────────────────────────────────────────────────
  const renderAuditDiff = (
    oldData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null
  ) => {
    const oldFields = getAuditFields(oldData);
    const newFields = getAuditFields(newData);

    const fieldNames = Array.from(
      new Set([
        ...oldFields.map(([k]) => k),
        ...newFields.map(([k]) => k)
      ])
    );

    if (fieldNames.length === 0) {
      return (
        <div className="al-diff-empty">
          <span>No property modifications recorded for this entry.</span>
        </div>
      );
    }

    const oldMap = Object.fromEntries(oldFields);
    const newMap = Object.fromEntries(newFields);

    const isCreate = !oldData && !!newData;
    const isDelete = !!oldData && !newData;

    return (
      <div className="al-diff-table-wrapper">
        <table className="al-diff-table">
          <thead>
            <tr>
              <th>Property</th>
              {!isCreate && <th>Previous State</th>}
              {!isDelete && <th>Updated State</th>}
            </tr>
          </thead>
          <tbody>
            {fieldNames.map((field) => {
              const prev = formatFieldValue(oldMap[field]);
              const next = formatFieldValue(newMap[field]);
              const isModified = !isCreate && !isDelete && prev !== next;

              return (
                <tr key={field} className={isModified ? "diff-row-changed" : ""}>
                  <td className="diff-field-name">{formatFieldName(field)}</td>

                  {!isCreate && (
                    <td className={`diff-val-cell ${isModified ? "diff-val-removed" : ""}`}>
                      {prev}
                    </td>
                  )}

                  {!isDelete && (
                    <td className={`diff-val-cell ${isModified ? "diff-val-added" : ""}`}>
                      {next}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const hasActiveFilters = Boolean(action || entityType || userId || fromDate || toDate);

  return (
    <div className="audit-page-container">
      {/* ── Top Header Toolbar ── */}
      <div className="al-header-bar">
        <div>
          {/* <div className="al-title-row">
            <span className="al-title-icon" aria-hidden="true">
              <Icons.Shield />
            </span>
            <h1>Audit Logs & Security Trail</h1>
          </div>
          <p className="al-header-subtitle">
            Immutable system logs, user access records, and entity modification histories
          </p> */}
        </div>

        <div className="al-header-actions">
          <button
            type="button"
            className="btn-export-audit"
            onClick={exportToCSV}
            disabled={logs.length === 0 || loading || isFiltering}
            title="Export filtered records to CSV"
          >
            <Icons.Download />
            <span>Export Trail</span>
          </button>
        </div>
      </div>

      {/* ── Notification Alert ── */}
      {error && (
        <div className="al-alert-banner" role="alert">
          <Icons.AlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* ── Query Parameter Workbench ── */}
      <section className="al-card al-filters-card">
        <div className="al-card-header">
          <div className="header-with-icon">
            <Icons.Filter />
            <h2>Audit Query Filters</h2>
          </div>
          {hasActiveFilters && <span className="active-tag">Filtered</span>}
        </div>

        <div className="al-filter-grid">
          {/* Action Classification */}
          <div className="al-field">
            <label htmlFor="filter-action">Action Event</label>
            <select
              id="filter-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">All Operations</option>
              {ACTION_GROUPS.map((grp) => (
                <optgroup key={grp.category} label={grp.category}>
                  {grp.actions.map((act) => (
                    <option key={act.key} value={act.key}>
                      {act.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Entity Type */}
          <div className="al-field">
            <label htmlFor="filter-entity">Target Entity</label>
            <select
              id="filter-entity"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="INCIDENT">Incident Record</option>
              <option value="USER">User Account</option>
              <option value="SITE">Facility Site</option>
              <option value="DEPARTMENT">Department</option>
              <option value="SUB_DEPARTMENT">Sub-Department</option>
            </select>
          </div>

          {/* Actor / User */}
          <div className="al-field">
            <label htmlFor="filter-user">Acting Personnel</label>
            <select
              id="filter-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">All Personnel</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.userId})
                </option>
              ))}
            </select>
          </div>

          {/* Date Constraints */}
          <div className="al-field">
            <label htmlFor="filter-from">From Timestamp</label>
            <input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="al-field">
            <label htmlFor="filter-to">To Timestamp</label>
            <input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="al-filter-actions">
          <button
            type="button"
            className="btn-reset-filters"
            onClick={resetFilters}
            disabled={loading || isFiltering}
          >
            <Icons.Refresh />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="btn-apply-filters"
            onClick={generateReport}
            disabled={loading || isFiltering || (Boolean(fromDate) && Boolean(toDate) && fromDate > toDate)}
          >
            {isFiltering ? (
              <>
                <Icons.Spinner />
                <span>Compiling Logs...</span>
              </>
            ) : (
              "Apply Query"
            )}
          </button>
        </div>
      </section>

      {/* ── Audit Trail Ledger ── */}
      <section className="al-card al-table-section">
        <div className="al-card-header header-between">
          <div>
            <h2>Recorded Audit Events</h2>
            <p>Showing latest {logs.length} indexed operational events</p>
          </div>
        </div>

        {loading ? (
          <div className="al-loading-wrapper">
            <div className="al-desktop-view">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="al-skeleton-row" />
              ))}
            </div>
            <div className="al-mobile-view">
              {[1, 2, 3].map((i) => (
                <div key={i} className="al-skeleton-card" />
              ))}
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="al-empty-state">
            <div className="empty-icon-circle">
              <Icons.Shield />
            </div>
            <h3>No audit records found</h3>
            <p>
              {hasActiveFilters
                ? "No system activity matches your active query parameters."
                : "No operational changes have been indexed yet."}
            </p>
            {hasActiveFilters && (
              <button type="button" className="btn-reset-filters" onClick={resetFilters}>
                Clear Filter Constraints
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (> 1024px) */}
            <div className="al-desktop-view">
              <div className="al-table-wrapper">
                <table className="al-data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Acting Personnel</th>
                      <th>Action Executed</th>
                      <th>Entity Scope</th>
                      <th>Incident Ref</th>
                      <th>Source IP</th>
                      <th className="th-action">Inspection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="cell-time">
                          <div className="time-stack">
                            <Icons.Clock />
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                        </td>

                        <td>
                          <div className="actor-profile">
                            <strong className="truncate-text">{log.user_name || "System Automated"}</strong>
                            {log.user_code && <span className="actor-code">{log.user_code}</span>}
                          </div>
                        </td>

                        <td>
                          <span className={`al-badge ${getActionBadgeClass(log.action)}`}>
                            {formatAction(log.action)}
                          </span>
                        </td>

                        <td>
                          <div className="entity-tag-group">
                            <span className="entity-type">{log.entity_type || "—"}</span>
                            {log.entity_id && <span className="entity-id">#{log.entity_id}</span>}
                          </div>
                        </td>

                        <td>
                          {log.incident_no ? (
                            <span className="incident-link-badge">#{log.incident_no}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        <td>
                          <span className="ip-badge" title={log.ip_address || "Internal"}>
                            {log.ip_address || "Internal"}
                          </span>
                        </td>

                        <td className="cell-action">
                          <button
                            type="button"
                            className="btn-inspect"
                            onClick={() => setSelectedLog(log)}
                            title="Inspect field level differences"
                            aria-label={`Inspect audit log #${log.id}`}
                          >
                            <Icons.Eye />
                            <span>Diff</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View (<= 1024px) */}
            <div className="al-mobile-view">
              <div className="al-card-stack">
                {logs.map((log) => (
                  <div key={log.id} className="al-mobile-card">
                    <div className="mcard-top-row">
                      <span className={`al-badge ${getActionBadgeClass(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                      <span className="mcard-timestamp">{formatDate(log.created_at)}</span>
                    </div>

                    <div className="mcard-body">
                      <div className="mcard-detail-row">
                        <span className="mcard-label">Actor</span>
                        <strong className="truncate-text">
                          {log.user_name || "System"} {log.user_code ? `(${log.user_code})` : ""}
                        </strong>
                      </div>

                      <div className="mcard-detail-row">
                        <span className="mcard-label">Entity</span>
                        <span>
                          {log.entity_type || "—"} {log.entity_id ? `(#${log.entity_id})` : ""}
                        </span>
                      </div>

                      {log.incident_no && (
                        <div className="mcard-detail-row">
                          <span className="mcard-label">Incident</span>
                          <span className="incident-link-badge">#{log.incident_no}</span>
                        </div>
                      )}

                      <div className="mcard-detail-row">
                        <span className="mcard-label">IP Address</span>
                        <span className="ip-badge">{log.ip_address || "Internal"}</span>
                      </div>
                    </div>

                    <div className="mcard-footer">
                      <button
                        type="button"
                        className="btn-inspect-mobile"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Icons.Eye />
                        <span>Inspect Field Changes</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Detailed Diff Modal / Mobile Drawer ── */}
      {selectedLog && (
        <div
          className="al-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="al-modal-card">
            <div className="al-modal-header">
              <div>
                <h2>Audit Event Inspection</h2>
                <div className="modal-header-meta">
                  <span className={`al-badge ${getActionBadgeClass(selectedLog.action)}`}>
                    {formatAction(selectedLog.action)}
                  </span>
                  <span className="header-log-id">Record #{selectedLog.id}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedLog(null)}
                aria-label="Close inspection dialog"
              >
                <Icons.Close />
              </button>
            </div>

            {/* Event Key Parameters */}
            <div className="al-modal-meta-grid">
              <div className="meta-box">
                <span className="meta-cap">Timestamp</span>
                <strong>{formatDate(selectedLog.created_at)}</strong>
              </div>
              <div className="meta-box">
                <span className="meta-cap">Acting Personnel</span>
                <strong>
                  {selectedLog.user_name || "System"} {selectedLog.user_code ? `(${selectedLog.user_code})` : ""}
                </strong>
              </div>
              <div className="meta-box">
                <span className="meta-cap">Entity Scope</span>
                <strong>
                  {selectedLog.entity_type || "—"} {selectedLog.entity_id ? `(#${selectedLog.entity_id})` : ""}
                </strong>
              </div>
              <div className="meta-box">
                <span className="meta-cap">Originating IP</span>
                <span className="ip-badge">{selectedLog.ip_address || "Internal Network"}</span>
              </div>
            </div>

            {/* Differential Data Body */}
            <div className="al-diff-container">
              <div className="diff-heading-row">
                <h3>Recorded State Mutation</h3>
                <span className="diff-action-tag">{selectedLog.action}</span>
              </div>

              {renderAuditDiff(selectedLog.old_data, selectedLog.new_data)}
            </div>

            <div className="al-modal-footer">
              <button
                type="button"
                className="btn-modal-dismiss"
                onClick={() => setSelectedLog(null)}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;