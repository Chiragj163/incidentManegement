import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile
} from "../services/api";
import type { MyProfile } from "../services/api";
import "./UserSettings.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  User: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Mail: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Phone: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Building: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
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
  ArrowUp: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  ),
  Spinner: () => (
    <svg className="us-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
};

const UserSettings = () => {
  const [profile, setProfile] = useState<MyProfile | null>(null);

  // Profile Form States
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Loading & Message States
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setProfileError("");
        const data = await getMyProfile();
        setProfile(data);
        setEmail(data.email || "");
        setMobile(data.mobile || "");
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleKeyModifier = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState("CapsLock"));
  };

  const handleProfileSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");

    try {
      setSavingProfile(true);
      const updated = await updateMyProfile(email.trim(), mobile.trim());
      setProfile(updated);
      setEmail(updated.email || "");
      setMobile(updated.mobile || "");
      setProfileSuccess("Contact information updated successfully.");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      setChangingPassword(true);
      await changeMyPassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Account password changed successfully.");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="settings-page-wrapper">
        <div className="settings-skeleton-hero" />
        <div className="settings-skeleton-card" />
        <div className="settings-skeleton-card" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="settings-page-wrapper">
        <div className="settings-error-banner" role="alert">
          <Icons.AlertCircle />
          <span>{profileError || "Unable to load employee profile."}</span>
        </div>
      </div>
    );
  }

  const isPasswordMatch =
    Boolean(newPassword) && Boolean(confirmPassword) && newPassword === confirmPassword;
  const isPasswordMismatch =
    Boolean(confirmPassword) && newPassword !== confirmPassword;

  return (
    <div className="settings-page-wrapper">
      {/* ── Page Header ── */}
      <div className="settings-header">
        <div>
          {/* <h1>Account & Security Settings</h1>
          <p>Review administrative assignments, edit contact details, and update security credentials.</p> */}
        </div>
      </div>

      {/* ── Employee Hero Banner ── */}
      <section className="profile-hero-card">
        <div className="hero-avatar" aria-hidden="true">
          {getUserInitials(profile.full_name)}
        </div>
        <div className="hero-meta">
          <div className="hero-title-row">
            <h2>{profile.full_name}</h2>
           {profile.role_name !== "Normal User" && (
  <span className="role-tag">
    <Icons.Shield />
    <span>{profile.role_name}</span>
  </span>
)}
          </div>
          <p className="hero-designation">{profile.designation || "Staff Member"}</p>
          <div className="hero-location-pills">
            <span className="hero-pill">
              <Icons.Building /> {profile.site_name || "Unassigned Site"}
            </span>
            <span className="hero-pill">
              {profile.department_name || "General Department"}
              {profile.sub_department_name ? ` • ${profile.sub_department_name}` : ""}
            </span>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: PROFILE & CONTACT DETAILS ── */}
      <section className="settings-card">
        <div className="card-header">
          <div>
            <h3>Contact Information</h3>
            {/* <p>Official identity and department assignments are read-only. Contact details can be updated.</p> */}
          </div>
        </div>

        {profileSuccess && (
          <div className="settings-alert alert-success" role="status">
            <Icons.CheckCircle />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="settings-alert alert-danger" role="alert">
            <Icons.AlertCircle />
            <span>{profileError}</span>
          </div>
        )}

        {/* Read-Only Administrative Identity Grid */}
        <div className="admin-props-grid">
          <div className="prop-box">
            <span className="prop-label">
              <Icons.Lock /> SAP / User ID
            </span>
            <span className="prop-val mono">{profile.user_id}</span>
          </div>

          <div className="prop-box">
            <span className="prop-label">
              <Icons.Lock /> Employee Code
            </span>
            <span className="prop-val mono">{profile.employee_code || "—"}</span>
          </div>

          <div className="prop-box">
            <span className="prop-label">
              <Icons.Lock /> System Role
            </span>
            <span className="prop-val">{profile.role_name}</span>
          </div>

          <div className="prop-box">
            <span className="prop-label">
              <Icons.Lock /> Designation
            </span>
            <span className="prop-val">{profile.designation || "—"}</span>
          </div>

          <div className="prop-box">
            <span className="prop-label">
              <Icons.Lock /> Facility Site
            </span>
            <span className="prop-val">{profile.site_name || "—"}</span>
          </div>

          <div className="prop-box">
            <span className="prop-label">
              <Icons.Lock /> Department
            </span>
            <span className="prop-val">{profile.department_name || "—"}</span>
          </div>

          <div className="prop-box full-span">
            <span className="prop-label">
              <Icons.Lock /> Sub-Department Division
            </span>
            <span className="prop-val">{profile.sub_department_name || "General / Unassigned"}</span>
          </div>
        </div>

        {/* Editable Contact Fields */}
        <form onSubmit={handleProfileSubmit} className="contact-form" noValidate>
          <div className="form-subheading">
            <h4>Contact Channels</h4>
            {/* <span>Used for incident routing notifications and ticket updates</span> */}
          </div>

          <div className="form-grid-2">
            <div className="field-group">
              <label htmlFor="email">Work Email Address</label>
              <div className="input-with-icon">
                <span className="field-icon">
                  <Icons.Mail />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. employee@company.com"
                  disabled={savingProfile}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="mobile">Mobile Number</label>
              <div className="input-with-icon">
                <span className="field-icon">
                  <Icons.Phone />
                </span>
                <input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  disabled={savingProfile}
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>

          <div className="form-action-row">
            <button
              type="submit"
              className="btn-save-profile"
              disabled={savingProfile}
            >
              {savingProfile ? (
                <>
                  <Icons.Spinner />
                  <span>Saving Changes...</span>
                </>
              ) : (
                "Save Contact Changes"
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ── SECTION 2: SECURITY & PASSWORD CREDENTIALS ── */}
      <section className="settings-card">
        <div className="card-header">
          <div>
            <h3>Password Security</h3>
            {/* <p>Ensure your account remains protected by maintaining a strong, unique password.</p> */}
          </div>
        </div>

        {passwordSuccess && (
          <div className="settings-alert alert-success" role="status">
            <Icons.CheckCircle />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="settings-alert alert-danger" role="alert">
            <Icons.AlertCircle />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="password-form" noValidate>
          <div className="password-grid">
            {/* Current Password */}
            <div className="field-group">
              <div className="field-label-wrapper">
                <label htmlFor="currentPassword">Current Password *</label>
                {capsLockActive && (
                  <span className="caps-alert">
                    <Icons.ArrowUp /> Caps Lock is ON
                  </span>
                )}
              </div>
              <div className="input-with-icon">
                <span className="field-icon">
                  <Icons.Lock />
                </span>
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onKeyDown={handleKeyModifier}
                  onKeyUp={handleKeyModifier}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  disabled={changingPassword}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="field-group">
              <label htmlFor="newPassword">New Password *</label>
              <div className="input-with-icon">
                <span className="field-icon">
                  <Icons.Lock />
                </span>
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={handleKeyModifier}
                  onKeyUp={handleKeyModifier}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={changingPassword}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showNewPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
              <small className="field-hint">Must contain at least 8 characters</small>
            </div>

            {/* Confirm New Password */}
            <div className="field-group">
              <div className="field-label-wrapper">
                <label htmlFor="confirmPassword">Confirm New Password *</label>
                {isPasswordMatch && (
                  <span className="match-tag match-success">
                    <Icons.CheckCircle /> Passwords match
                  </span>
                )}
                {isPasswordMismatch && (
                  <span className="match-tag match-error">
                    Passwords do not match
                  </span>
                )}
              </div>
              <div className="input-with-icon">
                <span className="field-icon">
                  <Icons.Lock />
                </span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyModifier}
                  onKeyUp={handleKeyModifier}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={changingPassword}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>
          </div>

          <div className="form-action-row">
            <button
              type="submit"
              className="btn-change-password"
              disabled={
                changingPassword ||
                !currentPassword ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
            >
              {changingPassword ? (
                <>
                  <Icons.Spinner />
                  <span>Updating Password...</span>
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default UserSettings;