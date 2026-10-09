import React, { useState, useEffect, useMemo } from 'react';

export default function ReportExportModal({ 
  currentUser,
  categories = [], 
  technicians = [], 
  initialReportType = 'summary',
  onClose 
}) {
  const [reportType, setReportType] = useState(initialReportType);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedTechId, setSelectedTechId] = useState('all');
  const [selectedSlaFilter, setSelectedSlaFilter] = useState('all');
  
  // For Custom Query Builder
  const [selectedColumns, setSelectedColumns] = useState({
    ticket_no: true,
    title: true,
    category: true,
    priority: true,
    status: true,
    creator: true,
    technician: true,
    created_at: true,
    due_at: true,
    closed_at: true
  });

  const [rawTickets, setRawTickets] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate, selectedCatId, selectedStatus, selectedPriority, selectedTechId, reportType]);

  const fetchReportData = async () => {
    setLoadingPreview(true);
    try {
      let queryParams = new URLSearchParams();
      if (currentUser && currentUser.email) {
        queryParams.append('user_email', currentUser.email);
        queryParams.append('user_role', currentUser.role || 'user');
      }
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (selectedCatId !== 'all') queryParams.append('category_id', selectedCatId);
      if (selectedStatus !== 'all') queryParams.append('status', selectedStatus);
      if (selectedPriority !== 'all') queryParams.append('priority', selectedPriority);
      if (selectedTechId !== 'all') queryParams.append('technician_id', selectedTechId);

      const res = await fetch(`/api/tickets?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRawTickets(data);
      } else {
        setRawTickets([]);
      }
    } catch (err) {
      console.error('Preview error:', err);
      setRawTickets([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const setPreset = (type) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'clear') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Report configurations
  const reportConfigs = {
    summary: {
      title: 'Summary Master Report & Audit Log',
      icon: 'fa-solid fa-file-invoice-dollar',
      color: '#10B981',
      description: 'Comprehensive ticket directory with multi-status filters, dates, and full audit details.',
      tag: 'MASTER AUDIT'
    },
    tickets_per_day: {
      title: 'Daily Ticket Volume & Intake Velocity',
      icon: 'fa-solid fa-chart-line',
      color: '#3B82F6',
      description: 'Daily volume trends, intake frequency, daily resolution rates, and backlog accumulation.',
      tag: 'VOLUME & VELOCITY'
    },
    technician_stats: {
      title: 'Technician Performance & Workload Caseload',
      icon: 'fa-solid fa-user-gear',
      color: '#8B5CF6',
      description: 'Specialist efficiency, assigned vs closed case counts, workload balance, and resolution rates.',
      tag: 'STAFF AUDIT'
    },
    response_speed: {
      title: 'SLA Response Speed & Compliance Audit',
      icon: 'fa-solid fa-stopwatch-20',
      color: '#F59E0B',
      description: 'SLA resolution deadlines, turnaround compliance, breach alerts, and overdue tracking.',
      tag: 'SLA TRACKING'
    },
    custom_reports: {
      title: 'Custom Multi-Matrix Query Builder',
      icon: 'fa-solid fa-sliders',
      color: '#06B6D4',
      description: 'Build custom query exports by selecting exact fields, date filters, priorities, and technicians.',
      tag: 'CUSTOM QUERY'
    },
    companies_stats: {
      title: 'Department & Category Breakdown Statistics',
      icon: 'fa-solid fa-building-columns',
      color: '#F43F5E',
      description: 'Distribution of grievances grouped by municipal wings, urban planning sections, and departments.',
      tag: 'DEPARTMENT AUDIT'
    },
    due_dates: {
      title: 'SLA Deadlines & Due Dates Schedule',
      icon: 'fa-regular fa-calendar-check',
      color: '#0EA5E9',
      description: 'Upcoming resolution due dates, urgent priority deadlines, and countdown to SLA breach.',
      tag: 'TIMELINE SCHEDULE'
    }
  };

  const currentConfig = reportConfigs[reportType] || reportConfigs.summary;

  // Process Specialized Data Previews
  // 1. Tickets Per Day aggregated data
  const dailyData = useMemo(() => {
    const map = {};
    rawTickets.forEach(t => {
      const day = (t.created_at || '').substring(0, 10) || 'Unknown';
      if (!map[day]) {
        map[day] = { date: day, total: 0, closed: 0, pending: 0, critical: 0 };
      }
      map[day].total++;
      if (t.status === 'Closed') map[day].closed++;
      else map[day].pending++;
      if (t.priority === 'Critical') map[day].critical++;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [rawTickets]);

  // 2. Technician Performance aggregated data
  const techData = useMemo(() => {
    const map = {};
    technicians.forEach(tech => {
      map[tech.id] = {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        designation: tech.designation || 'Specialist',
        total: 0,
        closed: 0,
        pending: 0
      };
    });
    map['unassigned'] = {
      id: 'unassigned',
      name: 'Unassigned',
      email: '-',
      designation: 'Queue Pool',
      total: 0,
      closed: 0,
      pending: 0
    };

    rawTickets.forEach(t => {
      const techKey = t.assigned_technician_id || 'unassigned';
      if (!map[techKey]) {
        map[techKey] = {
          id: techKey,
          name: t.technician_name || 'Agent',
          email: '-',
          designation: 'Specialist',
          total: 0,
          closed: 0,
          pending: 0
        };
      }
      map[techKey].total++;
      if (t.status === 'Closed') map[techKey].closed++;
      else map[techKey].pending++;
    });

    return Object.values(map).filter(item => item.total > 0 || item.id !== 'unassigned');
  }, [rawTickets, technicians]);

  // 3. SLA & Response Speed data
  const slaData = useMemo(() => {
    return rawTickets.map(t => {
      const now = new Date();
      const due = t.due_at ? new Date(t.due_at) : null;
      let slaStatus = 'In SLA Target';
      let badgeClass = 'zoho-badge-green';

      if (t.status === 'Closed') {
        const closed = t.closed_at ? new Date(t.closed_at) : now;
        if (due && closed > due) {
          slaStatus = 'Breached SLA';
          badgeClass = 'zoho-badge-red';
        } else {
          slaStatus = 'Resolved (Met SLA)';
          badgeClass = 'zoho-badge-green';
        }
      } else {
        if (due && now > due) {
          slaStatus = 'Breached (Overdue)';
          badgeClass = 'zoho-badge-red';
        } else if (due && (due - now) < 4 * 3600 * 1000) {
          slaStatus = 'Warning (< 4h left)';
          badgeClass = 'zoho-badge-orange';
        }
      }

      return {
        ...t,
        slaStatus,
        badgeClass,
        dueFormatted: due ? due.toLocaleString() : 'N/A'
      };
    });
  }, [rawTickets]);

  // 4. Department & Category aggregated data
  const categoryData = useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat.id] = { id: cat.id, name: cat.name, total: 0, closed: 0, pending: 0, critical: 0 };
    });

    rawTickets.forEach(t => {
      const catKey = t.category_id || 0;
      if (!map[catKey]) {
        map[catKey] = { id: catKey, name: t.category_name || 'General', total: 0, closed: 0, pending: 0, critical: 0 };
      }
      map[catKey].total++;
      if (t.status === 'Closed') map[catKey].closed++;
      else map[catKey].pending++;
      if (t.priority === 'Critical') map[catKey].critical++;
    });

    return Object.values(map).filter(c => c.total > 0);
  }, [rawTickets, categories]);

  // 5. Due Dates sorted data
  const dueDatesData = useMemo(() => {
    return rawTickets
      .filter(t => t.due_at)
      .map(t => {
        const now = new Date();
        const due = new Date(t.due_at);
        const isOverdue = now > due && t.status !== 'Closed';
        const diffMs = due - now;
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        let urgencyText = '';
        if (t.status === 'Closed') urgencyText = 'Resolved';
        else if (isOverdue) urgencyText = `Overdue by ${Math.abs(diffHours)}h`;
        else if (diffHours < 24) urgencyText = `Due in ${diffHours}h`;
        else urgencyText = `Due in ${Math.round(diffHours / 24)} days`;

        return { ...t, isOverdue, urgencyText, dueFormatted: due.toLocaleString() };
      })
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
  }, [rawTickets]);

  const handleDownload = () => {
    let queryParams = new URLSearchParams();
    queryParams.append('reportType', reportType);
    if (currentUser && currentUser.email) {
      queryParams.append('user_email', currentUser.email);
      queryParams.append('user_role', currentUser.role || 'user');
    }
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (selectedCatId !== 'all') queryParams.append('category_id', selectedCatId);
    if (selectedStatus !== 'all') queryParams.append('status', selectedStatus);
    if (selectedPriority !== 'all') queryParams.append('priority', selectedPriority);
    if (selectedTechId !== 'all') queryParams.append('technician_id', selectedTechId);

    const downloadUrl = `/api/reports/export?${queryParams.toString()}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="zoho-modal-overlay">
      <div className="zoho-modal-card zoho-modal-simple" style={{ maxWidth: '920px', width: '95%' }}>
        {/* Modal Header with Dynamic Theme */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '10px', 
              background: currentConfig.color, 
              color: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.25rem',
              boxShadow: `0 4px 12px ${currentConfig.color}40`
            }}>
              <i className={currentConfig.icon}></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {currentConfig.title}
                </h2>
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  background: `${currentConfig.color}18`, 
                  color: currentConfig.color, 
                  padding: '3px 8px', 
                  borderRadius: '6px',
                  border: `1px solid ${currentConfig.color}40`
                }}>
                  {currentConfig.tag}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {currentConfig.description}
              </span>
            </div>
          </div>

          <button className="zoho-modal-close" onClick={onClose} style={{ fontSize: '1.6rem' }}>&times;</button>
        </div>

        {/* Specialized Filter Controls depending on report type */}
        <div style={{ background: 'var(--bg-body, #F8FAFC)', padding: '16px 18px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '18px' }}>
          
          {/* Quick Date Presets */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <i className="fa-regular fa-clock"></i> Date Range:
              </span>
              <button type="button" className="btn btn-zoho-secondary btn-xs" onClick={() => setPreset('today')}>Today</button>
              <button type="button" className="btn btn-zoho-secondary btn-xs" onClick={() => setPreset('7days')}>Last 7 Days</button>
              <button type="button" className="btn btn-zoho-secondary btn-xs" onClick={() => setPreset('month')}>This Month</button>
              <button type="button" className="btn btn-zoho-secondary btn-xs" onClick={() => setPreset('clear')}>All Time</button>
            </div>

            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Live Records: <strong>{rawTickets.length}</strong> matching
            </div>
          </div>

          {/* Form Filter Row 1: Dates */}
          <div className="form-grid-2" style={{ marginBottom: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem' }}><i className="fa-regular fa-calendar"></i> Start Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem' }}><i className="fa-regular fa-calendar-check"></i> End Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          </div>

          {/* Form Filter Row 2: Specialized filters */}
          {reportType === 'technician_stats' ? (
            <div className="form-grid-2">
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}><i className="fa-solid fa-user-tie"></i> Specialist / Officer</label>
                <select className="form-control" value={selectedTechId} onChange={(e) => setSelectedTechId(e.target.value)}>
                  <option value="all">-- All Specialists ({technicians.length}) --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.designation || 'Specialist'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}><i className="fa-solid fa-bars-progress"></i> Case Status</label>
                <select className="form-control" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="all">-- All Statuses (Active & Closed) --</option>
                  <option value="New">New Unassigned</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Resolved / Closed</option>
                </select>
              </div>
            </div>
          ) : reportType === 'companies_stats' ? (
            <div className="form-grid-2">
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}><i className="fa-solid fa-building-columns"></i> Town Planning Department / Category</label>
                <select className="form-control" value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)}>
                  <option value="all">-- All Departments / Categories ({categories.length}) --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}><i className="fa-solid fa-flag"></i> Priority Filter</label>
                <select className="form-control" value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                  <option value="all">-- All Priorities --</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          ) : reportType === 'response_speed' ? (
            <div className="form-grid-2">
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}><i className="fa-solid fa-stopwatch"></i> SLA Priority Level</label>
                <select className="form-control" value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                  <option value="all">-- All Priority SLA Matrices --</option>
                  <option value="Critical">Critical (4 Hours Target)</option>
                  <option value="High">High (8 Hours Target)</option>
                  <option value="Medium">Medium (24 Hours Target)</option>
                  <option value="Low">Low (48 Hours Target)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}><i className="fa-solid fa-user-tie"></i> Specialist</label>
                <select className="form-control" value={selectedTechId} onChange={(e) => setSelectedTechId(e.target.value)}>
                  <option value="all">-- All Specialists --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : reportType === 'custom_reports' ? (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                <i className="fa-solid fa-table-columns"></i> Select Fields to Export in Custom Matrix:
              </label>
              <div style={{ display: 'flex', gap: '10px 16px', flexWrap: 'wrap', fontSize: '0.76rem' }}>
                {Object.keys(selectedColumns).map(col => (
                  <label key={col} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedColumns[col]} 
                      onChange={(e) => setSelectedColumns({ ...selectedColumns, [col]: e.target.checked })} 
                    />
                    {col.replace('_', ' ').toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="form-grid-3">
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Category</label>
                <select className="form-control" value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)}>
                  <option value="all">-- All Categories --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Status</label>
                <select className="form-control" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="all">-- All Statuses --</option>
                  <option value="New">New</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem' }}>Priority</label>
                <select className="form-control" value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                  <option value="all">-- All Priorities --</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          )}

        </div>

        {/* Live Specialized Preview Container */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-chart-simple" style={{ color: currentConfig.color }}></i> 
              Live Preview: {currentConfig.title}
            </h4>
            <span className="zoho-pill-count" style={{ background: `${currentConfig.color}15`, color: currentConfig.color }}>
              {reportType === 'tickets_per_day' ? `${dailyData.length} Day(s) Analyzed` :
               reportType === 'technician_stats' ? `${techData.length} Specialists` :
               reportType === 'companies_stats' ? `${categoryData.length} Departments` :
               reportType === 'due_dates' ? `${dueDatesData.length} Due Records` :
               `${rawTickets.length} Records`}
            </span>
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--card-bg)' }}>
            {loadingPreview ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.2rem', color: currentConfig.color }}></i>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem' }}>Calculating specialized report preview...</p>
              </div>
            ) : rawTickets.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No records match the selected date range and filter criteria.
              </div>
            ) : reportType === 'tickets_per_day' ? (
              /* Daily Volume Preview Table */
              <table className="zoho-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total Raised</th>
                    <th>Resolved / Closed</th>
                    <th>Pending Backlog</th>
                    <th>Critical Cases</th>
                    <th>Resolution Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.slice(0, 10).map((d, idx) => (
                    <tr key={idx}>
                      <td><strong>{d.date}</strong></td>
                      <td><span className="zoho-badge" style={{ background: '#DBEAFE', color: '#1E40AF' }}>{d.total} Tickets</span></td>
                      <td><span className="zoho-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>{d.closed} Resolved</span></td>
                      <td><span className="zoho-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>{d.pending} Pending</span></td>
                      <td>{d.critical > 0 ? <span className="zoho-badge zoho-badge-red">{d.critical} Critical</span> : '-'}</td>
                      <td><strong>{d.total > 0 ? `${Math.round((d.closed / d.total) * 100)}%` : '0%'}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'technician_stats' ? (
              /* Technician Caseload Preview Table */
              <table className="zoho-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Specialist Name</th>
                    <th>Role / Designation</th>
                    <th>Total Assigned</th>
                    <th>Resolved Cases</th>
                    <th>Pending Cases</th>
                    <th>Clearance %</th>
                  </tr>
                </thead>
                <tbody>
                  {techData.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.designation}</span></td>
                      <td><span className="zoho-badge" style={{ background: '#DBEAFE', color: '#1E40AF' }}>{t.total} Cases</span></td>
                      <td><span className="zoho-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>{t.closed} Closed</span></td>
                      <td><span className="zoho-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>{t.pending} Active</span></td>
                      <td><strong>{t.total > 0 ? `${Math.round((t.closed / t.total) * 100)}%` : '0%'}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'response_speed' ? (
              /* SLA Compliance Audit Preview Table */
              <table className="zoho-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Specialist</th>
                    <th>SLA Deadline</th>
                    <th>SLA Status</th>
                  </tr>
                </thead>
                <tbody>
                  {slaData.slice(0, 10).map(t => (
                    <tr key={t.id}>
                      <td><strong>#{t.ticket_number}</strong></td>
                      <td>{t.title}</td>
                      <td><span className={`zoho-badge zoho-badge-${(t.priority || '').toLowerCase()}`}>{t.priority}</span></td>
                      <td>{t.technician_name || 'Unassigned'}</td>
                      <td>{t.dueFormatted}</td>
                      <td><span className={`zoho-badge ${t.badgeClass}`}>{t.slaStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'companies_stats' ? (
              /* Department Categories Breakdown Preview Table */
              <table className="zoho-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Department / Category</th>
                    <th>Total Grievances</th>
                    <th>Resolved</th>
                    <th>Pending Backlog</th>
                    <th>Critical Count</th>
                    <th>Resolution Share</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td><span className="zoho-badge" style={{ background: '#FCE7F3', color: '#9D174D' }}>{c.total} Tickets</span></td>
                      <td><span className="zoho-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>{c.closed} Closed</span></td>
                      <td><span className="zoho-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>{c.pending} Active</span></td>
                      <td>{c.critical > 0 ? <span className="zoho-badge zoho-badge-red">{c.critical} Critical</span> : '-'}</td>
                      <td><strong>{c.total > 0 ? `${Math.round((c.closed / c.total) * 100)}%` : '0%'}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'due_dates' ? (
              /* Due Dates Deadlines Schedule Preview Table */
              <table className="zoho-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Assigned Agent</th>
                    <th>Deadline Time</th>
                    <th>Urgency Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {dueDatesData.slice(0, 10).map(t => (
                    <tr key={t.id}>
                      <td><strong>#{t.ticket_number}</strong></td>
                      <td>{t.title}</td>
                      <td><span className={`zoho-badge zoho-badge-${(t.priority || '').toLowerCase()}`}>{t.priority}</span></td>
                      <td>{t.technician_name || 'Unassigned'}</td>
                      <td>{t.dueFormatted}</td>
                      <td>
                        <span className={`zoho-badge ${t.isOverdue ? 'zoho-badge-red' : t.status === 'Closed' ? 'zoho-badge-green' : 'zoho-badge-orange'}`}>
                          {t.urgencyText}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* Summary Master / Custom Matrix Preview Table */
              <table className="zoho-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned Agent</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rawTickets.slice(0, 8).map(t => (
                    <tr key={t.id}>
                      <td><strong>#{t.ticket_number}</strong></td>
                      <td>{t.title}</td>
                      <td>{t.category_name}</td>
                      <td><span className={`zoho-badge zoho-badge-${(t.priority || '').toLowerCase()}`}>{t.priority}</span></td>
                      <td><span className="zoho-badge zoho-badge-progress">{t.status}</span></td>
                      <td>{t.technician_name || 'Unassigned'}</td>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-file-excel" style={{ color: '#10B981' }}></i> Formatted as UTF-8 Excel (.csv) with Hindi Unicode Support
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-zoho-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-zoho-excel" 
              onClick={handleDownload}
              disabled={rawTickets.length === 0}
              style={{ padding: '8px 18px', fontSize: '0.84rem', fontWeight: 700 }}
            >
              <i className="fa-solid fa-file-excel"></i> Export {currentConfig.title.split('&')[0]} to Excel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
