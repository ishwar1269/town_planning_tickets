import React, { useState, useMemo } from 'react';
import ReportExportModal from './ReportExportModal';

export default function ReportsSection({ currentUser, categories = [], technicians = [] }) {
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  const reportItems = [
    {
      id: 'summary',
      title: 'Summary Master Report',
      category: 'operations',
      tag: 'MASTER AUDIT',
      subtitle: 'Complete ticket log breakdown with custom date ranges, category segmentation, priority levels, and full Excel export.',
      icon: 'fa-solid fa-file-invoice-dollar',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      accentColor: '#10B981',
      bgLight: '#ECFDF5',
      features: ['Date Range Filter', 'Multi-Status Export', 'Audit Trail CSV']
    },
    {
      id: 'tickets_per_day',
      title: 'Daily Volume & Velocity',
      category: 'operations',
      tag: 'TREND ANALYTICS',
      subtitle: 'Analyze daily ticket intake, peak submission hours, resolution velocity, and intake distribution over time.',
      icon: 'fa-solid fa-chart-line-up',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      accentColor: '#3B82F6',
      bgLight: '#EFF6FF',
      features: ['Daily Intake Log', 'Peak Load Tracker', 'Volume Distribution']
    },
    {
      id: 'technician_stats',
      title: 'Technician Performance',
      category: 'staff',
      tag: 'WORKLOAD & EFFICIENCY',
      subtitle: 'Measure specialist resolution efficiency, assigned vs closed case counts, workload distribution, and individual velocity.',
      icon: 'fa-solid fa-user-gear',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
      accentColor: '#8B5CF6',
      bgLight: '#F5F3FF',
      features: ['Agent Workload', 'Closed Rate %', 'Active Assigned Cases']
    },
    {
      id: 'response_speed',
      title: 'SLA Response & Compliance',
      category: 'sla',
      tag: 'SLA COMPLIANCE',
      subtitle: 'Detailed SLA turnaround times, first-response speed, breach warnings, and turnaround compliance audit.',
      icon: 'fa-solid fa-stopwatch-20',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      accentColor: '#F59E0B',
      bgLight: '#FFFBEB',
      features: ['Response Speed', 'Breach Frequency', 'SLA Target Tracking']
    },
    {
      id: 'custom_reports',
      title: 'Custom Query Builder',
      category: 'operations',
      tag: 'CUSTOM FILTERS',
      subtitle: 'Build tailored cross-filter queries combining departments, priority matrices, dates, and assigned technicians.',
      icon: 'fa-solid fa-sliders',
      gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      accentColor: '#06B6D4',
      bgLight: '#ECFEFF',
      features: ['Universal Filtering', 'Custom Matrices', 'Direct CSV Download']
    },
    {
      id: 'companies_stats',
      title: 'Department & Category Breakdown',
      category: 'dept',
      tag: 'DEPARTMENT AUDIT',
      subtitle: 'Comprehensive distribution of tickets grouped by town planning wings, municipal wards, and urban divisions.',
      icon: 'fa-solid fa-building-columns',
      gradient: 'linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)',
      accentColor: '#F43F5E',
      bgLight: '#FFF1F2',
      features: ['Ward Segmentation', 'Category Load', 'Departmental Audits']
    },
    {
      id: 'due_dates',
      title: 'SLA Timelines & Due Schedule',
      category: 'sla',
      tag: 'SCHEDULE & DEADLINES',
      subtitle: 'Upcoming resolution due dates, deadline calendar schedules, and overdue ticket tracking overview.',
      icon: 'fa-regular fa-calendar-check',
      gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
      accentColor: '#0EA5E9',
      bgLight: '#F0F9FF',
      features: ['Deadline Calendar', 'Overdue Tracking', 'Target Timelines']
    }
  ];

  const filteredReports = useMemo(() => {
    return reportItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.tag.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategoryFilter === 'all' || item.category === activeCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategoryFilter]);

  return (
    <div className="reports-hub-wrapper">
      {/* Executive Hero Banner */}
      <div className="reports-hero-banner">
        <div className="reports-hero-content">
          <div className="reports-hero-badge">
            <i className="fa-solid fa-file-shield"></i> Official Export & Analytics Hub
          </div>
          <h2 className="reports-hero-title">
            Executive Reports & Intelligence Directory
          </h2>
          <p className="reports-hero-desc">
            Generate scheduled audits, analyze SLA resolution performance, track technician caseloads, and export formatted Excel/CSV data sheets.
          </p>
        </div>

        <div className="reports-hero-stats">
          <div className="hero-stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              <i className="fa-solid fa-file-excel"></i>
            </div>
            <div>
              <div className="stat-pill-value">7 Modules</div>
              <div className="stat-pill-label">Pre-Configured</div>
            </div>
          </div>
          <div className="hero-stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
              <i className="fa-solid fa-bolt"></i>
            </div>
            <div>
              <div className="stat-pill-value">Live Sync</div>
              <div className="stat-pill-label">Real-Time Data</div>
            </div>
          </div>
          <div className="hero-stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
              <i className="fa-solid fa-download"></i>
            </div>
            <div>
              <div className="stat-pill-value">XLSX / CSV</div>
              <div className="stat-pill-label">Universal Export</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="reports-toolbar">
        {/* Category Pills */}
        <div className="reports-filter-chips">
          <button 
            type="button" 
            className={`report-chip ${activeCategoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('all')}
          >
            <i className="fa-solid fa-layer-group"></i> All Reports ({reportItems.length})
          </button>
          <button 
            type="button" 
            className={`report-chip ${activeCategoryFilter === 'operations' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('operations')}
          >
            <i className="fa-solid fa-gears"></i> Operations & Volume
          </button>
          <button 
            type="button" 
            className={`report-chip ${activeCategoryFilter === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('staff')}
          >
            <i className="fa-solid fa-user-tie"></i> Staff & Performance
          </button>
          <button 
            type="button" 
            className={`report-chip ${activeCategoryFilter === 'sla' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('sla')}
          >
            <i className="fa-solid fa-clock-rotate-left"></i> SLA & Deadlines
          </button>
          <button 
            type="button" 
            className={`report-chip ${activeCategoryFilter === 'dept' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('dept')}
          >
            <i className="fa-solid fa-building-user"></i> Department Audits
          </button>
        </div>

        {/* Search Box */}
        <div className="reports-search-box">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            placeholder="Search report templates (e.g. SLA, technician, summary)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="reports-grid-modern">
        {filteredReports.map(item => (
          <div 
            key={item.id} 
            className="report-card-premium"
            onClick={() => setActiveReportModal(item.id)}
          >
            {/* Card Header */}
            <div className="report-card-header">
              <div 
                className="report-icon-avatar"
                style={{ background: item.gradient }}
              >
                <i className={item.icon}></i>
              </div>

              <div className="report-card-badges">
                <span 
                  className="report-tag-pill"
                  style={{ background: item.bgLight, color: item.accentColor, borderColor: `${item.accentColor}30` }}
                >
                  {item.tag}
                </span>
                <span className="report-format-pill">
                  <i className="fa-solid fa-file-excel"></i> XLSX
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="report-card-body">
              <h3 className="report-card-title">{item.title}</h3>
              <p className="report-card-desc">{item.subtitle}</p>
            </div>

            {/* Features Tags */}
            <div className="report-features-row">
              {item.features.map((feat, idx) => (
                <span key={idx} className="report-feature-item">
                  <i className="fa-solid fa-circle-check" style={{ color: item.accentColor }}></i> {feat}
                </span>
              ))}
            </div>

            {/* Card Action Footer */}
            <div className="report-card-footer">
              <span className="report-action-label">Configure & Generate</span>
              <div className="report-action-btn" style={{ background: item.bgLight, color: item.accentColor }}>
                <i className="fa-solid fa-arrow-right"></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick consolidated report launcher bar */}
      <div className="reports-quick-launcher-bar">
        <div className="launcher-bar-info">
          <div className="launcher-bar-icon">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <h4 className="launcher-bar-title">Need a Custom Filtered Ticket Extraction?</h4>
            <p className="launcher-bar-sub">Launch the universal query builder with custom date ranges, status filters, and category selections.</p>
          </div>
        </div>

        <button 
          type="button" 
          className="btn-launch-export"
          onClick={() => setActiveReportModal('summary')}
        >
          <i className="fa-solid fa-file-excel"></i> Launch Universal Export Engine
        </button>
      </div>

      {/* Export Configuration Modal */}
      {activeReportModal && (
        <ReportExportModal 
          currentUser={currentUser}
          categories={categories}
          technicians={technicians}
          initialReportType={activeReportModal}
          onClose={() => setActiveReportModal(null)}
        />
      )}
    </div>
  );
}
