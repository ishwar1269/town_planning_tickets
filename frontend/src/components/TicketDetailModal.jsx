import React, { useState, useEffect } from 'react';

export default function TicketDetailModal({ currentUser, ticketId, redirectedFromMergedId, technicians, categories = [], onClose, onRefresh, onOpenCreateModal }) {
  const [currentTicketId, setCurrentTicketId] = useState(ticketId);
  const [redirectNotice, setRedirectNotice] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Status & Agent Quick Edit State
  const [newStatus, setNewStatus] = useState('');
  const [newTechnicianId, setNewTechnicianId] = useState('');
  
  // Universal Operator / Admin Full Edit State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPriority, setEditPriority] = useState('High');
  const [editStatus, setEditStatus] = useState('New');
  const [editTechnicianId, setEditTechnicianId] = useState('');
  const [savingFullDetails, setSavingFullDetails] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);

  const handlePasteEditDescription = async (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    const items = Array.from(clipboardData.items);
    const imageItems = items.filter(item => item.type && item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();
    setUploadingEditImage(true);

    try {
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;

        const formData = new FormData();
        const fileName = file.name && file.name !== 'image.png' ? file.name : `pasted-image-${Date.now()}.png`;
        formData.append('image', file, fileName);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) throw new Error('Failed to upload pasted image');
        const data = await res.json();

        const imgHtml = `\n<img src="${data.url}" alt="Pasted Screenshot" style="max-width: 100%; border-radius: 8px; margin: 8px 0; display: block;" />\n`;

        setEditDescription(prev => (prev ? prev + imgHtml : imgHtml.trim()));
      }
    } catch (err) {
      alert('Failed to upload pasted image: ' + err.message);
    } finally {
      setUploadingEditImage(false);
    }
  };

  const renderFormattedDescription = (text) => {
    if (!text) return <span style={{ color: 'var(--text-muted)' }}>No additional description provided.</span>;

    const imgTagRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>|!\[([^\]]*)\]\(([^)]+)\)|(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg))|(\/uploads\/[^\s"']+\.(?:png|jpg|jpeg|gif|webp|svg))/gi;

    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = imgTagRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        const textSegment = text.substring(lastIdx, match.index);
        parts.push(
          <span key={`txt-${lastIdx}`} style={{ whiteSpace: 'pre-wrap' }}>
            {textSegment}
          </span>
        );
      }

      const imgSrc = match[1] || match[3] || match[4] || match[5];
      const altText = match[2] || 'Description Image';

      if (imgSrc) {
        parts.push(
          <div key={`img-${match.index}`} style={{ margin: '12px 0', textAlign: 'left' }}>
            <img 
              src={imgSrc} 
              alt={altText}
              onClick={() => window.open(imgSrc, '_blank')}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '480px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                cursor: 'pointer',
                display: 'block'
              }} 
              title="Click to view full image in a new tab"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'inline-block' }}>
              <i className="fa-solid fa-up-right-from-square" style={{ fontSize: '0.68rem', marginRight: '4px' }}></i>
              Click image to open full size
            </span>
          </div>
        );
      }

      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
      parts.push(
        <span key={`txt-${lastIdx}`} style={{ whiteSpace: 'pre-wrap' }}>
          {text.substring(lastIdx)}
        </span>
      );
    }

    return (
      <div style={{ wordBreak: 'break-word', lineHeight: '1.6' }}>
        {parts}
      </div>
    );
  };

  // Remark & File Upload State
  const [remarkText, setRemarkText] = useState('');
  const [remarkFiles, setRemarkFiles] = useState([]);
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingStatusOnly, setUpdatingStatusOnly] = useState(false);
  const [updatingAgentOnly, setUpdatingAgentOnly] = useState(false);

  // Ticket Merge State & Handlers
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [allAvailableTickets, setAllAvailableTickets] = useState([]);
  const [mergeSearchQuery, setMergeSearchQuery] = useState('');
  const [selectedMergeTicketId, setSelectedMergeTicketId] = useState('');
  const [mergingInProgress, setMergingInProgress] = useState(false);
  const [expandedMergedIds, setExpandedMergedIds] = useState({});

  const handleOpenMergeModal = async () => {
    setIsMergeModalOpen(true);
    setSelectedMergeTicketId('');
    setMergeSearchQuery('');
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        const available = data.filter(t => t.id !== Number(currentTicketId) && t.status !== 'Merged' && t.merged_into_ticket_id !== Number(currentTicketId));
        setAllAvailableTickets(available);
      }
    } catch (err) {
      console.error('Error fetching tickets for merge:', err);
    }
  };

  const handleConfirmMergeTicket = async () => {
    if (!selectedMergeTicketId) {
      alert('Please select a ticket to merge.');
      return;
    }
    setMergingInProgress(true);
    try {
      const res = await fetch(`/api/tickets/${currentTicketId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTicketId: Number(selectedMergeTicketId),
          merged_by_name: currentUser?.name || 'System Operator'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to merge ticket');

      alert(data.message || 'Ticket merged successfully!');
      setIsMergeModalOpen(false);
      fetchTicketDetails(currentTicketId, false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setMergingInProgress(false);
    }
  };

  const toggleExpandMergedTicket = (id) => {
    setExpandedMergedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    setCurrentTicketId(ticketId);
    if (redirectedFromMergedId) {
      setExpandedMergedIds(prev => ({ ...prev, [redirectedFromMergedId]: true }));
      setRedirectNotice(`🔗 Redirected from Merged Ticket. Showing details inside Master Ticket.`);
    } else {
      setRedirectNotice(null);
    }
  }, [ticketId, redirectedFromMergedId]);

  useEffect(() => {
    if (!currentTicketId) return;
    fetchTicketDetails(currentTicketId, false);

    // Live polling every 3 seconds for real-time status and timeline remarks updates
    const interval = setInterval(() => {
      fetchTicketDetails(currentTicketId, true);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentTicketId]);

  const fetchTicketDetails = async (targetId = currentTicketId, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${targetId}`);
      if (!res.ok) throw new Error('Failed to load ticket details');
      const data = await res.json();

      // If this ticket was merged into another master ticket, redirect to load the master ticket instead!
      if (data.merged_into_ticket_id) {
        const masterId = data.merged_into_ticket_id;
        const masterNumber = data.merged_into_ticket_number || `#${masterId}`;
        const currentNumber = data.ticket_number || `#${targetId}`;

        setRedirectNotice(`🔗 Ticket #${currentNumber} ('${data.title}') was merged into Master Ticket #${masterNumber}. Showing master ticket details below.`);
        setExpandedMergedIds(prev => ({ ...prev, [data.id]: true }));
        setCurrentTicketId(masterId);

        const masterRes = await fetch(`/api/tickets/${masterId}`);
        if (masterRes.ok) {
          const masterData = await masterRes.json();
          setTicketData(masterData);
          if (!isSilent) {
            setNewStatus(masterData.status);
            setNewTechnicianId(masterData.assigned_technician_id || '');
            setEditTitle(masterData.title || '');
            setEditDescription(masterData.description || '');
            setEditCategoryId(masterData.category_id || (categories[0]?.id || 1));
            setEditPriority(masterData.priority || 'High');
            setEditStatus(masterData.status || 'New');
            setEditTechnicianId(masterData.assigned_technician_id || '');
          }
          return;
        }
      }

      setTicketData(data);
      if (!isSilent) {
        setNewStatus(data.status);
        setNewTechnicianId(data.assigned_technician_id || '');

        // Populate Universal Operator Edit form fields
        setEditTitle(data.title || '');
        setEditDescription(data.description || '');
        setEditCategoryId(data.category_id || (categories[0]?.id || 1));
        setEditPriority(data.priority || 'High');
        setEditStatus(data.status || 'New');
        setEditTechnicianId(data.assigned_technician_id || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSaveFullDetails = async (e) => {
    if (e) e.preventDefault();
    setSavingFullDetails(true);

    try {
      const officerName = currentUser ? currentUser.name : 'Universal Operator';
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category_id: Number(editCategoryId),
          priority: editPriority,
          status: editStatus,
          assigned_technician_id: editTechnicianId ? Number(editTechnicianId) : null,
          updated_by_name: officerName
        })
      });

      if (!res.ok) throw new Error('Failed to update ticket details');
      alert('All ticket details updated successfully by Universal Operator!');
      setIsEditingDetails(false);
      fetchTicketDetails();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingFullDetails(false);
    }
  };

  const handleSaveStatusOnly = async () => {
    setUpdatingStatusOnly(true);
    try {
      const oldStatus = ticketData ? ticketData.status : '';
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

      if (!res.ok) throw new Error('Status update failed');
      alert('Ticket status updated successfully!');
      fetchTicketDetails();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatusOnly(false);
    }
  };

  const handleSaveAgentOnly = async () => {
    setUpdatingAgentOnly(true);
    try {
      const selectedTech = technicians.find(t => String(t.id) === String(newTechnicianId));
      const techName = selectedTech ? selectedTech.name : 'Unassigned';
      const officerName = currentUser ? currentUser.name : 'Officer';

      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_technician_id: newTechnicianId ? Number(newTechnicianId) : null,
          remark: newTechnicianId ? `Assigned technician updated to '${techName}'` : `Technician unassigned`,
          updated_by_name: officerName
        })
      });

      if (!res.ok) throw new Error('Agent assignment update failed');
      alert('Assigned technician updated successfully!');
      fetchTicketDetails();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingAgentOnly(false);
    }
  };

  const handleUserCloseTicket = async () => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Closed',
          remark: 'Closed by Applicant / User',
          updated_by_name: currentUser ? currentUser.name : 'Applicant'
        })
      });

      if (!res.ok) throw new Error('Failed to close ticket');
      alert('Ticket closed successfully!');
      fetchTicketDetails();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUserReopenTicket = async () => {
    if (!window.confirm('Are you sure you want to reopen this ticket?')) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Reopened',
          remark: 'Reopened by Applicant / User',
          updated_by_name: currentUser ? currentUser.name : 'Applicant'
        })
      });

      if (!res.ok) throw new Error('Failed to reopen ticket');
      alert('Ticket reopened successfully!');
      fetchTicketDetails();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddRemark = async (e) => {
    e.preventDefault();
    if (!remarkText.trim() && remarkFiles.length === 0) return;

    setSubmittingRemark(true);
    try {
      const formData = new FormData();
      formData.append('user_name', currentUser ? currentUser.name : 'Officer');
      formData.append('user_role', currentUser ? (currentUser.role === 'user' ? 'Applicant' : 'Technician/Agent') : 'Officer');
      formData.append('remark_text', remarkText.trim());

      for (let i = 0; i < remarkFiles.length; i++) {
        formData.append('attachments', remarkFiles[i]);
      }

      const res = await fetch(`/api/tickets/${ticketId}/remarks`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to post reply with attachment');
      setRemarkText('');
      setRemarkFiles([]);
      fetchTicketDetails();
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingRemark(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

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

  const getPriorityBadgeStyle = (prio) => {
    switch (prio) {
      case 'Critical': return { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' };
      case 'High': return { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' };
      case 'Medium': return { background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' };
      case 'Low': return { background: '#E0E7FF', color: '#3730A3', border: '1px solid #C7D2FE' };
      default: return { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' };
    }
  };

  const getSLAState = (ticket) => {
    if (ticket.status === 'Closed' || !ticket.due_at) return { level: 'normal', label: 'Closed' };

    const now = new Date();
    const due = new Date(ticket.due_at);
    const diffMs = due - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) {
      const overHours = Math.abs(Math.round(diffHours));
      return { 
        level: 'breached', 
        label: `🚨 SLA Breached (${overHours > 0 ? `${overHours}h ago` : 'just now'})`
      };
    } else if (diffHours <= 4) {
      return { 
        level: 'warning', 
        label: `⚠️ SLA Warning (< ${Math.max(1, Math.ceil(diffHours))}h remaining)`
      };
    }
    return { level: 'normal', label: `⏱️ 24h SLA Active (${Math.round(diffHours)}h remaining)` };
  };

  // Render Remark Text & Interactive File Download Link Badges inside History Timeline
  const renderRemarkContent = (text, attachments = []) => {
    if (!text) return null;

    const parts = text.split(/📎 Attached file\(s\):\s*/);
    const mainText = parts[0] ? parts[0].trim() : '';
    const filePart = parts[1] ? parts[1].trim() : '';

    const attachedBadges = [];

    if (filePart) {
      const fileNames = filePart.split(',').map(s => s.trim()).filter(Boolean);
      fileNames.forEach(fn => {
        const found = attachments.find(a => a.original_name.toLowerCase() === fn.toLowerCase() || fn.toLowerCase().includes(a.original_name.toLowerCase()));
        if (found) {
          attachedBadges.push(found);
        } else {
          attachedBadges.push({ id: fn, original_name: fn, file_path: `/uploads/${fn}`, file_size: 0 });
        }
      });
    }

    return (
      <div>
        {mainText && (
          <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', margin: '4px 0 0 0', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
            {mainText}
          </p>
        )}

        {attachedBadges.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {attachedBadges.map((att, idx) => (
              <a 
                key={idx}
                href={att.file_path}
                target="_blank"
                rel="noreferrer"
                download={att.original_name}
                className="zoho-file-badge"
                style={{
                  background: 'var(--card-bg)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--zoho-blue)',
                  color: 'var(--zoho-blue)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-xs)'
                }}
                title="Click to download attachment"
              >
                <i className="fa-solid fa-download" style={{ color: 'var(--zoho-blue)' }}></i>
                <span>{att.original_name}</span>
                {att.file_size > 0 && (
                  <small style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({(att.file_size / 1024).toFixed(1)} KB)</small>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading || !ticketData) {
    return (
      <div className="zoho-modal-overlay">
        <div className="zoho-modal-card" style={{ maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: 'var(--zoho-blue)' }}></i>
          <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Loading ticket details...</p>
        </div>
      </div>
    );
  }

  const rawTicketNum = ticketData && ticketData.ticket_number ? String(ticketData.ticket_number) : `#${ticketData?.id || '0000'}`;
  const formattedId = rawTicketNum.startsWith('#') ? rawTicketNum : `#${rawTicketNum}`;

  const formattedMergedTags = ticketData && ticketData.merged_ticket_numbers
    ? String(ticketData.merged_ticket_numbers).split(',').map(n => {
        const trimmed = n.trim();
        return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
      }).join(', ')
    : null;

  const sla = getSLAState(ticketData);
  const isCitizenUser = currentUser && currentUser.role === 'user';
  const isUniversalOrAdmin = currentUser && (currentUser.role === 'universal' || currentUser.role === 'admin');
  const allAttachments = ticketData.attachments || [];

  // Construct complete chronological history events (Creator, Technician, Officer actions)
  const timelineEvents = [];

  // 1. Ticket Creation Event (Creator History)
  timelineEvents.push({
    id: 'creator-event',
    user_name: ticketData.created_by_name || 'Applicant',
    user_role: 'Ticket Creator',
    created_at: ticketData.created_at,
    remark_text: `Ticket ${formattedId} submitted by ${ticketData.created_by_name} (${ticketData.created_by_email}). Category: '${ticketData.category_name}', Default Priority: '${ticketData.priority || 'High'}'.`,
    isCreatorEvent: true
  });

  // 2. Remarks, Technician Assignments & Status Changes History
  if (ticketData.remarks && ticketData.remarks.length > 0) {
    ticketData.remarks.forEach(r => {
      if (!r.remark_text.includes('दर्ज किया गया')) {
        timelineEvents.push(r);
      }
    });
  }

  // Sort events chronologically (oldest at top, newest at bottom)
  timelineEvents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <>
      <div className="zoho-modal-overlay">
      <div className="zoho-modal-card">
        {/* Top Modal Header Bar */}
        <div className="zoho-modal-header">
          <div className="zoho-modal-header-left">
            <h3 className="zoho-ticket-id" style={{ fontSize: '1.35rem' }}>Ticket ID: {formattedId}</h3>
            <span className={`zoho-badge ${ticketData.status === 'Closed' ? 'zoho-badge-closed' : 'zoho-badge-progress'}`}>
              {ticketData.status === 'New' ? 'Open' : ticketData.status}
            </span>
            <span className="zoho-cat-tag">
              <i className="fa-solid fa-tag"></i> {ticketData.category_name}
            </span>
            <span className="zoho-badge" style={getPriorityBadgeStyle(ticketData.priority)}>
              🔥 {ticketData.priority || 'High'} Priority
            </span>

            {/* Merged Tag Badge */}
            {formattedMergedTags && (
              <span className="zoho-badge" style={{ background: '#EDE9FE', color: '#6D28D9', border: '1px solid #C4B5FD', fontWeight: 800, fontSize: '0.78rem', padding: '3px 10px' }}>
                <i className="fa-solid fa-code-merge" style={{ marginRight: '5px' }}></i> Merged Tag: {formattedMergedTags}
              </span>
            )}

            {/* SLA Badge */}
            {sla.level === 'warning' && (
              <span className="zoho-badge-sla-warning">{sla.label}</span>
            )}
            {sla.level === 'breached' && (
              <span className="zoho-badge-sla-breached">{sla.label}</span>
            )}
            {sla.level === 'normal' && ticketData.status !== 'Closed' && (
              <span className="zoho-badge" style={{ background: '#F3F4F6', color: '#4B5563' }}>{sla.label}</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isCitizenUser && (
              <button 
                className="btn btn-sm"
                onClick={handleOpenMergeModal}
                style={{ 
                  background: '#8B5CF6', 
                  color: '#FFFFFF', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  borderRadius: '6px', 
                  padding: '5px 12px',
                  border: 'none',
                  boxShadow: '0 2px 4px rgba(139, 92, 246, 0.25)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Merge another ticket into this primary ticket"
              >
                <i className="fa-solid fa-code-merge"></i> Merge Ticket
              </button>
            )}
            {isUniversalOrAdmin && (
              <button 
                className={`btn ${isEditingDetails ? 'btn-zoho-secondary' : 'btn-zoho-primary'} btn-sm`}
                onClick={() => setIsEditingDetails(!isEditingDetails)}
                style={{ fontSize: '0.78rem', fontWeight: 700 }}
              >
                <i className={`fa-solid ${isEditingDetails ? 'fa-xmark' : 'fa-pen-to-square'}`}></i> {isEditingDetails ? 'Cancel Edit' : 'Edit'}
              </button>
            )}
            <button className="zoho-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* Redirect Notice Banner when user tried to view a merged ticket */}
        {redirectNotice && (
          <div style={{ 
            background: '#F3E8FF', 
            color: '#6D28D9', 
            padding: '10px 20px', 
            borderBottom: '1px solid #C4B5FD', 
            fontSize: '0.84rem', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px' 
          }}>
            <i className="fa-solid fa-circle-info" style={{ fontSize: '1.05rem', color: '#8B5CF6' }}></i>
            <span>{redirectNotice}</span>
          </div>
        )}

        {/* Dual-Pane Layout Body */}
        <div className="zoho-modal-body">
          {/* Main Left Section */}
          <div className="zoho-detail-main">
            
            {/* 1. UNIVERSAL / ADMIN EDIT FORM (Toggled by Edit Mode button) */}
            {isEditingDetails && isUniversalOrAdmin ? (
              <form onSubmit={handleSaveFullDetails} style={{ background: '#F3E8FF', padding: '16px', borderRadius: '8px', border: '1px solid #C084FC', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#6B21A8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-pen-to-square"></i> Edit Ticket Details
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#581C87' }}>Subject / Issue Title *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-2" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#581C87' }}>Category / Module *</label>
                    <select className="form-control" value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.group_name})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#581C87' }}>Priority Level *</label>
                    <select className="form-control" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#581C87' }}>Ticket Status *</label>
                    <select className="form-control" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                      <option value="New">Open / New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                      <option value="Reopened">Reopened</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#581C87' }}>Assign Specialist Technician</label>
                    <select className="form-control" value={editTechnicianId} onChange={(e) => setEditTechnicianId(e.target.value)}>
                      <option value="">-- Unassigned --</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#581C87' }}>Description</label>
                  <textarea 
                    className="form-control" 
                    rows="4" 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onPaste={handlePasteEditDescription}
                    placeholder="Enter description... (You can copy & paste Ctrl+V images directly here)"
                  />
                  {uploadingEditImage && (
                    <div style={{ fontSize: '0.78rem', color: '#7C3AED', marginTop: '4px', fontWeight: 600 }}>
                      <i className="fa-solid fa-spinner fa-spin"></i> Uploading pasted image...
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-zoho-secondary btn-sm" onClick={() => setIsEditingDetails(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-zoho-primary btn-sm" disabled={savingFullDetails} style={{ background: '#7C3AED', borderColor: '#6D28D9' }}>
                    {savingFullDetails ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>} Save All Ticket Changes
                  </button>
                </div>
              </form>
            ) : null}

            {/* 1. SUBJECT */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Subject / Issue Title
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0', lineHeight: '1.3' }}>
                {ticketData.title}
              </h2>
            </div>

            {/* 2. DESCRIPTION */}
            <div style={{ marginBottom: '24px' }}>
              <h4 className="zoho-section-heading">
                <i className="fa-solid fa-align-left" style={{ color: 'var(--zoho-blue)' }}></i> Description
              </h4>
              <div style={{ 
                background: 'var(--bg-body)', 
                padding: '16px', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border-color)',
                fontSize: '0.88rem',
                color: 'var(--text-main)',
                lineHeight: '1.5'
              }}>
                {renderFormattedDescription(ticketData.description)}
              </div>
            </div>

            {/* 2b. MERGED TICKETS SECTION (SHOWS DETAILS OF MERGED TICKETS) */}
            {ticketData.mergedTickets && ticketData.mergedTickets.length > 0 && (
              <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', border: '1px solid #C4B5FD', marginBottom: '24px', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.08)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                  <i className="fa-solid fa-code-merge" style={{ color: '#8B5CF6' }}></i> Merged Tickets ({ticketData.mergedTickets.length})
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ticketData.mergedTickets.map(mt => {
                    const isExpanded = expandedMergedIds[mt.id];
                    return (
                      <div key={mt.id} style={{ background: 'var(--bg-body)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, color: 'var(--zoho-blue)', fontSize: '0.85rem' }}>#{mt.ticket_number}</span>
                              <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)' }}>{mt.title}</span>
                              <span className="zoho-badge" style={{ background: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE', fontSize: '0.68rem' }}>Merged</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Raised by <strong>{mt.created_by_name}</strong> ({mt.created_by_email}) on {formatDate(mt.created_at)} | Category: <strong>{mt.category_name || 'General Support'}</strong>
                            </div>
                          </div>
                          <button 
                            className="btn btn-zoho-secondary btn-xs" 
                            style={{ fontSize: '0.74rem', padding: '3px 10px', color: '#6D28D9', borderColor: '#C4B5FD', cursor: 'pointer' }}
                            onClick={() => toggleExpandMergedTicket(mt.id)}
                          >
                            <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i> 
                            {isExpanded ? ' Hide Merged Details' : ' View Merged Details & History'}
                          </button>
                        </div>

                        {/* Expanded Merged Ticket Content */}
                        {isExpanded && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Description */}
                            <div>
                              <strong style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Merged Ticket Description:</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px', background: 'var(--card-bg)', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', whiteSpace: 'pre-wrap' }}>
                                {mt.description || 'No description provided.'}
                              </div>
                            </div>

                            {/* Merged Attachments */}
                            {mt.attachments && mt.attachments.length > 0 && (
                              <div>
                                <strong style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Merged Attachments ({mt.attachments.length}):</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                  {mt.attachments.map(att => (
                                    <a key={att.id} href={att.file_path} target="_blank" rel="noreferrer" download={att.original_name} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--card-bg)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.74rem', textDecoration: 'none', color: 'var(--zoho-blue)', fontWeight: 600 }}>
                                      <i className="fa-solid fa-paperclip"></i> {att.original_name}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Merged Remarks & History */}
                            {mt.remarks && mt.remarks.length > 0 && (
                              <div>
                                <strong style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Merged Action History ({mt.remarks.length}):</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                  {mt.remarks.map(rem => (
                                    <div key={rem.id} style={{ background: 'var(--card-bg)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontSize: '0.76rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '2px' }}>
                                        <span><strong>{rem.user_name}</strong> ({rem.user_role})</span>
                                        <span>{formatDate(rem.created_at)}</span>
                                      </div>
                                      <div style={{ color: 'var(--text-main)' }}>{rem.remark_text}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. TICKET HISTORY & ACTION TIMELINE */}
            <div style={{ marginBottom: '24px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <h4 className="zoho-section-heading" style={{ marginTop: 0 }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--zoho-blue)' }}></i> Ticket History & Action Timeline
              </h4>

              <div className="zoho-timeline" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {timelineEvents.map((r, idx) => (
                  <div 
                    key={r.id || idx} 
                    className="zoho-timeline-item" 
                    style={{ 
                      marginBottom: '12px', 
                      padding: '10px 12px', 
                      background: r.isCreatorEvent ? 'var(--zoho-blue-light)' : 'var(--bg-body)', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${r.isCreatorEvent ? 'var(--zoho-blue)' : '#8B5CF6'}` 
                    }}
                  >
                    <div className="zoho-timeline-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                        <i className={`fa-solid ${r.isCreatorEvent ? 'fa-user-pen' : 'fa-user-circle'}`} style={{ color: r.isCreatorEvent ? 'var(--zoho-blue)' : '#8B5CF6', marginRight: '5px' }}></i> 
                        {r.user_name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({r.user_role || 'Officer'})</span>
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-regular fa-clock" style={{ fontSize: '0.7rem' }}></i>
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    
                    {/* Render Content Text & Direct File Attachment Download Badges */}
                    {renderRemarkContent(r.remark_text, allAttachments)}
                  </div>
                ))}
              </div>

              {/* Reply & Attachment Form */}
              <form onSubmit={handleAddRemark} style={{ marginTop: '18px', background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-reply" style={{ color: 'var(--zoho-blue)' }}></i> Add Update / Technician Remark & Attach Files
                </div>
                
                <textarea 
                  className="form-control" 
                  rows="4"
                  placeholder="Type remark, status update, or technician note..." 
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  style={{ 
                    width: '100%',
                    marginBottom: '12px', 
                    fontSize: '0.86rem', 
                    resize: 'none', 
                    minHeight: '105px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--input-bg)',
                    color: 'var(--input-text)',
                    lineHeight: '1.45'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '7px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <i className="fa-solid fa-paperclip" style={{ color: 'var(--zoho-blue)', fontSize: '0.85rem' }}></i>
                    <span>{remarkFiles.length > 0 ? `${remarkFiles.length} file(s) selected` : 'Attach File / Document'}</span>
                    <input 
                      type="file" 
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const incoming = Array.from(e.target.files);
                          const totalSize = incoming.reduce((s, f) => s + f.size, 0);
                          if (totalSize > 25 * 1024 * 1024) {
                            alert(`⚠️ File Size Limit Exceeded!\n\nCombined attachment size cannot exceed 25 MB. (Selected: ${(totalSize / (1024 * 1024)).toFixed(2)} MB).`);
                            e.target.value = '';
                            return;
                          }
                          setRemarkFiles(incoming);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button type="submit" className="btn btn-zoho-primary btn-sm" disabled={submittingRemark} style={{ whiteSpace: 'nowrap', padding: '7px 16px', fontSize: '0.82rem', fontWeight: 700 }}>
                    {submittingRemark ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>} Post Reply & Attach
                  </button>
                </div>

                {remarkFiles.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--zoho-blue)', fontWeight: 600 }}>
                    Selected attachments: {remarkFiles.map(f => f.name).join(', ')}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT SIDEBAR SECTION - STRICT USER SEQUENCE ORDER                        */}
          {/* ========================================================================= */}
          <div className="zoho-detail-sidebar">

            {/* 1. TICKET STATUS (MOVED TO VERY TOP) */}
            <div style={{ marginBottom: '16px' }}>
              <h4 className="zoho-section-heading" style={{ marginBottom: '10px' }}>
                <i className="fa-solid fa-sliders" style={{ color: 'var(--zoho-blue)' }}></i> Ticket Status
              </h4>
              {isCitizenUser ? (
                <div>
                  <div style={{ fontSize: '0.82rem', marginBottom: '10px' }}>
                    <strong>Current Status:</strong> <span className={`zoho-badge ${getBadgeClass(ticketData.status)}`}>{ticketData.status}</span>
                  </div>
                  {ticketData.status !== 'Closed' && (
                    <button 
                      className="btn btn-zoho-secondary btn-sm" 
                      style={{ width: '100%', background: '#EF4444', color: '#FFFFFF', borderColor: '#DC2626' }}
                      onClick={handleUserCloseTicket} 
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-circle-xmark"></i>} Close Ticket
                    </button>
                  )}
                  {(ticketData.status === 'Closed' || ticketData.status === 'Resolved') && (
                    <button 
                      className="btn btn-zoho-secondary btn-sm" 
                      style={{ width: '100%', background: '#E11D48', color: '#FFFFFF', borderColor: '#BE123C', marginTop: ticketData.status !== 'Closed' ? '6px' : '0' }}
                      onClick={handleUserReopenTicket} 
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-rotate-left"></i>} Reopen Ticket
                    </button>
                  )}
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <select className="form-control" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="New">Open / New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                    <option value="Reopened">Reopened</option>
                  </select>
                  <button 
                    className="btn btn-zoho-primary btn-sm" 
                    style={{ marginTop: '8px', width: '100%' }} 
                    onClick={handleSaveStatusOnly} 
                    disabled={updatingStatusOnly}
                  >
                    {updatingStatusOnly ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>} Update Status
                  </button>
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />

            {/* 2. ASSIGNED AGENT SELECTOR */}
            {!isCitizenUser && (
              <div style={{ marginBottom: '16px' }}>
                <h4 className="zoho-section-heading" style={{ marginBottom: '10px' }}>
                  <i className="fa-solid fa-user-plus" style={{ color: 'var(--zoho-blue)' }}></i> Assigned Agent
                </h4>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <select className="form-control" value={newTechnicianId} onChange={(e) => setNewTechnicianId(e.target.value)}>
                    <option value="">-- Unassigned --</option>
                    {technicians.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-zoho-excel btn-xs" 
                    style={{ width: '100%', marginTop: '6px' }} 
                    onClick={handleSaveAgentOnly} 
                    disabled={updatingAgentOnly}
                  >
                    {updatingAgentOnly ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-user-check"></i>} Save Agent
                  </button>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />
              </div>
            )}

            {/* 3. ASSIGNED AGENT DETAILS */}
            <div style={{ marginBottom: '16px' }}>
              <h4 className="zoho-section-heading" style={{ marginBottom: '8px' }}>
                <i className="fa-solid fa-user-tie" style={{ color: 'var(--zoho-blue)' }}></i> Assigned Agent Details
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Agent Name:</strong> {ticketData.technician_name || 'Unassigned'}</div>
                {!isCitizenUser && (
                  <div><strong>Official Email:</strong> {ticketData.technician_email || '-'}</div>
                )}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />

            {/* 4. TICKET TIMELINE CARD (MOVED BELOW ASSIGNED AGENT) */}
            <div style={{ 
              background: 'var(--card-bg)', 
              padding: '14px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              marginBottom: '16px', 
              boxShadow: 'var(--shadow-xs)' 
            }}>
              <h4 className="zoho-section-heading" style={{ marginTop: 0, fontSize: '0.88rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--zoho-blue)' }}></i> Ticket Timeline
              </h4>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Created Time:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{formatDate(ticketData.created_at)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>24h SLA Target:</span>
                  <strong style={{ color: '#EF4444' }}>{formatDate(ticketData.due_at)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Resolved Time:</span>
                  <strong style={{ color: ticketData.resolved_at ? '#10B981' : 'var(--text-muted)' }}>{formatDate(ticketData.resolved_at)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Closed Time:</span>
                  <strong style={{ color: ticketData.closed_at ? '#64748B' : 'var(--text-muted)' }}>{formatDate(ticketData.closed_at)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Reopen Time:</span>
                  <strong style={{ color: ticketData.reopened_at ? '#DC2626' : 'var(--text-muted)' }}>{formatDate(ticketData.reopened_at)}</strong>
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />

            {/* 4. APPLICANT / CREATOR CONTACT */}
            <div style={{ marginBottom: '16px' }}>
              <h4 className="zoho-section-heading" style={{ marginBottom: '8px' }}>
                <i className="fa-solid fa-circle-info" style={{ color: 'var(--zoho-blue)' }}></i> Applicant / Creator Contact
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Name:</strong> {ticketData.created_by_name}</div>
                <div><strong>Email:</strong> {ticketData.created_by_email}</div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />

            {/* 5. ALL ATTACHMENTS (MOVED TO BOTTOM OF RIGHT SIDEBAR) */}
            <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', boxShadow: 'var(--shadow-xs)' }}>
              <h4 className="zoho-section-heading" style={{ marginTop: 0, fontSize: '0.88rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <i className="fa-solid fa-folder-open" style={{ color: '#8B5CF6' }}></i> All Attachments ({allAttachments.length})
              </h4>
              
              {allAttachments.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                  No files attached to this ticket yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', marginTop: '10px' }}>
                  {allAttachments.map(a => (
                    <a 
                      key={a.id} 
                      href={a.file_path} 
                      target="_blank" 
                      rel="noreferrer"
                      download={a.original_name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'var(--bg-body)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        textDecoration: 'none',
                        color: 'var(--text-main)',
                        fontSize: '0.78rem',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Click to download ${a.original_name}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <i className="fa-solid fa-file-arrow-down" style={{ color: 'var(--zoho-blue)', fontSize: '0.9rem' }}></i>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px', fontWeight: 600 }}>
                          {a.original_name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {(a.file_size / 1024).toFixed(0)} KB
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>

      {/* MERGE TICKET POPUP MODAL */}
      {isMergeModalOpen && (
        <div className="zoho-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="zoho-modal-card" style={{ maxWidth: '550px', padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                <i className="fa-solid fa-code-merge" style={{ color: '#8B5CF6' }}></i> Merge Ticket into #{ticketData.ticket_number}
              </h3>
              <button className="zoho-modal-close" onClick={() => setIsMergeModalOpen(false)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
              Select a ticket from the list below to merge into <strong>Ticket #{ticketData.ticket_number} ({ticketData.title})</strong>. The merged ticket's details, attachments, and remarks history will be preserved inside this ticket.
            </p>

            {/* Search Input */}
            <div style={{ marginBottom: '14px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search ticket by number (#00004), title, or applicant name..."
                value={mergeSearchQuery}
                onChange={(e) => setMergeSearchQuery(e.target.value)}
                style={{ fontSize: '0.84rem', padding: '8px 12px' }}
              />
            </div>

            {/* Ticket Selection List */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '16px', background: 'var(--bg-body)' }}>
              {allAvailableTickets.filter(t => {
                if (!mergeSearchQuery.trim()) return true;
                const q = mergeSearchQuery.toLowerCase();
                return (
                  (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
                  (t.title && t.title.toLowerCase().includes(q)) ||
                  (t.created_by_name && t.created_by_name.toLowerCase().includes(q))
                );
              }).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No available tickets found to merge.
                </div>
              ) : (
                allAvailableTickets.filter(t => {
                  if (!mergeSearchQuery.trim()) return true;
                  const q = mergeSearchQuery.toLowerCase();
                  return (
                    (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
                    (t.title && t.title.toLowerCase().includes(q)) ||
                    (t.created_by_name && t.created_by_name.toLowerCase().includes(q))
                  );
                }).map(t => {
                  const isSelected = String(selectedMergeTicketId) === String(t.id);
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedMergeTicketId(t.id)}
                      style={{ 
                        padding: '10px 14px', 
                        borderBottom: '1px solid var(--border-subtle)', 
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                        borderLeft: isSelected ? '4px solid #8B5CF6' : '4px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--zoho-blue)', fontSize: '0.83rem' }}>#{t.ticket_number}</span>
                        <span className={`zoho-badge ${getBadgeClass(t.status)}`} style={{ fontSize: '0.68rem' }}>{t.status}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', marginTop: '2px' }}>{t.title}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Created by <strong>{t.created_by_name}</strong> | Category: {t.category_name || 'General'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-zoho-secondary btn-sm" onClick={() => setIsMergeModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-sm" 
                onClick={handleConfirmMergeTicket} 
                disabled={!selectedMergeTicketId || mergingInProgress}
                style={{ background: '#8B5CF6', color: '#FFFFFF', fontWeight: 700, borderColor: '#7C3AED' }}
              >
                {mergingInProgress ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-code-merge"></i>} Confirm & Merge Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
