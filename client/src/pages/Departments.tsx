import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createDepartment,
  getDepartments,
  getSites,
  updateDepartment,
  updateDepartmentStatus
} from "../services/api";
import type { CreateDepartmentRequest, Department, Site } from "../services/api";
import "./Departments.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Layers: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Building: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
    </svg>
  ),
  User: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Power: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Spinner: () => (
    <svg className="dp-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

interface DepartmentForm {
  siteId: string;
  departmentCode: string;
  departmentName: string;
  departmentHead: string;
}

const emptyForm: DepartmentForm = {
  siteId: "",
  departmentCode: "",
  departmentName: "",
  departmentHead: ""
};

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notifications
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentForm>(emptyForm);
  const [modalError, setModalError] = useState("");

  // Status Change Confirmation Modal
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    department: Department;
    nextStatus: "ACTIVE" | "INACTIVE";
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [departmentData, siteData] = await Promise.all([
        getDepartments(),
        getSites()
      ]);

      setDepartments(departmentData);
      setSites(siteData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lock body scroll on active modal
  useEffect(() => {
    const isModalOpen = showModal || Boolean(statusConfirmTarget);
    document.body.style.overflow = isModalOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal, statusConfirmTarget]);

  // Map site names for fast lookups
  const siteMap = useMemo(() => {
    const map = new Map<number, string>();
    sites.forEach((site) => map.set(site.id, site.site_name));
    return map;
  }, [sites]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return departments.filter((department) => {
      const siteName = siteMap.get(department.site_id) || "";

      const matchesSearch =
        !query ||
        department.department_code.toLowerCase().includes(query) ||
        department.department_name.toLowerCase().includes(query) ||
        (department.department_head_name || "").toLowerCase().includes(query) ||
        siteName.toLowerCase().includes(query);

      const matchesSite = !siteFilter || String(department.site_id) === siteFilter;
      const matchesStatus = !statusFilter || department.status === statusFilter;

      return matchesSearch && matchesSite && matchesStatus;
    });
  }, [departments, siteMap, search, siteFilter, statusFilter]);

  // ── Form Modal Handlers ─────────────────────────────────────────────
  const openAddModal = () => {
    setEditingDepartment(null);
    setForm(emptyForm);
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (department: Department) => {
    setEditingDepartment(department);
    setForm({
      siteId: String(department.site_id),
      departmentCode: department.department_code,
      departmentName: department.department_name,
      departmentHead: department.department_head_name || ""
    });
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingDepartment(null);
    setForm(emptyForm);
    setModalError("");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError("");

    if (!form.siteId) {
      setModalError("Please select a valid facility site.");
      return;
    }
    if (!form.departmentCode.trim()) {
      setModalError("Department Code is required (e.g. IT, HR, ELEC).");
      return;
    }
    if (!form.departmentName.trim()) {
      setModalError("Department Name is required.");
      return;
    }

    try {
      setSaving(true);
      const payload: CreateDepartmentRequest = {
        siteId: Number(form.siteId),
        departmentCode: form.departmentCode.trim().toUpperCase(),
        departmentName: form.departmentName.trim(),
        departmentHead: form.departmentHead.trim()
      };

      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, payload);
        setSuccess(`Department "${payload.departmentName}" updated successfully.`);
      } else {
        await createDepartment(payload);
        setSuccess(`Department "${payload.departmentName}" created successfully.`);
      }

      closeModal();
      await loadData();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to save department.");
    } finally {
      setSaving(false);
    }
  };

  // ── Status Toggle Handlers ──────────────────────────────────────────
  const requestToggleStatus = (department: Department) => {
    const nextStatus = department.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusConfirmTarget({ department, nextStatus });
  };

  const confirmToggleStatus = async () => {
    if (!statusConfirmTarget) return;

    try {
      setStatusUpdating(true);
      setError("");
      setSuccess("");

      await updateDepartmentStatus(
        statusConfirmTarget.department.id,
        statusConfirmTarget.nextStatus
      );

      setSuccess(
        `Department "${statusConfirmTarget.department.department_name}" marked as ${statusConfirmTarget.nextStatus.toLowerCase()}.`
      );
      setStatusConfirmTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update department status.");
      setStatusConfirmTarget(null);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="departments-page-container">
      {/* ── Page Header ── */}
      <div className="dp-header-bar">
        <div>
          {/* <div className="dp-title-row">
            <span className="dp-title-icon" aria-hidden="true">
              <Icons.Layers />
            </span>
            <h1>Departments</h1>
          </div>
          <p className="dp-header-subtitle">
            Configure site-wise operational departments, designations, and heads
          </p> */}
        </div>

        <button type="button" className="btn-primary-action" onClick={openAddModal}>
          <Icons.Plus />
          <span>Add Department</span>
        </button>
      </div>

      {/* ── Notification Feedback ── */}
      {error && (
        <div className="dp-banner banner-danger" role="alert">
          <Icons.AlertCircle />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="dp-banner banner-success" role="alert">
          <Icons.CheckCircle />
          <span>{success}</span>
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="dp-control-bar">
        <div className="dp-search-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search code, department, site, or head..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="dp-filter-group">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            aria-label="Filter by facility site"
          >
            <option value="">All Sites ({sites.length})</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Units Only</option>
            <option value="INACTIVE">Inactive Units Only</option>
          </select>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="dp-loading-wrapper">
          <div className="dp-desktop-view">
            <div className="dp-table-skeleton">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          </div>
          <div className="dp-mobile-view">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-dept-card" />
            ))}
          </div>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="dp-empty-state">
          <div className="empty-icon-box">
            <Icons.Layers />
          </div>
          <h3>No departments found</h3>
          <p>
            {search || siteFilter || statusFilter
              ? "No departments match your active search or filter selection."
              : "No departments have been configured for your facility sites yet."}
          </p>
          {search || siteFilter || statusFilter ? (
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => {
                setSearch("");
                setSiteFilter("");
                setStatusFilter("");
              }}
            >
              Clear Filters
            </button>
          ) : (
            <button type="button" className="btn-primary-action" onClick={openAddModal}>
              <Icons.Plus /> Create First Department
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table (> 1024px) ── */}
          <div className="dp-desktop-view">
            <div className="dp-table-card">
              <table className="dp-data-table">
                <thead>
                  <tr>
                    <th>Dept Code</th>
                    <th>Department Name</th>
                    <th>Site Location</th>
                    <th>Department Head</th>
                    <th>Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((dept) => (
                    <tr key={dept.id}>
                      <td className="cell-code">
                        <strong>{dept.department_code}</strong>
                      </td>
                      <td className="cell-dept-name">
                        <strong className="truncate-text">{dept.department_name}</strong>
                      </td>
                      <td>
                        <div className="cell-meta-inline">
                          <Icons.Building />
                          <span className="truncate-text">
                            {siteMap.get(dept.site_id) || `Site #${dept.site_id}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-meta-inline">
                          <Icons.User />
                          <span className="truncate-text">
                            {dept.department_head_name || "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`dp-status-badge ${
                            dept.status === "ACTIVE" ? "badge-active" : "badge-inactive"
                          }`}
                        >
                          <span className="status-dot" />
                          {dept.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => openEditModal(dept)}
                            title="Edit department"
                            aria-label={`Edit ${dept.department_name}`}
                          >
                            <Icons.Edit />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className={`btn-table-action ${
                              dept.status === "ACTIVE" ? "action-deactivate" : "action-activate"
                            }`}
                            onClick={() => requestToggleStatus(dept)}
                            title={dept.status === "ACTIVE" ? "Deactivate department" : "Activate department"}
                            aria-label={`${dept.status === "ACTIVE" ? "Deactivate" : "Activate"} ${dept.department_name}`}
                          >
                            <Icons.Power />
                            <span>{dept.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Card View (<= 1024px) ── */}
          <div className="dp-mobile-view">
            <div className="dp-card-stack">
              {filteredDepartments.map((dept) => (
                <div key={dept.id} className="dp-mobile-card">
                  <div className="dp-mcard-top">
                    <span className="dp-mcard-code">{dept.department_code}</span>
                    <span
                      className={`dp-status-badge ${
                        dept.status === "ACTIVE" ? "badge-active" : "badge-inactive"
                      }`}
                    >
                      <span className="status-dot" />
                      {dept.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h3 className="dp-mcard-title">{dept.department_name}</h3>

                  <div className="dp-mcard-details">
                    <div className="dp-detail-row">
                      <span className="detail-label">Facility Site</span>
                      <strong className="detail-value truncate-text">
                        {siteMap.get(dept.site_id) || `Site #${dept.site_id}`}
                      </strong>
                    </div>
                    <div className="dp-detail-row">
                      <span className="detail-label">Department Head</span>
                      <span className="detail-value truncate-text">
                        {dept.department_head_name || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  <div className="dp-mcard-actions">
                    <button
                      type="button"
                      className="btn-mcard-action"
                      onClick={() => openEditModal(dept)}
                    >
                      <Icons.Edit />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-mcard-action ${
                        dept.status === "ACTIVE" ? "action-deactivate" : "action-activate"
                      }`}
                      onClick={() => requestToggleStatus(dept)}
                    >
                      <Icons.Power />
                      <span>{dept.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Add / Edit Modal Drawer ── */}
      {showModal && (
        <div
          className="dp-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="dp-modal-card">
            <div className="dp-modal-header">
              <div>
                <h2>{editingDepartment ? "Edit Department" : "Add Department"}</h2>
                {/* <p>Configure department codes, site mapping, and administrative leads</p> */}
              </div>
              <button
                type="button"
                className="dp-btn-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
              >
                <Icons.Close />
              </button>
            </div>

            {modalError && (
              <div className="dp-modal-error-alert" role="alert">
                <Icons.AlertCircle />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="dp-modal-form" noValidate>
              <div className="dp-form-stack">
                <div className="dp-field">
                  <label htmlFor="siteId">Facility Site *</label>
                  <select
                    id="siteId"
                    name="siteId"
                    value={form.siteId}
                    onChange={handleChange}
                    disabled={saving}
                    required
                  >
                    <option value="">Select facility site...</option>
                    {sites
                      .filter((s) => s.status === "ACTIVE" || String(s.id) === form.siteId)
                      .map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.site_code} — {site.site_name}
                        </option>
                      ))}
                  </select>
                  {/* <small className="field-hint">Assigns department jurisdiction to a site</small> */}
                </div>

                <div className="dp-form-grid-2">
                  <div className="dp-field">
                    <label htmlFor="departmentCode">Department Code *</label>
                    <input
                      id="departmentCode"
                      name="departmentCode"
                      value={form.departmentCode}
                      onChange={handleChange}
                      placeholder="e.g. IT, HR, MECH"
                      autoCapitalize="characters"
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="dp-field">
                    <label htmlFor="departmentName">Department Name *</label>
                    <input
                      id="departmentName"
                      name="departmentName"
                      value={form.departmentName}
                      onChange={handleChange}
                      placeholder="e.g. Information Technology"
                      disabled={saving}
                      required
                    />
                  </div>
                </div>

                <div className="dp-field">
                  <label htmlFor="departmentHead">Department Head</label>
                  <input
                    id="departmentHead"
                    name="departmentHead"
                    value={form.departmentHead}
                    onChange={handleChange}
                    placeholder="Enter full name of departmental lead"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="dp-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Icons.Spinner />
                      <span>Saving Changes...</span>
                    </>
                  ) : editingDepartment ? (
                    "Update Department"
                  ) : (
                    "Create Department"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Status Change Confirmation Modal ── */}
      {statusConfirmTarget && (
        <div
          className="dp-modal-backdrop"
          onClick={() => {
            if (!statusUpdating) setStatusConfirmTarget(null);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="dp-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-box">
              <Icons.AlertCircle />
            </div>
            <h3>
              {statusConfirmTarget.nextStatus === "ACTIVE"
                ? "Activate Department?"
                : "Deactivate Department?"}
            </h3>
            <p>
              Are you sure you want to mark{" "}
              <strong>"{statusConfirmTarget.department.department_name}"</strong> as{" "}
              <strong>{statusConfirmTarget.nextStatus.toLowerCase()}</strong>?
              {statusConfirmTarget.nextStatus === "INACTIVE" &&
                " Active incident tickets routed to this department will still be resolved, but new reporting may be restricted."}
            </p>

            <div className="confirm-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setStatusConfirmTarget(null)}
                disabled={statusUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn-confirm-execute ${
                  statusConfirmTarget.nextStatus === "ACTIVE"
                    ? "btn-execute-activate"
                    : "btn-execute-deactivate"
                }`}
                onClick={confirmToggleStatus}
                disabled={statusUpdating}
              >
                {statusUpdating ? (
                  <>
                    <Icons.Spinner />
                    <span>Updating...</span>
                  </>
                ) : (
                  `Yes, ${statusConfirmTarget.nextStatus === "ACTIVE" ? "Activate" : "Deactivate"}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}