import React from 'react';

export default function StatusTabs({ 
  activeStatus, 
  setActiveStatus, 
  tickets, 
  searchQuery, 
  setSearchQuery 
}) {
  const getCount = (statusName) => {
    if (statusName === 'all') return tickets.length;
    if (statusName === 'action_needed') {
      const now = new Date();
      return tickets.filter(item => {
        if (item.status === 'Closed' || !item.due_at) return false;
        const diffHours = (new Date(item.due_at) - now) / (1000 * 60 * 60);
        return diffHours <= 4;
      }).length;
    }
    return tickets.filter(item => item.status === statusName).length;
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      flexWrap: 'wrap', 
      gap: '12px', 
      marginBottom: '16px', 
      background: 'var(--card-bg)', 
      padding: '12px 16px', 
      borderRadius: 'var(--radius-md)', 
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-xs)'
    }}>
      {/* STATUS PILLS WRAPPER */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveStatus('all')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            border: activeStatus === 'all' ? '1px solid var(--zoho-blue)' : '1px solid var(--border-color)',
            background: activeStatus === 'all' ? 'var(--zoho-blue)' : 'var(--bg-body)',
            color: activeStatus === 'all' ? '#FFFFFF' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          All Tickets <span style={{ background: activeStatus === 'all' ? 'rgba(255,255,255,0.3)' : 'var(--border-color)', color: activeStatus === 'all' ? '#FFFFFF' : 'var(--text-secondary)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>{getCount('all')}</span>
        </button>

        <button 
          onClick={() => setActiveStatus('action_needed')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            border: activeStatus === 'action_needed' ? '1px solid #F59E0B' : '1px solid var(--border-color)',
            background: activeStatus === 'action_needed' ? '#FEF3C7' : 'var(--bg-body)',
            color: activeStatus === 'action_needed' ? '#D97706' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          ⚡ Action Needed <span style={{ background: '#F59E0B', color: '#FFFFFF', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>{getCount('action_needed')}</span>
        </button>

        <button 
          onClick={() => setActiveStatus('New')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            border: activeStatus === 'New' ? '1px solid var(--zoho-blue)' : '1px solid var(--border-color)',
            background: activeStatus === 'New' ? 'var(--zoho-blue)' : 'var(--bg-body)',
            color: activeStatus === 'New' ? '#FFFFFF' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          Open / New <span style={{ background: activeStatus === 'New' ? 'rgba(255,255,255,0.3)' : 'var(--border-color)', color: activeStatus === 'New' ? '#FFFFFF' : 'var(--text-secondary)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>{getCount('New')}</span>
        </button>

        <button 
          onClick={() => setActiveStatus('In Progress')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            border: activeStatus === 'In Progress' ? '1px solid var(--zoho-blue)' : '1px solid var(--border-color)',
            background: activeStatus === 'In Progress' ? 'var(--zoho-blue)' : 'var(--bg-body)',
            color: activeStatus === 'In Progress' ? '#FFFFFF' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          In Progress <span style={{ background: activeStatus === 'In Progress' ? 'rgba(255,255,255,0.3)' : 'var(--border-color)', color: activeStatus === 'In Progress' ? '#FFFFFF' : 'var(--text-secondary)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>{getCount('In Progress')}</span>
        </button>

        <button 
          onClick={() => setActiveStatus('Resolved')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            border: activeStatus === 'Resolved' ? '1px solid var(--zoho-blue)' : '1px solid var(--border-color)',
            background: activeStatus === 'Resolved' ? 'var(--zoho-blue)' : 'var(--bg-body)',
            color: activeStatus === 'Resolved' ? '#FFFFFF' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          Resolved <span style={{ background: activeStatus === 'Resolved' ? 'rgba(255,255,255,0.3)' : 'var(--border-color)', color: activeStatus === 'Resolved' ? '#FFFFFF' : 'var(--text-secondary)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>{getCount('Resolved')}</span>
        </button>

        <button 
          onClick={() => setActiveStatus('Closed')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            border: activeStatus === 'Closed' ? '1px solid var(--zoho-blue)' : '1px solid var(--border-color)',
            background: activeStatus === 'Closed' ? 'var(--zoho-blue)' : 'var(--bg-body)',
            color: activeStatus === 'Closed' ? '#FFFFFF' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          Closed <span style={{ background: activeStatus === 'Closed' ? 'rgba(255,255,255,0.3)' : 'var(--border-color)', color: activeStatus === 'Closed' ? '#FFFFFF' : 'var(--text-secondary)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>{getCount('Closed')}</span>
        </button>

        <button 
          onClick={() => setActiveStatus('Reopened')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            border: activeStatus === 'Reopened' ? '1px solid #E11D48' : '1px solid var(--border-color)',
            background: activeStatus === 'Reopened' ? '#E11D48' : 'var(--bg-body)',
            color: activeStatus === 'Reopened' ? '#FFFFFF' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          🔄 Reopened <span style={{ background: activeStatus === 'Reopened' ? 'rgba(255,255,255,0.3)' : 'var(--border-color)', color: activeStatus === 'Reopened' ? '#FFFFFF' : 'var(--text-secondary)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>{getCount('Reopened')}</span>
        </button>
      </div>

      {/* SEARCH BAR & SEARCH BUTTON (NEATLY WRAPS TO LINE 2 IF SPACE IS TIGHT) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
        <div style={{ position: 'relative', width: '250px', display: 'flex', alignItems: 'center' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}></i>
          <input 
            type="text" 
            placeholder="Search ticket ID, subject..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%',
              paddingLeft: '30px', 
              paddingRight: searchQuery ? '26px' : '10px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--input-text)',
              fontSize: '0.8rem'
            }}
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: '8px', background: 'transparent', border: 'none', 
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Clear Search"
            >
              &times;
            </button>
          )}
        </div>
        
        <button 
          type="button" 
          className="btn btn-zoho-primary"
          style={{ 
            height: '34px', 
            padding: '0 14px', 
            fontSize: '0.8rem', 
            whiteSpace: 'nowrap', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '5px', 
            fontWeight: 700,
            borderRadius: 'var(--radius-sm)' 
          }}
        >
          <i className="fa-solid fa-magnifying-glass"></i> Search
        </button>
      </div>
    </div>
  );
}
