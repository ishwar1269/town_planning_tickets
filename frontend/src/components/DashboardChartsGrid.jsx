import React, { useState, useEffect, useMemo } from 'react';

export default function DashboardChartsGrid({ tickets = [], categories = [], onSelectTicket }) {
  const [showCharts, setShowCharts] = useState(true);
  const [priorityScope, setPriorityScope] = useState('all'); // 'all' | 'open'
  const [drilldownModal, setDrilldownModal] = useState(null); // { title, tickets: [] }

  // ---------------------------------------------------------------------------
  // 1. PRIORITY BREAKDOWN COMPUTATION
  // ---------------------------------------------------------------------------
  const priorityTickets = useMemo(() => {
    if (priorityScope === 'open') {
      return tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved');
    }
    return tickets;
  }, [tickets, priorityScope]);

  const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  priorityTickets.forEach(t => {
    const p = t.priority || 'Medium';
    if (priorityCounts[p] !== undefined) {
      priorityCounts[p]++;
    } else {
      priorityCounts.Medium++;
    }
  });

  const pTotal = priorityTickets.length;
  const pCriticalPct = pTotal > 0 ? (priorityCounts.Critical / pTotal) * 100 : 0;
  const pHighPct = pTotal > 0 ? (priorityCounts.High / pTotal) * 100 : 0;
  const pMedPct = pTotal > 0 ? (priorityCounts.Medium / pTotal) * 100 : 0;
  const pLowPct = pTotal > 0 ? (priorityCounts.Low / pTotal) * 100 : 0;

  // ---------------------------------------------------------------------------
  // 2. ACCURATE SLA COMPLIANCE COMPUTATION (HEALTHY VS BREACHED)
  // ---------------------------------------------------------------------------
  const { healthyTickets, breachedTickets, slaCompliancePct, needleAngle } = useMemo(() => {
    const healthy = [];
    const breached = [];
    const now = new Date();

    tickets.forEach(t => {
      const isResolvedOrClosed = t.status === 'Resolved' || t.status === 'Closed';
      const finishTimeStr = isResolvedOrClosed ? (t.resolved_at || t.closed_at) : null;
      const finishTime = finishTimeStr ? new Date(finishTimeStr) : now;
      const created = t.created_at ? new Date(t.created_at) : null;
      const due = t.due_at ? new Date(t.due_at) : (created ? new Date(created.getTime() + 24 * 60 * 60 * 1000) : null);

      if (due) {
        if (isResolvedOrClosed) {
          if (finishTimeStr && finishTime <= due) {
            healthy.push(t);
          } else {
            breached.push(t);
          }
        } else {
          if (now <= due) {
            healthy.push(t);
          } else {
            breached.push(t);
          }
        }
      } else {
        healthy.push(t);
      }
    });

    const total = healthy.length + breached.length;
    const rate = total > 0 ? Math.round((healthy.length / total) * 100) : 100;
    const angle = -90 + (Math.min(100, Math.max(0, rate)) / 100) * 180;

    return {
      healthyTickets: healthy,
      breachedTickets: breached,
      slaCompliancePct: rate,
      needleAngle: angle
    };
  }, [tickets]);

  // ---------------------------------------------------------------------------
  // 3. WEEKLY TREND LINE CHART COMPUTATION
  // ---------------------------------------------------------------------------
  const { weekDays, trendData, points, pathD, chartWidth, chartHeight } = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Determine base date: use latest ticket creation date or today
    let anchorDate = new Date();
    if (tickets.length > 0) {
      const sorted = [...tickets].filter(t => t.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (sorted.length > 0) {
        anchorDate = new Date(sorted[0].created_at);
      }
    }

    const start = new Date(anchorDate);
    start.setDate(anchorDate.getDate() - 6); // 7-day trailing window

    const days = [];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const ticketBuckets = [[], [], [], [], [], [], []];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        dayName: dayNames[d.getDay()],
        dateStr: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        dateObj: d
      });
    }

    tickets.forEach(t => {
      if (t.created_at) {
        const td = new Date(t.created_at);
        days.forEach((wd, idx) => {
          if (
            td.getFullYear() === wd.dateObj.getFullYear() &&
            td.getMonth() === wd.dateObj.getMonth() &&
            td.getDate() === wd.dateObj.getDate()
          ) {
            counts[idx]++;
            ticketBuckets[idx].push(t);
          }
        });
      }
    });

    // Fallback if all 0, count by day of week
    if (counts.every(c => c === 0) && tickets.length > 0) {
      tickets.forEach(t => {
        if (t.created_at) {
          const dIdx = new Date(t.created_at).getDay();
          const targetIdx = dIdx % 7;
          counts[targetIdx]++;
          ticketBuckets[targetIdx].push(t);
        }
      });
    }

    const maxVal = Math.max(...counts, 4);
    const width = 320;
    const height = 90;

    const pts = counts.map((val, idx) => {
      const x = (idx / 6) * (width - 40) + 20;
      const y = height - (val / maxVal) * (height - 35) - 15;
      return { x, y, val, tickets: ticketBuckets[idx], label: days[idx]?.dateStr || '' };
    });

    const dPath = pts.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = pts[i - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');

    return {
      weekDays: days,
      trendData: counts,
      points: pts,
      pathD: dPath,
      chartWidth: width,
      chartHeight: height
    };
  }, [tickets]);

  // ---------------------------------------------------------------------------
  // 4. CATEGORY DISTRIBUTION BAR CHART DATA
  // ---------------------------------------------------------------------------
  const { barData, maxBar } = useMemo(() => {
    const catMap = {};
    
    // Pre-populate with known category names
    categories.forEach(c => {
      if (c && c.name) catMap[c.name] = { count: 0, tickets: [] };
    });

    tickets.forEach(t => {
      let name = t.category_name;
      if (!name && t.category_id) {
        const found = categories.find(c => Number(c.id) === Number(t.category_id));
        if (found) name = found.name;
      }
      if (!name) name = 'General Support';

      if (!catMap[name]) {
        catMap[name] = { count: 0, tickets: [] };
      }
      catMap[name].count++;
      catMap[name].tickets.push(t);
    });

    const list = Object.keys(catMap).map(catName => ({
      name: catName,
      count: catMap[catName].count,
      tickets: catMap[catName].tickets
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    const max = Math.max(...list.map(b => b.count), 4);
    return { barData: list, maxBar: max };
  }, [tickets, categories]);

  // ---------------------------------------------------------------------------
  // 5. MONTHLY & YEARLY DATE-WISE ANALYTICS COMPUTATION
  // ---------------------------------------------------------------------------
  const monthNamesList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const availableYears = [2026, 2025, 2024];

  // Auto-detect best default Year and Month with data
  const defaultYearMonth = useMemo(() => {
    if (tickets && tickets.length > 0) {
      const sorted = [...tickets].filter(t => t.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (sorted.length > 0) {
        const d = new Date(sorted[0].created_at);
        return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() };
      }
    }
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth(), date: n.getDate() };
  }, [tickets]);

  const [mSelectedYear, setMSelectedYear] = useState(defaultYearMonth.year);
  const [mSelectedMonth, setMSelectedMonth] = useState(defaultYearMonth.month);
  const [mSelectedDateNum, setMSelectedDateNum] = useState(defaultYearMonth.date);

  const [ySelectedYear, setYSelectedYear] = useState(defaultYearMonth.year);
  const [ySelectedMonthIdx, setYSelectedMonthIdx] = useState(defaultYearMonth.month);

  // Sync state when defaultYearMonth resolves
  useEffect(() => {
    setMSelectedYear(defaultYearMonth.year);
    setMSelectedMonth(defaultYearMonth.month);
    setMSelectedDateNum(defaultYearMonth.date);
    setYSelectedYear(defaultYearMonth.year);
    setYSelectedMonthIdx(defaultYearMonth.month);
  }, [defaultYearMonth]);

  // Monthly Date-Wise computation
  const daysInMMonth = new Date(Number(mSelectedYear), Number(mSelectedMonth) + 1, 0).getDate();
  const mDateData = useMemo(() => {
    const list = Array.from({ length: daysInMMonth }, (_, i) => ({
      dateNum: i + 1,
      dateStr: `${i + 1} ${monthNamesList[mSelectedMonth].slice(0, 3)}`,
      count: 0,
      resolved: 0,
      open: 0,
      ticketList: []
    }));

    tickets.forEach(t => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        if (d.getFullYear() === Number(mSelectedYear) && d.getMonth() === Number(mSelectedMonth)) {
          const dateIdx = d.getDate() - 1;
          if (list[dateIdx]) {
            list[dateIdx].count++;
            list[dateIdx].ticketList.push(t);
            if (t.status === 'Closed' || t.status === 'Resolved') {
              list[dateIdx].resolved++;
            } else {
              list[dateIdx].open++;
            }
          }
        }
      }
    });

    return list;
  }, [tickets, mSelectedYear, mSelectedMonth, daysInMMonth]);

  const mTotalTickets = mDateData.reduce((sum, d) => sum + d.count, 0);
  const mTotalResolved = mDateData.reduce((sum, d) => sum + d.resolved, 0);
  const mMaxDailyCount = Math.max(...mDateData.map(d => d.count), 1);
  const mPeakDateObj = mDateData.reduce((max, d) => d.count > max.count ? d : max, { dateNum: '-', count: 0, dateStr: '-' });
  const selectedDateObj = mDateData.find(d => d.dateNum === Number(mSelectedDateNum)) || { ticketList: [], dateStr: `${mSelectedDateNum} ${monthNamesList[mSelectedMonth].slice(0, 3)}` };

  // Yearly Month-Wise computation
  const yMonthData = useMemo(() => {
    const list = monthNamesList.map((mName, idx) => ({
      monthIdx: idx,
      monthName: mName,
      monthShort: mName.slice(0, 3),
      count: 0,
      resolved: 0,
      open: 0,
      ticketList: []
    }));

    tickets.forEach(t => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        if (d.getFullYear() === Number(ySelectedYear)) {
          const mIdx = d.getMonth();
          if (list[mIdx]) {
            list[mIdx].count++;
            list[mIdx].ticketList.push(t);
            if (t.status === 'Closed' || t.status === 'Resolved') {
              list[mIdx].resolved++;
            } else {
              list[mIdx].open++;
            }
          }
        }
      }
    });

    return list;
  }, [tickets, ySelectedYear]);

  const yTotalTickets = yMonthData.reduce((sum, m) => sum + m.count, 0);
  const yTotalResolved = yMonthData.reduce((sum, m) => sum + m.resolved, 0);
  const yMaxMonthlyCount = Math.max(...yMonthData.map(m => m.count), 1);
  const yPeakMonthObj = yMonthData.reduce((max, m) => m.count > max.count ? m : max, { monthName: '-', count: 0 });
  const selectedMonthObj = yMonthData.find(m => m.monthIdx === Number(ySelectedMonthIdx)) || { ticketList: [], monthName: monthNamesList[ySelectedMonthIdx] };

  // Badge Styles Helper
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Critical': return { bg: '#FEF2F2', color: '#EF4444', border: '#FCA5A5' };
      case 'High': return { bg: '#FFEDD5', color: '#F97316', border: '#FDBA74' };
      case 'Medium': return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Low': return { bg: '#D1FAE5', color: '#059669', border: '#6EE7B7' };
      default: return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'New': return { bg: '#EFF6FF', color: '#0265DC', border: '#93C5FD' };
      case 'In Progress': return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Assigned': return { bg: '#F3E8FF', color: '#7C3AED', border: '#DDD6FE' };
      case 'Reopened': return { bg: '#FFF7ED', color: '#EA580C', border: '#FFEDD5' };
      case 'Resolved': return { bg: '#D1FAE5', color: '#059669', border: '#6EE7B7' };
      case 'Closed': return { bg: '#F3F4F6', color: '#4B5563', border: '#D1D5DB' };
      default: return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
    }
  };

  const handleOpenPriorityDrilldown = (prio) => {
    const list = priorityTickets.filter(t => (t.priority || 'Medium') === prio);
    setDrilldownModal({
      title: `${prio} Priority Tickets (${priorityScope === 'open' ? 'Open Only' : 'All'})`,
      tickets: list
    });
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Master Charts Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-chart-pie" style={{ color: 'var(--zoho-blue)', fontSize: '1.1rem' }}></i>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Dashboard Performance Metrics</h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '1px 0 0 0' }}>
              Real-time analytics, SLA gauge compliance, trends, and category distribution.
            </p>
          </div>
        </div>
        <button 
          type="button"
          className="btn btn-zoho-secondary btn-sm"
          onClick={() => setShowCharts(!showCharts)}
          style={{ fontSize: '0.78rem', fontWeight: 700 }}
        >
          <i className={`fa-solid ${showCharts ? 'fa-eye-slash' : 'fa-chart-line'}`}></i>
          {' '}{showCharts ? 'Hide Visual Charts' : 'Show Visual Charts'}
        </button>
      </div>

      {showCharts && (
        <>
          {/* 4 Stat Cards Row */}
          <div className="zoho-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* CHART CARD 1: Priority Breakdown Donut */}
            <div className="zoho-stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>Priority Breakdown</strong>
                <div style={{ display: 'inline-flex', background: 'var(--border-subtle)', borderRadius: '12px', padding: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setPriorityScope('all')}
                    style={{
                      border: 'none',
                      background: priorityScope === 'all' ? 'var(--zoho-blue)' : 'transparent',
                      color: priorityScope === 'all' ? '#FFFFFF' : 'var(--text-muted)',
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      borderRadius: '10px',
                      padding: '2px 7px',
                      cursor: 'pointer'
                    }}
                  >
                    All ({tickets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityScope('open')}
                    style={{
                      border: 'none',
                      background: priorityScope === 'open' ? 'var(--zoho-blue)' : 'transparent',
                      color: priorityScope === 'open' ? '#FFFFFF' : 'var(--text-muted)',
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      borderRadius: '10px',
                      padding: '2px 7px',
                      cursor: 'pointer'
                    }}
                  >
                    Open Only
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '130px', position: 'relative' }}>
                <svg width="120" height="120" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#E2E8F0" strokeWidth="6" />
                  {pLowPct > 0 && (
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#10B981" strokeWidth="6" strokeDasharray={`${pLowPct} ${100 - pLowPct}`} strokeDashoffset="25" />
                  )}
                  {pMedPct > 0 && (
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#F59E0B" strokeWidth="6" strokeDasharray={`${pMedPct} ${100 - pMedPct}`} strokeDashoffset={`${25 - pLowPct}`} />
                  )}
                  {pHighPct > 0 && (
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#F97316" strokeWidth="6" strokeDasharray={`${pHighPct} ${100 - pHighPct}`} strokeDashoffset={`${25 - pLowPct - pMedPct}`} />
                  )}
                  {pCriticalPct > 0 && (
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#EF4444" strokeWidth="6" strokeDasharray={`${pCriticalPct} ${100 - pCriticalPct}`} strokeDashoffset={`${25 - pLowPct - pMedPct - pHighPct}`} />
                  )}
                </svg>

                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{pTotal}</div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{priorityScope}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', marginTop: '6px' }}>
                <div 
                  onClick={() => handleOpenPriorityDrilldown('Critical')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '2px', borderRadius: '4px' }}
                  title="Click to view Critical tickets"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></span>
                  <span style={{ fontWeight: 600 }}>Critical ({priorityCounts.Critical})</span>
                </div>
                <div 
                  onClick={() => handleOpenPriorityDrilldown('High')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '2px', borderRadius: '4px' }}
                  title="Click to view High tickets"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F97316' }}></span>
                  <span style={{ fontWeight: 600 }}>High ({priorityCounts.High})</span>
                </div>
                <div 
                  onClick={() => handleOpenPriorityDrilldown('Medium')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '2px', borderRadius: '4px' }}
                  title="Click to view Medium tickets"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></span>
                  <span style={{ fontWeight: 600 }}>Medium ({priorityCounts.Medium})</span>
                </div>
                <div 
                  onClick={() => handleOpenPriorityDrilldown('Low')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '2px', borderRadius: '4px' }}
                  title="Click to view Low tickets"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                  <span style={{ fontWeight: 600 }}>Low ({priorityCounts.Low})</span>
                </div>
              </div>
            </div>

            {/* CHART CARD 2: SLA Gauge Meter Chart */}
            <div className="zoho-stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>SLA Compliance Gauge</strong>
                <i className="fa-solid fa-gauge" style={{ color: slaCompliancePct >= 80 ? '#10B981' : '#EF4444', fontSize: '0.85rem' }}></i>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '130px' }}>
                <svg width="150" height="85" viewBox="0 0 160 90">
                  <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#E2E8F0" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 20 80 A 60 60 0 0 1 45 35" fill="none" stroke="#EF4444" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 45 35 A 60 60 0 0 1 115 35" fill="none" stroke="#F59E0B" strokeWidth="12" />
                  <path d="M 115 35 A 60 60 0 0 1 140 80" fill="none" stroke="#10B981" strokeWidth="12" strokeLinecap="round" />

                  <g transform={`rotate(${needleAngle}, 80, 80)`}>
                    <line x1="80" y1="80" x2="80" y2="30" stroke="#1F2937" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="80" cy="80" r="6" fill="#1F2937" />
                  </g>
                </svg>

                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: slaCompliancePct >= 80 ? '#10B981' : (slaCompliancePct >= 50 ? '#F59E0B' : '#EF4444'), lineHeight: 1 }}>
                    {slaCompliancePct}%
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span 
                      onClick={() => setDrilldownModal({ title: 'SLA Breached Tickets', tickets: breachedTickets })}
                      style={{ cursor: 'pointer', color: '#EF4444', fontWeight: 700 }}
                      title="Click to inspect breached tickets"
                    >
                      {breachedTickets.length} Breached
                    </span>
                    {' • '}
                    <span 
                      onClick={() => setDrilldownModal({ title: 'SLA Compliant / Healthy Tickets', tickets: healthyTickets })}
                      style={{ cursor: 'pointer', color: '#10B981', fontWeight: 700 }}
                      title="Click to inspect healthy tickets"
                    >
                      {healthyTickets.length} Healthy
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#10B981' }}></i> Target SLA Rate: 85%+
              </div>
            </div>

            {/* CHART CARD 3: Weekly Requests Trend Line Chart */}
            <div className="zoho-stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>Weekly Ticket Trend</strong>
                <i className="fa-solid fa-chart-line" style={{ color: 'var(--zoho-blue)', fontSize: '0.85rem' }}></i>
              </div>

              <div style={{ height: '90px', width: '100%', marginTop: '4px' }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0265DC" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0265DC" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="22" x2={chartWidth} y2="22" stroke="rgba(241,245,249,0.12)" strokeWidth="1" />
                  <line x1="0" y1="45" x2={chartWidth} y2="45" stroke="rgba(241,245,249,0.12)" strokeWidth="1" />
                  <line x1="0" y1="68" x2={chartWidth} y2="68" stroke="rgba(241,245,249,0.12)" strokeWidth="1" />

                  <path d={`${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`} fill="url(#lineGrad)" />
                  <path d={pathD} fill="none" stroke="#0265DC" strokeWidth="3" />

                  {points.map((pt, idx) => (
                    <g key={idx} style={{ cursor: pt.val > 0 ? 'pointer' : 'default' }} onClick={() => {
                      if (pt.tickets && pt.tickets.length > 0) {
                        setDrilldownModal({ title: `Tickets on ${pt.label}`, tickets: pt.tickets });
                      }
                    }}>
                      <circle cx={pt.x} cy={pt.y} r="4.5" fill="#0265DC" stroke="#FFFFFF" strokeWidth="2" />
                      {pt.val > 0 && (
                        <text x={pt.x} y={pt.y - 7} fontSize="8.5" fill="var(--text-main)" textAnchor="middle" fontWeight="bold">
                          {pt.val}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px 4px 4px', borderTop: '1px solid var(--border-subtle)', marginTop: '4px' }}>
                {weekDays.map((wd, idx) => (
                  <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.1 }}>
                      {wd.dayName}
                    </div>
                    <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1 }}>
                      {wd.dateStr}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-muted)', marginTop: '4px' }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--zoho-blue)' }}></i> 7-Day Activity Volume
              </div>
            </div>

            {/* CHART CARD 4: Category Distribution Bar Chart */}
            <div className="zoho-stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>Requests by Category</strong>
                <i className="fa-solid fa-chart-bar" style={{ color: '#8B5CF6', fontSize: '0.85rem' }}></i>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', height: '130px' }}>
                {barData.map((item, idx) => {
                  const pct = Math.max(8, Math.round((item.count / maxBar) * 100));
                  const colors = ['#0265DC', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div 
                      key={item.name} 
                      onClick={() => setDrilldownModal({ title: `Category: ${item.name}`, tickets: item.tickets })}
                      style={{ cursor: 'pointer' }}
                      title={`Click to view ${item.count} ticket(s) in ${item.name}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px', fontWeight: 600 }}>{item.name}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div style={{ width: '100%', background: 'var(--border-subtle)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, background: barColor, height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <i className="fa-solid fa-layer-group" style={{ color: '#8B5CF6' }}></i> Top Service Categories
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SEPARATE CARD A: MONTHLY DATE-WISE TICKET ANALYTICS DASHBOARD CARD        */}
          {/* ========================================================================= */}
          <div className="zoho-stat-card" style={{ flexDirection: 'column', padding: '20px', marginTop: '20px', alignItems: 'stretch' }}>
            {/* Header & Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-calendar-day" style={{ color: 'var(--zoho-blue)' }}></i> Monthly Date-Wise Ticket Dashboard
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Daily ticket distribution for {monthNamesList[mSelectedMonth]} {mSelectedYear}. Click on any date bar to view ticket details below.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={mSelectedMonth}
                  onChange={(e) => {
                    const newM = Number(e.target.value);
                    setMSelectedMonth(newM);
                    setMSelectedDateNum(1);
                  }}
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  {monthNamesList.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={mSelectedYear}
                  onChange={(e) => {
                    const newY = Number(e.target.value);
                    setMSelectedYear(newY);
                    setMSelectedDateNum(1);
                  }}
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Metric Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>MONTHLY TICKETS</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--zoho-blue)' }}>{mTotalTickets}</div>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLVED / CLOSED</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>{mTotalResolved}</div>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>PEAK DATE</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F59E0B' }}>
                  {mPeakDateObj.count > 0 ? `${mPeakDateObj.dateStr} (${mPeakDateObj.count})` : 'None'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLUTION RATE</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8B5CF6' }}>
                  {mTotalTickets > 0 ? `${Math.round((mTotalResolved / mTotalTickets) * 100)}%` : '0%'}
                </div>
              </div>
            </div>

            {/* Interactive Date Bar Chart */}
            <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Daily Distribution — Click a date to inspect tickets</span>
                <span style={{ color: 'var(--zoho-blue)', fontSize: '0.74rem', fontWeight: 700 }}>
                  Selected Date: {mSelectedDateNum} {monthNamesList[mSelectedMonth]} {mSelectedYear}
                </span>
              </div>

              <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px', minWidth: `${daysInMMonth * 24}px`, padding: '10px 0 0 0' }}>
                  {mDateData.map((d) => {
                    const isSelected = Number(d.dateNum) === Number(mSelectedDateNum);
                    const barHeightPct = Math.max(6, Math.round((d.count / mMaxDailyCount) * 100));
                    return (
                      <div 
                        key={d.dateNum} 
                        onClick={() => setMSelectedDateNum(d.dateNum)}
                        title={`Click to view tickets for Date ${d.dateStr}\nTotal Tickets: ${d.count}`}
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          height: '100%', 
                          justifyContent: 'flex-end',
                          cursor: 'pointer',
                          opacity: isSelected ? 1 : 0.8,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: isSelected ? '#38BDF8' : (d.count > 0 ? 'var(--zoho-blue)' : 'transparent'), marginBottom: '3px' }}>
                          {d.count > 0 ? d.count : ''}
                        </span>
                        <div style={{
                          width: '100%',
                          maxWidth: '20px',
                          background: isSelected 
                            ? 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)'
                            : (d.count > 0 ? 'linear-gradient(180deg, #0265DC 0%, #3B82F6 100%)' : 'rgba(148, 163, 184, 0.15)'),
                          height: `${barHeightPct}%`,
                          borderRadius: '4px 4px 0 0',
                          boxShadow: isSelected ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none',
                          border: isSelected ? '1px solid #FCD34D' : 'none',
                          transition: 'all 0.2s ease'
                        }}></div>
                        <div style={{ fontSize: '0.62rem', color: isSelected ? '#F59E0B' : 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', fontWeight: isSelected ? 800 : 600 }}>
                          {d.dateNum}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Clicked Date Tickets List Table */}
            <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-list-check" style={{ color: '#F59E0B' }}></i> Tickets Raised on {mSelectedDateNum} {monthNamesList[mSelectedMonth]} {mSelectedYear}
                </h4>
                <span style={{ fontSize: '0.74rem', background: '#DBEAFE', color: '#0265DC', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {selectedDateObj.ticketList.length} Ticket(s) Found
                </span>
              </div>

              {selectedDateObj.ticketList.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <i className="fa-solid fa-folder-open fa-2x" style={{ color: 'var(--border-color)', marginBottom: '8px' }}></i>
                  <p style={{ margin: 0 }}>No tickets were created on {mSelectedDateNum} {monthNamesList[mSelectedMonth]} {mSelectedYear}. Click on dates with bars above to view tickets.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="zoho-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Title / Issue Description</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDateObj.ticketList.map(t => {
                        const prio = getPriorityStyle(t.priority);
                        const stat = getStatusStyle(t.status);
                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 800, color: 'var(--zoho-blue)' }}>{t.ticket_number}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.title}</td>
                            <td>{t.category_name || 'General'}</td>
                            <td>
                              <span style={{ background: prio.bg, color: prio.color, border: `1px solid ${prio.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                                {t.priority || 'Medium'}
                              </span>
                            </td>
                            <td>
                              <span style={{ background: stat.bg, color: stat.color, border: `1px solid ${stat.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                                {t.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>
                              {t.created_at ? new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                            </td>
                            <td>
                              <button 
                                type="button"
                                className="btn btn-zoho-primary btn-xs"
                                onClick={() => onSelectTicket && onSelectTicket(t.id)}
                                title="Click to view full ticket detail modal"
                              >
                                View Details <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.65rem' }}></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SEPARATE CARD B: YEARLY MONTH-WISE TICKET ANALYTICS DASHBOARD CARD        */}
          {/* ========================================================================= */}
          <div className="zoho-stat-card" style={{ flexDirection: 'column', padding: '20px', marginTop: '20px', alignItems: 'stretch' }}>
            {/* Header & Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-calendar-days" style={{ color: '#8B5CF6' }}></i> Yearly Month-Wise Ticket Dashboard
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  12-month ticket breakdown for full year {ySelectedYear}. Click on any month bar to view ticket details below.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={ySelectedYear}
                  onChange={(e) => {
                    const newY = Number(e.target.value);
                    setYSelectedYear(newY);
                    setYSelectedMonthIdx(0);
                  }}
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Metric Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>YEARLY TICKETS</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8B5CF6' }}>{yTotalTickets}</div>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLVED / CLOSED</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>{yTotalResolved}</div>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>PEAK MONTH</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F59E0B' }}>
                  {yPeakMonthObj.count > 0 ? `${yPeakMonthObj.monthShort} (${yPeakMonthObj.count})` : 'None'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLUTION RATE</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8B5CF6' }}>
                  {yTotalTickets > 0 ? `${Math.round((yTotalResolved / yTotalTickets) * 100)}%` : '0%'}
                </div>
              </div>
            </div>

            {/* Interactive Month Bar Chart */}
            <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>12-Month Volume — Click a month to inspect tickets</span>
                <span style={{ color: '#8B5CF6', fontSize: '0.74rem', fontWeight: 700 }}>
                  Selected Month: {monthNamesList[ySelectedMonthIdx]} {ySelectedYear}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '150px', padding: '10px 0 0 0' }}>
                {yMonthData.map((m) => {
                  const isSelected = Number(m.monthIdx) === Number(ySelectedMonthIdx);
                  const barHeightPct = Math.max(6, Math.round((m.count / yMaxMonthlyCount) * 100));
                  return (
                    <div 
                      key={m.monthIdx} 
                      onClick={() => setYSelectedMonthIdx(m.monthIdx)}
                      title={`Click to view tickets for Month ${m.monthName} ${ySelectedYear}\nTotal Tickets: ${m.count}`}
                      style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        height: '100%', 
                        justifyContent: 'flex-end',
                        cursor: 'pointer',
                        opacity: isSelected ? 1 : 0.8,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isSelected ? '#A78BFA' : (m.count > 0 ? '#8B5CF6' : 'transparent'), marginBottom: '3px' }}>
                        {m.count > 0 ? m.count : ''}
                      </span>
                      <div style={{
                        width: '100%',
                        maxWidth: '38px',
                        background: isSelected 
                          ? 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)' 
                          : (m.count > 0 ? 'linear-gradient(180deg, #8B5CF6 0%, #A78BFA 100%)' : 'rgba(148, 163, 184, 0.15)'),
                        height: `${barHeightPct}%`,
                        borderRadius: '4px 4px 0 0',
                        boxShadow: isSelected ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none',
                        border: isSelected ? '1px solid #FCD34D' : 'none',
                        transition: 'all 0.2s ease'
                      }}></div>
                      <div style={{ fontSize: '0.68rem', color: isSelected ? '#F59E0B' : 'var(--text-muted)', marginTop: '6px', fontWeight: isSelected ? 800 : 700 }}>
                        {m.monthShort}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clicked Month Tickets List Table */}
            <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-list-check" style={{ color: '#8B5CF6' }}></i> Tickets Raised in {monthNamesList[ySelectedMonthIdx]} {ySelectedYear}
                </h4>
                <span style={{ fontSize: '0.74rem', background: '#F3E8FF', color: '#8B5CF6', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {selectedMonthObj.ticketList.length} Ticket(s) Found
                </span>
              </div>

              {selectedMonthObj.ticketList.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <i className="fa-solid fa-folder-open fa-2x" style={{ color: 'var(--border-color)', marginBottom: '8px' }}></i>
                  <p style={{ margin: 0 }}>No tickets were created in {monthNamesList[ySelectedMonthIdx]} {ySelectedYear}. Select another month on the graph above.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="zoho-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Title / Issue Description</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonthObj.ticketList.map(t => {
                        const prio = getPriorityStyle(t.priority);
                        const stat = getStatusStyle(t.status);
                        return (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 800, color: '#8B5CF6' }}>{t.ticket_number}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.title}</td>
                            <td>{t.category_name || 'General'}</td>
                            <td>
                              <span style={{ background: prio.bg, color: prio.color, border: `1px solid ${prio.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                                {t.priority || 'Medium'}
                              </span>
                            </td>
                            <td>
                              <span style={{ background: stat.bg, color: stat.color, border: `1px solid ${stat.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                                {t.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>
                              {t.created_at ? new Date(t.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                            </td>
                            <td>
                              <button 
                                type="button"
                                className="btn btn-zoho-primary btn-xs"
                                onClick={() => onSelectTicket && onSelectTicket(t.id)}
                                title="Click to view full ticket detail modal"
                              >
                                View Details <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.65rem' }}></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* QUICK DRILLDOWN MODAL */}
      {drilldownModal && (
        <div className="zoho-modal-backdrop" onClick={() => setDrilldownModal(null)} style={{ zIndex: 1200 }}>
          <div className="zoho-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="zoho-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-filter" style={{ color: 'var(--zoho-blue)' }}></i> {drilldownModal.title}
              </h3>
              <button className="zoho-modal-close" onClick={() => setDrilldownModal(null)}>&times;</button>
            </div>
            
            <div className="zoho-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {drilldownModal.tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-folder-open fa-2x" style={{ marginBottom: '8px', color: 'var(--border-color)' }}></i>
                  <p>No tickets found for this selection.</p>
                </div>
              ) : (
                <table className="zoho-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownModal.tickets.map(t => {
                      const prio = getPriorityStyle(t.priority);
                      const stat = getStatusStyle(t.status);
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 800, color: 'var(--zoho-blue)' }}>{t.ticket_number}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.title}</td>
                          <td>{t.category_name || 'General'}</td>
                          <td>
                            <span style={{ background: prio.bg, color: prio.color, border: `1px solid ${prio.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                              {t.priority || 'Medium'}
                            </span>
                          </td>
                          <td>
                            <span style={{ background: stat.bg, color: stat.color, border: `1px solid ${stat.border}`, padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700 }}>
                              {t.status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-zoho-primary btn-xs"
                              onClick={() => {
                                setDrilldownModal(null);
                                if (onSelectTicket) onSelectTicket(t.id);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
