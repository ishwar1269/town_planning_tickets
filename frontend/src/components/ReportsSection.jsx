import React, { useState } from 'react';
import ReportExportModal from './ReportExportModal';

export default function ReportsSection({ currentUser, categories = [], technicians = [] }) {
  const [activeReportModal, setActiveReportModal] = useState(null);

  const reportItems = [
    {
      id: 'summary',
      title: 'Summary Report',
      subtitle: 'Build ticket report by date range, category, status and export to Excel',
      icon: 'fa-solid fa-file-invoice',
      color: '#0265DC'
    },
    {
      id: 'tickets_per_day',
      title: 'Tickets Per Day',
      subtitle: 'Daily volume distribution of raised & resolved tickets',
      icon: 'fa-solid fa-chart-area',
      color: '#0265DC'
    },
    {
      id: 'technician_stats',
      title: 'Technician Performance',
      subtitle: 'Tickets handled per specialist within custom date ranges',
      icon: 'fa-solid fa-user-tie',
      color: '#0265DC'
    },
    {
      id: 'response_speed',
      title: 'SLA Response Speed',
      subtitle: 'Average first response and resolution turnaround time',
      icon: 'fa-regular fa-clock',
      color: '#0265DC'
    },
    {
      id: 'custom_reports',
      title: 'Custom Reports',
      subtitle: 'Build custom financial and department category reports',
      icon: 'fa-solid fa-gears',
      color: '#0265DC'
    },
    {
      id: 'companies_stats',
      title: 'Companies Statistics',
      subtitle: 'Tickets grouped by municipal departments & organizations',
      icon: 'fa-regular fa-building',
      color: '#0265DC'
    },
    {
      id: 'due_dates',
      title: 'Due Dates Calendar',
      subtitle: 'Upcoming due tickets shown in a calendar schedule',
      icon: 'fa-regular fa-calendar-days',
      color: '#0265DC'
    }
  ];

  return (
    <div className="zoho-reports-wrapper" style={{ marginTop: '16px', marginBottom: '40px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-file-arrow-down" style={{ color: '#10B981' }}></i> System Reports Directory & Excel Export Hub
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Select any report module below to filter by date range, department category, status, and generate downloadable Excel reports.
        </p>
      </div>

      <div className="zoho-reports-card" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <div className="zoho-reports-grid">
          {reportItems.map(item => (
            <div 
              key={item.id} 
              className="zoho-report-tile"
              onClick={() => setActiveReportModal(item.id)}
            >
              <div className="zoho-report-icon-box">
                <i className={item.icon}></i>
              </div>
              <div className="zoho-report-info">
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
