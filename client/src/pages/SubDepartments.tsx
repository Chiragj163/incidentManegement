import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createSubDepartment,
  getDepartments,
  getSites,
  getSubDepartments,
  updateSubDepartment,
  updateSubDepartmentStatus
} from "../services/api";
import type {
  CreateSubDepartmentRequest,
  Department,
  Site,
  SubDepartment
} from "../services/api";
import "./SubDepartments.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Hierarchy: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <path d="M12 9v3" />
      <path d="M6 15v-1.5a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 1.5 1.5V15" />
    </svg>
  ),
  Building: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
    </svg>
  ),
  Department: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
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
    <svg className="sd-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

interface SubDepartmentForm {
  siteId: string;
  departmentId: string;
  subDepartmentCode: string;
  subDepartmentName: string;
  subDepartmentHead: string;
  description: string;
}

const emptyForm: SubDepartmentForm = {
  siteId: "",
  departmentId: "",
  subDepartmentCode: "",
  subDepartmentName: "",
  subDepartmentHead: "",
  description: ""
};

export default function SubDepartments() {
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notifications
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSubDepartment, setEditingSubDepartment] = useState<SubDepartment | null>(null);
  const [form, setForm] = useState<SubDepartmentForm>(emptyForm);
  const [modalError, setModalError] = useState("");

  // Status Confirmation Modal
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    subDepartment: SubDepartment;
    nextStatus: "ACTIVE" | "INACTIVE";
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [subDepartmentData, siteData, departmentData] = await Promise.all([
        getSubDepartments(),
        getSites(),
        getDepartments()
      ]);

      setSubDepartments(subDepartmentData);
      setSites(siteData);
      setDepartments(departmentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sub-departments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lock body scroll when modal or dialog is open
  useEffect(() => {
    const isModalOpen = showModal || Boolean(statusConfirmTarget);
    document.body.style.overflow = isModalOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal, statusConfirmTarget]);

  // Fast entity lookup maps
  const departmentMap = useMemo(() => {
    const map = new Map<number, Department>();
    departments.forEach((dept) => map.set(dept.id, dept));
    return map;
  }, [departments]);

  const siteMap = useMemo(() => {
    const map = new Map<number, string>();
    sites.forEach((site) => map.set(site.id, site.site_name));
    return map;
  }, [sites]);

  // Filter departments for the search bar filter based on selected site
  const departmentsForFilter = useMemo(() => {
    if (!siteFilter) return departments;
    return departments.filter((d) => String(d.site_id) === siteFilter);
  }, [departments, siteFilter]);

  // Filter active departments in the form based on chosen site
  const departmentsForForm = useMemo(() => {
    if (!form.siteId) return [];
    return departments.filter(
      (dept) =>
        String(dept.site_id) === form.siteId &&
        (dept.status === "ACTIVE" || String(dept.id) === form.departmentId)
    );
  }, [departments, form.siteId, form.departmentId]);

  // Filtered dataset for table and cards
  const filteredSubDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return subDepartments.filter((subDept) => {
      const parentDept = departmentMap.get(subDept.department_id);
      const parentSiteName = parentDept ? siteMap.get(parentDept.site_id) || "" : "";

      const matchesSearch =
        !query ||
        subDept.sub_department_code.toLowerCase().includes(query) ||
        subDept.sub_department_name.toLowerCase().includes(query) ||
        (subDept.head_name || "").toLowerCase().includes(query) ||
        (subDept.description || "").toLowerCase().includes(query) ||
        (parentDept?.department_name || "").toLowerCase().includes(query) ||
        parentSiteName.toLowerCase().includes(query);

      const matchesSite = !siteFilter || (parentDept && String(parentDept.site_id) === siteFilter);
      const matchesDept = !departmentFilter || String(subDept.department_id) === departmentFilter;
      const matchesStatus = !statusFilter || subDept.status === statusFilter;

      return matchesSearch && matchesSite && matchesDept && matchesStatus;
    });
  }, [subDepartments, departmentMap, siteMap, search, siteFilter, departmentFilter, statusFilter]);

  // ── Modal Handlers ──────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingSubDepartment(null);
    setForm(emptyForm);
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (subDept: SubDepartment) => {
    const parentDept = departmentMap.get(subDept.department_id);

    setEditingSubDepartment(subDept);
    setForm({
      siteId: parentDept ? String(parentDept.site_id) : "",
      departmentId: String(subDept.department_id),
      subDepartmentCode: subDept.sub_department_code,
      subDepartmentName: subDept.sub_department_name,
      subDepartmentHead: subDept.head_name || "",
      description: subDept.description || ""
    });
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingSubDepartment(null);
    setForm(emptyForm);
    setModalError("");
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSiteChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const siteId = e.target.value;
    setForm((prev) => ({
      ...prev,
      siteId,
      departmentId: ""
    }));
  };

  const handleFilterSiteChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSiteFilter(e.target.value);
    setDepartmentFilter("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError("");

    if (!form.siteId) {
      setModalError("Please select a facility site.");
      return;
    }
    if (!form.departmentId) {
      setModalError("Please select a parent department.");
      return;
    }
    if (!form.subDepartmentCode.trim()) {
      setModalError("Sub-department code is required (e.g. NET, SEC, CIV).");
      return;
    }
    if (!form.subDepartmentName.trim()) {
      setModalError("Sub-department name is required.");
      return;
    }

    try {
      setSaving(true);
      const payload: CreateSubDepartmentRequest = {
        departmentId: Number(form.departmentId),
        subDepartmentCode: form.subDepartmentCode.trim().toUpperCase(),
        subDepartmentName: form.subDepartmentName.trim(),
        subDepartmentHead: form.subDepartmentHead.trim(),
        description: form.description.trim()
      };

      if (editingSubDepartment) {
        await updateSubDepartment(editingSubDepartment.id, payload);
        setSuccess(`Sub-department "${payload.subDepartmentName}" updated successfully.`);
      } else {
        await createSubDepartment(payload);
        setSuccess(`Sub-department "${payload.subDepartmentName}" registered successfully.`);
      }

      closeModal();
      await loadData();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to save sub-department.");
    } finally {
      setSaving(false);
    }
  };

  // ── Status Confirmation Handlers ────────────────────────────────────
  const requestToggleStatus = (subDept: SubDepartment) => {
    const nextStatus = subDept.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusConfirmTarget({ subDepartment: subDept, nextStatus });
  };

  const confirmToggleStatus = async () => {
    if (!statusConfirmTarget) return;

    try {
      setStatusUpdating(true);
      setError("");
      setSuccess("");

      await updateSubDepartmentStatus(
        statusConfirmTarget.subDepartment.id,
        statusConfirmTarget.nextStatus
      );

      setSuccess(
        `Sub-department "${statusConfirmTarget.subDepartment.sub_department_name}" marked as ${statusConfirmTarget.nextStatus.toLowerCase()}.`
      );
      setStatusConfirmTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update sub-department status.");
      setStatusConfirmTarget(null);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="sub-departments-container">
      {/* ── Top Header Toolbar ── */}
      <div className="sd-header-bar">
        <div>
          {/* <div className="sd-title-row">
            <span className="sd-title-icon" aria-hidden="true">
              <Icons.Hierarchy />
            </span>
            <h1>Sub-Departments</h1>
          </div>
          <p className="sd-header-subtitle">
            Configure specialized operational teams, units, and localized functional leads
          </p> */}
        </div>

        <button type="button" className="btn-primary-action" onClick={openAddModal}>
          <Icons.Plus />
          <span>Add Sub-Department</span>
        </button>
      </div>

      {/* ── Notification Feedback ── */}
      {error && (
        <div className="sd-banner banner-danger" role="alert">
          <Icons.AlertCircle />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="sd-banner banner-success" role="alert">
          <Icons.CheckCircle />
          <span>{success}</span>
        </div>
      )}

      {/* ── Multi-Filter Control Bar ── */}
      <div className="sd-control-bar">
        <div className="sd-search-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search code, team name, parent dept, site, or lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="sd-filter-group">
          {/* Site Filter */}
          <select
            value={siteFilter}
            onChange={handleFilterSiteChange}
            aria-label="Filter by facility site"
          >
            <option value="">All Sites ({sites.length})</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name}
              </option>
            ))}
          </select>

          {/* Department Filter (Cascades with Site Filter) */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by parent department"
          >
            <option value="">
              {siteFilter ? "All Departments at Site" : "All Departments"}
            </option>
            {departmentsForFilter.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.department_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by operational status"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Units Only</option>
            <option value="INACTIVE">Inactive Units Only</option>
          </select>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="sd-loading-wrapper">
          <div className="sd-desktop-view">
            <div className="sd-table-skeleton">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          </div>
          <div className="sd-mobile-view">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-subdept-card" />
            ))}
          </div>
        </div>
      ) : filteredSubDepartments.length === 0 ? (
        <div className="sd-empty-state">
          <div className="empty-icon-box">
            <Icons.Hierarchy />
          </div>
          <h3>No sub-departments found</h3>
          <p>
            {search || siteFilter || departmentFilter || statusFilter
              ? "No sub-departments match your active search or filter parameters."
              : "No specialized sub-department teams have been registered in the system yet."}
          </p>
          {search || siteFilter || departmentFilter || statusFilter ? (
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => {
                setSearch("");
                setSiteFilter("");
                setDepartmentFilter("");
                setStatusFilter("");
              }}
            >
              Clear Filters
            </button>
          ) : (
            <button type="button" className="btn-primary-action" onClick={openAddModal}>
              <Icons.Plus /> Register First Sub-Department
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table (> 1024px) ── */}
          <div className="sd-desktop-view">
            <div className="sd-table-card">
              <table className="sd-data-table">
                <thead>
                  <tr>
                    <th>Sub-Dept Code</th>
                    <th>Sub-Department Team</th>
                    <th>Hierarchy Mapping</th>
                    <th>Team Lead</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubDepartments.map((subDept) => {
                    const parentDept = departmentMap.get(subDept.department_id);
                    const parentSite = parentDept ? siteMap.get(parentDept.site_id) : null;

                    return (
                      <tr key={subDept.id}>
                        <td className="cell-code">
                          <strong>{subDept.sub_department_code}</strong>
                        </td>
                        <td className="cell-team-name">
                          <strong className="truncate-text">{subDept.sub_department_name}</strong>
                        </td>
                        <td>
                          <div className="hierarchy-pill-stack">
                            <span className="hierarchy-pill site-pill truncate-text" title={parentSite || "Site"}>
                              <Icons.Building /> {parentSite || "Unknown Site"}
                            </span>
                            <span className="hierarchy-pill dept-pill truncate-text" title={parentDept?.department_name || "Department"}>
                              <Icons.Department /> {parentDept?.department_name || "Unknown Dept"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-meta-inline">
                            <Icons.User />
                            <span className="truncate-text">{subDept.head_name || "Unassigned"}</span>
                          </div>
                        </td>
                        <td className="cell-description">
                          <span className="truncate-text" title={subDept.description || ""}>
                            {subDept.description || "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`sd-status-badge ${
                              subDept.status === "ACTIVE" ? "badge-active" : "badge-inactive"
                            }`}
                          >
                            <span className="status-dot" />
                            {subDept.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="cell-actions">
                          <div className="action-button-group">
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => openEditModal(subDept)}
                              title="Edit sub-department"
                              aria-label={`Edit ${subDept.sub_department_name}`}
                            >
                              <Icons.Edit />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className={`btn-table-action ${
                                subDept.status === "ACTIVE" ? "action-deactivate" : "action-activate"
                              }`}
                              onClick={() => requestToggleStatus(subDept)}
                              title={subDept.status === "ACTIVE" ? "Deactivate unit" : "Activate unit"}
                              aria-label={`${subDept.status === "ACTIVE" ? "Deactivate" : "Activate"} ${subDept.sub_department_name}`}
                            >
                              <Icons.Power />
                              <span>{subDept.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Card View (<= 1024px) ── */}
          <div className="sd-mobile-view">
            <div className="sd-card-stack">
              {filteredSubDepartments.map((subDept) => {
                const parentDept = departmentMap.get(subDept.department_id);
                const parentSite = parentDept ? siteMap.get(parentDept.site_id) : null;

                return (
                  <div key={subDept.id} className="sd-mobile-card">
                    <div className="sd-mcard-top">
                      <span className="sd-mcard-code">{subDept.sub_department_code}</span>
                      <span
                        className={`sd-status-badge ${
                          subDept.status === "ACTIVE" ? "badge-active" : "badge-inactive"
                        }`}
                      >
                        <span className="status-dot" />
                        {subDept.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <h3 className="sd-mcard-title">{subDept.sub_department_name}</h3>

                    {subDept.description && (
                      <p className="sd-mcard-desc">{subDept.description}</p>
                    )}

                    <div className="sd-mcard-details">
                      <div className="sd-detail-row">
                        <span className="detail-label">Facility Site</span>
                        <strong className="detail-value truncate-text">
                          {parentSite || "Unknown Site"}
                        </strong>
                      </div>
                      <div className="sd-detail-row">
                        <span className="detail-label">Department</span>
                        <strong className="detail-value truncate-text">
                          {parentDept?.department_name || "Unknown Dept"}
                        </strong>
                      </div>
                      <div className="sd-detail-row">
                        <span className="detail-label">Team Lead</span>
                        <span className="detail-value truncate-text">
                          {subDept.head_name || "Unassigned"}
                        </span>
                      </div>
                    </div>

                    <div className="sd-mcard-actions">
                      <button
                        type="button"
                        className="btn-mcard-action"
                        onClick={() => openEditModal(subDept)}
                      >
                        <Icons.Edit />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className={`btn-mcard-action ${
                          subDept.status === "ACTIVE" ? "action-deactivate" : "action-activate"
                        }`}
                        onClick={() => requestToggleStatus(subDept)}
                      >
                        <Icons.Power />
                        <span>{subDept.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Add / Edit Modal Drawer ── */}
      {showModal && (
        <div
          className="sd-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="sd-modal-card">
            <div className="sd-modal-header">
              <div>
                <h2>{editingSubDepartment ? "Edit Sub-Department" : "Add Sub-Department"}</h2>
                {/* <p>Configure operational hierarchy, departmental alignment, and team leads</p> */}
              </div>
              <button
                type="button"
                className="sd-btn-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
              >
                <Icons.Close />
              </button>
            </div>

            {modalError && (
              <div className="sd-modal-error-alert" role="alert">
                <Icons.AlertCircle />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="sd-modal-form" noValidate>
              <div className="sd-form-stack">
                <div className="sd-form-grid-2">
                  {/* Site Selector */}
                  <div className="sd-field">
                    <label htmlFor="form-siteId">Facility Site *</label>
                    <select
                      id="form-siteId"
                      name="siteId"
                      value={form.siteId}
                      onChange={handleFormSiteChange}
                      disabled={saving}
                      required
                    >
                      <option value="">Select site...</option>
                      {sites
                        .filter((s) => s.status === "ACTIVE" || String(s.id) === form.siteId)
                        .map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.site_code} — {site.site_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Parent Department Selector */}
                  <div className="sd-field">
                    <label htmlFor="form-departmentId">Parent Department *</label>
                    <select
                      id="form-departmentId"
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleChange}
                      disabled={saving || !form.siteId}
                      required
                    >
                      <option value="">
                        {!form.siteId ? "Select site first..." : "Select department..."}
                      </option>
                      {departmentsForForm.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.department_code} — {dept.department_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sd-form-grid-2">
                  <div className="sd-field">
                    <label htmlFor="subDepartmentCode">Sub-Dept Code *</label>
                    <input
                      id="subDepartmentCode"
                      name="subDepartmentCode"
                      value={form.subDepartmentCode}
                      onChange={handleChange}
                      placeholder="e.g. NET, SEC, FAB"
                      autoCapitalize="characters"
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="sd-field">
                    <label htmlFor="subDepartmentName">Sub-Department Name *</label>
                    <input
                      id="subDepartmentName"
                      name="subDepartmentName"
                      value={form.subDepartmentName}
                      onChange={handleChange}
                      placeholder="e.g. Network Infrastructure"
                      disabled={saving}
                      required
                    />
                  </div>
                </div>

                <div className="sd-field">
                  <label htmlFor="subDepartmentHead">Team / Unit Lead</label>
                  <input
                    id="subDepartmentHead"
                    name="subDepartmentHead"
                    value={form.subDepartmentHead}
                    onChange={handleChange}
                    placeholder="Enter full name of unit lead or supervisor"
                    disabled={saving}
                  />
                </div>

                <div className="sd-field">
                  <label htmlFor="description">Scope & Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe operational responsibilities, machinery domains, or jurisdictional coverage..."
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="sd-modal-actions">
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
                  ) : editingSubDepartment ? (
                    "Update Sub-Department"
                  ) : (
                    "Create Sub-Department"
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
          className="sd-modal-backdrop"
          onClick={() => {
            if (!statusUpdating) setStatusConfirmTarget(null);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="sd-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-box">
              <Icons.AlertCircle />
            </div>
            <h3>
              {statusConfirmTarget.nextStatus === "ACTIVE"
                ? "Activate Sub-Department?"
                : "Deactivate Sub-Department?"}
            </h3>
            <p>
              Are you sure you want to mark{" "}
              <strong>"{statusConfirmTarget.subDepartment.sub_department_name}"</strong> as{" "}
              <strong>{statusConfirmTarget.nextStatus.toLowerCase()}</strong>?
              {statusConfirmTarget.nextStatus === "INACTIVE" &&
                " Active employee routing and incident categorization for this unit may be restricted."}
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