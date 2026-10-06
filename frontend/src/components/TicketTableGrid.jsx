import React from 'react';

export default function TicketTableGrid({ currentUser, tickets, onSelectTicket, onUpdateStatus }) {
  const getBadgeClass = (status) => {
    switch (status) {
      case 'New': return 'zoho-badge-new';
      case 'Assigned': return 'zoho-badge-assigned';
      case 'In Progress': return 'zoho-badge-progress';
      case 'Resolved': return 'zoho-badge-resolved';
      case 'Closed': return 'zoho-badge-closed';
      case 'Reopened': return 'zoho-badge-reopened';
      default: return 'zoho-badge-progress';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'Critical': return 'zoho-prio-critical';
      case 'High': return 'zoho-prio-high';
      case 'Medium': return 'zoho-prio-medium';
      case 'Low': return 'zoho-prio-low';
      default: return 'zoho-prio-medium';
    }
  };

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

  const getSLAFlag = (ticket) => {
    if (!ticket.due_at) {
      return { 
        level: 'normal', 
        rowClass: '',
        icon: <i className="fa-solid fa-flag" style={{ color: '#9CA3AF', fontSize: '0.88rem' }} title="No SLA"></i>
      };
    }

    const due = new Date(ticket.due_at);

    if (ticket.status === 'Closed' || ticket.status === 'Resolved') {
      const finishTimeStr = ticket.resolved_at || ticket.closed_at;
      if (finishTimeStr && new Date(finishTimeStr) > due) {
        return { 
          level: 'breached', 
          rowClass: 'zoho-sla-row-breached',
          icon: <i className="fa-solid fa-flag" style={{ color: '#DC2626', fontSize: '0.9rem' }} title="🚨 SLA Breached after resolution"></i>
        };
      }
      return { 
        level: 'normal', 
        rowClass: '',
        icon: <i className="fa-solid fa-flag" style={{ color: '#10B981', fontSize: '0.88rem' }} title={`SLA Met (${ticket.status})`}></i>
      };
    }

    const now = new Date();
    const diffMs = due - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { 
        level: 'breached', 
        rowClass: 'zoho-sla-row-breached',
        icon: <i className="fa-solid fa-flag" style={{ color: '#DC2626', fontSize: '0.9rem' }} title={`🚨 SLA Breached (${Math.abs(Math.round(diffHours))}h ago)`} />
      };
    } else if (diffHours <= 4) {
      return { 
        level: 'warning', 
        rowClass: 'zoho-sla-row-warning',
        icon: <i className="fa-solid fa-flag" style={{ color: '#F59E0B', fontSize: '0.9rem' }} title={`⚠️ SLA Warning (Expires in ${Math.max(1, Math.ceil(diffHours))}h)`} />
      };
    }

    return { 
      level: 'normal', 
      rowClass: '',
      icon: <i className="fa-solid fa-flag" style={{ color: '#9CA3AF', fontSize: '0.88rem' }} title="SLA Active" />
    };
  };

  const handleStatusChange = (ticketId, e) => {
    const newStatus = e.target.value;
    if (onUpdateStatus) {
      onUpdateStatus(ticketId, newStatus);
    }
  };

  const isCitizenUser = currentUser && currentUser.role === 'user';

  return (
    <div className="zoho-table-card" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table className="zoho-table" style={{ width: '100%', tableLayout: 'auto' }}>
        <thead>
          <tr>
            <th style={{ width: '26px', padding: '8px 4px' }}><input type="checkbox" /></th>
            <th style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>TICKET ID</th>
            <th style={{ padding: '8px 6px', minWidth: '160px' }}>SUBJECT</th>
            <th style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>CREATED BY</th>
            <th style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>PRIORITY</th>
            <th style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>ASSIGNED AGENT</th>
            <th style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>CREATED DATE</th>
            <th style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>STATUS</th>
            <th style={{ padding: '8px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>
              <i className="fa-solid fa-bolt" style={{ color: 'var(--zoho-blue)', marginRight: '4px' }}></i> ACTION
            </th>
          </tr>
        </thead>
        <tbody>
          {(tickets || []).map(ticket => {
            if (!ticket) return null;
            const rawId = ticket.ticket_number ? String(ticket.ticket_number) : `#${ticket.id || '0000'}`;
            const formattedId = rawId.startsWith('#') ? rawId : `#${rawId}`;
            const isMergedChild = ticket.status === 'Merged' || !!ticket.merged_into_ticket_id;
            const hasMergedTag = !!ticket.merged_ticket_numbers || (ticket.merged_tickets_count && ticket.merged_tickets_count > 0);
            const formattedMergedTags = ticket.merged_ticket_numbers
              ? String(ticket.merged_ticket_numbers).split(',').map(n => {
                  const trimmed = n.trim();
                  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
                }).join(', ')
              : null;

            const sla = getSLAFlag(ticket);

            return (
              <tr key={ticket.id} className={sla.rowClass || ''}>
                <td style={{ padding: '10px 4px' }}><input type="checkbox" /></td>

                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <span 
                    className="zoho-ticket-id"
                    onClick={() => onSelectTicket(ticket.id)}
                    style={{ fontSize: '0.83rem', fontWeight: 700 }}
                  >
                    {formattedId}
                  </span>
                </td>

                {/* Subject Column (Clean Multi-line wrap, NO overlap!) */}
                <td style={{ padding: '10px 8px', minWidth: '200px' }}>
                  <div 
                    className="zoho-ticket-subject"
                    onClick={() => onSelectTicket(ticket.id)}
                    title={ticket.title}
                    style={{ 
                      fontSize: '0.83rem', 
                      fontWeight: 600, 
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                      color: 'var(--text-main)'
                    }}
                  >
                    <i className="fa-solid fa-globe text-muted" style={{ fontSize: '0.75rem', marginRight: '6px' }} title="Web Portal Channel"></i>
                    {ticket.title}
                    {hasMergedTag && (
                      <span style={{ 
                        marginLeft: '8px', 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem', 
                        background: '#EDE9FE', 
                        color: '#6D28D9', 
                        padding: '1px 8px', 
                        borderRadius: '12px',
                        border: '1px solid #C4B5FD',
                        fontWeight: 700
                      }} title={`Merged Ticket(s): ${formattedMergedTags}`}>
                        <i className="fa-solid fa-code-merge"></i> Merged Tag: {formattedMergedTags}
                      </span>
                    )}
                    {isMergedChild && (
                      <span style={{ 
                        marginLeft: '8px', 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem', 
                        background: '#EDE9FE', 
                        color: '#6D28D9', 
                        padding: '1px 7px', 
                        borderRadius: '12px',
                        border: '1px solid #DDD6FE',
                        fontWeight: 700
                      }}>
                        <i className="fa-solid fa-code-merge"></i> Merged into #{ticket.merged_into_ticket_number || ticket.merged_into_ticket_id}
                      </span>
                    )}
                  </div>
                </td>

                {/* Created By Column (ONLY Name displayed) */}
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)' }}>
                    <i className="fa-regular fa-user" style={{ color: 'var(--zoho-blue)', marginRight: '5px' }}></i>
                    {ticket.created_by_name}
                  </div>
                </td>

                {/* Priority */}
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <span className={getPriorityClass(ticket.priority)} style={{ fontSize: '0.78rem' }}>
                    ● {ticket.priority}
                  </span>
                </td>

                {/* Assigned Agent Column (ONLY Technician Name displayed) */}
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  {ticket.technician_name ? (
                    <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {ticket.technician_name}
                    </div>
                  ) : (
                    <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.78rem' }}>Unassigned</span>
                  )}
                </td>

                {/* Created Date */}
                <td style={{ padding: '10px 8px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  {formatDate(ticket.created_at)}
                </td>

                {/* Status Column with Flag Icon */}
                <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ minWidth: '85px', display: 'inline-flex', alignItems: 'center' }}>
                      <span className={`zoho-badge ${getBadgeClass(ticket.status)}`} style={{ fontSize: '0.74rem', padding: '2px 8px' }}>
                        {ticket.status === 'New' ? 'Open' : ticket.status}
                      </span>
                    </div>
                    <div style={{ width: '20px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                      {sla.icon}
                    </div>
                  </div>
                </td>

                {/* Actions Column */}
                <td style={{ padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {isCitizenUser ? (
                      <>
                        {ticket.status !== 'Closed' ? (
                          <button 
                            className="btn btn-zoho-secondary btn-xs" 
                            style={{ color: '#DC2626', borderColor: '#FCA5A5', background: '#FEF2F2', padding: '3px 8px', fontSize: '0.74rem' }}
                            onClick={() => onUpdateStatus(ticket.id, 'Closed')}
                            title="Close your raised ticket"
                          >
                            <i className="fa-solid fa-circle-xmark"></i> Close Ticket
                          </button>
                        ) : (
                          <button 
                            className="btn btn-zoho-secondary btn-xs" 
                            style={{ color: '#E11D48', borderColor: '#FDA4AF', background: '#FFE4E6', padding: '3px 8px', fontSize: '0.74rem' }}
                            onClick={() => onUpdateStatus(ticket.id, 'Reopened')}
                            title="Reopen your closed ticket"
                          >
                            <i className="fa-solid fa-rotate-left"></i> Reopen
                          </button>
                        )}
                      </>
                    ) : (
                      <select 
                        className="form-control" 
                        style={{ fontSize: '0.75rem', padding: '3px 6px', width: 'auto', background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e)}
                        title="Quick Status Change"
                      >
                        <option value="New">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                        <option value="Reopened">Reopen</option>
                      </select>
                    )}

                    <button 
                      className="btn btn-zoho-secondary btn-xs" 
                      onClick={() => onSelectTicket(ticket.id)}
                      style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                    >
                      <i className="fa-solid fa-eye"></i> View
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
