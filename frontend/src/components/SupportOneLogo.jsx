import React from 'react';

export default function SupportOneLogo({ 
  height = 36, 
  showTagline = true, 
  showDivider = true,
  className = "" 
}) {
  return (
    <div 
      className={`supportone-logo ${className}`} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.75rem',
        textDecoration: 'none',
        userSelect: 'none'
      }}
    >
      {/* Scalable Vector Ticket Emblem with Speed Motion & Verified Checkmark */}
      <svg 
        width={height * 1.35} 
        height={height} 
        viewBox="0 0 92 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="speedGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00b4d8" />
            <stop offset="100%" stopColor="#0077b6" />
          </linearGradient>
          <linearGradient id="speedGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0096c7" />
            <stop offset="100%" stopColor="#0052ff" />
          </linearGradient>
          <linearGradient id="speedGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0077b6" />
            <stop offset="100%" stopColor="#023e8a" />
          </linearGradient>
        </defs>

        {/* Speed Motion Lines on the Left */}
        <line x1="10" y1="21" x2="28" y2="21" stroke="url(#speedGrad1)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="4" y1="32" x2="24" y2="32" stroke="url(#speedGrad2)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="10" y1="43" x2="28" y2="43" stroke="url(#speedGrad3)" strokeWidth="3.5" strokeLinecap="round" />

        {/* Ticket Outer Outline with Notch Insets */}
        <path 
          d="M 38 12 
             H 74 
             A 6 6 0 0 1 80 18 
             V 24 
             A 7 7 0 0 0 80 40 
             V 46 
             A 6 6 0 0 1 74 52 
             H 38 
             A 6 6 0 0 1 32 46 
             V 40 
             A 7 7 0 0 0 32 24 
             V 18 
             A 6 6 0 0 1 38 12 Z" 
          fill="none" 
          className="supportone-ticket-border"
          strokeWidth="3.5" 
          strokeLinejoin="round" 
        />

        {/* Inner Teal/Green Checkmark */}
        <path 
          d="M 47 32.5 L 53 38.5 L 65 24.5" 
          fill="none" 
          stroke="#00b49f" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>

      {/* Divider line if enabled */}
      {showDivider && (
        <div 
          className="supportone-divider"
          style={{ 
            width: '1.5px', 
            height: height * 0.9, 
            opacity: 0.35,
            alignSelf: 'center'
          }} 
        />
      )}

      {/* Brand Typography */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', letterSpacing: '-0.025em' }}>
          <span className="supportone-brand-support" style={{ fontWeight: 800, fontSize: height * 0.44 }}>
            Support
          </span>
          <span style={{ fontWeight: 800, fontSize: height * 0.44, color: '#0052ff' }}>
            One
          </span>
        </div>

        <div className="supportone-brand-desk" style={{ fontWeight: 700, fontSize: height * 0.42, letterSpacing: '-0.02em', marginTop: '1px' }}>
          Desk
        </div>

        {showTagline && (
          <div 
            className="supportone-tagline" 
            style={{ 
              fontSize: Math.max(height * 0.19, 9), 
              letterSpacing: '0.01em', 
              marginTop: '2px',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            One Platform. Complete Support.
          </div>
        )}
      </div>
    </div>
  );
}
