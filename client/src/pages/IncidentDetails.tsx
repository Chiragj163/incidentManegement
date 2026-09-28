import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getIncidentById,
  startIncidentWork,
  completeIncident,
  reviewIncident,
  assignIncident,
  getUsers,
  getCurrentUser
} from "../services/api";
import type { IncidentDetailsResponse, User } from "../services/api";
import "./IncidentDetails.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Back: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  ArrowDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  File: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Download: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  ExternalLink: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Spinner: () => (
    <svg className="details-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

const IncidentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<IncidentDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Workflow states
  const [workPerformed, setWorkPerformed] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [assignmentRemarks, setAssignmentRemarks] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cycles" | "assignments" | "status" | "updates" | "reviews">("cycles");

  const [currentUser, setCurrentUser] = useState<{
    id: number;
    userId: string;
    role: string;
    siteId: number | null;
    departmentId: number | null;
  } | null>(null);

  const loadIncident = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!id) {
        setError("Invalid incident ID.");
        return;
      }

      const result = await getIncidentById(Number(id));
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incident.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAssignableUsers = useCallback(async () => {
    if (!data?.incident) return;

    try {
      setUsersLoading(true);
      const userList = await getUsers({
        siteId: data.incident.to_site_id,
        departmentId: data.incident.to_department_id,
        subDepartmentId: data.incident.to_sub_department_id ?? undefined,
        role: "USER",
        status: "ACTIVE"
      });
      setUsers(userList);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  }, [data?.incident]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser({
        id: Number(user.id),
        userId: user.userId,
        role: user.role,
        siteId: user.siteId !== null ? Number(user.siteId) : null,
        departmentId: user.departmentId !== null ? Number(user.departmentId) : null
      });
    }
  }, []);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  useEffect(() => {
    if (
      data?.incident &&
      (data.incident.status === "REPORTED" || data.incident.status === "REOPENED")
    ) {
      loadAssignableUsers();
    }
  }, [data?.incident, loadAssignableUsers]);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!data?.incident || !selectedUser) return;
    try {
      setActionLoading(true);
      await assignIncident(data.incident.id, {
        assignedTo: Number(selectedUser),
        assignedSubDepartmentId: data.incident.to_sub_department_id ?? null,
        remarks: assignmentRemarks
      });
      setSelectedUser("");
      setAssignmentRemarks("");
      await loadIncident();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign incident.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWork = async () => {
    if (!data?.incident) return;
    try {
      setActionLoading(true);
      await startIncidentWork(data.incident.id);
      await loadIncident();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start incident work.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!data?.incident) return;
    if (!workPerformed.trim() || !resolutionDetails.trim()) {
      alert("Please fill in both work performed and resolution details.");
      return;
    }
    try {
      setActionLoading(true);
      await completeIncident(data.incident.id, {
        workPerformed,
        resolutionDetails
      });
      setWorkPerformed("");
      setResolutionDetails("");
      await loadIncident();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete incident.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (reviewResult: "APPROVED" | "REOPENED") => {
    if (!data?.incident) return;
    if (reviewResult === "REOPENED" && !reviewRemarks.trim()) {
      alert("Please enter the reason for reopening.");
      return;
    }
    try {
      setActionLoading(true);
      await reviewIncident(data.incident.id, {
        reviewResult,
        remarks: reviewRemarks
      });
      setReviewRemarks("");
      await loadIncident();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to review incident.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatStatus = (value: string) =>
    value ? value.replace(/_/g, " ") : "";

  if (loading) {
    return (
      <div className="incident-details-page">
        <div className="details-skeleton-header" />
        <div className="details-layout-grid">
          <div className="details-skeleton-main" />
          <div className="details-skeleton-sidebar" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="incident-details-page">
        <button className="btn-back" onClick={() => navigate("/incidents")}>
          <Icons.Back /> Back to Incidents
        </button>
        <div className="details-error-card">
          <Icons.AlertCircle />
          <h3>Unable to load incident</h3>
          <p>{error || "No data available."}</p>
        </div>
      </div>
    );
  }

  const { incident, assignments, resolutionCycles, reviews, statusHistory, updates, attachments } = data;
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isAssignedToMe = currentUser && Number(incident.assigned_to) === currentUser.id;
  const isReportedByMe = currentUser && Number(incident.reported_by) === currentUser.id;

  const canAssignIncident =
    isSuperAdmin ||
    (currentUser?.role === "DEPARTMENT_ADMIN" &&
      currentUser.siteId !== null &&
      currentUser.departmentId !== null &&
      Number(currentUser.siteId) === Number(incident.to_site_id) &&
      Number(currentUser.departmentId) === Number(incident.to_department_id));

  return (
    <div className="incident-details-page">
      {/* ── Top Navigation & Title Bar ── */}
      <div className="details-header-bar">
        <div className="header-nav-title">
          <button className="btn-back" onClick={() => navigate("/incidents")}>
            <Icons.Back /> <span>Incidents</span>
          </button>
          <div className="incident-title-row">
            <span className="incident-number-badge">#{incident.incident_no}</span>
            <h1 className="incident-title">{incident.subject}</h1>
          </div>
        </div>

        <div className="details-header-badges">
          <span className={`priority-pill priority-${incident.priority.toLowerCase()}`}>
            {incident.priority}
          </span>
          <span className={`status-pill status-${incident.status.toLowerCase()}`}>
            {formatStatus(incident.status)}
          </span>
        </div>
      </div>

      {/* ── Main Layout: Content & Sidebar ── */}
      <div className="details-layout-grid">
        
        {/* LEFT COLUMN: Main Information & Workflow Forms */}
        <div className="details-main-column">
          
          {/* Workflow Action Panel */}
          {currentUser && (
            <div className="workflow-card">
              <div className="workflow-card-header">
                <span className="workflow-eyebrow">Action Workbench</span>
                <h3>Operational State: {formatStatus(incident.status)}</h3>
              </div>

              {/* ACTION: Assign */}
              {(incident.status === "REPORTED" || incident.status === "REOPENED") && canAssignIncident && (
                <div className="workflow-body">
                  <p className="workflow-instructions">
                    Assign this incident to an active personnel member in the destination department.
                  </p>
                  <div className="workflow-form-grid">
                    <div className="form-field">
                      <label>Assignee</label>
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        disabled={usersLoading || actionLoading}
                      >
                        <option value="">
                          {usersLoading ? "Loading employees..." : "Select employee..."}
                        </option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.userId}) {u.designation ? `— ${u.designation}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field full-span">
                      <label>Assignment Remarks (Optional)</label>
                      <textarea
                        rows={2}
                        value={assignmentRemarks}
                        onChange={(e) => setAssignmentRemarks(e.target.value)}
                        placeholder="Add operational notes or priority context..."
                      />
                    </div>
                  </div>
                  <div className="workflow-actions">
                    <button
                      className="btn-action-primary"
                      onClick={handleAssign}
                      disabled={actionLoading || !selectedUser}
                    >
                      {actionLoading ? <><Icons.Spinner /> Assigning...</> : "Assign Incident"}
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION: Start Work */}
              {incident.status === "ASSIGNED" && isAssignedToMe && (
                <div className="workflow-body">
                  <p className="workflow-instructions">
                    You are assigned to this incident. Acknowledge and transition status to in-progress.
                  </p>
                  <div className="workflow-actions">
                    <button
                      className="btn-action-primary"
                      onClick={handleStartWork}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <><Icons.Spinner /> Updating...</> : "Start Working Now"}
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION: Complete Work */}
              {incident.status === "WORKING" && isAssignedToMe && (
                <div className="workflow-body">
                  <div className="workflow-form-grid">
                    <div className="form-field full-span">
                      <label>Work Performed</label>
                      <textarea
                        rows={3}
                        value={workPerformed}
                        onChange={(e) => setWorkPerformed(e.target.value)}
                        placeholder="Detail troubleshooting steps and actions taken..."
                      />
                    </div>
                    <div className="form-field full-span">
                      <label>Resolution Details</label>
                      <textarea
                        rows={3}
                        value={resolutionDetails}
                        onChange={(e) => setResolutionDetails(e.target.value)}
                        placeholder="Root cause, changes made, or verification tests performed..."
                      />
                    </div>
                  </div>
                  <div className="workflow-actions">
                    <button
                      className="btn-action-primary"
                      onClick={handleComplete}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <><Icons.Spinner /> Submitting...</> : "Mark Complete & Submit for Review"}
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION: Review & Close / Reopen */}
              {incident.status === "REVIEW" && isReportedByMe && (
                <div className="workflow-body">
                  <div className="workflow-form-grid">
                    <div className="form-field full-span">
                      <label>Review Assessment Remarks</label>
                      <textarea
                        rows={3}
                        value={reviewRemarks}
                        onChange={(e) => setReviewRemarks(e.target.value)}
                        placeholder="Provide feedback on the resolution quality..."
                      />
                    </div>
                  </div>
                  <div className="workflow-actions inline-actions">
                    <button
                      className="btn-action-success"
                      onClick={() => handleReview("APPROVED")}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Icons.Spinner /> : <Icons.CheckCircle />} Approve & Finish
                    </button>
                    <button
                      className="btn-action-danger"
                      onClick={() => handleReview("REOPENED")}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Icons.Spinner /> : <Icons.AlertCircle />} Reopen Incident
                    </button>
                  </div>
                </div>
              )}

              {/* Passive Notice */}
              {((incident.status === "REPORTED" && !canAssignIncident) ||
                (incident.status === "ASSIGNED" && !isAssignedToMe) ||
                (incident.status === "WORKING" && !isAssignedToMe) ||
                (incident.status === "REVIEW" && !isReportedByMe) ||
                incident.status === "FINISHED" ||
                incident.status === "CANCELLED") && (
                <div className="workflow-passive-body">
                  <span className="status-indicator-dot" />
                  <p>
                    {incident.status === "FINISHED"
                      ? "This incident has been verified and permanently closed."
                      : incident.status === "CANCELLED"
                      ? "This incident was retracted or cancelled."
                      : "No user actions are currently required from your profile."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Description Section */}
          <div className="content-card">
            <h3 className="card-section-title">Incident Description</h3>
            <div className="description-text">
              {incident.description || "No description provided."}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="content-card">
            <div className="card-header-flex">
              <h3 className="card-section-title">Attachments</h3>
              <span className="counter-pill">{attachments?.length || 0}</span>
            </div>

            {attachments && attachments.length > 0 ? (
              <div className="attachment-grid">
                {attachments.map((att) => {
                  const fileUrl = `http://localhost:5000/${att.file_path}`;
                  return (
                    <div key={att.id} className="attachment-item">
                      <div className="attachment-icon">
                        <Icons.File />
                      </div>
                      <div className="attachment-details">
                        <span className="attachment-title" title={att.file_name}>
                          {att.file_name}
                        </span>
                        <small className="attachment-meta">
                          {Math.round(att.file_size / 1024)} KB
                        </small>
                      </div>
                      <div className="attachment-actions">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon-link"
                          title="Preview"
                          aria-label="Preview attachment"
                        >
                          <Icons.ExternalLink />
                        </a>
                        <a
                          href={fileUrl}
                          download={att.file_name}
                          className="btn-icon-link"
                          title="Download"
                          aria-label="Download attachment"
                        >
                          <Icons.Download />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-quiet">No files or evidence attached.</p>
            )}
          </div>

          {/* Tabbed Audit / Activity Log */}
          <div className="content-card tabbed-card">
            <div className="tab-scroll-wrapper">
              <div className="tab-bar" role="tablist">
                <button
                  role="tab"
                  aria-selected={activeTab === "cycles"}
                  className={`tab-btn ${activeTab === "cycles" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("cycles")}
                >
                  Cycles ({resolutionCycles.length})
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === "assignments"}
                  className={`tab-btn ${activeTab === "assignments" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("assignments")}
                >
                  Assignments ({assignments.length})
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === "reviews"}
                  className={`tab-btn ${activeTab === "reviews" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("reviews")}
                >
                  Reviews ({reviews.length})
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === "status"}
                  className={`tab-btn ${activeTab === "status" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("status")}
                >
                  History ({statusHistory.length})
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === "updates"}
                  className={`tab-btn ${activeTab === "updates" ? "tab-active" : ""}`}
                  onClick={() => setActiveTab("updates")}
                >
                  Updates ({updates.length})
                </button>
              </div>
            </div>

            <div className="tab-pane">
              {/* CYCLES */}
              {activeTab === "cycles" && (
                <div className="timeline-stack">
                  {resolutionCycles.length === 0 ? (
                    <p className="empty-quiet">No resolution cycles recorded yet.</p>
                  ) : (
                    resolutionCycles.map((cycle) => (
                      <div key={cycle.id} className="cycle-item">
                        <div className="cycle-header">
                          <strong>Cycle #{cycle.cycle_number}</strong>
                          <span className={`badge-pill ${cycle.done_at ? "completed" : "pending"}`}>
                            {cycle.done_at ? "Completed" : "In Progress"}
                          </span>
                        </div>
                        <div className="cycle-details">
                          <div>
                            <span className="field-caption">Work Performed:</span>
                            <p>{cycle.work_performed || "—"}</p>
                          </div>
                          <div>
                            <span className="field-caption">Resolution:</span>
                            <p>{cycle.resolution_details || "—"}</p>
                          </div>
                        </div>
                        <div className="cycle-meta-footer">
                          <span>Resolved by: <strong>{cycle.resolved_by_name || "—"}</strong></span>
                          <span>Completed: {formatDate(cycle.done_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ASSIGNMENTS */}
              {activeTab === "assignments" && (
                <div className="timeline-stack">
                  {assignments.length === 0 ? (
                    <p className="empty-quiet">No assignment history found.</p>
                  ) : (
                    assignments.map((a) => (
                      <div key={a.id} className="timeline-entry">
                        <div className="timeline-entry-header">
                          <strong>Assigned to: {a.assigned_user_name || "Department"}</strong>
                          <small>{formatDate(a.assigned_at)}</small>
                        </div>
                        <p className="timeline-entry-author">By: {a.assigned_by_name || "System"}</p>
                        {a.remarks && <p className="timeline-entry-remarks">“{a.remarks}”</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* REVIEWS */}
              {activeTab === "reviews" && (
                <div className="timeline-stack">
                  {reviews.length === 0 ? (
                    <p className="empty-quiet">No reviews conducted yet.</p>
                  ) : (
                    reviews.map((r) => (
                      <div key={r.id} className="timeline-entry">
                        <div className="timeline-entry-header">
                          <span className={`badge-pill ${r.review_result === "APPROVED" ? "approved" : "danger"}`}>
                            {r.review_result}
                          </span>
                          <small>{formatDate(r.reviewed_at)}</small>
                        </div>
                        <p className="timeline-entry-author">Reviewer: {r.reviewed_by_name}</p>
                        {r.remarks && <p className="timeline-entry-remarks">“{r.remarks}”</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* STATUS HISTORY */}
              {activeTab === "status" && (
                <div className="status-flow-list">
                  {statusHistory.map((s) => (
                    <div key={s.id} className="status-flow-item">
                      <div className="status-transition">
                        <span className="truncate-text">{formatStatus(s.old_status || "ORIGIN")}</span>
                        <Icons.ArrowRight />
                        <strong className="truncate-text">{formatStatus(s.new_status)}</strong>
                      </div>
                      <div className="status-meta">
                        <span className="truncate-text">{s.changed_by_name || "System"}</span>
                        <small>{formatDate(s.created_at)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* UPDATES */}
              {activeTab === "updates" && (
                <div className="timeline-stack">
                  {updates.length === 0 ? (
                    <p className="empty-quiet">No periodic updates provided.</p>
                  ) : (
                    updates.map((u) => (
                      <div key={u.id} className="timeline-entry">
                        <div className="timeline-entry-header">
                          <strong>{u.update_by_name}</strong>
                          <small>{formatDate(u.created_at)}</small>
                        </div>
                        <p className="timeline-entry-remarks">{u.update_text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Metadata & Flow Summary */}
        <aside className="details-sidebar-column">
          
          {/* Routing Card */}
          <div className="content-card">
            <h3 className="card-section-title">Department Routing</h3>
            <div className="routing-tree">
              <div className="routing-node">
                <span className="routing-label">Originating Source</span>
                <strong className="truncate-text">{incident.from_department_name}</strong>
                {incident.from_sub_department_name && (
                  <small className="truncate-text">{incident.from_sub_department_name}</small>
                )}
              </div>
              <div className="routing-separator" aria-hidden="true">
                <span className="sep-desktop"><Icons.ArrowRight /></span>
                <span className="sep-mobile"><Icons.ArrowDown /></span>
              </div>
              <div className="routing-node">
                <span className="routing-label">Destination Handler</span>
                <strong className="truncate-text">{incident.to_department_name}</strong>
                {incident.to_sub_department_name && (
                  <small className="truncate-text">{incident.to_sub_department_name}</small>
                )}
              </div>
            </div>
          </div>

          {/* Key Personnel */}
          <div className="content-card">
            <h3 className="card-section-title">Personnel</h3>
            <div className="person-row">
              <span className="person-role-label">Reported By</span>
              <div className="person-meta">
                <strong className="truncate-text">{incident.reporter_name || `User #${incident.reported_by}`}</strong>
                {incident.reporter_user_id && <small className="truncate-text">{incident.reporter_user_id}</small>}
              </div>
            </div>
            <div className="person-row">
              <span className="person-role-label">Assigned To</span>
              <div className="person-meta">
                <strong className="truncate-text">{incident.assigned_user_name || "Unassigned"}</strong>
                {incident.assigned_user_id && <small className="truncate-text">{incident.assigned_user_id}</small>}
              </div>
            </div>
          </div>

          {/* Properties Summary */}
          <div className="content-card">
            <h3 className="card-section-title">Properties</h3>
            <div className="props-list">
              <div className="prop-item">
                <span>Facility Site</span>
                <strong className="truncate-text">{incident.site_name || "—"}</strong>
              </div>
              <div className="prop-item">
                <span>Reported On</span>
                <strong>{formatDate(incident.created_at)}</strong>
              </div>
              <div className="prop-item">
                <span>Last Updated</span>
                <strong>{formatDate(incident.updated_at || incident.created_at)}</strong>
              </div>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
};

export default IncidentDetails;