import React, { useState } from 'react';
import { getOrgConfig, saveOrgConfig } from '../config/organizationConfig';

export default function BrandingSettingsModal({ onClose, onConfigSaved }) {
  const [config, setConfig] = useState(getOrgConfig());
  const [activeTab, setActiveTab] = useState('branding');
  const [successMsg, setSuccessMsg] = useState('');

  // Industry Preset Templates for instant 1-click enterprise customization
  const presets = [
    {
      name: "🏛️ Govt & Town Planning",
      orgName: "Town Planning & Urban Development",
      orgShortName: "Town Planning",
      appTitle: "I-SupportOne Desk",
      appSubtitle: "Raise It. Route It. Resolve It.",
      logoIcon: "fa-solid fa-building-columns",
      primaryColor: "#0265DC",
      supportEmail: "support@townplanning.gov.in",
      supportPhone: "+91 1800-123-4567"
    },
    {
      name: "🏥 Healthcare & Hospital Services",
      orgName: "Apollo Healthcare Services",
      orgShortName: "Healthcare",
      appTitle: "Hospital Operations Desk",
      appSubtitle: "Track medical equipment repairs, patient requests, and facility maintenance.",
      logoIcon: "fa-solid fa-hospital",
      primaryColor: "#10B981",
      supportEmail: "helpdesk@apollohealthcare.com",
      supportPhone: "+91 1800-999-8888"
    },
    {
      name: "💼 Corporate IT & Enterprise Desk",
      orgName: "Global Infotech Solutions",
      orgShortName: "Infotech",
      appTitle: "Enterprise Service Desk",
      appSubtitle: "Submit IT hardware, software access, and network infrastructure tickets.",
      logoIcon: "fa-solid fa-laptop-code",
      primaryColor: "#8B5CF6",
      supportEmail: "itdesk@globalinfotech.com",
      supportPhone: "+1 800-555-0199"
    },
    {
      name: "🏦 Banking & Financial Services",
      orgName: "National Commercial Bank",
      orgShortName: "NC Bank",
      appTitle: "Banking Support Portal",
      appSubtitle: "Manage branch operations, ATM queries, and customer issue resolution.",
      logoIcon: "fa-solid fa-landmark",
      primaryColor: "#0284C7",
      supportEmail: "support@ncbank.com",
      supportPhone: "+91 1800-222-3333"
    }
  ];

  const handleApplyPreset = (preset) => {
    const updated = { ...config, ...preset };
    setConfig(updated);
    setSuccessMsg(`Applied ${preset.name} branding template!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveOrgConfig(config);
    setSuccessMsg('White-Label Organization settings updated successfully!');
    if (onConfigSaved) onConfigSaved(config);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px'
    }}>
      <div style={{
        background: 'var(--card-bg)', width: '100%', maxWidth: '780px', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--zoho-header-bg)', color: '#FFFFFF', padding: '16px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-sliders" style={{ color: '#38BDF8' }}></i>
              White-Label Enterprise & Organization Setup
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
              Customize branding, organization name, primary colors, and support contacts for any enterprise client.
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{ display: 'flex', background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', padding: '0 20px' }}>
          <button 
            onClick={() => setActiveTab('branding')}
            style={{
              padding: '12px 18px', background: 'transparent', border: 'none',
              borderBottom: activeTab === 'branding' ? '3px solid var(--zoho-blue)' : '3px solid transparent',
              color: activeTab === 'branding' ? 'var(--zoho-blue)' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer'
            }}
          >
            🎨 Branding & Identity
          </button>

          <button 
            onClick={() => setActiveTab('presets')}
            style={{
              padding: '12px 18px', background: 'transparent', border: 'none',
              borderBottom: activeTab === 'presets' ? '3px solid var(--zoho-blue)' : '3px solid transparent',
              color: activeTab === 'presets' ? 'var(--zoho-blue)' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer'
            }}
          >
            ⚡ 1-Click Industry Templates
          </button>

          <button 
            onClick={() => setActiveTab('contact')}
            style={{
              padding: '12px 18px', background: 'transparent', border: 'none',
              borderBottom: activeTab === 'contact' ? '3px solid var(--zoho-blue)' : '3px solid transparent',
              color: activeTab === 'contact' ? 'var(--zoho-blue)' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer'
            }}
          >
            📞 Support & Contact Info
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {successMsg && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#10B981',
              padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.84rem',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <i className="fa-solid fa-circle-check"></i> {successMsg}
            </div>
          )}

          {activeTab === 'branding' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Full Organization / Enterprise Name *
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.orgName}
                  onChange={(e) => setConfig({ ...config, orgName: e.target.value })}
                  placeholder="e.g. Town Planning & Urban Development / Apollo Hospitals / TATA Motors"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Short Org Name (Header Tag)
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.orgShortName}
                  onChange={(e) => setConfig({ ...config, orgShortName: e.target.value })}
                  placeholder="e.g. Town Planning"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  App Brand Header Title *
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.appTitle}
                  onChange={(e) => setConfig({ ...config, appTitle: e.target.value })}
                  placeholder="e.g. I-SupportOne Desk / IT Service Portal"
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Portal Description Subtitle
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.appSubtitle}
                  onChange={(e) => setConfig({ ...config, appSubtitle: e.target.value })}
                  placeholder="e.g. View, search, filter, and update status for all raised helpdesk tickets."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Header Logo Icon (FontAwesome Class)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', color: config.primaryColor, width: '30px', textAlign: 'center' }}>
                    <i className={config.logoIcon}></i>
                  </span>
                  <input 
                    type="text"
                    className="form-control"
                    value={config.logoIcon}
                    onChange={(e) => setConfig({ ...config, logoIcon: e.target.value })}
                    placeholder="fa-solid fa-headset"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Primary Signature Theme Color
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value, logoColor: e.target.value })}
                    style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-xs)' }}
                  />
                  <input 
                    type="text"
                    className="form-control"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value, logoColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Select an enterprise template to automatically adapt the portal for your client's industry:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {presets.map((preset, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                      borderLeft: `5px solid ${preset.primaryColor}`, borderRadius: 'var(--radius-md)',
                      padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      {preset.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {preset.orgName} • {preset.appTitle}
                    </div>
                    <button className="btn btn-zoho-secondary btn-xs" style={{ fontSize: '0.74rem' }}>
                      <i className="fa-solid fa-wand-magic-sparkles"></i> Apply This Preset
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Office Address (Footer Display)
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.officeAddress || ''}
                  onChange={(e) => setConfig({ ...config, officeAddress: e.target.value })}
                  placeholder="Directorate of Town and Country Planning, Atal Nagar, Raipur (C.G.)"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Official Support Email ID
                </label>
                <input 
                  type="email"
                  className="form-control"
                  value={config.supportEmail || ''}
                  onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                  placeholder="cgtownplan@gmail.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Support Hotline / Phone
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.supportPhone || ''}
                  onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                  placeholder="0866 - 2527 - 110"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Portal Version String
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.portalVersion || ''}
                  onChange={(e) => setConfig({ ...config, portalVersion: e.target.value })}
                  placeholder="v1.0.0"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Visitor Counter Number
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.visitorCount || ''}
                  onChange={(e) => setConfig({ ...config, visitorCount: e.target.value })}
                  placeholder="361849"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Singular Term (e.g. Ticket / Complaint / Request)
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.ticketTermSingular || ''}
                  onChange={(e) => setConfig({ ...config, ticketTermSingular: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Plural Term (e.g. Tickets / Complaints / Issues)
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={config.ticketTermPlural || ''}
                  onChange={(e) => setConfig({ ...config, ticketTermPlural: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: 'var(--table-header-bg)', padding: '14px 24px', borderTop: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: 'var(--zoho-blue)' }}></i> White-Label Customization Mode Active
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-zoho-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-zoho-primary" onClick={handleSave} style={{ fontWeight: 700 }}>
              <i className="fa-solid fa-floppy-disk"></i> Save Enterprise Branding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
