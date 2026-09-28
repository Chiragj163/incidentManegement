import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";
import "./Login.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  User: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Eye: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
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
    <svg className="login-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  ShieldLock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
};

const Login = () => {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!userId.trim()) {
      setError("Please enter your SAP / User ID");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    try {
      setLoading(true);

      const data = await login(userId.trim(), password);

      sessionStorage.setItem("incident_token", data.data.token);
      sessionStorage.setItem("incident_user", JSON.stringify(data.data.user));

      navigate("/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid credentials or server connection failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        
        {/* Main Authentication Card */}
        <div className="login-card">
          
          {/* Header & Branding */}
          <div className="login-header">
            <div className="d-inline-flex align-items-center justify-content-center p-2 rounded-3 bg-white shadow-sm mb-3 border"style={{ width: "56px", height: "56px" }}>
              <img 
                src="/images.svg" 
                alt="Logo" 
                className="object-fit-contain" 
                style={{ width: "46px", height: "46px" }} 
              />

            </div>
            <h1>Incident Management</h1>
            {/* <p>Enterprise Cross-Department Incident Portal</p> */}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="login-error-banner" role="alert">
              <Icons.AlertCircle />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            
            {/* User ID Field */}
            <div className="login-field-group">
              <label htmlFor="userId">Employee / SAP ID</label>
              <div className="login-input-wrapper">
                <span className="input-prefix-icon" aria-hidden="true">
                  <Icons.User />
                </span>
                <input
                  id="userId"
                  type="text"
                  placeholder="Enter your ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-field-group">
              <div className="field-label-row">
                <label htmlFor="password">Password</label>
              </div>
              <div className="login-input-wrapper">
                <span className="input-prefix-icon" aria-hidden="true">
                  <Icons.Lock />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icons.Spinner />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to System</span>
              )}
            </button>
          </form>

          {/* Card Footer */}
          <div className="login-footer">
            <span className="security-tag">
              <Icons.ShieldLock /> Secure Access
            </span>
            {/* <p>Use your designated organizational credentials to log in.</p> */}
          </div>
        </div>

        {/* Global Copyright / Disclaimer Sub-footer */}
        <div className="login-system-meta">
          {/* <span>Incident Management System • v2.4</span> */}
        </div>

      </div>
    </div>
  );
};

export default Login;