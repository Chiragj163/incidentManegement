import  { useState, useEffect, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "../services/api";
import NotificationBell from "./NotificationBell";
import "./Layout.css"

// ── Icons (Same as previous) ──────────────────────────────────────────
const Icons = {
  Menu: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  SubDepartments: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /> <polyline points="2 12 12 17 22 12" /> </svg>,
  Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Incidents: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Sites: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  Departments: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  AuditLogs: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Reports: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Logout: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
};

// ── Navigation Config (Same as previous) ──────────────────────────────
const NAVIGATION_SECTIONS = [
  {
    title: null,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: Icons.Dashboard },
      { to: "/incidents", label: "Incidents", icon: Icons.Incidents }
    ]
  },
  {
    title: "Administration",
    roles: ["SUPER_ADMIN"],
    items: [
      { to: "/sites", label: "Sites", icon: Icons.Sites },
      { to: "/departments", label: "Departments", icon: Icons.Departments },
      { to: "/sub-departments", label: "Sub Departments", icon: Icons.SubDepartments },
      { to: "/users", label: "Users", icon: Icons.Users },
      { to: "/audit-logs", label: "Audit Logs", icon: Icons.AuditLogs }
    ]
  },
  {
    title: "Department",
    roles: ["DEPARTMENT_ADMIN"],
    items: [
      { to: "/users", label: "Users", icon: Icons.Users }
    ]
  },
  {
    title: "Analytics",
    items: [
      { to: "/reports", label: "Reports", icon: Icons.Reports }
    ]
  }
];

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Mobile scroll lock
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none"; // Prevents iOS overscroll
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [mobileMenuOpen]);

  const filteredNavSections = useMemo(() => {
    if (!user) return [];
    return NAVIGATION_SECTIONS.filter(section => {
      if (!section.roles) return true;
      return section.roles.includes(user.role);
    });
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  const userInitial = user.fullName ? user.fullName.charAt(0).toUpperCase() : "U";

  return (
    <div className="app-layout">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`}
        aria-label="Application Navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">IM</div>
            <div className="sidebar-brand-text">
              <span className="brand-title">Incident</span>
              <span className="brand-subtitle">Management</span>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <Icons.Close />
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredNavSections.map((section, idx) => (
            <div key={section.title || idx} className="nav-group">
              {section.title && (
                <span className="nav-group-title">{section.title}</span>
              )}
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? "nav-item--active" : ""}`
                    }
                  >
                    <span className="nav-icon" aria-hidden="true">
                      <IconComponent />
                    </span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="user-meta">
              <span className="user-name">{user.fullName}</span>
              <span className="user-role">{user.roleName || user.role}</span>
            </div>
          </div>
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Sign out of system"
            aria-label="Sign out"
          >
            <Icons.Logout />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        <header className="top-header">
          <div className="top-header-left">
            <button
              className="menu-trigger-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open sidebar menu"
              aria-expanded={mobileMenuOpen}
            >
              <Icons.Menu />
            </button>
            
            {/* Added Title Container for mobile truncation */}
            <div className="title-container">
                <h1 className="page-heading">Incident Management</h1>
                {/* <h5 className="page-heading fw-bold text-dark mb-0 lh-1">{activePage || "Dashboard"}</h5> */}
            </div>
          </div>

          <div className="top-header-right">
            <NotificationBell />
            <div className="header-divider" />
            <div className="header-profile">
              <div className="header-user-info">
                <span className="header-user-name">{user.fullName}</span>
                <span className="header-user-id">ID: {user.userId}</span>
              </div>
              <div className="user-avatar header-avatar" aria-hidden="true">
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        <main className="page-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;