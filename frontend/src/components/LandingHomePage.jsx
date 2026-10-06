import React, { useState, useEffect, useRef } from 'react';
import { getOrgConfig } from '../config/organizationConfig';
import SupportOneLogo from './SupportOneLogo';

// Module-level guard to prevent React StrictMode double execution per page reload
let hasIncrementedOnThisPageLoad = false;

export default function LandingHomePage({ 
  onOpenCreateModal, 
  onOpenLoginModal, 
  onOpenRegisterModal, 
  onNavigateTab,
  currentUser,
  tickets = [],
  categories = []
}) {
  const [orgConfig, setOrgConfig] = useState(getOrgConfig());
  const [activeFeatureTab, setActiveFeatureTab] = useState('whitelabel');
  const [liveVisitorCount, setLiveVisitorCount] = useState(orgConfig.visitorCount || '1');

  useEffect(() => {
    const handleConfigUpdate = () => {
      setOrgConfig(getOrgConfig());
    };
    window.addEventListener('org_config_updated', handleConfigUpdate);

    // Dynamic visitor counter increment strictly +1 per page load
    if (!hasIncrementedOnThisPageLoad) {
      hasIncrementedOnThisPageLoad = true;
      fetch('/api/visitor-count/increment', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data && data.visitor_count) {
            setLiveVisitorCount(String(data.visitor_count));
          }
        })
        .catch(() => {
          const localVal = parseInt(localStorage.getItem('tp_visitor_count') || '0', 10) + 1;
          localStorage.setItem('tp_visitor_count', String(localVal));
          setLiveVisitorCount(String(localVal));
        });
    } else {
      fetch('/api/visitor-count')
        .then(res => res.json())
        .then(data => {
          if (data && data.visitor_count) {
            setLiveVisitorCount(String(data.visitor_count));
          }
        })
        .catch(() => {});
    }

    return () => window.removeEventListener('org_config_updated', handleConfigUpdate);
  }, []);

  const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  const resolutionRate = tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 98;

  const ticketTerm = orgConfig.ticketTermSingular || 'Ticket';
  const ticketsTerm = orgConfig.ticketTermPlural || 'Tickets';
  const orgTitle = orgConfig.orgName || 'Enterprise Organization';

  return (
    <div className="landing-home-wrapper" style={{ width: '100%', color: 'var(--text-main)' }}>
      {/* ------------------------------------------------------------------------- */}
      {/* 1. DYNAMIC MULTI-ORGANIZATION HERO BANNER                                */}
      {/* ------------------------------------------------------------------------- */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(2, 101, 220, 0.1) 0%, rgba(139, 92, 246, 0.15) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '48px 40px',
        marginBottom: '28px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ maxWidth: '940px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '22px' }}>
            <div style={{
              background: 'var(--card-bg)',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'inline-flex'
            }}>
              <SupportOneLogo height={38} showTagline={true} showDivider={true} />
            </div>

            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'var(--card-bg)', 
              border: '1px solid var(--border-color)', 
              padding: '7px 16px', 
              borderRadius: '20px', 
              fontSize: '0.82rem', 
              fontWeight: 800, 
              color: 'var(--zoho-blue)'
            }}>
              <i className={orgConfig.logoIcon || 'fa-solid fa-layer-group'}></i> Multi-Organization Enterprise SaaS Helpdesk System
            </div>
          </div>

          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 900, 
            color: 'var(--text-main)', 
            lineHeight: '1.2', 
            margin: '0 0 18px 0',
            letterSpacing: '-0.5px' 
          }}>
            {orgConfig.appTitle || 'I-SupportOne Desk'} <br />
            <span style={{ color: 'var(--zoho-blue)' }}>Support & {ticketsTerm} Management Platform</span>
          </h1>

          <p style={{ 
            fontSize: '1rem', 
            color: 'var(--text-secondary)', 
            lineHeight: '1.6', 
            marginBottom: '32px',
            maxWidth: '820px' 
          }}>
            A complete, multi-tenant White-Label Helpdesk & Ticketing Software built for <strong>{orgTitle}</strong> and deployable across any organization, government directorate, or enterprise team. Manage support requests, SLA deadlines, technician routing, and executive analytics in one workspace.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
            <button 
              onClick={() => onNavigateTab && onNavigateTab('tickets')}
              className="btn btn-zoho-primary"
              style={{ padding: '14px 28px', fontSize: '0.94rem', fontWeight: 800, borderRadius: '8px', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)', border: 'none' }}
            >
              <i className="fa-solid fa-toolbox" style={{ marginRight: '8px' }}></i> Ticket Tools & Details
            </button>

            <button 
              onClick={onOpenCreateModal}
              className="btn btn-zoho-primary"
              style={{ padding: '14px 28px', fontSize: '0.94rem', fontWeight: 800, borderRadius: '8px', boxShadow: '0 4px 16px rgba(2, 101, 220, 0.35)' }}
            >
              <i className="fa-solid fa-square-plus" style={{ marginRight: '8px' }}></i> Submit {ticketTerm}
            </button>

            {!currentUser || currentUser.role === 'user' ? (
              <>
                <button 
                  onClick={onOpenLoginModal}
                  className="btn btn-zoho-secondary"
                  style={{ padding: '14px 24px', fontSize: '0.92rem', fontWeight: 700, borderRadius: '8px' }}
                >
                  <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '8px', color: 'var(--zoho-blue)' }}></i> Sign In / Portal Access
                </button>

                <button 
                  onClick={onOpenRegisterModal}
                  className="btn btn-zoho-secondary"
                  style={{ padding: '14px 22px', fontSize: '0.92rem', fontWeight: 700, borderRadius: '8px' }}
                >
                  <i className="fa-solid fa-user-plus" style={{ marginRight: '8px', color: '#8B5CF6' }}></i> Register Account
                </button>
              </>
            ) : null}

            <button 
              onClick={() => onNavigateTab && onNavigateTab('dashboard')}
              className="btn btn-zoho-secondary"
              style={{ padding: '14px 22px', fontSize: '0.92rem', fontWeight: 700, borderRadius: '8px' }}
            >
              <i className="fa-solid fa-chart-line" style={{ marginRight: '8px', color: '#10B981' }}></i> Enterprise Analytics
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. DYNAMIC LIVE PERFORMANCE METRICS                                       */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        <div style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--zoho-blue)' }}>{resolutionRate}%</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>Resolution Efficiency Rate</div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10B981' }}>24 Hours</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>Guaranteed Enterprise SLA</div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#8B5CF6' }}>{categories.length || 13} Categories</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>Department Support Wings</div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '22px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F59E0B' }}>Multi-Tenant</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>White-Label Ready Platform</div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. INTERACTIVE MULTI-ORGANIZATION FEATURE SHOWCASE TABS                  */}
      {/* ------------------------------------------------------------------------- */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-gears" style={{ color: 'var(--zoho-blue)' }}></i> Built for Any Enterprise & Client Organization
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Deploy this software for any government department, corporate company, or IT organization with full White-Label customization.
        </p>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button 
            onClick={() => setActiveFeatureTab('whitelabel')}
            className={`btn btn-sm ${activeFeatureTab === 'whitelabel' ? 'btn-zoho-primary' : 'btn-zoho-secondary'}`}
            style={{ fontSize: '0.85rem', fontWeight: 700, padding: '8px 16px' }}
          >
            <i className="fa-solid fa-[#0265DC] fa-palette"></i> White-Label & Custom Branding
          </button>

          <button 
            onClick={() => setActiveFeatureTab('sla')}
            className={`btn btn-sm ${activeFeatureTab === 'sla' ? 'btn-zoho-primary' : 'btn-zoho-secondary'}`}
            style={{ fontSize: '0.85rem', fontWeight: 700, padding: '8px 16px' }}
          >
            <i className="fa-solid fa-clock"></i> 24-Hour SLA Automation
          </button>

          <button 
            onClick={() => setActiveFeatureTab('merging')}
            className={`btn btn-sm ${activeFeatureTab === 'merging' ? 'btn-zoho-primary' : 'btn-zoho-secondary'}`}
            style={{ fontSize: '0.85rem', fontWeight: 700, padding: '8px 16px' }}
          >
            <i className="fa-solid fa-code-merge"></i> Smart {ticketTerm} Merging
          </button>

          <button 
            onClick={() => setActiveFeatureTab('analytics')}
            className={`btn btn-sm ${activeFeatureTab === 'analytics' ? 'btn-zoho-primary' : 'btn-zoho-secondary'}`}
            style={{ fontSize: '0.85rem', fontWeight: 700, padding: '8px 16px' }}
          >
            <i className="fa-solid fa-chart-pie"></i> Executive Analytics & CSV Export
          </button>
        </div>

        {/* Tab Content Box */}
        <div style={{ 
          background: 'var(--card-bg)', 
          padding: '28px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)' 
        }}>
          {activeFeatureTab === 'whitelabel' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--zoho-blue)', marginBottom: '8px' }}>
                  <i className="fa-solid fa-palette"></i> Full White-Label & Multi-Org Customization
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  Easily adapt logo, organization name, primary colors, header titles, support email, phone numbers, and custom terminology (Ticket / Complaint / Work Order / Case) for any client organization.
                </p>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                <strong>⚡ White-Label Capabilities:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '18px', lineHeight: '1.6' }}>
                  <li>Custom Logo, Title & Header Color scheme</li>
                  <li>Custom Organization Contact & Email settings</li>
                  <li>Dynamic Terminology (Ticket vs Complaint vs Case)</li>
                </ul>
              </div>
            </div>
          )}

          {activeFeatureTab === 'sla' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#D97706', marginBottom: '8px' }}>
                  <i className="fa-solid fa-clock"></i> 24-Hour SLA Target & Automated Escalations
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  Every registered request carries an automated 24-hour resolution deadline timer with real-time visual SLA warning flags (🚨 / ⚠️) and officer escalation pathways.
                </p>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                <strong>⚡ Key Benefits:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '18px', lineHeight: '1.6' }}>
                  <li>Automated 24-hour resolution deadline tracking</li>
                  <li>Visual SLA warning flags and row highlights</li>
                  <li>Category-wise specialist technician auto-routing</li>
                </ul>
              </div>
            </div>
          )}

          {activeFeatureTab === 'merging' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8B5CF6', marginBottom: '8px' }}>
                  <i className="fa-solid fa-code-merge"></i> Smart {ticketTerm} Merging & Audit History
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  Consolidate duplicate user requests into a primary master ticket while preserving complete conversation history, file attachments, and Merged Tags (#...).
                </p>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                <strong>⚡ Key Benefits:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '18px', lineHeight: '1.6' }}>
                  <li>Eliminates duplicate request clutter</li>
                  <li>Preserves complete audit history under Merged Tag</li>
                  <li>Master ticket auto-redirection on click</li>
                </ul>
              </div>
            </div>
          )}

          {activeFeatureTab === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981', marginBottom: '8px' }}>
                  <i className="fa-solid fa-chart-column"></i> Executive Analytics & CSV Export
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  Monitor technician performance, category workload breakdown, SLA compliance percentages, and export full reports to Excel/CSV with one click.
                </p>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                <strong>⚡ Key Benefits:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '18px', lineHeight: '1.6' }}>
                  <li>Interactive category workload charts</li>
                  <li>SLA calculation tools & audit timeline</li>
                  <li>One-click CSV data exports</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------------- */}
      {/* 4. CORE SYSTEM PILLARS GRID                                              */}
      {/* ------------------------------------------------------------------------- */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-layer-group" style={{ color: 'var(--zoho-blue)' }}></i> Enterprise Platform Features
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#DBEAFE', color: '#0265DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '12px' }}>
              <i className="fa-solid fa-palette"></i>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>White-Label Customization</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Custom logo, title, brand colors, contact emails, and terminology settings for any organization or client.
            </p>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '12px' }}>
              <i className="fa-solid fa-code-merge"></i>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Smart {ticketTerm} Merging</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Consolidate duplicate tickets into a primary master ticket while keeping full history, file attachments, and Merged Tags (#...).
            </p>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#F3E8FF', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '12px' }}>
              <i className="fa-solid fa-user-gear"></i>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Specialist Technician Routing</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Route tickets automatically or manually to category-recommended technical specialists and support agents.
            </p>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '12px' }}>
              <i className="fa-solid fa-paperclip"></i>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>25MB Multi-Format Attachments</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Attach CAD drawings (.dwg), PDF approval documents, images, ZIP files, and notes up to 25 MB with individual file removal.
            </p>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '12px' }}>
              <i className="fa-solid fa-flag"></i>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Aligned SLA Flag Indicators</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Straight vertical column alignment for FontAwesome SLA flag icons (`fa-solid fa-flag`) across all table rows for instant visual status.
            </p>
          </div>

          <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#E0E7FF', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '12px' }}>
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>Role-Based Security</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
              Strict permission controls for Users, Technicians, Universal Operators, and Admins to ensure security and data integrity.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------------- */}
      {/* 5. 3-STEP UNIVERSAL WORKFLOW                                             */}
      {/* ------------------------------------------------------------------------- */}
      <section style={{ 
        background: 'var(--card-bg)', 
        padding: '26px 30px', 
        borderRadius: '8px', 
        border: '1px solid var(--border-color)',
        marginBottom: '32px' 
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-list-ol" style={{ color: 'var(--zoho-blue)' }}></i> How It Works — 3 Steps to Resolution
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--zoho-blue)', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>1</div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>Submit & Classify</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Select category, describe the inquiry, and attach supporting files (up to 25MB).
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ background: '#8B5CF6', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>2</div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>Automate & Monitor SLA</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Track 24-hour resolution timers live with SLA warning flags and assigned technical specialist updates.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{ background: '#10B981', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>3</div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>Specialist Resolution & Closure</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Deliver speedy answers, close tickets, and analyze performance with executive charts and CSV exports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------------- */}
      {/* 6. DYNAMIC MULTI-COLUMN GOVERNMENT & ENTERPRISE FOOTER                    */}
      {/* ------------------------------------------------------------------------- */}
      <footer style={{ 
        background: 'linear-gradient(180deg, var(--card-bg) 0%, rgba(226, 232, 240, 0.4) 100%)', 
        padding: '32px 36px 24px 36px', 
        borderRadius: '12px', 
        border: '1px solid var(--border-color)',
        marginTop: '20px',
        position: 'relative'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Column 1: Get in touch */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 12px 0' }}>
              <span style={{ color: '#0265DC', fontWeight: 900 }}>G</span>et in touch
            </h4>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
              <i className="fa-solid fa-location-dot" style={{ color: 'var(--zoho-blue)', marginRight: '6px' }}></i> Office address
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
              {orgConfig.officeAddress || 'Directorate of Town and Country Planning, Atal Nagar, Raipur (C.G.)'}
            </p>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-envelope" style={{ color: 'var(--zoho-blue)' }}></i>
              <a href={`mailto:${orgConfig.supportEmail || 'cgtownplan@gmail.com'}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}>
                {orgConfig.supportEmail || 'cgtownplan@gmail.com'}
              </a>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-phone" style={{ color: 'var(--zoho-blue)' }}></i>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                {orgConfig.supportPhone || '0866 - 2527 - 110'}
              </span>
            </div>
          </div>

          {/* Column 2: Portal map */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 12px 0' }}>
              Portal map
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><a href="#home" onClick={(e) => { e.preventDefault(); onNavigateTab && onNavigateTab('home'); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Home</a></li>
              <li><a href="#about" onClick={(e) => { e.preventDefault(); alert(`${orgTitle} Helpdesk Portal`); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>About us</a></li>
              <li><a href="#dashboard" onClick={(e) => { e.preventDefault(); onNavigateTab && onNavigateTab('dashboard'); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</a></li>
              <li><a href="#download" onClick={(e) => { e.preventDefault(); alert('Help manuals & forms available in downloads section.'); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Download</a></li>
            </ul>
          </div>

          {/* Column 3: Government portals */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 12px 0' }}>
              Government portals
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><a href="#dtcp" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>DTCP Portal</a></li>
              <li><a href="#bpams" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>BPAMS System</a></li>
              <li><a href="#autodcr" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>AutoDCR Scrutiny</a></li>
              <li><a href="#state" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>State Portal</a></li>
            </ul>
          </div>

          {/* Column 4: Support */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 12px 0' }}>
              Support
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><a href="#manuals" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Help manuals</a></li>
              <li><a href="#faq" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>FAQ</a></li>
              <li><a href="#tickets" onClick={(e) => { e.preventDefault(); onNavigateTab && onNavigateTab('tickets'); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Helpdesk</a></li>
              <li><a href="#contact" onClick={(e) => e.preventDefault()} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact us</a></li>
            </ul>
          </div>

          {/* Column 5: Emblem Logo, Visitor Counter & Version Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {/* Government Emblem Icon */}
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              background: '#FFFFFF', 
              border: '2px solid #10B981', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '10px'
            }}>
              <i className="fa-solid fa-building-columns" style={{ fontSize: '1.6rem', color: '#10B981' }}></i>
            </div>

            {/* Digital Visitor Counter Box */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginBottom: '4px' }}>
                {String(liveVisitorCount || '1').padStart(6, '0').split('').map((digit, idx) => (
                  <span key={idx} style={{ 
                    background: 'var(--card-bg)', 
                    border: '1px solid var(--border-color)', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.82rem', 
                    fontWeight: 900,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    fontFamily: 'monospace'
                  }}>
                    {digit}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Visitors count</span>
            </div>

            {/* Social Icons */}
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              <i className="fa-brands fa-facebook" style={{ cursor: 'pointer' }}></i>
              <i className="fa-brands fa-twitter" style={{ cursor: 'pointer' }}></i>
              <i className="fa-brands fa-instagram" style={{ cursor: 'pointer' }}></i>
              <i className="fa-solid fa-globe" style={{ cursor: 'pointer' }}></i>
            </div>

            {/* Version Gradient Pill */}
            <div style={{ 
              background: 'linear-gradient(135deg, #F43F5E 0%, #3B82F6 100%)', 
              color: '#FFFFFF', 
              padding: '8px 16px', 
              borderRadius: '10px', 
              fontSize: '0.78rem', 
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
              textAlign: 'center',
              letterSpacing: '0.5px'
            }}>
              <div>Version:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900 }}>{orgConfig.portalVersion || 'v1.0.0'}</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
