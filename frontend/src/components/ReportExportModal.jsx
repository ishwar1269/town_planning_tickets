import React, { useState, useEffect } from 'react';

export default function ReportExportModal({ 
  currentUser,
  categories, 
  technicians, 
  initialReportType = 'summary',
  onClose 
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedTechId, setSelectedTechId] = useState('all');

  const [previewTickets, setPreviewTickets] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchPreviewData();
  }, [startDate, endDate, selectedCatId, selectedStatus, selectedPriority, selectedTechId]);

  const fetchPreviewData = async () => {
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
        setPreviewTickets(data);
      } else {
        setPreviewTickets([]);
      }
    } catch (err) {
      console.error('Preview error:', err);
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

  const handleDownload = () => {
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

    const downloadUrl = `/api/reports/export?${queryParams.toString()}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="zoho-modal-overlay">
      <div className="zoho-modal-card zoho-modal-simple" style={{ maxWidth: '840px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-file-excel" style={{ color: '#059669' }}></i> Download Custom Ticket Report
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Select custom date range, category, status, and technician to filter report data.
            </span>
          </div>
          <button className="zoho-modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Date Range Quick Presets */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Quick Range:</span>
          <button type="button" className="btn btn-zoho-secondary btn-xs" onClick={() => setPreset('today')}>Today</button>
          <button type="button" className="btn btn-zoho-secondary btn-xs" onClick={() => setPreset('7days')}>Last 7 Days</button>
          <button type="button" className="btn btn-zoho-secondary btn-xs" onClick={() => setPreset('month')}>This Month</button>
          <button type="button" className="btn btn-zoho-secondary btn-xs" onClick={() => setPreset('clear')}>All Time</button>
        </div>

        {/* Filter Controls Grid */}
        <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <div className="form-grid-2">
            {/* Start Date */}
            <div className="form-group">
              <label><i className="fa-regular fa-calendar"></i> From Date (Start)</label>
              <input 
                type="date" 
                className="form-control" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>

            {/* End Date */}
            <div className="form-group">
              <label><i className="fa-regular fa-calendar-check"></i> To Date (End)</label>
              <input 
                type="date" 
                className="form-control" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-grid-2">
            {/* Category Dropdown */}
            <div className="form-group">
              <label><i className="fa-solid fa-layer-group"></i> Department Category</label>
              <select className="form-control" value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)}>
                <option value="all">-- All Categories --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="form-group">
              <label><i className="fa-solid fa-bars-progress"></i> Ticket Status</label>
              <select className="form-control" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="all">-- All Statuses --</option>
                <option value="New">Open / New</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            {/* Priority */}
            <div className="form-group">
              <label><i className="fa-solid fa-flag"></i> Priority Level</label>
              <select className="form-control" value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                <option value="all">-- All Priorities --</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Technician */}
            <div className="form-group">
              <label><i className="fa-solid fa-user-tie"></i> Assigned Specialist</label>
              <select className="form-control" value={selectedTechId} onChange={(e) => setSelectedTechId(e.target.value)}>
                <option value="all">-- All Agents --</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Preview Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 className="zoho-section-heading" style={{ margin: 0 }}>
            <i className="fa-solid fa-list-check" style={{ color: 'var(--zoho-blue)' }}></i> Matching Tickets Preview ({previewTickets.length})
          </h4>
          <span className="zoho-pill-count" style={{ background: '#DBEAFE', color: '#0265DC', padding: '4px 10px' }}>
            {previewTickets.length} Record(s) Found
          </span>
        </div>

        {/* Preview Table */}
        <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
          {loadingPreview ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-spinner fa-spin"></i> Fetching matching report preview...
            </div>
          ) : previewTickets.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No tickets found matching the selected date range and filter criteria.
            </div>
          ) : (
            <table className="zoho-table" style={{ fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Assigned Agent</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {previewTickets.slice(0, 5).map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.ticket_number.startsWith('#') ? t.ticket_number : `#${t.ticket_number}`}</strong></td>
                    <td>{t.title}</td>
                    <td>{t.category_name}</td>
                    <td><span className="zoho-badge zoho-badge-progress">{t.status}</span></td>
                    <td>{t.technician_name || 'Unassigned'}</td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Actions */}
        <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-zoho-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-zoho-excel" 
            onClick={handleDownload}
            disabled={previewTickets.length === 0}
          >
            <i className="fa-solid fa-file-excel"></i> Download Excel / CSV Report
          </button>
        </div>

      </div>
    </div>
  );
}
