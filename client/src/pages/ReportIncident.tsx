import { useEffect, useState,  useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  createIncident,
  getDepartments,
  getSites,
  getSubDepartments,
  uploadIncidentAttachment,
  getCurrentUser
} from "../services/api";
import type { Department, Site, SubDepartment } from "../services/api";
import "./ReportIncident.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Back: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  UploadCloud: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <polyline points="12 13 12 9 10 11" />
      <path d="m14 11-2-2" />
    </svg>
  ),
  FilePdf: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  ),
  FileImage: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Alert: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
};

const PRIORITIES: Array<{ key: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; label: string; desc: string }> = [
  { key: "LOW", label: "Low", desc: "Minimal operational friction" },
  { key: "MEDIUM", label: "Medium", desc: "Standard workflow degradation" },
  { key: "HIGH", label: "High", desc: "Direct disruption to production" },
  { key: "CRITICAL", label: "Critical", desc: "Immediate shutdown or safety hazard" }
];

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "application/pdf"];

const ReportIncident = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lists
  const [sites, setSites] = useState<Site[]>([]);
  const [fromDepartments, setFromDepartments] = useState<Department[]>([]);
  const [toDepartments, setToDepartments] = useState<Department[]>([]);
  const [fromSubDepartments, setFromSubDepartments] = useState<SubDepartment[]>([]);
  const [toSubDepartments, setToSubDepartments] = useState<SubDepartment[]>([]);

  // Selections
  const [fromSiteId, setFromSiteId] = useState("");
  const [toSiteId, setToSiteId] = useState("");
  const [fromDepartmentId, setFromDepartmentId] = useState("");
  const [fromSubDepartmentId, setFromSubDepartmentId] = useState("");
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [toSubDepartmentId, setToSubDepartmentId] = useState("");

  // Content
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [success, setSuccess] = useState("");
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  
  // ── 1. Init User & Site Check ───────────────────────────────────────
 useEffect(() => {
    if (!currentUser) {
        setError("User session not found. Please log in again.");
        return;
    }

    if (!isSuperAdmin) {
        if (
            currentUser.siteId === null ||
            currentUser.siteId === undefined
        ) {
            setError(
                "Your account is not assigned to any site. Contact an administrator."
            );
            return;
        }

        setFromSiteId(String(currentUser.siteId));
    }
}, []);
  // ── 2. Load Sites ───────────────────────────────────────────────────
    useEffect(() => {
    const loadSites = async () => {
        try {
            const data = await getSites();
            setSites(data);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("Failed to load sites");
            }
        } finally {
            setLoadingSites(false);
        }
    };

    loadSites();
}, []);
  // ── 3. Cascading: From Site -> From Depts ───────────────────────────
 useEffect(() => {
    setFromDepartmentId("");
    setFromSubDepartmentId("");
    setFromDepartments([]);
    setFromSubDepartments([]);

    if (!fromSiteId) return;

    const loadDepts = async () => {
        try {
            const data = await getDepartments(Number(fromSiteId));

            setFromDepartments(data);

            if (
                currentUser &&
                !isSuperAdmin &&
                currentUser.departmentId !== null &&
                currentUser.siteId !== null &&
                Number(currentUser.siteId) === Number(fromSiteId)
            ) {
                const departmentExists = data.some(
                    (department) =>
                        Number(department.id) ===
                        Number(currentUser.departmentId)
                );

                if (departmentExists) {
                    setFromDepartmentId(
                        String(currentUser.departmentId)
                    );
                }
            }
        } catch (err) {
            console.error(
                "Failed to load origin departments:",
                err
            );
        }
    };

    loadDepts();
}, [fromSiteId]);
  // ── 4. Cascading: To Site -> To Departments ─────────────────────────
useEffect(() => {
    setToDepartmentId("");
    setToSubDepartmentId("");
    setToDepartments([]);
    setToSubDepartments([]);

    if (!toSiteId) {
        return;
    }

    const loadDepartments = async () => {
        try {
            const data = await getDepartments(Number(toSiteId));

            setToDepartments(data);
        } catch (err) {
            console.error(
                "Failed to load target departments:",
                err
            );
        }
    };

    loadDepartments();
}, [toSiteId]);


// ── 5. Cascading: To Department -> To SubDepartments ────────────────
useEffect(() => {
    setToSubDepartmentId("");
    setToSubDepartments([]);

    if (!toDepartmentId) {
        return;
    }

    const loadSubDepartments = async () => {
        try {
            const data = await getSubDepartments(
                Number(toDepartmentId)
            );

            setToSubDepartments(data);
        } catch (err) {
            console.error(
                "Failed to load target sub-departments:",
                err
            );
        }
    };

    loadSubDepartments();
}, [toDepartmentId]);


