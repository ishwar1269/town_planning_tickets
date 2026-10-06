import React from 'react';

export default function ISupportOneLogo({ 
  height = 38, 
  showTagline = true, 
  className = "" 
}) {
  return (
    <div 
      className={`isupportone-logo ${className}`} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.65rem',
        textDecoration: 'none',
        userSelect: 'none'
      }}
    >
      {/* 2.4 Icon with Headset & Information Bubble */}
      <svg 
        width={height * 1.15} 
        height={height} 
        viewBox="0 0 110 96" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, overflow: 'visible' }}
      >
        <defs>
          {/* Headband Gradient: Deep royal blue to bright cyan */}
          <linearGradient id="headbandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0247d4" />
            <stop offset="60%" stopColor="#0077b6" />
            <stop offset="100%" stopColor="#00b4d8" />
          </linearGradient>

          {/* Speech Bubble Gradient: Vibrant blue to cyan */}
          <linearGradient id="bubbleGrad" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#0353e9" />
            <stop offset="45%" stopColor="#0265dc" />
            <stop offset="85%" stopColor="#0096c7" />
            <stop offset="100%" stopColor="#00b4d8" />
          </linearGradient>

          {/* Right Earpiece Gradient: Sky blue / cyan 3D highlight */}
          <linearGradient id="earpieceRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#90e0ef" />
            <stop offset="50%" stopColor="#48cae4" />
            <stop offset="100%" stopColor="#0096c7" />
          </linearGradient>

          {/* Left Earpiece Gradient: Deep royal blue 3D */}
          <linearGradient id="earpieceLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0052cc" />
            <stop offset="100%" stopColor="#023e8a" />
          </linearGradient>
        </defs>

        {/* Headset Headband Arch */}
        <path 
          d="M 23 44 A 36 36 0 0 1 87 44" 
          stroke="url(#headbandGrad)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none" 
        />

        {/* Left Headset Earpiece (Navy/Royal) */}
        <rect 
          x="12" 
          y="37" 
          width="10" 
          height="24" 
          rx="5" 
          fill="url(#earpieceLeftGrad)" 
        />

        {/* Right Headset Earpiece (Cyan/Sky Highlight) */}
        <rect 
          x="88" 
          y="37" 
          width="10" 
          height="24" 
          rx="5" 
          fill="url(#earpieceRightGrad)" 
        />

        {/* Chat Speech Bubble with tail at 7 o'clock */}
        <path 
          d="M 55 18 
             C 71.5 18, 85 31.5, 85 48 
             C 85 64.5, 71.5 78, 55 78 
             C 49.5 78, 44.5 76.5, 40 73.8 
             L 24 88 
             C 27.5 81, 28.5 76, 28 72 
             C 26 65, 25 56.5, 25 48 
             C 25 31.5, 38.5 18, 55 18 Z" 
          stroke="url(#bubbleGrad)" 
          strokeWidth="4.5" 
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none" 
        />

        {/* Center Information "i" Symbol */}
        {/* Dot of the i */}
        <circle 
          cx="55" 
          cy="34" 
          r="5.5" 
          fill="#061b4d" 
          className="isupportone-i-dot"
        />

        {/* Stem of the i */}
        <rect 
          x="49.5" 
          y="44" 
          width="11" 
          height="22" 
          rx="5.5" 
          fill="#061b4d" 
          className="isupportone-i-stem"
        />
      </svg>

      {/* Typography: I-SupportOne Desk + Tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.08, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', letterSpacing: '-0.025em' }}>
          <span className="isupportone-brand-text" style={{ fontWeight: 800, fontSize: height * 0.46 }}>
            I-Support
          </span>
          <span style={{ fontWeight: 800, fontSize: height * 0.46, color: '#0052ff' }}>
            One
          </span>
        </div>

        <div className="isupportone-brand-desk" style={{ fontWeight: 700, fontSize: height * 0.44, letterSpacing: '-0.02em', marginTop: '1px' }}>
          Desk
        </div>

        {showTagline && (
          <div 
            className="isupportone-tagline" 
            style={{ 
              fontSize: Math.max(height * 0.19, 9.5), 
              letterSpacing: '0.015em', 
              marginTop: '3px',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            Raise It. Route It. Resolve It.
          </div>
        )}
      </div>
    </div>
  );
}
