import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIncidents } from "../services/api";
import type { Incident } from "../services/api";
import "./Incidents.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Warning: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Empty: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
};

const Incidents = () => {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
      const interval = setInterval(() => {
          setNow(Date.now());
      }, 60000);

      return () => clearInterval(interval);
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getIncidents({ search, status, priority });
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [search, status, priority]);

  // Debounced load
  useEffect(() => {
    const timer = setTimeout(() => {
      loadIncidents();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadIncidents]);

  // ── Formatters ──────────────────────────────────────────────────────
  const formatDate = (value?: string | null) => {
      if (!value) {
          return "—";
      }

      return new Date(value).toLocaleString("en-IN");
  };

  const formatDuration = (
      start?: string | null,
      end?: string | null
  ) => {
      if (!start) {
          return "—";
      }

      const startTime = new Date(start).getTime();

      const endTime = end
          ? new Date(end).getTime()
          : now;

      const difference = Math.max(
          0,
          endTime - startTime
      );

      const totalMinutes = Math.floor(
          difference / 60000
      );

      const days = Math.floor(
          totalMinutes / 1440
      );

      const hours = Math.floor(
          (totalMinutes % 1440) / 60
      );

      const minutes =
          totalMinutes % 60;

      if (days > 0) {
          return `${days}d ${hours}h ${minutes}m`;
      }

      if (hours > 0) {
          return `${hours}h ${minutes}m`;
      }

      return `${minutes}m`;
  };

  const formatStatus = (value: string) => {
    if (!value) return "";
    return value.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(" ");
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setPriority("");
  };

  return (
    <div className="incidents-page">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="header-title">
          {/* <h1>Incident Directory</h1>
          <p>View, search, and manage all organizational incidents.</p> */}
        </div>
        <button className="btn-primary" onClick={() => navigate("/incidents/new")}>
          <Icons.Plus />
          <span>Report Incident</span>
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search incident, subject, site, department, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-selects">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="content-area">
        {error ? (
          <div className="state-container error-state">
            <Icons.Warning />
            <h3>Failed to load</h3>
            <p>{error}</p>
            <button className="btn-secondary" onClick={loadIncidents}>Try Again</button>
          </div>
        ) : loading ? (
          <div className="loading-state">
            {/* Desktop Skeleton */}
            <div className="desktop-view">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-row"></div>
              ))}
            </div>
            {/* Mobile Skeleton */}
            <div className="mobile-view">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-card"></div>
              ))}
            </div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="state-container empty-state">
            <Icons.Empty />
            <h3>No incidents found</h3>
            <p>Try adjusting your search or filters to find what you're looking for.</p>
            {(search || status || priority) && (
              <button className="btn-secondary" onClick={clearFilters}>Clear Filters</button>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop Table View ── */}
            <div className="desktop-view">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Subject & Site</th>
                      <th>Route</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Reported On</th>
                      <th>Closed On</th>
                      <th>Duration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((incident) => (
                      <tr key={incident.id} onClick={() => navigate(`/incidents/${incident.id}`)} className="clickable-row">
                        <td className="font-mono"><strong>#{incident.incident_no}</strong></td>
                        <td>
                          <div className="cell-stacked">
                            <strong className="truncate-text" title={incident.subject}>{incident.subject}</strong>
                            <span className="text-muted">{incident.site_name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-stacked">
                            <span className="truncate-text" title={incident.from_department_name}>
                              <strong>Fr:</strong> {incident.from_department_name}
                            </span>
                            <span className="truncate-text" title={incident.to_department_name}>
                              <strong>To:</strong> {incident.to_department_name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-priority-${incident.priority?.toLowerCase()}`}>
                            {incident.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-status-${incident.status?.toLowerCase()}`}>
                            {formatStatus(incident.status)}
                          </span>
                        </td>
                        <td>
                          <div className="cell-stacked">
                            <span>{incident.assigned_user_name || "Unassigned"}</span>
                          </div>
                        </td>
                        <td className="text-muted text-small">{formatDate(incident.created_at)}</td>
                        <td >{formatDate(incident.closed_at)}</td>
                        <td> <span className={incident.closed_at ? "duration-closed" : "duration-running"}>{formatDuration(incident.created_at,incident.closed_at)}</span></td>
                        <td>
                          <button 
                            className="btn-icon" 
                            aria-label="View Incident"
                            onClick={(e) => { e.stopPropagation(); navigate(`/incidents/${incident.id}`); }}
                          >
                            <Icons.Eye />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Mobile Card View ── */}
            <div className="mobile-view">
              <div className="mobile-card-list">
                {incidents.map((incident) => (
                  <div key={incident.id} className="mobile-card" onClick={() => navigate(`/incidents/${incident.id}`)}>
                    <div className="m-card-header">
                      <span className="m-card-id">#{incident.incident_no}</span>
                      <div className="m-card-badges">
                        <span className={`badge badge-priority-${incident.priority?.toLowerCase()}`}>
                          {incident.priority}
                        </span>
                        <span className={`badge badge-status-${incident.status?.toLowerCase()}`}>
                          {formatStatus(incident.status)}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="m-card-title">{incident.subject}</h3>
                    <p className="m-card-site">{incident.site_name}</p>

                    <div className="m-card-route">
                      <div className="route-leg">
                        <small>From</small>
                        <span>{incident.from_department_name}</span>
                      </div>
                      <div className="route-leg">
                        <small>To</small>
                        <span>{incident.to_department_name}</span>
                      </div>
                    </div>

                    <div className="m-card-footer">
                      <div className="footer-leg">
                        <small>Assigned To</small>
                        <span>{incident.assigned_user_name || "Unassigned"}</span>
                      </div>
                      <div className="footer-leg text-right">
                        <small>Reported</small>
                        <span>{formatDate(incident.created_at).split(',')[0]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Incidents;