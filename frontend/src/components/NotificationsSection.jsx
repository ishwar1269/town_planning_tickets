import React, { useState, useEffect } from 'react';

export default function NotificationsSection({ currentUser, tickets = [], onSelectTicket }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'unread' | 'read'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'comment' | 'status' | 'sla'

  // Persisted Read Notification IDs in localStorage
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('tp_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetchActivities(false);

    const interval = setInterval(() => {
      fetchActivities(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch('/api/activity-notifications');
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('Error fetching activity notifications:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const isNotifRead = (id) => {
    return readIds.some(rid => String(rid) === String(id));
  };

  const markAsRead = (notifId, ticketId) => {
    if (!isNotifRead(notifId)) {
      const updated = [...readIds, String(notifId)];
      setReadIds(updated);
      try {
        localStorage.setItem('tp_read_notifications', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }
    if (onSelectTicket) onSelectTicket(ticketId);
  };

  const handleMarkAllRead = (notificationsToMark) => {
    const idsToMark = notificationsToMark.map(n => String(n.id));
    const updated = Array.from(new Set([...readIds.map(String), ...idsToMark]));
    setReadIds(updated);
    try {
      localStorage.setItem('tp_read_notifications', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Format relative timestamp
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} mins ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hours ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Scope notifications according to user role
  const scopedActivities = activities.filter(act => {
    if (!currentUser) return true;
    if (currentUser.role === 'user') {
      return (
        (currentUser.email && act.ticket_created_by_email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.name && act.ticket_created_by_name?.toLowerCase() === currentUser.name.toLowerCase())
      );
    }
    if (currentUser.role === 'technician') {
      return act.technician_email?.toLowerCase() === currentUser.email?.toLowerCase();
    }
    return true;
  });

  const rawNotifications = [];

  // 1. SLA Breach & Warning alerts
  tickets.forEach(ticket => {
    if (ticket.status === 'Closed' || ticket.status === 'Resolved') return;
    const due = ticket.due_at ? new Date(ticket.due_at) : null;
    const now = new Date();

    if (due) {
      const diffHours = (due - now) / (1000 * 60 * 60);

      if (diffHours < 0) {
        rawNotifications.push({
          id: `sla-breach-${ticket.id}`,
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          title: ticket.title,
          category: 'sla',
          level: 'Critical',
          icon: 'fa-solid fa-triangle-exclamation',
          iconColor: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.08)',
          borderColor: '#FCA5A5',
          actorName: 'SLA Monitor',
          actorRole: 'System Alert',
          message: `🚨 SLA Breached! Ticket #${ticket.ticket_number} ('${ticket.title}') is overdue by ${Math.abs(Math.round(diffHours))} hours.`,
          time: formatTime(ticket.due_at),
          rawTime: new Date(ticket.due_at).getTime()
        });
      } else if (diffHours <= 4) {
        rawNotifications.push({
          id: `sla-warn-${ticket.id}`,
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          title: ticket.title,
          category: 'sla',
          level: 'Warning',
          icon: 'fa-solid fa-circle-exclamation',
          iconColor: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.08)',
          borderColor: '#FCD34D',
          actorName: 'SLA Monitor',
          actorRole: 'System Alert',
          message: `⚠️ SLA Warning! Ticket #${ticket.ticket_number} ('${ticket.title}') expires in ${Math.max(1, Math.ceil(diffHours))} hours.`,
          time: formatTime(ticket.created_at),
          rawTime: new Date(ticket.created_at).getTime()
        });
      }
    }
  });

  // 2. Real-time remarks & activity updates
  scopedActivities.forEach(act => {
    const textLower = (act.remark_text || '').toLowerCase();
    const isStatusUpdate = textLower.includes('status changed') || textLower.includes('status updated');
    const isAssignUpdate = textLower.includes('assigned') || textLower.includes('technician');

    let category = 'comment';
    let icon = 'fa-solid fa-comment-dots';
    let iconColor = '#0265DC';
    let bgColor = 'rgba(2, 101, 220, 0.06)';
    let borderColor = '#93C5FD';
    let tagText = 'COMMENT / REPLY';

    if (isStatusUpdate) {
      category = 'status';
      icon = 'fa-solid fa-arrows-rotate';
      iconColor = '#8B5CF6';
      bgColor = 'rgba(139, 92, 246, 0.06)';
      borderColor = '#C4B5FD';
      tagText = 'STATUS UPDATED';
    } else if (isAssignUpdate) {
      category = 'status';
      icon = 'fa-solid fa-user-gear';
      iconColor = '#10B981';
      bgColor = 'rgba(16, 185, 129, 0.06)';
      borderColor = '#6EE7B7';
      tagText = 'ASSIGNED';
    } else if (textLower.includes('ticket created') || textLower.includes('raised new ticket')) {
      category = 'status';
      icon = 'fa-solid fa-circle-plus';
      iconColor = '#10B981';
      bgColor = 'rgba(16, 185, 129, 0.06)';
      borderColor = '#6EE7B7';
      tagText = 'NEW TICKET';
    }

    rawNotifications.push({
      id: `act-${act.id}`,
      ticketId: act.ticket_id,
      ticketNumber: act.ticket_number,
      title: act.ticket_title,
      category,
      icon,
      iconColor,
      bgColor,
      borderColor,
      tagText,
      actorName: act.user_name || 'Helpdesk Officer',
      actorRole: act.user_role || 'Staff',
      message: act.remark_text,
      time: formatTime(act.created_at),
      rawTime: new Date(act.created_at).getTime()
    });
  });

  // Sort latest notifications first
  rawNotifications.sort((a, b) => b.rawTime - a.rawTime);

  // 3. AUTO-REMOVE NOTIFICATIONS OLDER THAN 15 DAYS
  const fifteenDaysAgoMs = Date.now() - (15 * 24 * 60 * 60 * 1000);
  const activeNotifications = rawNotifications.filter(n => n.rawTime >= fifteenDaysAgoMs);

  // Compute Read / Unread subsets
  const unreadList = activeNotifications.filter(n => !isNotifRead(n.id));
  const readList = activeNotifications.filter(n => isNotifRead(n.id));

  // Filter based on Status Tab ('unread' | 'read' | 'all')
  const statusFilteredList = statusTab === 'unread' 
    ? unreadList 
    : statusTab === 'read' 
      ? readList 
      : activeNotifications;

  // Filter based on Category Pill ('all' | 'comment' | 'status' | 'sla')
  const finalFilteredList = statusFilteredList.filter(item => {
    if (filterType === 'all') return true;
    if (filterType === 'comment') return item.category === 'comment';
    if (filterType === 'status') return item.category === 'status';
    if (filterType === 'sla') return item.category === 'sla';
    return true;
  });

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <i className="fa-solid fa-bell" style={{ color: 'var(--zoho-blue)' }}></i> Notifications Hub & Activity Feed
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Real-time technician comments, status updates, SLA breach alerts (Auto-purged after 15 days).
          </p>
        </div>

        {unreadList.length > 0 && (
          <button 
            className="btn btn-zoho-secondary btn-sm"
            onClick={() => handleMarkAllRead(activeNotifications)}
            style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--zoho-blue)' }}
          >
            <i className="fa-solid fa-check-double"></i> Mark All as Read
          </button>
        )}
      </div>

      {/* READ vs UNREAD Sub-Tabs Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        {/* Left Sub-Tabs: All / Unread / Read */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn btn-zoho-secondary btn-sm ${statusTab === 'all' ? 'active' : ''}`}
            onClick={() => { setStatusTab('all'); setFilterType('all'); }}
            style={{ 
              fontWeight: 700, 
              fontSize: '0.8rem',
              background: statusTab === 'all' ? 'var(--zoho-blue)' : 'var(--card-bg)',
              color: statusTab === 'all' ? '#FFFFFF' : 'var(--text-main)',
              borderColor: statusTab === 'all' ? 'var(--zoho-blue)' : 'var(--border-color)'
            }}
          >
            <i className="fa-solid fa-list-ul"></i> All ({activeNotifications.length})
          </button>

          <button 
            className={`btn btn-zoho-secondary btn-sm ${statusTab === 'unread' ? 'active' : ''}`}
            onClick={() => { setStatusTab('unread'); setFilterType('all'); }}
            style={{ 
              fontWeight: 800, 
              fontSize: '0.8rem',
              background: statusTab === 'unread' ? '#EF4444' : 'var(--card-bg)',
              color: statusTab === 'unread' ? '#FFFFFF' : 'var(--text-main)',
              borderColor: statusTab === 'unread' ? '#DC2626' : 'var(--border-color)'
            }}
          >
            <i className="fa-solid fa-circle" style={{ fontSize: '0.55rem', color: statusTab === 'unread' ? '#FFF' : '#EF4444' }}></i> Unread ({unreadList.length})
          </button>

          <button 
            className={`btn btn-zoho-secondary btn-sm ${statusTab === 'read' ? 'active' : ''}`}
            onClick={() => { setStatusTab('read'); setFilterType('all'); }}
            style={{ 
              fontWeight: 700, 
              fontSize: '0.8rem',
              background: statusTab === 'read' ? 'var(--zoho-blue)' : 'var(--card-bg)',
              color: statusTab === 'read' ? '#FFFFFF' : 'var(--text-main)',
              borderColor: statusTab === 'read' ? 'var(--zoho-blue)' : 'var(--border-color)'
            }}
          >
            <i className="fa-solid fa-check"></i> Read ({readList.length})
          </button>
        </div>

        {/* Right Category Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button 
            className={`btn btn-zoho-secondary btn-xs ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
            style={{ fontWeight: 700, fontSize: '0.75rem' }}
          >
            All Types
          </button>

          <button 
            className={`btn btn-zoho-secondary btn-xs ${filterType === 'comment' ? 'active' : ''}`}
            onClick={() => setFilterType('comment')}
            style={{ color: 'var(--zoho-blue)', fontWeight: 700, fontSize: '0.75rem' }}
          >
            💬 Comments
          </button>

          <button 
            className={`btn btn-zoho-secondary btn-xs ${filterType === 'status' ? 'active' : ''}`}
            onClick={() => setFilterType('status')}
            style={{ color: '#8B5CF6', fontWeight: 700, fontSize: '0.75rem' }}
          >
            🔄 Status
          </button>

          <button 
            className={`btn btn-zoho-secondary btn-xs ${filterType === 'sla' ? 'active' : ''}`}
            onClick={() => setFilterType('sla')}
            style={{ color: '#EF4444', fontWeight: 700, fontSize: '0.75rem' }}
          >
            🚨 SLA Alerts
          </button>
        </div>
      </div>

      {/* Notifications Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: 'var(--zoho-blue)' }}></i>
          <p style={{ marginTop: '10px' }}>Loading real-time notifications...</p>
        </div>
      ) : finalFilteredList.length === 0 ? (
        <div style={{ 
          background: 'var(--card-bg)', 
          padding: '60px 20px', 
          textAlign: 'center', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <i className="fa-solid fa-bell-slash" style={{ fontSize: '2.5rem', color: '#94A3B8' }}></i>
          <h3 style={{ marginTop: '12px', color: 'var(--text-main)' }}>
            No {statusTab === 'unread' ? 'Unread' : statusTab === 'read' ? 'Read' : ''} Notifications Found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            {statusTab === 'unread' 
              ? 'Great job! You have read all recent notifications within the last 15 days.'
              : 'No notifications match your current filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {finalFilteredList.map(item => {
            const isUnread = !isNotifRead(item.id);

            return (
              <div 
                key={item.id}
                onClick={() => markAsRead(item.id, item.ticketId)}
                style={{ 
                  background: isUnread 
                    ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.07) 0%, var(--card-bg) 100%)' 
                    : 'var(--card-bg)', 
                  borderLeft: isUnread ? '5px solid #EF4444' : `3px solid ${item.borderColor || '#94A3B8'}`,
                  borderTop: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  position: 'relative',
                  boxShadow: isUnread ? '0 2px 8px rgba(239, 68, 68, 0.12)' : 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                {/* Left Icon Badge with Unread Glow Indicator */}
                <div style={{ position: 'relative' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: item.bgColor, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: item.iconColor,
                    fontSize: '1rem',
                    border: isUnread ? `1.5px solid ${item.iconColor}` : 'none'
                  }}>
                    <i className={item.icon}></i>
                  </div>

                  {isUnread && (
                    <span 
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '10px',
                        height: '10px',
                        background: '#EF4444',
                        borderRadius: '50%',
                        border: '2px solid #FFF'
                      }}
                      title="Unread Notification"
                    />
                  )}
                </div>

                {/* Main Notification Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Ticket Number Badge */}
                      <span style={{ 
                        fontWeight: 800, 
                        color: 'var(--zoho-blue)', 
                        fontSize: '0.86rem',
                        background: 'rgba(2, 101, 220, 0.08)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)'
                      }}>
                        #{item.ticketNumber}
                      </span>

                      {/* Notification Type Tag */}
                      {item.tagText && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 700, 
                          color: item.iconColor,
                          border: `1px solid ${item.borderColor}`,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-xs)',
                          textTransform: 'uppercase'
                        }}>
                          {item.tagText}
                        </span>
                      )}

                      {/* UNREAD vs READ Status Badge */}
                      {isUnread ? (
                        <span style={{ 
                          fontSize: '0.66rem', 
                          fontWeight: 900, 
                          background: '#EF4444', 
                          color: '#FFFFFF', 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          letterSpacing: '0.5px'
                        }}>
                          UNREAD
                        </span>
                      ) : (
                        <span style={{ 
                          fontSize: '0.66rem', 
                          fontWeight: 600, 
                          color: 'var(--text-muted)', 
                          background: 'rgba(0,0,0,0.05)', 
                          padding: '1px 6px', 
                          borderRadius: '4px'
                        }}>
                          READ
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.75rem', color: isUnread ? '#DC2626' : 'var(--text-muted)', fontWeight: isUnread ? 700 : 400 }}>
                      <i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i>
                      {item.time}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {item.title}
                  </div>

                  <div style={{ 
                    fontSize: '0.83rem', 
                    color: isUnread ? 'var(--text-main)' : 'var(--text-secondary)', 
                    background: isUnread ? 'rgba(255, 255, 255, 0.7)' : 'var(--bg-body)', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    lineHeight: '1.45',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    <strong style={{ color: 'var(--text-main)' }}>{item.actorName}</strong> ({item.actorRole}): {item.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
