import React from 'react';

interface PaprbndrLogoProps {
  size?: number;
  className?: string;
  variant?: 'mark' | 'full';
}

/**
 * Paprbndr Vector Logo
 * Geometric folded sheets & binder clasp forming an iconic modern "P".
 * Inspired by Swiss modernism & precision geometric productivity marks.
 */
export const PaprbndrLogo: React.FC<PaprbndrLogoProps> = ({
  size = 32,
  className = '',
  variant = 'mark',
}) => {
  return (
    <div
      className={`paprbndr-logo-wrap ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: variant === 'full' ? '10px' : '0',
        lineHeight: 1,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          {/* Subtle depth gradient for the primary folded sheet */}
          <linearGradient id="papr-sheet-grad" x1="12" y1="6" x2="42" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Spine / Binder clasp gradient */}
          <linearGradient id="papr-binder-grad" x1="6" y1="4" x2="18" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Lower sheet / duplex page */}
          <linearGradient id="papr-duplex-grad" x1="18" y1="22" x2="40" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Fold highlight facet */}
          <linearGradient id="papr-facet-grad" x1="28" y1="6" x2="42" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>

        {/* --- 1. SECONDARY / UNDERLYING SHEET (Showing Duplex & Stack) --- */}
        <path
          d="M18 20H34C36.2091 20 38 21.7909 38 24V34L30 42H18C15.7909 42 14 40.2091 14 38V24C14 21.7909 15.7909 20 18 20Z"
          fill="url(#papr-duplex-grad)"
          opacity="0.85"
        />
        {/* Lower dog-ear fold */}
        <path
          d="M30 34H38L30 42V34Z"
          fill="#475569"
          opacity="0.95"
        />

        {/* --- 2. PRIMARY FOLDED SHEET (The "P" Loop) --- */}
        <path
          d="M14 6H32C37.5228 6 42 10.4772 42 16C42 21.5228 37.5228 26 32 26H14V6Z"
          fill="url(#papr-sheet-grad)"
        />
        
        {/* The "P" counter / eye cutout with crisp paper corner */}
        <path
          d="M22 13H31C32.6569 13 34 14.3431 34 16C34 17.6569 32.6569 19 31 19H22V13Z"
          fill="#ffffff"
        />

        {/* Top-right origami facet corner */}
        <path
          d="M32 6C34.5 6 38.5 7.5 42 16L34 16L32 6Z"
          fill="url(#papr-facet-grad)"
          opacity="0.6"
        />

        {/* --- 3. BINDER SPINE & CLASPS (The "Bndr") --- */}
        {/* Vertical binding spine */}
        <rect
          x="6"
          y="4"
          width="10"
          height="40"
          rx="4"
          fill="url(#papr-binder-grad)"
        />

        {/* Precision metallic binder clips / rivets */}
        <circle cx="11" cy="12" r="2.2" fill="#f8fafc" />
        <circle cx="11" cy="12" r="1.1" fill="#0f172a" />

        <circle cx="11" cy="24" r="2.2" fill="#f8fafc" />
        <circle cx="11" cy="24" r="1.1" fill="#0f172a" />

        <circle cx="11" cy="36" r="2.2" fill="#f8fafc" />
        <circle cx="11" cy="36" r="1.1" fill="#0f172a" />

        {/* Horizontal binder clasp brackets */}
        <rect x="13" y="10.5" width="4" height="3" rx="1.5" fill="#38bdf8" />
        <rect x="13" y="22.5" width="4" height="3" rx="1.5" fill="#64748b" />
        <rect x="13" y="34.5" width="4" height="3" rx="1.5" fill="#64748b" />
      </svg>

      {variant === 'full' && (
        <span
          style={{
            fontWeight: 800,
            fontSize: '1.2rem',
            letterSpacing: '-0.03em',
            color: 'var(--text-primary, #0f172a)',
            fontFamily: 'var(--font-sans, inherit)',
          }}
        >
          Paprbndr
        </span>
      )}
    </div>
  );
};

export default PaprbndrLogo;
