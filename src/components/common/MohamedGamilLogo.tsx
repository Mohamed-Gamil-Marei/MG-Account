import React from 'react';

interface MohamedGamilLogoProps {
  size?: number;
  className?: string;
  variant?: 'SEAL_FULL' | 'HEADER_TRANSPARENT' | 'MONOGRAM_ONLY';
}

/**
 * Mohamed Gamil Marei - Official CPA Luxury Emblem & Seal
 * Precision Vector Reproduction (Isolated / Transparent Background)
 */
export const MohamedGamilLogo: React.FC<MohamedGamilLogoProps> = ({
  size = 140,
  className = '',
  variant = 'SEAL_FULL',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
    >
      <defs>
        {/* Metallic Gold Gradients */}
        <linearGradient id="mgGoldPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbf3c2" />
          <stop offset="25%" stopColor="#d4af37" />
          <stop offset="50%" stopColor="#aa771c" />
          <stop offset="75%" stopColor="#f3e5ab" />
          <stop offset="100%" stopColor="#7a5210" />
        </linearGradient>

        <linearGradient id="mgGoldLight" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="50%" stopColor="#fff6cc" />
          <stop offset="100%" stopColor="#b38728" />
        </linearGradient>

        <linearGradient id="mgSilverChrome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#d1d5db" />
          <stop offset="50%" stopColor="#9ca3af" />
          <stop offset="70%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>

        {/* Circular Text Paths */}
        <path
          id="topTextArc"
          d="M 75 250 A 175 175 0 0 1 425 250"
          fill="none"
        />
        <path
          id="bottomTextArc"
          d="M 425 250 A 175 175 0 0 1 75 250"
          fill="none"
        />
        <path
          id="subBottomTextArc"
          d="M 450 250 A 200 200 0 0 1 50 250"
          fill="none"
        />

        {/* Subtle Drop Shadow for Metallic Emboss */}
        <filter id="goldGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Outer Metallic Ring (Beveled Gold Border) */}
      <circle
        cx="250"
        cy="250"
        r="230"
        stroke="url(#mgGoldPrimary)"
        strokeWidth="12"
        fill="none"
        filter="url(#goldGlow)"
      />
      <circle
        cx="250"
        cy="250"
        r="220"
        stroke="url(#mgGoldLight)"
        strokeWidth="3"
        fill="none"
      />
      <circle
        cx="250"
        cy="250"
        r="165"
        stroke="url(#mgGoldPrimary)"
        strokeWidth="6"
        fill="none"
      />
      <circle
        cx="250"
        cy="250"
        r="158"
        stroke="url(#mgGoldLight)"
        strokeWidth="2"
        fill="none"
      />

      {/* Inner Globe / Celestial Grid (Audit Scope) */}
      <g stroke="url(#mgGoldLight)" strokeWidth="1.2" opacity="0.45">
        <circle cx="250" cy="250" r="145" fill="none" />
        <ellipse cx="250" cy="250" rx="145" ry="55" fill="none" />
        <ellipse cx="250" cy="250" rx="75" ry="145" fill="none" />
        <line x1="105" y1="250" x2="395" y2="250" />
        <line x1="250" y1="105" x2="250" y2="395" />
      </g>

      {/* Circular Embossed Text */}
      <text
        fill="url(#mgGoldLight)"
        fontFamily="sans-serif"
        fontSize="25"
        fontWeight="900"
        letterSpacing="3.5"
        filter="url(#goldGlow)"
      >
        <textPath href="#topTextArc" startOffset="50%" textAnchor="middle">
          MOHAMED GAMIL MAREI
        </textPath>
      </text>

      <text
        fill="url(#mgGoldLight)"
        fontFamily="sans-serif"
        fontSize="17"
        fontWeight="800"
        letterSpacing="2.5"
        filter="url(#goldGlow)"
      >
        <textPath href="#bottomTextArc" startOffset="50%" textAnchor="middle">
          CHARTERED ACCOUNTANT AUDITOR
        </textPath>
      </text>

      {/* Sub-text: Reg & Tel */}
      <text
        fill="url(#mgGoldPrimary)"
        fontFamily="monospace"
        fontSize="13"
        fontWeight="bold"
        letterSpacing="1.5"
      >
        <textPath href="#subBottomTextArc" startOffset="50%" textAnchor="middle">
          REG. NO. RAA 43122  •  TEL: (+20) 0100 333 5360
        </textPath>
      </text>

      {/* Currency Banknotes Fan (Background of Monogram) */}
      <g opacity="0.85" transform="translate(145, 115) scale(0.62)">
        {/* Bill 1 */}
        <g transform="rotate(-28 100 100)">
          <rect x="30" y="40" width="130" height="75" rx="4" fill="#e8f5e9" stroke="#2e7d32" strokeWidth="2.5" />
          <circle cx="95" cy="77" r="18" fill="none" stroke="#2e7d32" strokeWidth="2" />
          <text x="40" y="60" fontSize="14" fontWeight="bold" fill="#1b5e20">$100</text>
          <text x="135" y="105" fontSize="14" fontWeight="bold" fill="#1b5e20">$100</text>
        </g>
        {/* Bill 2 */}
        <g transform="rotate(-12 100 100)">
          <rect x="40" y="40" width="130" height="75" rx="4" fill="#fffde7" stroke="#f57f17" strokeWidth="2.5" />
          <circle cx="105" cy="77" r="18" fill="none" stroke="#f57f17" strokeWidth="2" />
          <text x="50" y="60" fontSize="14" fontWeight="bold" fill="#f57f17">$50</text>
          <text x="145" y="105" fontSize="14" fontWeight="bold" fill="#f57f17">$50</text>
        </g>
        {/* Bill 3 */}
        <g transform="rotate(6 100 100)">
          <rect x="50" y="40" width="130" height="75" rx="4" fill="#e0f2f1" stroke="#00695c" strokeWidth="2.5" />
          <circle cx="115" cy="77" r="18" fill="none" stroke="#00695c" strokeWidth="2" />
          <text x="60" y="60" fontSize="14" fontWeight="bold" fill="#00695c">$20</text>
          <text x="155" y="105" fontSize="14" fontWeight="bold" fill="#00695c">$20</text>
        </g>
      </g>

      {/* Upward Growth & Audit Arrow */}
      <g filter="url(#goldGlow)">
        <path
          d="M 170 310 C 230 250, 310 180, 420 120"
          stroke="url(#mgGoldLight)"
          strokeWidth="11"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrow Head */}
        <polygon
          points="440,110 405,120 418,145"
          fill="url(#mgGoldLight)"
          stroke="url(#mgGoldPrimary)"
          strokeWidth="2"
        />
      </g>

      {/* Large 3D Monogram: "M" with engraved Checkmark ✓ + Silver "G" */}
      <g filter="url(#goldGlow)">
        {/* The Golden Checkmark (Left Arm of 'M') */}
        <path
          d="M 155 240 L 195 305 L 255 170 L 235 160 L 195 260 L 170 225 Z"
          fill="url(#mgGoldPrimary)"
          stroke="url(#mgGoldLight)"
          strokeWidth="3"
        />
        {/* Checkmark decorative inner engraving */}
        <path
          d="M 165 238 L 195 285 L 243 175"
          stroke="#fff6cc"
          strokeWidth="2"
          fill="none"
        />

        {/* Right Stems of Golden "M" */}
        <path
          d="M 235 220 L 265 290 L 285 220 L 285 315 L 265 315 L 265 265 L 248 305 L 232 305 Z"
          fill="url(#mgGoldPrimary)"
          stroke="url(#mgGoldLight)"
          strokeWidth="2"
        />

        {/* The 3D Silver / Chrome "G" */}
        <path
          d="M 345 200 C 310 195, 290 225, 290 260 C 290 295, 310 325, 345 320 C 365 318, 375 305, 375 290 L 375 265 L 335 265 L 335 282 L 355 282 L 355 296 C 350 302, 342 304, 335 302 C 315 298, 310 280, 310 260 C 310 240, 318 215, 340 215 C 352 215, 360 222, 365 230 L 380 218 C 372 206, 360 198, 345 200 Z"
          fill="url(#mgSilverChrome)"
          stroke="#ffffff"
          strokeWidth="3"
        />
      </g>

      {/* Security Padlock at Bottom Center */}
      <g transform="translate(236, 335) scale(0.9)" filter="url(#goldGlow)">
        {/* Shackle */}
        <path
          d="M 7 12 V 5 C 7 0, 25 0, 25 5 V 12"
          stroke="url(#mgGoldLight)"
          strokeWidth="3.5"
          fill="none"
        />
        {/* Body */}
        <rect
          x="0"
          y="11"
          width="32"
          height="25"
          rx="4"
          fill="url(#mgGoldPrimary)"
          stroke="url(#mgGoldLight)"
          strokeWidth="2"
        />
        {/* Keyhole */}
        <circle cx="16" cy="21" r="3" fill="#3e2704" />
        <polygon points="15,21 17,21 18,29 14,29" fill="#3e2704" />
      </g>
    </svg>
  );
};
