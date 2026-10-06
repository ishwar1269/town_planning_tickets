import React, { useState, useEffect } from 'react';

export default function LoginModal({ onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');

  // Fetch live active registered users from the backend database
  useEffect(() => {
    fetchActiveUsers();
  }, []);

  const fetchActiveUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // Filter ONLY active accounts (exclude soft-deleted ones)
        const activeOnly = data.filter(u => !u.is_deleted || u.is_deleted === 0);
        setActiveUsers(activeOnly);
      }
    } catch (err) {
      console.error('Error fetching active users for login:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const getRoleMetadata = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return {
          title: 'Admin',
          icon: 'fa-solid fa-crown',
          badgeBg: '#FEF3C7',
          badgeColor: '#D97706',
          badgeBorder: '#FCD34D',
          desc: 'Full access to Admin Console, User Provisioning, Service Categories & All Reports'
        };
      case 'universal':
        return {
          title: 'Helpdesk Operator',
          icon: 'fa-solid fa-globe',
          badgeBg: '#EDE9FE',
          badgeColor: '#7C3AED',
          badgeBorder: '#DDD6FE',
          desc: 'Raise tickets on behalf of any citizen and assign tickets directly to specialists'
        };
      case 'technician':
        return {
          title: 'Technician',
          icon: 'fa-solid fa-wrench',
          badgeBg: '#EFF6FF',
          badgeColor: '#0265DC',
          badgeBorder: '#BFDBFE',
          desc: 'Access to assigned tickets, SLA compliance metrics, and technical remarks'
        };
      case 'user':
      default:
        return {
          title: 'Citizen User',
          icon: 'fa-solid fa-user',
          badgeBg: '#ECFDF5',
          badgeColor: '#059669',
          badgeBorder: '#A7F3D0',
          desc: 'Access to submit new complaints/grievances and track submitted issues'
        };
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.token) {
        localStorage.setItem('jwtToken', data.token);
      }
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (account) => {
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password: account.password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.token) {
        localStorage.setItem('jwtToken', data.token);
      }
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter users by selected role pill
  const filteredUsers = activeUsers.filter(u => {
    if (roleFilter === 'all') return true;
    return u.role === roleFilter;
  });

  const adminCount = activeUsers.filter(u => u.role === 'admin').length;
  const univCount = activeUsers.filter(u => u.role === 'universal').length;
  const techCount = activeUsers.filter(u => u.role === 'technician').length;
  const userCount = activeUsers.filter(u => u.role === 'user').length;

  return (
    <div className="zoho-modal-overlay">
      <div className="zoho-modal-card zoho-modal-simple" style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <i className="fa-solid fa-right-to-bracket" style={{ color: 'var(--zoho-blue)' }}></i> User & Role Authentication Login
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Sign in with currently active registered Admin, Technician, Helpdesk or Citizen User credentials.
            </span>
          </div>
          <button className="zoho-modal-close" onClick={onClose} title="Close">&times;</button>
        </div>

        {errorMsg && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-Click Active Users Quick Login Section */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-bolt" style={{ color: '#F59E0B' }}></i> Active Registered Accounts ({activeUsers.length})
            </label>
            <span style={{ fontSize: '0.72rem', color: '#10B981', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-circle-dot" style={{ fontSize: '0.55rem' }}></i> Live Database Sync
            </span>
          </div>

          {/* Role Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 10px',
                borderRadius: '12px',
                border: roleFilter === 'all' ? '1px solid var(--zoho-blue)' : '1px solid var(--border-color)',
                background: roleFilter === 'all' ? 'var(--zoho-blue)' : 'var(--bg-body)',
                color: roleFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All ({activeUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 10px',
                borderRadius: '12px',
                border: roleFilter === 'admin' ? '1px solid #D97706' : '1px solid var(--border-color)',
                background: roleFilter === 'admin' ? '#FEF3C7' : 'var(--bg-body)',
                color: roleFilter === 'admin' ? '#92400E' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              👑 Admin ({adminCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('universal')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 10px',
                borderRadius: '12px',
                border: roleFilter === 'universal' ? '1px solid #7C3AED' : '1px solid var(--border-color)',
                background: roleFilter === 'universal' ? '#EDE9FE' : 'var(--bg-body)',
                color: roleFilter === 'universal' ? '#5B21B6' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🌐 Helpdesk ({univCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('technician')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 10px',
                borderRadius: '12px',
                border: roleFilter === 'technician' ? '1px solid #0265DC' : '1px solid var(--border-color)',
                background: roleFilter === 'technician' ? '#EFF6FF' : 'var(--bg-body)',
                color: roleFilter === 'technician' ? '#1E40AF' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🛠️ Techs ({techCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('user')}
              style={{
                fontSize: '0.74rem',
                padding: '3px 10px',
                borderRadius: '12px',
                border: roleFilter === 'user' ? '1px solid #059669' : '1px solid var(--border-color)',
                background: roleFilter === 'user' ? '#ECFDF5' : 'var(--bg-body)',
                color: roleFilter === 'user' ? '#065F46' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              👤 Citizens ({userCount})
            </button>
          </div>

          {/* User Account Cards Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--zoho-blue)', marginRight: '6px' }}></i>
                Loading active accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-body)', borderRadius: '6px' }}>
                No active users found for this role category.
              </div>
            ) : (
              filteredUsers.map((acc) => {
                const meta = getRoleMetadata(acc.role);
                return (
                  <div
                    key={acc.id}
                    style={{
                      background: 'var(--bg-body)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: '12px'
                    }}
                    onClick={() => handleQuickLogin(acc)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = meta.badgeColor;
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    title={`Click to login as ${acc.name} (${acc.email})`}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          background: meta.badgeBg,
                          color: meta.badgeColor,
                          border: `1px solid ${meta.badgeBorder}`,
                          padding: '1px 7px',
                          borderRadius: '4px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <i className={meta.icon}></i> {meta.title}
                        </span>

                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          {acc.name}
                        </strong>

                        <span style={{
                          fontSize: '0.72rem',
                          color: '#1E293B',
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          fontFamily: 'monospace'
                        }}>
                          {acc.email}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                        {acc.designation ? (
                          <span><strong>{acc.designation}</strong> &bull; {meta.desc}</span>
                        ) : (
                          meta.desc
                        )}{' '}
                        | Password: <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: '3px', color: '#D97706', fontWeight: 700 }}>{acc.password || 'admin123'}</code>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-zoho-secondary btn-xs"
                      style={{
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        borderColor: meta.badgeBorder,
                        color: meta.badgeColor,
                        background: '#FFFFFF',
                        fontWeight: 700,
                        padding: '4px 10px'
                      }}
                    >
                      Login <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px', fontSize: '0.7rem' }}></i>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />

        {/* Manual Login Form */}
        <form onSubmit={handleManualLogin}>
          <h4 className="zoho-section-heading" style={{ marginBottom: '10px', fontSize: '0.88rem' }}>
            <i className="fa-solid fa-key" style={{ color: 'var(--zoho-blue)' }}></i> Or Enter Credentials Manually
          </h4>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Email ID *</label>
              <input
                type="email"
                className="form-control"
                placeholder={activeUsers[0]?.email || 'e.g. ishwarsahu1269@gmail.com'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password..."
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '14px' }}>
            <button type="button" className="btn btn-zoho-secondary" onClick={onClose} style={{ marginRight: '8px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-zoho-primary" disabled={loading}>
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>} Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
