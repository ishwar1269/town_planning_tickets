import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricsBar from './components/MetricsBar';
import StatusTabs from './components/StatusTabs';
import SidebarFilters from './components/SidebarFilters';
import TicketTableGrid from './components/TicketTableGrid';
import CreateTicketModal from './components/CreateTicketModal';
import TicketDetailModal from './components/TicketDetailModal';
import TechnicianManagerModal from './components/TechnicianManagerModal';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import ReportsSection from './components/ReportsSection';
import SLACalculationSection from './components/SLACalculationSection';
import NotificationsSection from './components/NotificationsSection';
import DashboardChartsGrid from './components/DashboardChartsGrid';
import BrandingSettingsModal from './components/BrandingSettingsModal';
import LandingHomePage from './components/LandingHomePage';

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // Theme State (Light vs Dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tp_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tp_theme', theme);
  }, [theme]);

  // Authentication & Active User Session State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tp_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Tab & Filters State
  const [activeTab, setActiveTab] = useState('home');
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('all');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [redirectedFromMergedId, setRedirectedFromMergedId] = useState(null);

  const handleSelectTicket = (id) => {
    if (!id) {
      setSelectedTicketId(null);
      setRedirectedFromMergedId(null);
      return;
    }
    const target = tickets.find(t => t.id === Number(id));
    if (target && target.merged_into_ticket_id) {
      // If the selected ticket is a merged ticket, redirect to open the master ticket!
      setRedirectedFromMergedId(target.id);
      setSelectedTicketId(target.merged_into_ticket_id);
    } else {
      setRedirectedFromMergedId(null);
      setSelectedTicketId(id);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // Live polling every 3 seconds for real-time dynamic status & activity updates
    const interval = setInterval(() => {
      fetchTickets(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchTickets(true), fetchCategories(), fetchTechnicians()]);
    setLoading(false);
  };

  const fetchTickets = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const token = localStorage.getItem('jwtToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/tickets', { headers });
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await fetch('/api/technicians');
      const data = await res.json();
      setTechnicians(data);
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tp_user');
    localStorage.removeItem('jwtToken');
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem('tp_user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('jwtToken', token);
    }
  };

  const handleExportExcel = () => {
    if (tickets.length === 0) {
      alert('No tickets available to export.');
      return;
    }

    const headers = ['Ticket Number', 'Title', 'Category', 'Priority', 'Status', 'Created By Name', 'Created By Email', 'Assigned Technician', 'Created Date', 'Due Date'];
    const csvRows = [headers.join(',')];

    tickets.forEach(t => {
      const row = [
        `"${t.ticket_number || ''}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.category_name || ''}"`,
        `"${t.priority || ''}"`,
        `"${t.status || ''}"`,
        `"${t.created_by_name || ''}"`,
        `"${t.created_by_email || ''}"`,
        `"${t.technician_name || 'Unassigned'}"`,
        `"${t.created_at || ''}"`,
        `"${t.due_at || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Helpdesk_Tickets_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Role-Based User Tickets Scope
  const userScopedTickets = (() => {
    if (!currentUser) return tickets;

    if (currentUser.role === 'user') {
      // Citizen User sees ONLY tickets raised by themselves
      return tickets.filter(t => 
        (currentUser.email && t.created_by_email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.name && t.created_by_name?.toLowerCase() === currentUser.name.toLowerCase())
      );
    } else if (currentUser.role === 'technician') {
      // Technician sees assigned tickets AND unassigned tickets matching allocated categories
      const matchedTech = technicians.find(tc => tc.email?.toLowerCase() === currentUser.email?.toLowerCase());
      if (matchedTech) {
        const assignedCatIds = matchedTech.category_ids || [];
        return tickets.filter(t => 
          t.assigned_technician_id === matchedTech.id || 
          assignedCatIds.includes(Number(t.category_id))
        );
      }
    }
    // Admin and Universal Operator see ALL tickets
    return tickets;
  })();

  // Compute Unread / Active Action Notifications Count
  const unreadNotificationsCount = userScopedTickets.filter(t => {
    if (t.status === 'Closed') return false;
    if (t.status === 'New') return true;
    if (t.due_at) {
      const due = new Date(t.due_at);
      const diffHours = (due - new Date()) / (1000 * 60 * 60);
      if (diffHours <= 4) return true;
    }
    return false;
  }).length;

  // Filtered Tickets Computation
  const filteredTickets = userScopedTickets.filter(item => {
    let matchStatus = false;
    if (activeTab === 'actions' || activeStatus === 'action_needed') {
      if (item.status === 'Closed' || !item.due_at) {
        matchStatus = false;
      } else {
        const now = new Date();
        const diffHours = (new Date(item.due_at) - now) / (1000 * 60 * 60);
        matchStatus = diffHours <= 4; // SLA warning (<4h) or breached (<0h)
      }
    } else if (activeStatus === 'all') {
      matchStatus = true;
    } else {
      matchStatus = (item.status === activeStatus);
    }

    const matchCategory = (
      selectedCatId === 'all' || 
      String(item.category_id) === String(selectedCatId) || 
      Number(item.category_id) === Number(selectedCatId)
    );
    
    const term = searchQuery.trim().toLowerCase();
    const matchSearch = (!term || 
      (item.ticket_number && String(item.ticket_number).toLowerCase().includes(term)) ||
      (item.title && String(item.title).toLowerCase().includes(term)) ||
      (item.created_by_name && String(item.created_by_name).toLowerCase().includes(term)) ||
      (item.created_by_email && String(item.created_by_email).toLowerCase().includes(term)) ||
      (item.technician_name && String(item.technician_name).toLowerCase().includes(term))
    );

    return matchStatus && matchCategory && matchSearch;
  });

  const handleQuickStatusUpdate = async (ticketId, newStatus) => {
    try {
      const targetTicket = tickets.find(t => t.id === ticketId);
      const oldStatus = targetTicket ? targetTicket.status : '';
      const officerName = currentUser ? currentUser.name : 'Officer';

      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          remark: oldStatus && oldStatus !== newStatus
            ? `Status changed from '${oldStatus}' to '${newStatus}'`
            : `Status changed to '${newStatus}'`,
          updated_by_name: officerName
        })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchTickets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSelectCategory = (catId) => {
    setSelectedCatId(catId);
    setActiveStatus('all');
    setActiveTab('tickets');
  };

  return (
    <div className="app-wrapper">
      {/* Unified Primary Top Navbar Header */}
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={(newTheme) => setTheme(newTheme)}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onOpenRegisterModal={() => setShowRegisterModal(true)}
        onLogout={handleLogout}
        onOpenCreateModal={() => setShowCreateModal(true)}
        onOpenTechModal={() => setShowTechModal(true)}
        onOpenBrandingModal={() => setShowBrandingModal(true)}
        onExportExcel={handleExportExcel}
        unreadCount={unreadNotificationsCount || 14}
      />

      <main className="container" style={{ paddingBottom: '60px', marginTop: '12px' }}>
        {activeTab === 'home' ? (
          /* Public Home Page — Full Width without Left Navigation Sidebar */
          <div style={{ width: '100%' }}>
            <LandingHomePage 
              onOpenCreateModal={() => setShowCreateModal(true)}
              onOpenLoginModal={() => setShowLoginModal(true)}
              onOpenRegisterModal={() => setShowRegisterModal(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              currentUser={currentUser}
              tickets={userScopedTickets}
              categories={categories}
            />
          </div>
        ) : (
          /* Internal Portal Views — Master 2-Column Layout with Left Sidebar */
          <div className="zoho-desk-layout">
            {/* Master Left Navigation Sidebar */}
            <SidebarFilters 
              categories={categories}
              selectedCatId={selectedCatId}
              setSelectedCatId={handleSelectCategory}
              ticketsCount={userScopedTickets.length}
              tickets={userScopedTickets}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
              onOpenTechModal={() => setShowTechModal(true)}
              unreadNotificationsCount={unreadNotificationsCount}
            />

            {/* Right Main Content Area */}
            <div>
              {activeTab === 'notifications' ? (
                <NotificationsSection 
                  currentUser={currentUser}
                  tickets={userScopedTickets}
                  onSelectTicket={handleSelectTicket}
                />
              ) : (activeTab === 'sla_calculation' && (currentUser?.role === 'admin' || currentUser?.role === 'universal' || currentUser?.role === 'technician')) ? (
                <SLACalculationSection 
                  currentUser={currentUser}
                  tickets={userScopedTickets}
                  onSelectTicket={handleSelectTicket}
                />
              ) : (activeTab === 'reports' && (currentUser?.role === 'admin' || currentUser?.role === 'universal')) ? (
                <ReportsSection 
                  currentUser={currentUser}
                  categories={categories}
                  technicians={technicians}
                />
              ) : (activeTab === 'dashboard' && (currentUser?.role === 'admin' || currentUser?.role === 'universal' || currentUser?.role === 'technician')) ? (
                <>
                  {/* Top Summary Metrics Cards */}
                  <MetricsBar tickets={userScopedTickets} />

                  {/* Dashboard Graphical Representation (Charts & KPI Performance Widgets) */}
                  <DashboardChartsGrid 
                    tickets={userScopedTickets} 
                    categories={categories} 
                    onSelectTicket={handleSelectTicket}
                  />
                </>
              ) : (
                <>
                  {/* Ticket Details View: All Raised Tickets Table & Filters */}
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-list-check" style={{ color: '#8B5CF6' }}></i> Ticket Management & Service Requests
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        Comprehensive overview, status tracking, filtering, and SLA management for all service tickets.
                      </p>
                    </div>

                    <button 
                      type="button"
                      className="btn btn-zoho-primary"
                      onClick={() => setShowCreateModal(true)}
                      style={{ 
                        padding: '8px 18px', 
                        fontSize: '0.84rem', 
                        fontWeight: 700, 
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer'
                      }}
                      title="Raise a new ticket / complaint"
                    >
                      <i className="fa-solid fa-plus-circle"></i> Raise Ticket
                    </button>
                  </div>

                  {/* Filter Toolbar & Search */}
                  <StatusTabs 
                    activeStatus={activeStatus}
                    setActiveStatus={setActiveStatus}
                    tickets={userScopedTickets}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />

                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '12px', color: 'var(--zoho-blue)' }}></i>
                      <p>Loading Ticket Data...</p>
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '60px 20px', 
                      background: 'var(--card-bg)', 
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <i className="fa-solid fa-folder-open text-muted" style={{ fontSize: '2.5rem', color: '#CBD5E1' }}></i>
                      <h3 style={{ marginTop: '12px', color: 'var(--text-main)' }}>No Tickets Match Your Filter</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>Try clearing your search query or selecting a different status pill.</p>
                    </div>
                  ) : (
                    <TicketTableGrid 
                      currentUser={currentUser}
                      tickets={filteredTickets}
                      onSelectTicket={handleSelectTicket}
                      onUpdateStatus={handleQuickStatusUpdate}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showRegisterModal && (
        <RegisterModal 
          onClose={() => setShowRegisterModal(false)}
          onRegisterSuccess={handleLoginSuccess}
        />
      )}

      {showCreateModal && (
        <CreateTicketModal 
          currentUser={currentUser}
          categories={categories}
          technicians={technicians}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { fetchTickets(); fetchTechnicians(); }}
        />
      )}

      {showTechModal && (
        <TechnicianManagerModal 
          technicians={technicians}
          categories={categories}
          onClose={() => setShowTechModal(false)}
          onRefresh={() => { fetchTechnicians(); fetchCategories(); }}
          onOpenBrandingModal={() => setShowBrandingModal(true)}
        />
      )}

      {showBrandingModal && (
        <BrandingSettingsModal 
          onClose={() => setShowBrandingModal(false)}
          onConfigSaved={() => fetchTickets(true)}
        />
      )}

      {selectedTicketId && (
        <TicketDetailModal 
          currentUser={currentUser}
          ticketId={selectedTicketId}
          redirectedFromMergedId={redirectedFromMergedId}
          technicians={technicians}
          categories={categories}
          onClose={() => { setSelectedTicketId(null); setRedirectedFromMergedId(null); }}
          onRefresh={() => { fetchTickets(); fetchTechnicians(); }}
          onOpenCreateModal={() => { setSelectedTicketId(null); setShowCreateModal(true); }}
        />
      )}
    </div>
  );
}
