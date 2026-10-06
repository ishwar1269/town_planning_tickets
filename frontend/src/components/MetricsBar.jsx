import React from 'react';

export default function MetricsBar({ tickets }) {
  const total = tickets.length;
  const newCount = tickets.filter(item => item.status === 'New' || item.status === 'Reopened').length;
  const inProgressCount = tickets.filter(item => item.status === 'In Progress' || item.status === 'Assigned').length;
  const closedCount = tickets.filter(item => item.status === 'Closed' || item.status === 'Resolved').length;

  return (
    <div className="zoho-metrics-row">
      <div className="zoho-stat-card">
        <div className="zoho-stat-icon" style={{ background: '#EBF3FE', color: '#0265DC' }}>
          <i className="fa-solid fa-ticket"></i>
        </div>
        <div className="zoho-stat-content">
          <strong>{total}</strong>
          <small>Total Helpdesk Tickets</small>
        </div>
      </div>

      <div className="zoho-stat-card">
        <div className="zoho-stat-icon" style={{ background: '#FEF2F2', color: '#EF4444' }}>
          <i className="fa-solid fa-circle-exclamation"></i>
        </div>
        <div className="zoho-stat-content">
          <strong>{newCount}</strong>
          <small>Open / New Tickets</small>
        </div>
      </div>

      <div className="zoho-stat-card">
        <div className="zoho-stat-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
          <i className="fa-solid fa-spinner"></i>
        </div>
        <div className="zoho-stat-content">
          <strong>{inProgressCount}</strong>
          <small>In Progress / Assigned</small>
        </div>
      </div>

      <div className="zoho-stat-card">
        <div className="zoho-stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
          <i className="fa-solid fa-circle-check"></i>
        </div>
        <div className="zoho-stat-content">
          <strong>{closedCount}</strong>
          <small>Resolved / Closed</small>
        </div>
      </div>
    </div>
  );
}
