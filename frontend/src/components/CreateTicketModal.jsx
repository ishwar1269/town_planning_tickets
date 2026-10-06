import React, { useState, useEffect } from 'react';

export default function CreateTicketModal({ currentUser, categories, technicians, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 1);
  const [priority, setPriority] = useState('High');
  const isCitizenUser = currentUser && currentUser.role === 'user';
  const universalTech = technicians.find(t => 
    t.email.toLowerCase().includes('universal') || t.name.toLowerCase().includes('universal')
  );

  const [technicianId, setTechnicianId] = useState(
    isCitizenUser ? (universalTech?.id || 1) : ''
  );
  const [createdByName, setCreatedByName] = useState(currentUser?.name || 'Suresh Kumar');
  const [createdByEmail, setCreatedByEmail] = useState(currentUser?.email || 'user@townplanning.gov.in');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sync applicant details automatically with logged-in user profile
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setCreatedByName(currentUser.name);
      if (currentUser.email) setCreatedByEmail(currentUser.email);
    }
  }, [currentUser]);

  const [uploadingPastedImage, setUploadingPastedImage] = useState(false);
  const [pastedImages, setPastedImages] = useState([]);

  const handlePasteDescription = async (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    const items = Array.from(clipboardData.items);
    const imageItems = items.filter(item => item.type && item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();
    setUploadingPastedImage(true);

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

        // Keep description clean without raw HTML img tags
        setPastedImages(prev => [...prev, { 
          url: data.url, 
          filename: data.filename, 
          originalName: data.originalName || fileName,
          size: data.size || file.size 
        }]);
      }
    } catch (err) {
      console.error('Error pasting image:', err);
      alert('Failed to upload pasted image: ' + err.message);
    } finally {
      setUploadingPastedImage(false);
    }
  };

  const handleImageFileSelect = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setUploadingPastedImage(true);

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const formData = new FormData();
        formData.append('image', file, file.name);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) throw new Error('Failed to upload image');
        const data = await res.json();

        // Keep description clean without raw HTML img tags
        setPastedImages(prev => [...prev, { 
          url: data.url, 
          filename: data.filename, 
          originalName: data.originalName || file.name,
          size: data.size || file.size 
        }]);
      }
    } catch (err) {
      alert('Image upload failed: ' + err.message);
    } finally {
      setUploadingPastedImage(false);
      e.target.value = '';
    }
  };

  const handleRemovePastedImage = (indexToRemove) => {
    setPastedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB Limit

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const incomingFiles = Array.from(e.target.files);

      // Check single file > 25MB
      const oversizedFiles = incomingFiles.filter(f => f.size > MAX_SIZE_BYTES);
      if (oversizedFiles.length > 0) {
        const oversizedNames = oversizedFiles.map(f => `"${f.name}" (${(f.size / (1024 * 1024)).toFixed(2)} MB)`).join(', ');
        alert(`⚠️ File Size Limit Exceeded!\n\nThe following file(s) exceed the maximum allowed limit of 25 MB:\n${oversizedNames}\n\nPlease select files smaller than 25 MB.`);
      }

      const validIncoming = incomingFiles.filter(f => f.size <= MAX_SIZE_BYTES);

      setSelectedFiles(prev => {
        const existingKeys = new Set(prev.map(f => `${f.name}_${f.size}`));
        const uniqueNewFiles = validIncoming.filter(f => !existingKeys.has(`${f.name}_${f.size}`));
        const combined = [...prev, ...uniqueNewFiles];

        // Check cumulative total size
        const totalSize = combined.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > MAX_SIZE_BYTES) {
          alert(`⚠️ Total Attachment Limit Exceeded!\n\nCombined size of all attachments cannot exceed 25 MB. (Attempted total: ${(totalSize / (1024 * 1024)).toFixed(2)} MB).\n\nPlease remove some files before adding more.`);
          return prev;
        }

        return combined;
      });

      e.target.value = '';
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category_id', categoryId);
      formData.append('priority', priority); // Default High for all categories
      formData.append('assigned_technician_id', isCitizenUser ? (universalTech?.id || 1) : technicianId);
      formData.append('created_by_name', createdByName);
      formData.append('created_by_email', createdByEmail);

      // Pass pasted/embedded images cleanly so backend creates attachments
      if (pastedImages.length > 0) {
        formData.append('pasted_images', JSON.stringify(pastedImages));
      }

      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await fetch('/api/tickets', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      const formattedNum = data.ticket_number.startsWith('#') ? data.ticket_number : `#${data.ticket_number}`;
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();

      alert(`Success! Ticket [${formattedNum}] created successfully.`);
      
      // Automatic page refresh to show newly created ticket instantly
      window.location.reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Technicians allocated to selected category
  const allocatedTechs = technicians.filter(t => 
    t.category_ids && t.category_ids.includes(Number(categoryId))
  );

  const otherTechs = technicians.filter(t => 
    !t.category_ids || !t.category_ids.includes(Number(categoryId))
  );

  return (
    <div className="zoho-modal-overlay">
      <div className="zoho-modal-card zoho-modal-large" style={{ maxWidth: '860px', width: '94%', padding: '32px 36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <i className="fa-solid fa-square-plus" style={{ color: 'var(--zoho-blue)', fontSize: '1.5rem' }}></i> Submit New Helpdesk Ticket
          </h2>
          <button className="zoho-modal-close" onClick={onClose} style={{ fontSize: '1.6rem' }}>&times;</button>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: '18px', fontSize: '0.88rem', lineHeight: '1.5' }}>
          Create a new helpdesk ticket for Town Planning DTCP / BPAMS / AutoDCR support.
        </p>

        {currentUser && (currentUser.role === 'universal' || currentUser.role === 'admin') && (
          <div style={{ background: '#F3E8FF', border: '1px solid #C084FC', color: '#6B21A8', padding: '12px 16px', borderRadius: '6px', fontSize: '0.84rem', marginBottom: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-headset" style={{ fontSize: '1rem' }}></i> <span><strong>Universal Operator Mode:</strong> You can raise tickets on behalf of any citizen applicant and directly assign a specialist technician.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 700 }}>Subject / Issue Title *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Unable to send file next level - Municipal Corporation" 
              required 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ fontSize: '0.9rem', padding: '10px 14px' }}
            />
          </div>

          <div className="form-grid-2" style={{ gap: '18px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700 }}>Module / Category *</label>
              <select 
                className="form-control" 
                value={categoryId} 
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '10px 14px' }}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.group_name})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700 }}>Priority Level *</label>
              <select 
                className="form-control" 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                disabled={isCitizenUser}
                style={{ 
                  fontSize: '0.9rem', 
                  padding: '10px 14px',
                  ...(isCitizenUser ? { background: '#F1F5F9', cursor: 'not-allowed', color: '#DC2626', fontWeight: 700 } : {})
                }}
              >
                <option value="High">High</option>
                <option value="Critical">Critical</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2" style={{ gap: '18px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Applicant Name *</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-lock" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}></i> Locked / Non-editable
                </span>
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={createdByName}
                readOnly={true}
                required
                style={{ 
                  fontSize: '0.9rem', 
                  padding: '10px 14px', 
                  background: 'var(--input-disabled-bg, rgba(0, 0, 0, 0.04))', 
                  color: 'var(--text-main)', 
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  border: '1px solid var(--border-color)'
                }}
                title="Applicant Name is automatically populated from your authenticated login session."
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Applicant Email ID *</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-lock" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}></i> Locked / Non-editable
                </span>
              </label>
              <input 
                type="email" 
                className="form-control" 
                value={createdByEmail}
                readOnly={true}
                required
                style={{ 
                  fontSize: '0.9rem', 
                  padding: '10px 14px', 
                  background: 'var(--input-disabled-bg, rgba(0, 0, 0, 0.04))', 
                  color: 'var(--text-main)', 
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  border: '1px solid var(--border-color)'
                }}
                title="Applicant Email ID is locked to your verified account credentials."
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 700 }}>Assign Specialist Technician</label>
            {isCitizenUser ? (
              <select 
                className="form-control" 
                value={universalTech?.id || 1} 
                disabled={true}
                style={{ background: '#F1F5F9', cursor: 'not-allowed', color: '#6B21A8', fontWeight: 700, fontSize: '0.9rem', padding: '10px 14px' }}
              >
                <option value={universalTech?.id || 1}>
                  🌐 Universal Helpdesk Operator (universal@townplanning.gov.in)
                </option>
              </select>
            ) : (
              <select 
                className="form-control" 
                value={technicianId} 
                onChange={(e) => setTechnicianId(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '10px 14px' }}
              >
                <option value="">-- Unassigned --</option>
                
                {allocatedTechs.length > 0 && (
                  <optgroup label="⭐ Category Recommended Specialists">
                    {allocatedTechs.map(item => (
                      <option key={item.id} value={item.id}>⭐ {item.name} ({item.email})</option>
                    ))}
                  </optgroup>
                )}

                {otherTechs.length > 0 && (
                  <optgroup label="Other Specialists">
                    {otherTechs.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.email})</option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700, margin: 0 }}>
                Description
              </label>
              <label 
                htmlFor="desc-img-picker" 
                style={{ 
                  fontSize: '0.78rem', 
                  color: 'var(--zoho-blue)', 
                  cursor: 'pointer', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: 'var(--bg-body)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)'
                }}
                title="Click to select or copy/paste (Ctrl+V) images directly into description"
              >
                <i className="fa-solid fa-image"></i> + Add / Paste Image
              </label>
              <input 
                id="desc-img-picker" 
                type="file" 
                accept="image/*" 
                multiple 
                style={{ display: 'none' }} 
                onChange={handleImageFileSelect}
              />
            </div>

            <textarea 
              className="form-control" 
              rows="5" 
              placeholder="Describe the issue, step to reproduce, or workflow error... (You can copy & paste (Ctrl+V) images or screenshots directly into this field)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={handlePasteDescription}
              style={{ fontSize: '0.9rem', padding: '10px 14px', lineHeight: '1.5' }}
            ></textarea>

            {uploadingPastedImage && (
              <div style={{ fontSize: '0.8rem', color: 'var(--zoho-blue)', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Uploading pasted image... Please wait.
              </div>
            )}

            {pastedImages.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pasted / Embedded Images ({pastedImages.length}):</span>
                {pastedImages.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={img.url} 
                      alt="Pasted Thumbnail" 
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--zoho-blue)' }} 
                    />
                    <button 
                      type="button"
                      onClick={() => handleRemovePastedImage(idx)}
                      style={{ 
                        position: 'absolute', 
                        top: '-6px', 
                        right: '-6px', 
                        background: '#EF4444', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '50%', 
                        width: '18px', 
                        height: '18px', 
                        fontSize: '0.65rem', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 800
                      }}
                      title="Remove this pasted image"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Upload Box */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700, margin: 0 }}>
                <i className="fa-solid fa-paperclip" style={{ color: 'var(--zoho-blue)' }}></i> File Attachments (PDF, DWG/CAD, Images, DOCX, ZIP)
              </label>
              {selectedFiles.length > 0 ? (
                <span style={{ fontSize: '0.8rem', color: (selectedFiles.reduce((s, f) => s + f.size, 0) > 20 * 1024 * 1024 ? '#DC2626' : 'var(--zoho-blue)'), fontWeight: 700 }}>
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} ({(selectedFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2)} MB / 25 MB)
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Max Limit: 25 MB</span>
              )}
            </div>

            <div className="zoho-upload-area" style={{ padding: '16px', background: 'var(--bg-body)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  multiple 
                  className="form-control" 
                  onChange={handleFileChange}
                  style={{ padding: '8px 12px', flex: '1', minWidth: '220px' }}
                />
              </div>

              {/* Selected Files Badges List with Remove Button */}
              {selectedFiles.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Attached Files ({selectedFiles.length}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedFiles.map((f, i) => (
                      <div 
                        key={`${f.name}_${i}`} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          background: 'var(--card-bg)', 
                          padding: '6px 12px', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border-color)', 
                          fontSize: '0.8rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        <i className="fa-solid fa-file-circle-check" style={{ color: 'var(--zoho-blue)' }}></i>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>
                          {f.name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({(f.size / 1024).toFixed(1)} KB)</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveFile(i)}
                          style={{ 
                            background: '#FEF2F2', 
                            border: '1px solid #FCA5A5', 
                            color: '#EF4444', 
                            cursor: 'pointer', 
                            fontSize: '0.78rem', 
                            padding: '2px 6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}
                          title="Remove this file"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '12px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-zoho-secondary" onClick={onClose} style={{ padding: '10px 20px', fontSize: '0.88rem' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-zoho-primary" disabled={loading} style={{ padding: '10px 24px', fontSize: '0.88rem', fontWeight: 700 }}>
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
