import React, { useState } from 'react';

export default function SLACalculationSection({ currentUser, tickets = [], onSelectTicket }) {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculate SLA Breach Status & Daily Accumulating Penalty (₹1,000 / Day from Creation Date)
  const getTicketSLADetails = (ticket) => {
    if (!ticket) return { isBreached: false, penalty: 0, daysCount: 0, overdueHours: 0 };

    const now = new Date();
    const created = ticket.created_at ? new Date(ticket.created_at) : null;
    const due = ticket.due_at ? new Date(ticket.due_at) : (created ? new Date(created.getTime() + 24 * 60 * 60 * 1000) : null);

    if (!created || !due) return { isBreached: false, penalty: 0, daysCount: 0, overdueHours: 0 };

    const isResolvedOrClosed = ticket.status === 'Resolved' || ticket.status === 'Closed';
    const finishTimeStr = isResolvedOrClosed ? (ticket.resolved_at || ticket.closed_at) : null;
    const finishTime = finishTimeStr ? new Date(finishTimeStr) : now;

    // Check if resolved/closed within 24h SLA target (finishTime <= due)
    if (isResolvedOrClosed && finishTimeStr && finishTime <= due) {
      return { isBreached: false, penalty: 0, daysCount: 0, overdueHours: 0 };
    }

    // Check if open ticket is currently within 24h SLA target (now <= due)
    if (!isResolvedOrClosed && finishTime <= due) {
      return { isBreached: false, penalty: 0, daysCount: 0, overdueHours: 0 };
    }

    // SLA BREACHED!
    // Total elapsed duration from ticket creation date (created_at) to finishTime
    const totalElapsedMs = finishTime - created;
    const totalElapsedHours = Math.max(24, Math.ceil(totalElapsedMs / (1000 * 60 * 60)));

    // Daily penalty: ₹1,000 per day from creation date!
    const daysCount = Math.ceil(totalElapsedHours / 24);
    const penalty = daysCount * 1000;

    const overdueMs = finishTime - due;
    const overdueHours = Math.max(1, Math.ceil(overdueMs / (1000 * 60 * 60)));

    return {
      isBreached: true,
      penalty,
      daysCount,
      overdueHours,
      totalElapsedHours
    };
  };

  const isTicketBreached = (ticket) => getTicketSLADetails(ticket).isBreached;

  const breachedTickets = tickets.filter(t => isTicketBreached(t));
  const totalPenaltyAmount = breachedTickets.reduce((sum, t) => sum + getTicketSLADetails(t).penalty, 0);
  const complianceRate = tickets.length > 0 
    ? Math.round(((tickets.length - breachedTickets.length) / tickets.length) * 100) 
    : 100;

  const filteredBreachedTickets = breachedTickets.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.created_by_name && t.created_by_name.toLowerCase().includes(q)) ||
      (t.technician_name && t.technician_name.toLowerCase().includes(q)) ||
      (t.category_name && t.category_name.toLowerCase().includes(q))
    );
  });

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // 2. Export Excel SLA Penalty Report Function
  const handleExportSLAPenaltyExcel = () => {
    if (breachedTickets.length === 0) {
      alert('No breached SLA tickets available to export.');
      return;
    }

    const headers = [
      'Ticket Number', 
      'Title / Subject', 
      'Category Name', 
      'Priority',
      'Created By', 
      'Assigned Technician', 
      'Raised Date & Time', 
      '24h SLA Due Date', 
      'Ticket Status', 
      'Overdue Duration', 
      'SLA Penalty Rate',
      'Breach Days (from Creation)',
      'SLA Financial Penalty (INR)'
    ];

    const csvRows = ['\uFEFF' + headers.join(',')];

    breachedTickets.forEach(t => {
      const sla = getTicketSLADetails(t);
      const row = [
        `"${t.ticket_number || ''}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.category_name || 'General Support'}"`,
        `"${t.priority || 'High'}"`,
        `"${t.created_by_name || ''}"`,
        `"${t.technician_name || 'Unassigned'}"`,
        `"${formatDate(t.created_at)}"`,
        `"${formatDate(t.due_at)}"`,
        `"${t.status || ''}"`,
        `"${sla.overdueHours} hrs overdue"`,
        `"₹1,000 / Day"`,
        `"${sla.daysCount} Days"`,
        `"₹${sla.penalty.toLocaleString('en-IN')} INR"`
      ];
      csvRows.push(row.join(','));
    });

    // Summary Totals Row
    csvRows.push('');
    csvRows.push(`"TOTAL BREACHED TICKETS","${breachedTickets.length} Tickets","","","","","","","","","","TOTAL NET SLA PENALTY:","₹${totalPenaltyAmount.toLocaleString('en-IN')} INR"`);

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SLA_Breach_Financial_Penalty_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="zoho-sla-calculation-wrapper" style={{ marginTop: '0px', marginBottom: '8px' }}>
      {/* 1. Header & Quick Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '6px', 
        flexWrap: 'wrap', 
        gap: '6px'
      }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-calculator" style={{ color: '#EF4444' }}></i> SLA Calculation & Penalty Audit
          </h3>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '1px 0 0 0' }}>
            24-Hour SLA Breach Tracking & Penalty Audit (₹1,000/day rate)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ position: 'relative', width: '180px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.7rem' }}></i>
            <input 
              type="text" 
              placeholder="Search breached..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%',
                paddingLeft: '24px', 
                height: '28px', 
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--input-text)',
                fontSize: '0.74rem'
              }}
            />
          </div>

          <button 
            type="button"
            className="btn btn-zoho-excel btn-sm"
            onClick={handleExportSLAPenaltyExcel}
            style={{ 
              height: '28px', 
              padding: '0 9px', 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              background: '#059669', 
              color: '#FFFFFF', 
              borderColor: '#047857',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
            title="Download CSV Report"
          >
            <i className="fa-solid fa-file-excel"></i> Export
          </button>
        </div>
      </div>

      {/* 2. Stat Cards Grid (Compact & Sleek, Guaranteed 1-Row Fit) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', 
        gap: '8px', 
        marginBottom: '8px',
        width: '100%'
      }}>
        {/* Card 1: Total Tickets */}
        <div style={{ 
          background: 'var(--card-bg)', 
          padding: '7px 10px', 
          borderRadius: '6px', 
          border: '1px solid var(--border-color)', 
          boxShadow: 'var(--shadow-xs)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minWidth: 0
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Total Tickets
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '1px', lineHeight: 1.1 }}>
              {tickets.length} <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total</span>
            </div>
          </div>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '6px', 
            background: '#EBF3FE', 
            color: '#0265DC', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.82rem',
            flexShrink: 0,
            marginLeft: '6px'
          }}>
            <i className="fa-solid fa-ticket"></i>
          </div>
        </div>

        {/* Card 2: Breached SLA */}
        <div style={{ 
          background: 'var(--card-bg)', 
          padding: '7px 10px', 
          borderRadius: '6px', 
          border: '1px solid rgba(239, 68, 68, 0.4)', 
          boxShadow: 'var(--shadow-xs)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minWidth: 0
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              24H Breached
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#EF4444', marginTop: '1px', lineHeight: 1.1 }}>
              {breachedTickets.length} <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>Breached</span>
            </div>
          </div>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '6px', 
            background: '#FEF2F2', 
            color: '#EF4444', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.82rem',
            flexShrink: 0,
            marginLeft: '6px'
          }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
        </div>

        {/* Card 3: Net Penalty */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)', 
          padding: '7px 10px', 
          borderRadius: '6px', 
          border: '1px solid rgba(239, 68, 68, 0.35)', 
          boxShadow: 'var(--shadow-xs)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minWidth: 0
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Net Penalty
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#DC2626', marginTop: '1px', lineHeight: 1.1 }}>
              ₹{totalPenaltyAmount.toLocaleString('en-IN')} <span style={{ fontSize: '0.66rem', fontWeight: 700 }}>INR</span>
            </div>
          </div>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '6px', 
            background: '#FEE2E2', 
            color: '#DC2626', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.85rem',
            flexShrink: 0,
            marginLeft: '6px'
          }}>
            <i className="fa-solid fa-indian-rupee-sign"></i>
          </div>
        </div>

        {/* Card 4: Compliance Rate */}
        <div style={{ 
          background: 'var(--card-bg)', 
          padding: '7px 10px', 
          borderRadius: '6px', 
          border: '1px solid var(--border-color)', 
          boxShadow: 'var(--shadow-xs)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          minWidth: 0
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Compliance
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: complianceRate >= 80 ? '#10B981' : '#F59E0B', marginTop: '1px', lineHeight: 1.1 }}>
              {complianceRate}% <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>Rate</span>
            </div>
          </div>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '6px', 
            background: complianceRate >= 80 ? '#ECFDF5' : '#FFFBEB', 
            color: complianceRate >= 80 ? '#10B981' : '#F59E0B', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.82rem',
            flexShrink: 0,
            marginLeft: '6px'
          }}>
            <i className="fa-solid fa-chart-line"></i>
          </div>
        </div>
      </div>

      {/* 3. Compact High-Density Table with Sticky Header & Auto-scroll fitting one screen */}
      <div className="zoho-table-card" style={{ 
        width: '100%', 
        maxHeight: 'calc(100vh - 220px)',
        overflowY: 'auto',
        overflowX: 'auto',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-xs)'
      }}>
        <table className="zoho-table" style={{ width: '100%', tableLayout: 'auto' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 3, background: 'var(--card-bg)' }}>
            <tr>
              <th style={{ padding: '6px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', background: 'inherit' }}>TICKET ID</th>
              <th style={{ padding: '6px 6px', minWidth: '130px', fontSize: '0.72rem', background: 'inherit' }}>SUBJECT</th>
              <th style={{ padding: '6px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', background: 'inherit' }}>CATEGORY</th>
              <th style={{ padding: '6px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', background: 'inherit' }}>CREATED BY</th>
              <th style={{ padding: '6px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', background: 'inherit' }}>ASSIGNED AGENT</th>
              <th style={{ padding: '6px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', background: 'inherit' }}>RAISED DATE</th>
              <th style={{ padding: '6px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', background: 'inherit' }}>24H SLA DUE</th>
              <th style={{ padding: '6px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', background: 'inherit' }}>OVERDUE</th>
              <th style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.72rem', background: 'inherit' }}>PENALTY (₹)</th>
            </tr>
          </thead>
          <tbody>
            {filteredBreachedTickets.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-circle-check" style={{ color: '#10B981', fontSize: '1.4rem', marginBottom: '4px', display: 'block' }}></i>
                  <strong style={{ fontSize: '0.85rem' }}>Zero 24H SLA Breaches Found!</strong>
                  <p style={{ fontSize: '0.74rem', margin: '2px 0 0 0' }}>All tickets are currently within their 24-hour turnaround SLA deadline.</p>
                </td>
              </tr>
            ) : (
              filteredBreachedTickets.map(t => {
                const rawId = t.ticket_number ? String(t.ticket_number) : `#${t.id || '0000'}`;
                const formattedId = rawId.startsWith('#') ? rawId : `#${rawId}`;
                const sla = getTicketSLADetails(t);

                return (
                  <tr key={t.id} style={{ background: 'rgba(239, 68, 68, 0.02)' }}>
                    {/* Ticket ID */}
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                      <span 
                        className="zoho-ticket-id"
                        onClick={() => onSelectTicket && onSelectTicket(t.id)}
                        style={{ fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                        title="Click to view details"
                      >
                        {formattedId}
                      </span>
                    </td>

                    {/* Subject */}
                    <td style={{ padding: '4px 6px', minWidth: '130px' }}>
                      <div 
                        className="zoho-ticket-subject"
                        onClick={() => onSelectTicket && onSelectTicket(t.id)}
                        title={t.title}
                        style={{ 
                          fontSize: '0.76rem', 
                          fontWeight: 600, 
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: '1.3',
                          color: 'var(--text-main)',
                          cursor: 'pointer'
                        }}
                      >
                        {t.title}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: 'rgba(2, 101, 220, 0.08)', color: 'var(--zoho-blue)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600, fontSize: '0.68rem' }}>
                        {t.category_name || 'General Support'}
                      </span>
                    </td>

                    {/* Created By */}
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {t.created_by_name}
                      </div>
                    </td>

                    {/* Assigned Technician */}
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                      {t.technician_name ? (
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {t.technician_name}
                        </div>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Unassigned</span>
                      )}
                    </td>

                    {/* Raised Date */}
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {formatDate(t.created_at)}
                    </td>

                    {/* 24H SLA Due Date */}
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>
                      {formatDate(t.due_at)}
                    </td>

                    {/* Overdue Duration */}
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                          {sla.overdueHours}h
                        </span>
                        {t.reopened_at && (
                          <span style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FFEDD5', padding: '1px 4px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 800 }} title={`Reopened on ${formatDate(t.reopened_at)}`}>
                            Reopen
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Penalty */}
                    <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-block' }}>
                        ₹{sla.penalty.toLocaleString('en-IN')}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
