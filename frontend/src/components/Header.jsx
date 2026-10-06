import React, { useState } from 'react';
import SupportOneLogo from './SupportOneLogo';

export default function Header({ 
  activeTab,
  setActiveTab,
  currentUser,
  theme = 'light',
  onToggleTheme,
  onOpenLoginModal,
  onOpenRegisterModal,
  onLogout,
  onOpenCreateModal, 
  onOpenTechModal, 
  onOpenBrandingModal,
  unreadCount = 14
}) {
  const [showNotifs, setShowNotifs] = useState(false);

  // Authentication State
  const isAuthenticated = !!currentUser;
  const role = currentUser?.role;

  // Role Access Checks:
  // - Admin (Super Admin): Full access to Overview, Dashboard, Tickets, Raise Ticket, Admin Console, Reports, Audit Logs
  // - Universal Operator: Access to Overview, Dashboard, Tickets, Raise Ticket, Reports, Audit Logs (No Admin Console)
  // - Technician: Access to Overview, Dashboard, Tickets, Raise Ticket, Audit Logs (No Admin Console, No Reports)
  // - Citizen User: Access to Overview, Tickets (My Tickets), Raise Ticket
  const isAdmin = role === 'admin';
  const isUniversal = role === 'universal';
  const isTechnician = role === 'technician';
  const isStaffOrAdmin = isAdmin || isUniversal || isTechnician;

  // Display information for user profile pill
  const displayName = currentUser?.name || 'Alex Mercer';
  const displayRole = isAdmin ? 'Super Admin' : 
                      isTechnician ? 'Technician' : 
                      isUniversal ? 'Universal Operator' : 
                      role === 'user' ? 'Citizen User' : 'Super Admin';
  const initial = displayName.charAt(0).toUpperCase();

  const mockNotifications = [
    { id: 1, title: 'SLA Escalation Level 2', message: 'Ticket #TP-1002 reached 75% SLA countdown.', time: '10m ago', type: 'warning' },
    { id: 2, title: 'New High Priority Ticket', message: 'Building plan scrutiny pending approval.', time: '25m ago', type: 'info' },
    { id: 3, title: 'Technician Reassigned', message: 'Ticket #TP-1005 assigned to Field Officer.', time: '1h ago', type: 'normal' },
    { id: 4, title: 'SLA Target Achieved', message: 'Ticket #TP-1001 resolved within 24h window.', time: '2h ago', type: 'success' }
  ];

  return (
    <header className="modern-navbar">
      <div className="modern-nav-container">
        {/* Left Side: SupportOne Desk Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
            onClick={() => setActiveTab && setActiveTab('home')}
            title="SupportOne Desk Home"
          >
            <SupportOneLogo height={36} showTagline={true} showDivider={true} />
          </div>

          {/* Navigation Links based on Login Status and Role Permissions */}
          <nav className="modern-nav-links">
            {/* Overview - Always visible for everyone */}
            <button 
              className={`modern-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab && setActiveTab('home')}
            >
              Overview
            </button>

            {/* If Authenticated: Render only tabs that current user's role has permission to access */}
            {isAuthenticated && (
              <>
                {/* Dashboard: Visible only to Staff / Technician / Universal / Admin */}
                {isStaffOrAdmin && (
                  <button 
                    className={`modern-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab && setActiveTab('dashboard')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="7" height="9" x="3" y="3" rx="1"/>
                      <rect width="7" height="5" x="14" y="3" rx="1"/>
                      <rect width="7" height="9" x="14" y="12" rx="1"/>
                      <rect width="7" height="5" x="3" y="16" rx="1"/>
                    </svg>
                    <span>Dashboard</span>
                  </button>
                )}

                {/* Tickets: Visible to all authenticated users (Citizen, Tech, Universal, Admin) */}
                <button 
                  className={`modern-nav-btn ${activeTab === 'tickets' ? 'active' : ''}`}
                  onClick={() => setActiveTab && setActiveTab('tickets')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
                    <path d="M13 5v2"/>
                    <path d="M13 17v2"/>
                    <path d="M13 11v2"/>
                  </svg>
                  <span>Tickets</span>
                </button>

                {/* Raise Ticket: Visible to all authenticated users */}
                <button 
                  className="modern-nav-btn"
                  onClick={onOpenCreateModal}
                  title="Raise New Ticket"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 12h8"/>
                    <path d="M12 8v8"/>
                  </svg>
                  <span>Raise Ticket</span>
                </button>



                {/* Reports: Visible to Admin and Universal Operator */}
                {(isAdmin || isUniversal) && (
                  <button 
                    className={`modern-nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab && setActiveTab('reports')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                      <path d="M8 18v-2"/>
                      <path d="M12 18v-4"/>
                      <path d="M16 18v-6"/>
                    </svg>
                    <span>Reports</span>
                  </button>
                )}

                {/* Audit Logs: Visible to Staff (Technician, Universal, Admin) */}
                {isStaffOrAdmin && (
                  <button 
                    className={`modern-nav-btn ${activeTab === 'sla_calculation' ? 'active' : ''}`}
                    onClick={() => setActiveTab && setActiveTab('sla_calculation')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                    <span>Audit Logs</span>
                  </button>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Right Side: Logged Out vs Logged In */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Dual Theme Toggle - Always available */}
          <button 
            type="button"
            className="modern-icon-btn"
            onClick={() => onToggleTheme && onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/><path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/><path d="M20 12h2"/>
                <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>

          {/* Conditional Rendering: Logged Out View vs Logged In View */}
          {!isAuthenticated ? (
            /* Logged Out: Purple Gradient "Sign In" Button matching screenshot */
            <button 
              type="button"
              className="btn-signin-primary"
              onClick={onOpenLoginModal}
              title="Sign in to your account"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Sign In</span>
            </button>
          ) : (
            /* Logged In: Notifications, User Profile Pill & Logout Button */
            <>
              {/* Notifications Bell with Red Count Badge */}
              <div style={{ position: 'relative' }}>
                <button 
                  type="button"
                  className="modern-icon-btn"
                  onClick={() => setShowNotifs(!showNotifs)}
                  title="View Notifications"
                  style={{ position: 'relative' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                  </svg>

                  {/* Red Badge with Number */}
                  {unreadCount > 0 && (
                    <span className="modern-notif-badge">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popover Dropdown */}
                {showNotifs && (
                  <div className="modern-notif-dropdown">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Notifications ({unreadCount})</span>
                      <button 
                        onClick={() => setShowNotifs(false)} 
                        style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#6366F1', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Close
                      </button>
                    </div>
                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      {mockNotifications.map(n => (
                        <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle, #f1f5f9)', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>{n.title}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{n.message}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '4px' }}>{n.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Pill */}
              <div className="modern-user-pill">
                <div className="modern-user-avatar">
                  {initial}
                </div>
                <div className="modern-user-text">
                  <span className="modern-user-name">{displayName}</span>
                  <span className="modern-user-role">{displayRole}</span>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                type="button"
                className="modern-icon-btn"
                onClick={onLogout}
                title="Logout"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" x2="9" y1="12" y2="12"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
