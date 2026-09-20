import React from 'react';

interface SummonsMitraLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textClassName?: string;
  subtitleClassName?: string;
  onClick?: () => void;
  clickable?: boolean;
}

/**
 * Official "Trust & Technology" SummonsMitra Logo Component
 * Concept: Blue/Cyan Shield + Court Building/Columns + Legal Document Element
 * High-tech, professional legal-tech appearance with crisp vector scaling.
 */
export const SummonsMitraLogo: React.FC<SummonsMitraLogoProps> = ({
  className = 'w-10 h-10',
  size,
  showText = false,
  textClassName = 'font-bold text-lg text-foreground tracking-tight',
  subtitleClassName = 'text-[11px] text-muted-foreground',
  onClick,
  clickable = false,
}) => {
  const isClickable = clickable || !!onClick;

  const logoSvg = (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0 select-none`}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
      }}
      aria-label="SummonsMitra logo"
      role="img"
    >
      <defs>
        {/* Outer Shield Glow & Gradients */}
        <linearGradient id="shieldBorderGrad" x1="15" y1="10" x2="105" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        <linearGradient id="shieldFillGrad" x1="60" y1="12" x2="60" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B1A3A" />
          <stop offset="50%" stopColor="#08142D" />
          <stop offset="100%" stopColor="#040A1A" />
        </linearGradient>

        <linearGradient id="shieldCyanAccent" x1="20" y1="15" x2="100" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F5FF" />
          <stop offset="50%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Court Pillars and Pediment Gradient */}
        <linearGradient id="courtWhiteGrad" x1="60" y1="40" x2="60" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>

        {/* Document Element Gradient */}
        <linearGradient id="docGrad" x1="75" y1="28" x2="102" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Inner Highlight Filter */}
        <filter id="logoGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0EA5E9" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background Soft Shadow Container */}
      <rect width="120" height="120" rx="24" fill="transparent" />

      {/* 1. OUTER SHIELD FRAME (Trust & Security) */}
      <g filter="url(#logoGlow)">
        {/* Outer Shield Path */}
        <path
          d="M60 12 L98 26 C98 58 84 86 60 106 C36 86 22 58 22 26 L60 12 Z"
          fill="url(#shieldFillGrad)"
          stroke="url(#shieldBorderGrad)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner Cyan High-Tech Bevel Shield Accent */}
        <path
          d="M60 19 L91 30.5 C91 56 79 79 60 97 C41 79 29 56 29 30.5 L60 19 Z"
          fill="none"
          stroke="url(#shieldCyanAccent)"
          strokeWidth="1.8"
          strokeOpacity="0.85"
          strokeLinejoin="round"
        />
      </g>

      {/* 2. DOCUMENT FOLD ELEMENT ON RIGHT SHOULDER (Legal Tech & Processing) */}
      <g opacity="0.95">
        <path
          d="M78 28 L94 28 C95.5 28 97 29.5 97 31 L97 48 L87 38 L78 38 Z"
          fill="url(#docGrad)"
          opacity="0.8"
        />
        {/* Document Corner Fold Accent Line */}
        <path
          d="M87 28 L87 38 L97 38"
          fill="none"
          stroke="#BAE6FD"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* 3. COURT OF LAW / JUDICIAL BUILDING (Justice & Authenticity) */}
      <g>
        {/* Pediment (Triangle Roof) */}
        <path
          d="M60 41 L39 53 L81 53 Z"
          fill="url(#courtWhiteGrad)"
          stroke="#0284C7"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />

        {/* Small Scales of Justice / Apex Circle on Pediment */}
        <circle cx="60" cy="48" r="2.2" fill="#0369A1" />

        {/* Entablature / Architrave Bar */}
        <rect
          x="37"
          y="54"
          width="46"
          height="3.5"
          rx="1"
          fill="url(#courtWhiteGrad)"
          stroke="#0284C7"
          strokeWidth="0.5"
        />

        {/* 3 Classical Architectural Pillars */}
        {/* Left Pillar */}
        <rect
          x="41.5"
          y="58.5"
          width="7"
          height="23"
          rx="1.5"
          fill="url(#courtWhiteGrad)"
          stroke="#0284C7"
          strokeWidth="0.5"
        />
        {/* Center Pillar */}
        <rect
          x="56.5"
          y="58.5"
          width="7"
          height="23"
          rx="1.5"
          fill="url(#courtWhiteGrad)"
          stroke="#0284C7"
          strokeWidth="0.5"
        />
        {/* Right Pillar */}
        <rect
          x="71.5"
          y="58.5"
          width="7"
          height="23"
          rx="1.5"
          fill="url(#courtWhiteGrad)"
          stroke="#0284C7"
          strokeWidth="0.5"
        />

        {/* Pillar Grooves / Fluting Highlights */}
        <line x1="45" y1="60" x2="45" y2="80" stroke="#0284C7" strokeWidth="0.75" opacity="0.6" />
        <line x1="60" y1="60" x2="60" y2="80" stroke="#0284C7" strokeWidth="0.75" opacity="0.6" />
        <line x1="75" y1="60" x2="75" y2="80" stroke="#0284C7" strokeWidth="0.75" opacity="0.6" />

        {/* Base Steps (Stylobate / Plinth) */}
        <rect
          x="35"
          y="82.5"
          width="50"
          height="3.5"
          rx="1"
          fill="url(#courtWhiteGrad)"
          stroke="#0284C7"
          strokeWidth="0.5"
        />
        <rect
          x="32"
          y="86.5"
          width="56"
          height="4"
          rx="1.5"
          fill="url(#courtWhiteGrad)"
          stroke="#0284C7"
          strokeWidth="0.5"
        />
      </g>
    </svg>
  );

  if (!showText) {
    if (isClickable) {
      return (
        <button
          type="button"
          onClick={onClick}
          aria-label="About SummonsMitra"
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-0.5 transition-transform duration-150 active:scale-95 cursor-pointer flex items-center justify-center"
        >
          {logoSvg}
        </button>
      );
    }
    return logoSvg;
  }

  const content = (
    <div className="flex items-center gap-3">
      {logoSvg}
      <div className="text-left">
        <div className="flex items-center gap-2">
          <span className={textClassName}>SummonsMitra</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 rounded tracking-wider">
            Legal-Tech
          </span>
        </div>
        <p className={subtitleClassName}>Your Smart Legal Document Companion</p>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="About SummonsMitra"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1 -m-1 transition-all duration-150 hover:opacity-90 active:scale-[0.98] cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return content;
};
