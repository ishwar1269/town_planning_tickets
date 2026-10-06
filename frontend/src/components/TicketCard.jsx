import React from 'react';

export default function TicketCard({ ticket, onSelectTicket, t, lang }) {
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const locale = lang === 'hi' ? 'hi-IN' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <span className="ticket-num">{ticket.ticket_number}</span>
        <span className={`priority-badge priority-${ticket.priority}`}>
          {t[`priority${ticket.priority}`] || ticket.priority}
        </span>
      </div>

      <h3 className="ticket-title">{ticket.title}</h3>
      <span className="ticket-cat"><i className="fa-solid fa-tag"></i> {ticket.category_name || 'Town Planning'}</span>

      <div className="ticket-body">
        <p>{ticket.description || 'No additional description provided.'}</p>
      </div>

      <div className="ticket-meta">
        <div>
          <i className="fa-solid fa-user-tie text-primary"></i> <strong>{t.assignedTech}</strong>{' '}
          {ticket.technician_name ? (
            <span>{ticket.technician_name} {currentUser?.role !== 'user' && ticket.technician_email ? `(${ticket.technician_email})` : ''}</span>
          ) : (
            <span className="text-danger font-bold">{t.unassigned}</span>
          )}
        </div>
        <div>
          <i className="fa-solid fa-user-pen"></i> <strong>{t.applicant}</strong> {ticket.created_by_name}
        </div>
        <div>
          <i className="fa-solid fa-clock"></i> <strong>{t.createdDate}</strong> {formatDate(ticket.created_at)}
        </div>
      </div>

      <div className="ticket-footer">
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
          <span title={t.attachmentsCount}><i className="fa-solid fa-paperclip text-muted"></i> {ticket.attachments_count || 0}</span>
          <span title={t.remarksCount}><i className="fa-solid fa-comments text-muted"></i> {ticket.remarks_count || 0}</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`status-badge status-${ticket.status.replace(' ', '-')}`}>
            {t[`${ticket.status.toLowerCase().replace(' ', '')}Status`] || ticket.status}
          </span>

          <button className="btn btn-outline btn-sm" onClick={() => onSelectTicket(ticket.id)}>
            <i className="fa-solid fa-eye"></i> {t.viewDetails}
          </button>
        </div>
      </div>
    </div>
  );
}
