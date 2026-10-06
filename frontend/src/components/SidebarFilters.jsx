import React, { useState } from 'react';

export default function SidebarFilters({ 
  categories = [], 
  selectedCatId, 
  setSelectedCatId, 
  ticketsCount = 0,
  tickets = [],
  activeTab = 'dashboard',
  setActiveTab,
  currentUser,
  onOpenTechModal,
  unreadNotificationsCount = 0
}) {
  // Toggle for Collapsible "Ticket Categories" Menu Item (Default Collapsed = 1 line item)
  const [isCatMenuExpanded, setIsCatMenuExpanded] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Compute live ticket counts per Category ID
  const catCounts = {};
  (tickets || []).forEach(t => {
    if (t && t.category_id !== undefined && t.category_id !== null) {
      catCounts[t.category_id] = (catCounts[t.category_id] || 0) + 1;
      catCounts[String(t.category_id)] = (catCounts[String(t.category_id)] || 0) + 1;
    }
  });

  // Compute live 24H Breached Tickets Count for SLA Calculation Badge
  const now = new Date();
  const breachedCount = (tickets || []).filter(t => {
    if (!t) return false;
    const due = t.due_at ? new Date(t.due_at) : null;
    const created = t.created_at ? new Date(t.created_at) : null;
    const effectiveDue = due || (created ? new Date(created.getTime() + 24 * 60 * 60 * 1000) : null);
    if (!effectiveDue) return false;

    const isResolvedOrClosed = t.status === 'Resolved' || t.status === 'Closed';
    if (isResolvedOrClosed) {
      const finishTimeStr = t.resolved_at || t.closed_at;
      if (finishTimeStr) {
        return new Date(finishTimeStr) > effectiveDue;
      }
      return false;
    }
    return now > effectiveDue;
  }).length;

  // Group categories by group_name
  const groupedCategories = (categories || []).reduce((acc, cat) => {
    const groupName = cat.group_name || 'General';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(cat);
    return acc;
  }, {});

  const availableGroups = Object.keys(groupedCategories);

  const toggleGroupCollapse = (groupName, e) => {
    e.stopPropagation();
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleSelectAllCategories = () => {
    setSelectedCatId('all');
    if (setActiveTab) setActiveTab('tickets');
  };

  const handleToggleCatMenu = () => {
    setIsCatMenuExpanded(!isCatMenuExpanded);
  };

  const role = currentUser?.role;
  const isAdmin = role === 'admin';
  const isUniversal = role === 'universal';
  const isTechnician = role === 'technician';
  const isStaffOrAdmin = isAdmin || isUniversal || isTechnician;

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ----------------------------------------------------------- */}
      {/* MASTER NAVIGATION MENU                                      */}
      {/* ----------------------------------------------------------- */}
      <div className="sidebar-category-card">
        <div className="sidebar-category-header" style={{ background: 'var(--zoho-header-bg)' }}>
          <span>Navigation Menu</span>
          <i className="fa-solid fa-compass" style={{ fontSize: '0.85rem' }}></i>
        </div>

        <div className="sidebar-category-body" style={{ padding: '8px' }}>
          {/* Menu Item 0: Home Page (Portal Overview) */}
          <div 
            className={`sidebar-category-row ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab && setActiveTab('home')}
            style={{ fontWeight: 600, fontSize: '0.84rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-house" style={{ color: 'var(--zoho-blue)' }}></i>
              <span>Portal Overview</span>
            </div>
          </div>

          {/* Menu Item 1: Ticket Management (All Raised Tickets Table View) */}
          <div 
            className={`sidebar-category-row ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => {
              setSelectedCatId('all');
              if (setActiveTab) setActiveTab('tickets');
            }}
            style={{ fontWeight: 600, fontSize: '0.84rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-ticket" style={{ color: '#8B5CF6' }}></i>
              <span>Ticket Management</span>
            </div>
            <span className="sidebar-count" style={{ fontWeight: 800 }}>{ticketsCount || tickets.length}</span>
          </div>

          {/* Menu Item 2: Analytics Dashboard */}
          {isStaffOrAdmin && (
            <div 
              className={`sidebar-category-row ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab && setActiveTab('dashboard')}
              style={{ fontWeight: 600, fontSize: '0.84rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-chart-pie" style={{ color: 'var(--zoho-blue)' }}></i>
                <span>Analytics Dashboard</span>
              </div>
            </div>
          )}

          {/* Menu Item 3: Service Categories (Visible only to Admin, Universal Operator & Technician) */}
          {isStaffOrAdmin && (
            <div>
              <div 
                className={`sidebar-category-row ${isCatMenuExpanded || (selectedCatId !== 'all' && activeTab === 'tickets') ? 'active' : ''}`}
                onClick={handleToggleCatMenu}
                style={{ fontWeight: 600, fontSize: '0.84rem' }}
                title="Click to view & filter by categories"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-layer-group" style={{ color: '#0265DC' }}></i>
                  <span>Service Categories</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="sidebar-count" style={{ background: '#DBEAFE', color: '#0265DC', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                    {categories.length}
                  </span>
                  <i className={`fa-solid ${isCatMenuExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}></i>
                </div>
              </div>

              {/* EXPANDABLE CATEGORIES TREE */}
              {isCatMenuExpanded && (
                <div style={{ 
                  marginTop: '6px', 
                  marginBottom: '6px', 
                  paddingLeft: '10px', 
                  paddingRight: '4px',
                  borderLeft: '2px solid var(--zoho-blue)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {/* All Categories Option */}
                  <div 
                    className={`sidebar-category-row ${selectedCatId === 'all' && activeTab === 'tickets' ? 'active' : ''}`}
                    onClick={handleSelectAllCategories}
                    style={{ fontWeight: 700, fontSize: '0.81rem', padding: '4px 8px' }}
                  >
                    <span>All Categories</span>
                    <span className="sidebar-count">{ticketsCount || tickets.length}</span>
                  </div>

                  {/* Group Categories & Nested Items */}
                  {availableGroups.map(groupName => {
                    const groupCats = groupedCategories[groupName];
                    const isCollapsed = collapsedGroups[groupName];
                    const groupTicketCount = groupCats.reduce((sum, c) => sum + (catCounts[c.id] || 0), 0);

                    return (
                      <div key={groupName} style={{ marginTop: '2px' }}>
                        {/* Group Header Row */}
                        <div 
                          className="sidebar-category-row"
                          style={{ fontWeight: 700, fontSize: '0.8rem', padding: '4px 8px' }}
                          onClick={(e) => toggleGroupCollapse(groupName, e)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className={`fa-solid ${isCollapsed ? 'fa-folder' : 'fa-folder-open'}`} style={{ fontSize: '0.72rem', color: 'var(--zoho-blue)' }}></i>
                            <span>{groupName}</span>
                          </div>
                          <span className="sidebar-count">{groupTicketCount}</span>
                        </div>

                        {/* Nested Categories Under Group */}
                        {!isCollapsed && (
                          <div style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '1px' }}>
                            {groupCats.map(cat => {
                              const isSelected = (String(selectedCatId) === String(cat.id) || selectedCatId === cat.id) && activeTab === 'tickets';
                              const catCount = catCounts[cat.id] || catCounts[String(cat.id)] || 0;

                              return (
                                <div 
                                  key={cat.id}
                                  className={`sidebar-category-row ${isSelected ? 'active' : ''}`}
                                  style={{ fontSize: '0.77rem', padding: '3px 8px' }}
                                  onClick={() => {
                                    setSelectedCatId(cat.id);
                                    if (setActiveTab) setActiveTab('tickets');
                                  }}
                                >
                                  <span style={{ color: isSelected ? 'inherit' : 'var(--text-secondary)' }}>
                                    {cat.name}
                                  </span>
                                  <span className="sidebar-count">{catCount}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Menu Item 4: Notifications & Alerts */}
          <div 
            className={`sidebar-category-row ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab && setActiveTab('notifications')}
            style={{ fontWeight: 600, fontSize: '0.84rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-bell" style={{ color: '#F59E0B' }}></i>
              <span>Notifications & Alerts</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="sidebar-count" style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                {unreadNotificationsCount}
              </span>
            )}
          </div>

          {/* Menu Item 5: SLA & Penalty Audit (Visible only to Admin, Universal Operator & Technician) */}
          {isStaffOrAdmin && (
            <div 
              className={`sidebar-category-row ${activeTab === 'sla_calculation' ? 'active' : ''}`}
              onClick={() => setActiveTab && setActiveTab('sla_calculation')}
              style={{ fontWeight: 600, fontSize: '0.84rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-calculator" style={{ color: '#EF4444' }}></i>
                <span>SLA & Penalty Audit</span>
              </div>
              {breachedCount > 0 && (
                <span className="sidebar-count" style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                  {breachedCount}
                </span>
              )}
            </div>
          )}

          {/* Menu Item 6: Reports & Analytics (Visible to Admin & Universal Operator) */}
          {(isAdmin || isUniversal) && (
            <div 
              className={`sidebar-category-row ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab && setActiveTab('reports')}
              style={{ fontWeight: 600, fontSize: '0.84rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-chart-simple" style={{ color: '#10B981' }}></i>
                <span>Reports & Analytics</span>
              </div>
            </div>
          )}

          {/* Menu Item 7: Admin Console (Admin Only) */}
          {isAdmin && (
            <div 
              className="sidebar-category-row"
              onClick={onOpenTechModal}
              style={{ fontWeight: 700, fontSize: '0.84rem', background: 'rgba(217, 119, 6, 0.12)', color: 'var(--zoho-blue-dark, #D97706)', marginTop: '4px', border: '1px solid rgba(217, 119, 6, 0.3)', cursor: 'pointer' }}
              title="Open Admin Console (Admin Only)"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user-shield" style={{ color: '#D97706' }}></i>
                <span>Admin Console</span>
              </div>
              <span style={{ fontSize: '0.68rem', background: '#D97706', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>ADMIN</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
