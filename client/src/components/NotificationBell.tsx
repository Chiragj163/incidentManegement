import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/api";
import type { Notification } from "../services/api";
import "./NotificationBell.css";

// ── Icons ─────────────────────────────────────────────────────────────
const Icons = {
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  ),
  CheckDouble: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 7 17l-5-5"></path>
      <path d="m22 10-7.5 7.5L13 16"></path>
    </svg>
  ),
  BellOff: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path>
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path>
      <path d="M18 8a6 6 0 0 0-9.33-5"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  ),
  Close: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
};

// ── Time Formatting Helper ────────────────────────────────────────────
const getRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll for unread count
  useEffect(() => {
    loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 30000);
    return () => window.clearInterval(interval);
  }, []);

  // Handle click outside to close popover
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Mobile body scroll lock when open
  useEffect(() => {
    if (open && window.innerWidth <= 640) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load notification count:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(50);
      setNotifications(data);
      const unread = data.filter((notification) => !notification.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async () => {
    const newState = !open;
    setOpen(newState);
    if (newState) {
      await loadNotifications();
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Optimistic UI update
    if (!notification.is_read) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((count) => Math.max(count - 1, 0));

      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    setOpen(false); // Close dropdown
    
    if (notification.incident_id) {
      navigate(`/incidents/${notification.incident_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true }))
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  return (
    <div className="notification-container" ref={containerRef}>
      <button
        type="button"
        className="notification-trigger"
        onClick={toggleNotifications}
        aria-label="Toggle notifications menu"
        aria-expanded={open}
      >
        <Icons.Bell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Overlay Backdrop */}
      {open && <div className="notification-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />}

      {open && (
        <div className="notification-panel" role="menu">
          <div className="notification-header">
            <div className="notification-header-info">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="unread-pill">{unreadCount} new</span>
              )}
            </div>

            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="mark-all-btn"
                  onClick={handleMarkAllRead}
                  aria-label="Mark all notifications as read"
                >
                  <Icons.CheckDouble />
                  <span>Mark all read</span>
                </button>
              )}
              {/* Visible only on mobile */}
              <button 
                type="button" 
                className="close-panel-btn" 
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
              >
                <Icons.Close />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="notification-skeleton">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-line title"></div>
                    <div className="skeleton-line msg"></div>
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="empty-icon">
                  <Icons.BellOff />
                </div>
                <p>No new notifications</p>
                <span>You're all caught up!</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? "" : "unread"}`}
                  onClick={() => handleNotificationClick(notification)}
                  role="menuitem"
                >
                  <div className="notification-item-indicator">
                    {!notification.is_read && <div className="unread-dot"></div>}
                  </div>

                  <div className="notification-content">
                    <div className="notification-content-header">
                      <strong>{notification.title}</strong>
                      <small className="notification-time">
                        {getRelativeTime(notification.created_at)}
                      </small>
                    </div>
                    
                    <p className="notification-message">{notification.message}</p>
                    
                    {notification.incident_no && (
                      <span className="notification-incident-tag">
                        #{notification.incident_no}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;