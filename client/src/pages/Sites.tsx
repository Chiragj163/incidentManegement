import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createSite,
  getSites,
  updateSite,
  updateSiteStatus
} from "../services/api";
import type { CreateSiteRequest, Site } from "../services/api";
import "./Sites.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Building: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Power: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  ),
  MapPin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  User: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
  Spinner: () => (
    <svg className="st-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

interface SiteForm {
  siteCode: string;
  siteName: string;
  siteLead: string;
  address: string;
  city: string;
  district: string;
  state: string;
}

const emptyForm: SiteForm = {
  siteCode: "",
  siteName: "",
  siteLead: "",
  address: "",
  city: "",
  district: "",
  state: ""
};

const Sites = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal form states
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Status toggle confirmation modal
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{
    site: Site;
    nextStatus: "ACTIVE" | "INACTIVE";
  } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadSites = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getSites();
      setSites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load facility sites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isModalOpen = showForm || Boolean(statusConfirmTarget);
    document.body.style.overflow = isModalOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showForm, statusConfirmTarget]);

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sites.filter((site) => {
      const matchesSearch =
        !query ||
        site.site_code.toLowerCase().includes(query) ||
        site.site_name.toLowerCase().includes(query) ||
        (site.city || "").toLowerCase().includes(query) ||
        (site.state || "").toLowerCase().includes(query) ||
        (site.site_lead || "").toLowerCase().includes(query);

      const matchesStatus = !statusFilter || site.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sites, search, statusFilter]);

  // ── Form Handlers ───────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingSite(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (site: Site) => {
    setEditingSite(site);
    setForm({
      siteCode: site.site_code || "",
      siteName: site.site_name || "",
      siteLead: site.site_lead || "",
      address: site.address || "",
      city: site.city || "",
      district: site.district || "",
      state: site.state || ""
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditingSite(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (!form.siteCode.trim()) {
      setFormError("Site Code is required (e.g., SITE-01).");
      return;
    }
    if (!form.siteName.trim()) {
      setFormError("Site Name is required.");
      return;
    }

    try {
      setSaving(true);
      const payload: CreateSiteRequest = {
        siteCode: form.siteCode.trim().toUpperCase(),
        siteName: form.siteName.trim(),
        siteLead: form.siteLead.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        state: form.state.trim()
      };

      if (editingSite) {
        await updateSite(editingSite.id, payload);
      } else {
        await createSite(payload);
      }

      closeForm();
      await loadSites();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save site data.");
    } finally {
      setSaving(false);
    }
  };

  // ── Status Toggle Handlers ──────────────────────────────────────────
  const requestStatusChange = (site: Site) => {
    const nextStatus = site.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusConfirmTarget({ site, nextStatus });
  };

  const confirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    try {
      setStatusUpdating(true);
      setError("");
      await updateSiteStatus(statusConfirmTarget.site.id, statusConfirmTarget.nextStatus);
      setStatusConfirmTarget(null);
      await loadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update site status.");
      setStatusConfirmTarget(null);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="sites-page-container">
      {/* ── Top Header Toolbar ── */}
      <div className="sites-header-bar">
        <div>
          {/* <div className="header-title-row">
            <span className="header-icon-box" aria-hidden="true">
              <Icons.Building />
            </span>
            <h1>Facility Sites</h1>
          </div>
          <p className="header-subtitle">
            Manage corporate facilities, regional hubs, and operational jurisdiction
          </p> */}
        </div>

        <button type="button" className="btn-primary-action" onClick={openAddForm}>
          <Icons.Plus />
          <span>Register Site</span>
        </button>
      </div>

      {/* ── Error Notification ── */}
      {error && (
        <div className="st-alert-banner" role="alert">
          <Icons.AlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <div className="sites-control-bar">
        <div className="st-search-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search by code, facility name, city, or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="st-filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter sites by operational status"
          >
            <option value="">All Statuses ({sites.length})</option>
            <option value="ACTIVE">Active Units Only</option>
            <option value="INACTIVE">Deactivated Units Only</option>
          </select>
        </div>
      </div>

      {/* ── Content View: Loading / Empty / Responsive Data ── */}
      {loading ? (
        <div className="st-loading-wrapper">
          {/* Desktop Skeleton */}
          <div className="st-desktop-view">
            <div className="st-table-skeleton">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          </div>
          {/* Mobile Skeleton */}
          <div className="st-mobile-view">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-site-card" />
            ))}
          </div>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="st-empty-state">
          <div className="empty-icon-box">
            <Icons.Building />
          </div>
          <h3>No facility sites found</h3>
          <p>
            {search || statusFilter
              ? "No registered sites matched your filter criteria. Try clearing filters."
              : "No facility sites have been configured in the system yet."}
          </p>
          {search || statusFilter ? (
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
              }}
            >
              Clear Filters
            </button>
          ) : (
            <button type="button" className="btn-primary-action" onClick={openAddForm}>
              <Icons.Plus /> Register First Site
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table View (> 1024px) ── */}
          <div className="st-desktop-view">
            <div className="st-table-card">
              <table className="st-data-table">
                <thead>
                  <tr>
                    <th>Site Code</th>
                    <th>Facility Name</th>
                    <th>Site Lead</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map((site) => (
                    <tr key={site.id}>
                      <td className="cell-code">
                        <strong>{site.site_code}</strong>
                      </td>
                      <td className="cell-name">
                        <strong className="truncate-cell">{site.site_name}</strong>
                        {site.address && (
                          <span className="cell-address truncate-cell">{site.address}</span>
                        )}
                      </td>
                      <td>
                        <div className="meta-inline">
                          <Icons.User />
                          <span>{site.site_lead || "Unassigned"}</span>
                        </div>
                      </td>
                      <td>
                        <div className="meta-inline">
                          <Icons.MapPin />
                          <span>
                            {[site.city, site.district, site.state].filter(Boolean).join(", ") || "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`st-status-badge ${
                            site.status === "ACTIVE" ? "badge-active" : "badge-inactive"
                          }`}
                        >
                          <span className="status-dot" />
                          {site.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => openEditForm(site)}
                            title="Edit site details"
                            aria-label={`Edit ${site.site_name}`}
                          >
                            <Icons.Edit />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className={`btn-table-action ${
                              site.status === "ACTIVE" ? "action-deactivate" : "action-activate"
                            }`}
                            onClick={() => requestStatusChange(site)}
                            title={site.status === "ACTIVE" ? "Deactivate site" : "Activate site"}
                            aria-label={`${site.status === "ACTIVE" ? "Deactivate" : "Activate"} ${site.site_name}`}
                          >
                            <Icons.Power />
                            <span>{site.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
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
          <div className="st-mobile-view">
            <div className="st-card-stack">
              {filteredSites.map((site) => (
                <div key={site.id} className="st-mobile-card">
                  <div className="st-mcard-top">
                    <span className="st-mcard-code">{site.site_code}</span>
                    <span
                      className={`st-status-badge ${
                        site.status === "ACTIVE" ? "badge-active" : "badge-inactive"
                      }`}
                    >
                      <span className="status-dot" />
                      {site.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h3 className="st-mcard-title">{site.site_name}</h3>
                  {site.address && <p className="st-mcard-address">{site.address}</p>}

                  <div className="st-mcard-details">
                    <div className="st-detail-row">
                      <span className="detail-label">Lead</span>
                      <strong className="detail-value">{site.site_lead || "Unassigned"}</strong>
                    </div>
                    <div className="st-detail-row">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">
                        {[site.city, site.district, site.state].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="st-mcard-actions">
                    <button
                      type="button"
                      className="btn-mcard-action"
                      onClick={() => openEditForm(site)}
                    >
                      <Icons.Edit />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-mcard-action ${
                        site.status === "ACTIVE" ? "action-deactivate" : "action-activate"
                      }`}
                      onClick={() => requestStatusChange(site)}
                    >
                      <Icons.Power />
                      <span>{site.status === "ACTIVE" ? "Deactivate" : "Activate"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Add / Edit Modal Drawer ── */}
      {showForm && (
        <div
          className="st-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="st-modal-card">
            <div className="st-modal-header">
              <div>
                <h2>{editingSite ? "Edit Site" : "Register Site"}</h2>
                {/* <p>Provide verified jurisdictional and regional administrative details</p> */}
              </div>
              <button
                type="button"
                className="st-btn-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close dialog"
              >
                <Icons.Close />
              </button>
            </div>

            {formError && (
              <div className="modal-error-alert" role="alert">
                <Icons.AlertCircle />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="st-site-form" noValidate>
              <div className="st-form-grid">
                <div className="st-field">
                  <label htmlFor="siteCode">Site Code *</label>
                  <input
                    id="siteCode"
                    name="siteCode"
                    value={form.siteCode}
                    onChange={handleChange}
                    placeholder="e.g. AG-01 or DLH-HQ"
                    disabled={saving}
                    autoCapitalize="characters"
                    required
                  />
                  <small className="field-hint">Unique corporate site identifier</small>
                </div>

                <div className="st-field">
                  <label htmlFor="siteName">Site Name *</label>
                  <input
                    id="siteName"
                    name="siteName"
                    value={form.siteName}
                    onChange={handleChange}
                    placeholder="e.g. Agra Head Office"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="st-field full-width">
                  <label htmlFor="siteLead">Facility / Site Lead</label>
                  <input
                    id="siteLead"
                    name="siteLead"
                    value={form.siteLead}
                    onChange={handleChange}
                    placeholder="Full name of site director or manager"
                    disabled={saving}
                  />
                </div>

                <div className="st-field full-width">
                  <label htmlFor="address">Physical Street Address</label>
                  <input
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Sector, Road, Landmark, Industrial Area"
                    disabled={saving}
                  />
                </div>

                <div className="st-field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Agra"
                    disabled={saving}
                  />
                </div>

                <div className="st-field">
                  <label htmlFor="district">District</label>
                  <input
                    id="district"
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    placeholder="e.g. Agra"
                    disabled={saving}
                  />
                </div>

                <div className="st-field full-width">
                  <label htmlFor="state">State / Province</label>
                  <input
                    id="state"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="e.g. Uttar Pradesh"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="st-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={closeForm}
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
                  ) : editingSite ? (
                    "Update Site"
                  ) : (
                    "Register Site"
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
          className="st-modal-backdrop"
          onClick={() => {
            if (!statusUpdating) setStatusConfirmTarget(null);
          }}
          aria-modal="true"
          role="dialog"
        >
          <div className="st-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-box">
              <Icons.AlertCircle />
            </div>
            <h3>
              {statusConfirmTarget.nextStatus === "ACTIVE"
                ? "Activate Facility Site?"
                : "Deactivate Facility Site?"}
            </h3>
            <p>
              Are you sure you want to mark{" "}
              <strong>"{statusConfirmTarget.site.site_name}"</strong> as{" "}
              <strong>{statusConfirmTarget.nextStatus.toLowerCase()}</strong>?
              {statusConfirmTarget.nextStatus === "INACTIVE" &&
                " Active incident routing to this facility may be affected."}
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
                onClick={confirmStatusChange}
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
};

export default Sites;