import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createUser,
  getDepartments,
  getSites,
  getSubDepartments,
  getUsers,
  getCurrentUser,
  updateUser,
  updateUserStatus
} from "../services/api";
import type {
  CreateUserRequest,
  Department,
  Site,
  SubDepartment,
  User
} from "../services/api";
import "./Users.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  Building: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
    </svg>
  ),
  Department: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Shield: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
    <svg className="usr-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

interface UserForm {
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  roleCode: string;
  siteId: string;
  departmentId: string;
  subDepartmentId: string;
  designation: string;
}

const emptyForm: UserForm = {
  userId: "",
  employeeCode: "",
  fullName: "",
  email: "",
  mobile: "",
  password: "",
  roleCode: "USER",
  siteId: "",
  departmentId: "",
  subDepartmentId: "",
  designation: ""
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string; siteId: number | null; departmentId: number | null; subDepartmentId: number | null; } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notifications
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [subDepartmentFilter, setSubDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [modalError, setModalError] = useState("");

  // Status Change Confirmation Modal
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    user: User;
    nextStatus: "ACTIVE" | "INACTIVE";
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isDepartmentAdmin = currentUser?.role === "DEPARTMENT_ADMIN";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [userData, siteData, departmentData, subDepartmentData] = await Promise.all([
        getUsers(),
        getSites(),
        getDepartments(),
        getSubDepartments()
      ]);

      setUsers(userData);
      setSites(siteData);
      setDepartments(departmentData);
      setSubDepartments(subDepartmentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser({
        id: Number(user.id),
        role: user.role,
        siteId: user.siteId != null ? Number(user.siteId) : null,
        departmentId:
          user.departmentId != null
            ? Number(user.departmentId)
            : null,
        subDepartmentId:
          user.subDepartmentId != null
            ? Number(user.subDepartmentId)
            : null,
      });
    }
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

  // Cascading filters for search toolbar
  const filteredDepartmentsForFilter = useMemo(() => {
    if (!siteFilter) return departments;
    return departments.filter((d) => String(d.site_id) === siteFilter);
  }, [departments, siteFilter]);

  const filteredSubDepartmentsForFilter = useMemo(() => {
    if (!departmentFilter) return subDepartments;
    return subDepartments.filter((sd) => String(sd.department_id) === departmentFilter);
  }, [subDepartments, departmentFilter]);

  // Cascading lists for the modal form
  const formDepartments = useMemo(() => {
    if (!form.siteId) return [];
    return departments.filter(
      (dept) =>
        String(dept.site_id) === form.siteId &&
        (dept.status === "ACTIVE" || String(dept.id) === form.departmentId)
    );
  }, [departments, form.siteId, form.departmentId]);

  const formSubDepartments = useMemo(() => {
    if (!form.departmentId) return [];
    return subDepartments.filter(
      (subDept) =>
        String(subDept.department_id) === form.departmentId &&
        (subDept.status === "ACTIVE" || String(subDept.id) === form.subDepartmentId)
    );
  }, [subDepartments, form.departmentId, form.subDepartmentId]);

  // Master filtered list
  const filteredUsers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return users.filter((u) => {
      const matchesSearch =
        !text ||
        u.userId.toLowerCase().includes(text) ||
        u.employeeCode.toLowerCase().includes(text) ||
        u.fullName.toLowerCase().includes(text) ||
        (u.email || "").toLowerCase().includes(text) ||
        (u.designation || "").toLowerCase().includes(text) ||
        (u.departmentName || "").toLowerCase().includes(text) ||
        (u.siteName || "").toLowerCase().includes(text);

      const matchesSite = !siteFilter || String(u.siteId) === siteFilter;
      const matchesDepartment = !departmentFilter || String(u.departmentId) === departmentFilter;
      const matchesSubDepartment = !subDepartmentFilter || String(u.subDepartmentId) === subDepartmentFilter;
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus = !statusFilter || u.status === statusFilter;

      return (
        matchesSearch &&
        matchesSite &&
        matchesDepartment &&
        matchesSubDepartment &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [users, search, siteFilter, departmentFilter, subDepartmentFilter, roleFilter, statusFilter]);

  // ── Modal Handlers ──────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      roleCode: "USER",

      siteId:
        isDepartmentAdmin && currentUser?.siteId != null
          ? String(currentUser.siteId)
          : "",

      departmentId:
        isDepartmentAdmin && currentUser?.departmentId != null
          ? String(currentUser.departmentId)
          : "",

      subDepartmentId: "",
    });
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (targetUser: User) => {
    setEditingUser(targetUser);
    setForm({
      userId: targetUser.userId,
      employeeCode: targetUser.employeeCode || "",
      fullName: targetUser.fullName,
      email: targetUser.email || "",
      mobile: targetUser.mobile || "",
      password: "",
      roleCode: targetUser.role,
      siteId: targetUser.siteId !== null ? String(targetUser.siteId) : "",
      departmentId: targetUser.departmentId !== null ? String(targetUser.departmentId) : "",
      subDepartmentId: targetUser.subDepartmentId !== null ? String(targetUser.subDepartmentId) : "",
      designation: targetUser.designation || ""
    });
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
    setModalError("");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSiteChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({
      ...prev,
      siteId: e.target.value,
      departmentId: "",
      subDepartmentId: ""
    }));
  };

  const handleDepartmentChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({
      ...prev,
      departmentId: e.target.value,
      subDepartmentId: ""
    }));
  };

  const handleFilterSiteChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSiteFilter(e.target.value);
    setDepartmentFilter("");
    setSubDepartmentFilter("");
  };

  const handleFilterDepartmentChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setDepartmentFilter(e.target.value);
    setSubDepartmentFilter("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError("");

    if (!form.userId.trim()) {
      setModalError("SAP / User ID is required.");
      return;
    }
    if (!form.fullName.trim()) {
      setModalError("Full name is required.");
      return;
    }
    if (!editingUser && !form.password.trim()) {
      setModalError("Initial temporary password is required.");
      return;
    }
    if (!form.roleCode) {
      setModalError("System role is required.");
      return;
    }
    if (!form.siteId) {
      setModalError("Facility site mapping is required.");
      return;
    }
    if ((form.roleCode === "USER" || form.roleCode === "DEPARTMENT_ADMIN") && !form.departmentId) {
      setModalError("Department is required for this role assignment.");
      return;
    }
    if (form.roleCode === "USER" && !form.subDepartmentId) {
      setModalError("Sub-department unit is required for standard users.");
      return;
    }

    try {
      setSaving(true);
      const payload: CreateUserRequest = {
        userId: form.userId.trim(),
        employeeCode: form.employeeCode.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        roleCode: form.roleCode,
        siteId: Number(form.siteId),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        subDepartmentId: form.subDepartmentId ? Number(form.subDepartmentId) : null,
        designation: form.designation.trim()
      };

      if (!editingUser) {
        payload.password = form.password;
        await createUser(payload);
        setSuccess(`Employee "${payload.fullName}" registered successfully.`);
      } else {
        await updateUser(editingUser.id, payload);
        setSuccess(`User profile "${payload.fullName}" updated successfully.`);
      }

      closeModal();
      await loadData();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to save user account.");
    } finally {
      setSaving(false);
    }
  };

  // ── Status Toggle Handlers ──────────────────────────────────────────
  const requestToggleStatus = (targetUser: User) => {
    if (currentUser && targetUser.id === currentUser.id) {
      setError("Security violation: You cannot deactivate your own administrative account.");
      return;
    }
    const nextStatus = targetUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusConfirmTarget({ user: targetUser, nextStatus });
  };

  const confirmToggleStatus = async () => {
    if (!statusConfirmTarget) return;

    try {
      setStatusUpdating(true);
      setError("");
      setSuccess("");

      await updateUserStatus(statusConfirmTarget.user.id, statusConfirmTarget.nextStatus);

      setSuccess(
        `User account "${statusConfirmTarget.user.fullName}" marked as ${statusConfirmTarget.nextStatus.toLowerCase()}.`
      );
      setStatusConfirmTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account status.");
      setStatusConfirmTarget(null);
    } finally {
      setStatusUpdating(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "role-super-admin";
      case "DEPARTMENT_ADMIN":
        return "role-dept-admin";
      default:
        return "role-user";
    }
  };

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "DEPARTMENT_ADMIN":
        return "Dept Admin";
      default:
        return "User";
    }
  };

  return (
    <div className="users-page-container">
      {/* ── Top Header Toolbar ── */}
      <div className="usr-header-bar">
        <div>
          {/* <div className="usr-title-row">
            <span className="usr-title-icon" aria-hidden="true">
              <Icons.Users />
            </span>
            <h1>Employee Directory</h1>
          </div>
          <p className="usr-header-subtitle">
            Manage user accounts, corporate SAP IDs, credential access, and organizational hierarchy
          </p> */}
        </div>

        <button type="button" className="btn-primary-action" onClick={openAddModal}>
          <Icons.Plus />
          <span>Register User</span>
        </button>
      </div>

      {/* ── Notification Feedback ── */}
      {error && (
        <div className="usr-banner banner-danger" role="alert">
          <Icons.AlertCircle />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="usr-banner banner-success" role="alert">
          <Icons.CheckCircle />
          <span>{success}</span>
        </div>
      )}

      {/* ── Multi-Filter Control Bar ── */}
      <div className="usr-control-bar">
        <div className="usr-search-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search by SAP ID, name, code, email, designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="usr-filter-group">
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

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={handleFilterDepartmentChange}
            aria-label="Filter by department"
          >
            <option value="">
              {siteFilter ? "All Departments at Site" : "All Departments"}
            </option>
            {filteredDepartmentsForFilter.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.department_name}
              </option>
            ))}
          </select>

          {/* Sub-Department Filter */}
          <select
            value={subDepartmentFilter}
            onChange={(e) => setSubDepartmentFilter(e.target.value)}
            aria-label="Filter by sub-department"
          >
            <option value="">All Sub-Departments</option>
            {filteredSubDepartmentsForFilter.map((sd) => (
              <option key={sd.id} value={sd.id}>
                {sd.sub_department_name}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by access role"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="DEPARTMENT_ADMIN">Department Admin</option>
            <option value="USER">Standard User</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by operational status"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Personnel</option>
            <option value="INACTIVE">Deactivated</option>
          </select>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="usr-loading-wrapper">
          <div className="usr-desktop-view">
            <div className="usr-table-skeleton">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          </div>
          <div className="usr-mobile-view">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-user-card" />
            ))}
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="usr-empty-state">
          <div className="empty-icon-box">
            <Icons.Users />
          </div>
          <h3>No employee accounts found</h3>
          <p>
            {search || siteFilter || departmentFilter || subDepartmentFilter || roleFilter || statusFilter
              ? "No accounts match your active search and filter combinations."
              : "No user accounts have been registered in the system yet."}
          </p>
          {search || siteFilter || departmentFilter || subDepartmentFilter || roleFilter || statusFilter ? (
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => {
                setSearch("");
                setSiteFilter("");
                setDepartmentFilter("");
                setSubDepartmentFilter("");
                setRoleFilter("");
                setStatusFilter("");
              }}
            >
              Clear Filters
            </button>
          ) : (
            <button type="button" className="btn-primary-action" onClick={openAddModal}>
              <Icons.Plus /> Register First Employee
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table (> 1024px) ── */}
          <div className="usr-desktop-view">
            <div className="usr-table-card">
              <table className="usr-data-table">
                <thead>
                  <tr>
                    <th>Employee Details</th>
                    <th>SAP / User ID</th>
                    <th>Organizational Hierarchy</th>
                    <th>System Role</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const initials = user.fullName
                      ? user.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "U";

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="user-profile-cell">
                            <div className="user-avatar-circle" aria-hidden="true">
                              {initials}
                            </div>
                            <div className="user-name-meta">
                              <strong className="truncate-text">{user.fullName}</strong>
                              <span className="user-email-text truncate-text">
                                {user.email || "No email on record"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="cell-id">
                          <strong>{user.userId}</strong>
                          {user.employeeCode && (
                            <span className="cell-subcode">{user.employeeCode}</span>
                          )}
                        </td>
                        <td>
                          <div className="hierarchy-pill-stack">
                            <span className="hierarchy-pill site-pill truncate-text" title={user.siteName || "Site"}>
                              <Icons.Building /> {user.siteName || "Unassigned Site"}
                            </span>
                            <span className="hierarchy-pill dept-pill truncate-text" title={user.departmentName || "Dept"}>
                              <Icons.Department /> {user.departmentName || "General Dept"}
                            </span>
                            {user.subDepartmentName && (
                              <span className="hierarchy-pill subdept-pill truncate-text" title={user.subDepartmentName}>
                                {user.subDepartmentName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                            <Icons.Shield />
                            <span>{formatRoleLabel(user.role)}</span>
                          </span>
                        </td>
                        <td className="cell-designation">
                          <span className="truncate-text" title={user.designation || ""}>
                            {user.designation || "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`usr-status-badge ${
                              user.status === "ACTIVE" ? "badge-active" : "badge-inactive"
                            }`}
                          >
                            <span className="status-dot" />
                            {user.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="cell-actions">
                          <div className="action-button-group">
                            <button
                              type="button"
                              className="btn-table-action"
                              onClick={() => openEditModal(user)}
                              title="Edit user profile"
                              aria-label={`Edit ${user.fullName}`}
                            >
                              <Icons.Edit />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className={`btn-table-action ${
                                user.status === "ACTIVE" ? "action-deactivate" : "action-activate"
                              }`}
                              onClick={() => requestToggleStatus(user)}
                              title={user.status === "ACTIVE" ? "Deactivate account" : "Activate account"}
                              aria-label={`${user.status === "ACTIVE" ? "Deactivate" : "Activate"} ${user.fullName}`}
                            >
                              <Icons.Power />
                              <span>{user.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
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
          <div className="usr-mobile-view">
            <div className="usr-card-stack">
              {filteredUsers.map((user) => {
                const initials = user.fullName
                  ? user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "U";

                return (
                  <div key={user.id} className="usr-mobile-card">
                    <div className="usr-mcard-top">
                      <div className="usr-mcard-profile">
                        <div className="user-avatar-circle" aria-hidden="true">
                          {initials}
                        </div>
                        <div>
                          <h3 className="usr-mcard-name">{user.fullName}</h3>
                          <span className="usr-mcard-id">ID: {user.userId}</span>
                        </div>
                      </div>

                      <span
                        className={`usr-status-badge ${
                          user.status === "ACTIVE" ? "badge-active" : "badge-inactive"
                        }`}
                      >
                        <span className="status-dot" />
                        {user.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="usr-mcard-badges">
                      <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                        <Icons.Shield />
                        <span>{formatRoleLabel(user.role)}</span>
                      </span>
                      {user.designation && (
                        <span className="mcard-designation-tag truncate-text">
                          {user.designation}
                        </span>
                      )}
                    </div>

                    <div className="usr-mcard-details">
                      <div className="usr-detail-row">
                        <span className="detail-label">Site</span>
                        <strong className="detail-value truncate-text">
                          {user.siteName || "Unassigned"}
                        </strong>
                      </div>
                      <div className="usr-detail-row">
                        <span className="detail-label">Department</span>
                        <strong className="detail-value truncate-text">
                          {user.departmentName || "General"}
                        </strong>
                      </div>
                      {user.subDepartmentName && (
                        <div className="usr-detail-row">
                          <span className="detail-label">Sub-Dept</span>
                          <span className="detail-value truncate-text">
                            {user.subDepartmentName}
                          </span>
                        </div>
                      )}
                      {user.email && (
                        <div className="usr-detail-row">
                          <span className="detail-label">Email</span>
                          <span className="detail-value truncate-text">{user.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="usr-mcard-actions">
                      <button
                        type="button"
                        className="btn-mcard-action"
                        onClick={() => openEditModal(user)}
                      >
                        <Icons.Edit />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className={`btn-mcard-action ${
                          user.status === "ACTIVE" ? "action-deactivate" : "action-activate"
                        }`}
                        onClick={() => requestToggleStatus(user)}
                      >
                        <Icons.Power />
                        <span>{user.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
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
          className="usr-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="usr-modal-card">
            <div className="usr-modal-header">
              <div>
                <h2>{editingUser ? "Edit Employee Account" : "Register Employee Account"}</h2>
                {/* <p>Configure credential identifiers, system privileges, and organizational units</p> */}
              </div>
              <button
                type="button"
                className="usr-btn-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
              >
                <Icons.Close />
              </button>
            </div>

            {modalError && (
              <div className="usr-modal-error-alert" role="alert">
                <Icons.AlertCircle />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="usr-modal-form" noValidate>
              <div className="usr-form-stack">
                {/* Identification */}
                <div className="usr-form-grid-2">
                  <div className="usr-field">
                    <label htmlFor="form-userId">SAP / User ID *</label>
                    <input
                      id="form-userId"
                      name="userId"
                      value={form.userId}
                      onChange={handleChange}
                      placeholder="e.g. 1004821"
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="usr-field">
                    <label htmlFor="form-employeeCode">Employee Code</label>
                    <input
                      id="form-employeeCode"
                      name="employeeCode"
                      value={form.employeeCode}
                      onChange={handleChange}
                      placeholder="e.g. EMP-9921"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="usr-field">
                  <label htmlFor="form-fullName">Full Name *</label>
                  <input
                    id="form-fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Enter full employee name"
                    disabled={saving}
                    required
                  />
                </div>

                {/* Contact */}
                <div className="usr-form-grid-2">
                  <div className="usr-field">
                    <label htmlFor="form-email">Email Address</label>
                    <input
                      id="form-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="employee@domain.com"
                      disabled={saving}
                    />
                  </div>

                  <div className="usr-field">
                    <label htmlFor="form-mobile">Mobile Number</label>
                    <input
                      id="form-mobile"
                      type="tel"
                      name="mobile"
                      value={form.mobile}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Password only when creating */}
                {!editingUser && (
                  <div className="usr-field">
                    <label htmlFor="form-password">Initial Temporary Password *</label>
                    <input
                      id="form-password"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Assign secure temporary password"
                      disabled={saving}
                      required
                    />
                    <small className="field-hint">User will be prompted to reset upon first login</small>
                  </div>
                )}

                {/* Role */}
                <div className="usr-field">
                  <label htmlFor="form-roleCode">System Access Role *</label>
                  <select
                    id="form-roleCode"
                    name="roleCode"
                    value={form.roleCode}
                    onChange={handleChange}
                    disabled={saving || isDepartmentAdmin}
                    required
                  >
                    {isSuperAdmin && (
                      <>
                        <option value="SUPER_ADMIN">Super Administrator (Full System Scope)</option>
                        <option value="DEPARTMENT_ADMIN">Department Administrator (Dept Scope)</option>
                      </>
                    )}
                    <option value="USER">Standard User (Incident Management Scope)</option>
                  </select>
                  {isDepartmentAdmin && (
                    <small className="field-hint">Department Administrators can register standard users only</small>
                  )}
                </div>

                {/* Site */}
                <div className="usr-field">
                  <label htmlFor="form-siteId">Facility Site *</label>
                  <select
                    id="form-siteId"
                    name="siteId"
                    value={form.siteId}
                    onChange={handleSiteChange}
                    disabled={saving || isDepartmentAdmin}
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
                </div>

                {/* Department & Sub-Department Grid */}
                <div className="usr-form-grid-2">
                  <div className="usr-field">
                    <label htmlFor="form-departmentId">
                      Department {form.roleCode !== "SUPER_ADMIN" ? "*" : "(Optional)"}
                    </label>
                    <select
                      id="form-departmentId"
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleDepartmentChange}
                      disabled={saving || !form.siteId || isDepartmentAdmin}
                      required={form.roleCode !== "SUPER_ADMIN"}
                    >
                      <option value="">
                        {!form.siteId ? "Select site first..." : "Select department..."}
                      </option>
                      {formDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.department_code} — {dept.department_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="usr-field">
                    <label htmlFor="form-subDepartmentId">
                      Sub-Department {form.roleCode === "USER" ? "*" : "(Optional)"}
                    </label>
                    <select
                      id="form-subDepartmentId"
                      name="subDepartmentId"
                      value={form.subDepartmentId}
                      onChange={handleChange}
                      disabled={saving || !form.departmentId}
                      required={form.roleCode === "USER"}
                    >
                      <option value="">
                        {!form.departmentId ? "Select department first..." : "Select sub-department..."}
                      </option>
                      {formSubDepartments.map((sd) => (
                        <option key={sd.id} value={sd.id}>
                          {sd.sub_department_code} — {sd.sub_department_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Designation */}
                <div className="usr-field">
                  <label htmlFor="form-designation">Corporate Designation</label>
                  <input
                    id="form-designation"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="e.g. Systems Engineer, Operations Lead"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="usr-modal-actions">
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
                      <span>Saving Profile...</span>
                    </>
                  ) : editingUser ? (
                    "Update User"
                  ) : (
                    "Register User"
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
          className="usr-modal-backdrop"
          onClick={() => {
            if (!statusUpdating) setStatusConfirmTarget(null);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="usr-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-box">
              <Icons.AlertCircle />
            </div>
            <h3>
              {statusConfirmTarget.nextStatus === "ACTIVE"
                ? "Activate Account Access?"
                : "Revoke Account Access?"}
            </h3>
            <p>
              Are you sure you want to mark{" "}
              <strong>"{statusConfirmTarget.user.fullName}"</strong> ({statusConfirmTarget.user.userId}) as{" "}
              <strong>{statusConfirmTarget.nextStatus.toLowerCase()}</strong>?
              {statusConfirmTarget.nextStatus === "INACTIVE" &&
                " Deactivated users are immediately barred from logging in or resolving tickets."}
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