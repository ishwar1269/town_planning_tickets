import React from 'react';

export default function SubNavTabs({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  unreadNotificationsCount = 0,
  onOpenTechModal 
}) {
  const isAdmin = currentUser && currentUser.role === 'admin';

  return (
    <div className="zoho-subnav">
      <div className="container zoho-subnav-inner">
        <ul className="zoho-nav-tabs" style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
          <li 
            className={`zoho-nav-tab ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <i className="fa-solid fa-house" style={{ color: activeTab === 'home' ? '#38BDF8' : '#94A3B8' }}></i> Home Portal
          </li>

          <li 
            className={`zoho-nav-tab ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
            style={{ fontWeight: activeTab === 'tickets' ? 700 : 600 }}
          >
            <i className="fa-solid fa-toolbox" style={{ color: activeTab === 'tickets' ? '#A78BFA' : '#C084FC' }}></i> Ticket Tools & Details
          </li>

          <li 
            className={`zoho-nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <i className="fa-solid fa-gauge-high" style={{ color: activeTab === 'dashboard' ? '#38BDF8' : '#60A5FA' }}></i> Dashboard
          </li>

          <li 
            className={`zoho-nav-tab ${activeTab === 'sla_calculation' ? 'active' : ''}`}
            onClick={() => setActiveTab('sla_calculation')}
          >
            <i className="fa-solid fa-calculator" style={{ color: activeTab === 'sla_calculation' ? '#F87171' : '#FCA5A5' }}></i> SLA Calculator
          </li>

          <li 
            className={`zoho-nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <i className="fa-solid fa-bell" style={{ color: activeTab === 'notifications' ? '#FBBF24' : '#FCD34D' }}></i> Notifications
            {unreadNotificationsCount > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 800, marginLeft: '4px' }}>
                {unreadNotificationsCount}
              </span>
            )}
          </li>

          <li 
            className={`zoho-nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <i className="fa-solid fa-file-arrow-down" style={{ color: activeTab === 'reports' ? '#34D399' : '#6EE7B7' }}></i> Reports
          </li>

          {isAdmin && (
            <li 
              className="zoho-nav-tab admin-tab"
              onClick={onOpenTechModal}
              style={{ color: '#FBBF24', fontWeight: 700, marginLeft: 'auto' }}
              title="Open Admin & Technician Console"
            >
              <i className="fa-solid fa-user-shield"></i> Admin Console
            </li>
          )}
        </ul>

        <div className="zoho-subnav-meta" style={{ flexShrink: 0, paddingLeft: '12px' }}>
          <i className="fa-solid fa-building-columns"></i> Town Planning Helpdesk
        </div>
      </div>
    </div>
  );
}