// ── 6. Cascading: From Dept -> From SubDepts ─────────────────────────
useEffect(() => {
    setFromSubDepartmentId("");
    setFromSubDepartments([]);

    if (!fromDepartmentId) {
        return;
    }

    const loadSubDepartments = async () => {
        try {
            const data = await getSubDepartments(
                Number(fromDepartmentId)
            );

            setFromSubDepartments(data);

            if (
                currentUser &&
                !isSuperAdmin &&
                currentUser.departmentId !== null &&
                currentUser.subDepartmentId !== null &&
                Number(currentUser.departmentId) ===
                    Number(fromDepartmentId)
            ) {
                const subDepartmentExists = data.some(
                    (subDepartment) =>
                        Number(subDepartment.id) ===
                        Number(currentUser.subDepartmentId)
                );

                if (subDepartmentExists) {
                    setFromSubDepartmentId(
                        String(currentUser.subDepartmentId)
                    );
                }
            }
        } catch (err) {
            console.error(
                "Failed to load origin sub-departments:",
                err
            );
        }
    };

    loadSubDepartments();
}, [fromDepartmentId]);
  // ── File Management ─────────────────────────────────────────────────
  const validateAndAddFiles = (fileList: File[]) => {
    setFileError("");
    const validFiles: File[] = [];

    for (const file of fileList) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError(`"${file.name}" rejected: Only JPEG and PDF files are allowed.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setFileError(`"${file.name}" rejected: File exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        continue;
      }
      validFiles.push(file);
    }

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      validateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // ── Form Submission ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fromSiteId) return setError("Source site is required.");
    if (!toSiteId) return setError("Destination site is required.");
    if (!fromDepartmentId) return setError("Source department is required.");
    if (!toDepartmentId) return setError("Destination department is required.");
    if (!subject.trim()) return setError("Please specify an incident subject.");
    if (!description.trim()) return setError("Please provide a thorough incident description.");

    try {
      setLoading(true);

      const result = await createIncident({
        siteId: Number(toSiteId),
        fromSiteId: Number(fromSiteId),
        fromDepartmentId: Number(fromDepartmentId),
        fromSubDepartmentId: fromSubDepartmentId ? Number(fromSubDepartmentId) : null,
        toSiteId: Number(toSiteId),
        toDepartmentId: Number(toDepartmentId),
        toSubDepartmentId: toSubDepartmentId ? Number(toSubDepartmentId) : null,
        subject: subject.trim(),
        description: description.trim(),
        priority
      });

      const createdIncident = result.data?.incident || result.incident || result.data;
      const incidentId = createdIncident?.id || createdIncident?.incident_id;

      if (!incidentId) {
        throw new Error("Incident created but identifier could not be verified.");
      }

      if (attachments.length > 0) {
        for (const file of attachments) {
          await uploadIncidentAttachment(Number(incidentId), file);
        }
      }

      const incNum = createdIncident?.incidentNo || createdIncident?.incident_no || `#${incidentId}`;
      setSuccess(`Incident ${incNum} has been recorded successfully.`);

      setTimeout(() => {
        navigate(`/incidents/${incidentId}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record incident.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-incident-page">
      {/* ── Top Header ── */}
      <div className="report-header">
        <button type="button" className="btn-back" onClick={() => navigate("/incidents")}>
          <Icons.Back /> <span>Incidents Directory</span>
        </button>
        {/* <div className="report-title-row">
          <h1>Report New Incident</h1>
          <p>Initialize an operational ticket to escalate or re-route facility issues.</p>
        </div> */}
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="alert-banner alert-danger">
          <Icons.Alert />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert-banner alert-success">
          <Icons.Check />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="report-form">
        {/* ── SECTION 1: ROUTING PIPELINE ── */}
        <div className="form-card">
          <div className="card-header">
            <h2>1. Facility Routing Architecture</h2>
            {/* <span className="card-subtitle">Define where the issue emerged and which team resolves it</span> */}
          </div>

          <div className="routing-pipeline">
          {/* Origin Node */}
          {(currentUser?.role === "SUPER_ADMIN" ||
            currentUser?.role === "DEPARTMENT_ADMIN") && (
            <div className="routing-card origin-card">
              <div className="node-indicator">
                <span className="node-tag">Origin</span>
                <h3>From (Reporting Unit)</h3>
              </div>

              <div className="fields-stack">
                <div className="form-group">
                  <label>Facility Site *</label>
                  <select
                    value={fromSiteId}
                    onChange={(e) => setFromSiteId(e.target.value)}
                    disabled={!isSuperAdmin}
                    className={!isSuperAdmin ? "select-locked" : ""}
                  >
                    <option value="">Select source site...</option>

                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.site_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={fromDepartmentId}
                    onChange={(e) => setFromDepartmentId(e.target.value)}
                    disabled={
                      !fromSiteId ||
                      currentUser?.role !== "SUPER_ADMIN"
                    }
                  >
                    <option value="">
                      {!fromSiteId
                        ? "Select site first..."
                        : "Select department..."}
                    </option>

                    {fromDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sub-Department (Optional)</label>
                  <select
                    value={fromSubDepartmentId}
                    onChange={(e) =>
                      setFromSubDepartmentId(e.target.value)
                    }
                    disabled={
                      !fromDepartmentId ||
                      currentUser?.role !== "SUPER_ADMIN"
                    }
                  >
                    <option value="">None / General</option>

                    {fromSubDepartments.map((sd) => (
                      <option key={sd.id} value={sd.id}>
                        {sd.sub_department_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
          </div>
          )}
          {(currentUser?.role === "SUPER_ADMIN" ||
            currentUser?.role === "DEPARTMENT_ADMIN") && (
                      <div className="pipeline-connector">
                        <div className="connector-circle">
                          <Icons.ArrowRight />
                        </div>
                      </div>
          )}

            {/* Destination Node */}
            <div className="routing-card dest-card">
              <div className="node-indicator">
                <span className="node-tag dest-tag">Target</span>
                <h3>To (Handler Unit)</h3>
              </div>

              <div className="fields-stack">
                <div className="form-group">
                  <label>Facility Site *</label>
                  <select
                    value={toSiteId}
                    onChange={(e) => setToSiteId(e.target.value)}
                    disabled={
                        loadingSites
                    }
                  >
                    <option value="">Select target site...</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.site_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={toDepartmentId}
                    onChange={(e) => setToDepartmentId(e.target.value)}
                    disabled={!toSiteId}
                  >
                    <option value="">
                      {!toSiteId ? "Select site first..." : "Select department..."}
                    </option>
                    {toDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sub-Department (Optional)</label>
                  <select
                    value={toSubDepartmentId}
                    onChange={(e) => setToSubDepartmentId(e.target.value)}
                    disabled={!toDepartmentId}
                  >
                    <option value="">None / General</option>
                    {toSubDepartments.map((sd) => {
                        const isOwnSubDepartment =
                            currentUser?.role === "USER" &&
                            currentUser?.departmentId !== null &&
                            currentUser?.subDepartmentId !== null &&
                            Number(currentUser.departmentId) === Number(toDepartmentId) &&
                            Number(currentUser.subDepartmentId) === Number(sd.id);

                        return (
                            <option
                                key={sd.id}
                                value={sd.id}
                                disabled={isOwnSubDepartment}
                            >
                                {sd.sub_department_name}
                                {isOwnSubDepartment ? " (Your Sub-Department)" : ""}
                            </option>
                        );
                    })}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: INCIDENT PARAMETERS ── */}
        <div className="form-card">
          <div className="card-header">
            <h2>2. Incident Diagnostics</h2>
            {/* <span className="card-subtitle">State the nature, impact, and critical priority</span> */}
          </div>

          <div className="form-section-body">
            {/* Subject */}
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="incident-subject">Subject Summary *</label>
                <span className="char-count">{subject.length} / 250</span>
              </div>
              <input
                id="incident-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder=""
                maxLength={250}
                required
              />
            </div>

            {/* Visual Priority Selector */}
            <div className="form-group">
              <label>Urgency & Priority Classification *</label>
              <div className="priority-grid">
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPriority(p.key)}
                      className={`priority-tile priority-${p.key.toLowerCase()} ${
                        isSelected ? "selected" : ""
                      }`}
                    >
                      <div className="tile-top">
                        <span className="tile-indicator" />
                        <span className="tile-label">{p.label}</span>
                      </div>
                      <span className="tile-desc">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="incident-desc">Operational Details & Symptoms *</label>
              <textarea
                id="incident-desc"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide comprehensive details: exact location, machinery IDs, observed deviations, error codes, and immediate actions taken..."
                required
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 3: ATTACHMENTS ── */}
        <div className="form-card">
          <div className="card-header">
            <h2>3. Evidence & Documentation</h2>
            {/* <span className="card-subtitle">Attach schematics, diagnostic reports, or photos</span> */}
          </div>

          <div className="form-section-body">
            {/* Drop Zone */}
            <div
              className={`dropzone ${dragOver ? "dropzone-active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                className="hidden-file-input"
                onChange={(e) => {
                  if (e.target.files) {
                    validateAndAddFiles(Array.from(e.target.files));
                  }
                }}
              />
              <div className="dropzone-content">
                <div className="dropzone-icon">
                  <Icons.UploadCloud />
                </div>
                <div className="dropzone-text">
                  <strong>Click to browse</strong> or drag and drop files here
                </div>
                <div className="dropzone-hint">
                  Supports JPEG, JPG, and PDF up to {MAX_FILE_SIZE_MB}MB each
                </div>
              </div>
            </div>

            {fileError && (
              <div className="file-warning">
                <Icons.Alert />
                <span>{fileError}</span>
              </div>
            )}

            {/* File List */}
            {attachments.length > 0 && (
              <div className="staged-files-list">
                {attachments.map((file, idx) => {
                  const isPdf = file.type === "application/pdf";
                  return (
                    <div key={`${file.name}-${idx}`} className="staged-file-card">
                      <div className="staged-file-icon">
                        {isPdf ? <Icons.FilePdf /> : <Icons.FileImage />}
                      </div>
                      <div className="staged-file-info">
                        <span className="file-name" title={file.name}>
                          {file.name}
                        </span>
                        <span className="file-size">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • {isPdf ? "PDF Document" : "JPEG Image"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-file"
                        onClick={() => removeFile(idx)}
                        title="Remove file"
                        aria-label="Remove attachment"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── FORM CONTROLS BAR ── */}
        <div className="form-action-bar">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate("/incidents")}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Submitting Incident..." : "Dispatch Incident Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIncident;