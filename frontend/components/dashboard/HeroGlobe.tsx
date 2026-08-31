"use client";

// Decorative illustration for the dashboard hero: a wireframe globe on a
// pedestal with a few floating UI tiles. Drawn inline as SVG rather than
// shipped as a raster asset so it stays crisp at any size and adds nothing
// to the bundle's image weight.

export default function HeroGlobe({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 340"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hg-sphere" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#C7BDFF" />
          <stop offset="45%" stopColor="#9B87F5" />
          <stop offset="100%" stopColor="#6D53E0" />
        </radialGradient>
        <linearGradient id="hg-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B7A6FF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="hg-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E5DEFF" />
          <stop offset="100%" stopColor="#F4F1FF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="hg-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EDE9FE" />
        </linearGradient>
        <filter id="hg-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="215" cy="170" rx="120" ry="120" fill="#A78BFA" className="hg-breathe" filter="url(#hg-soft)" />

      {/* Pedestal */}
      <ellipse cx="215" cy="272" rx="118" ry="34" fill="url(#hg-base)" />
      <ellipse cx="215" cy="266" rx="92" ry="26" fill="#DED6FF" opacity="0.75" />
      <ellipse cx="215" cy="262" rx="66" ry="18" fill="#C9BCFF" opacity="0.6" />

      {/* Orbit ring behind the sphere */}
      <ellipse
        cx="215"
        cy="163"
        rx="140"
        ry="52"
        stroke="url(#hg-ring)"
        strokeWidth="2.5"
        transform="rotate(-18 215 163)"
      />

      {/* Sphere — the whole body drifts gently as one unit */}
      <g className="hg-bob">
        <circle cx="215" cy="158" r="88" fill="url(#hg-sphere)" />

        {/* Latitudes stay put; meridians sweep to read as rotation. */}
        <g stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.1" fill="none">
          <ellipse cx="215" cy="158" rx="88" ry="30" />
          <ellipse cx="215" cy="158" rx="88" ry="58" />
          <line x1="127" y1="158" x2="303" y2="158" />
        </g>

        <g stroke="#FFFFFF" strokeWidth="1.1" fill="none">
          <ellipse cx="215" cy="158" ry="88" className="hg-meridian" style={{ animationDelay: "0s" }} />
          <ellipse cx="215" cy="158" ry="88" className="hg-meridian" style={{ animationDelay: "-3s" }} />
          <ellipse cx="215" cy="158" ry="88" className="hg-meridian" style={{ animationDelay: "-6s" }} />
        </g>

        {/* Specular highlight */}
        <ellipse
          cx="182"
          cy="122"
          rx="34"
          ry="24"
          fill="#FFFFFF"
          className="hg-shimmer"
          transform="rotate(-28 182 122)"
        />
      </g>

      {/* Orbit ring in front */}
      <path
        d="M83 186 A140 52 -18 0 0 347 140"
        stroke="url(#hg-ring)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Floating tiles */}
      <g className="hg-float" style={{ animationDelay: "-1s" }}>
        <rect x="52" y="150" width="60" height="52" rx="14" fill="url(#hg-tile)" />
        <rect x="52" y="150" width="60" height="52" rx="14" stroke="#DDD6FE" />
        <rect x="66" y="178" width="6" height="12" rx="2" fill="#8B5CF6" />
        <rect x="78" y="170" width="6" height="20" rx="2" fill="#6366F1" />
        <rect x="90" y="164" width="6" height="26" rx="2" fill="#A78BFA" />
      </g>

      <g className="hg-float" style={{ animationDelay: "-3.5s" }}>
        <rect x="312" y="196" width="62" height="52" rx="14" fill="url(#hg-tile)" />
        <rect x="312" y="196" width="62" height="52" rx="14" stroke="#DDD6FE" />
        <rect x="326" y="212" width="34" height="4" rx="2" fill="#8B5CF6" />
        <rect x="326" y="222" width="24" height="4" rx="2" fill="#C4B5FD" />
        <rect x="326" y="232" width="30" height="4" rx="2" fill="#C4B5FD" />
      </g>

      <g className="hg-float" style={{ animationDelay: "-5s" }}>
        <rect x="322" y="74" width="34" height="34" rx="11" fill="url(#hg-tile)" />
        <rect x="322" y="74" width="34" height="34" rx="11" stroke="#DDD6FE" />
        <circle cx="339" cy="91" r="6" fill="#A78BFA" />
      </g>

      <circle cx="96" cy="96" r="6" fill="#C4B5FD" className="hg-twinkle" />
      <circle cx="368" cy="164" r="4" fill="#DDD6FE" className="hg-twinkle" style={{ animationDelay: "-1.3s" }} />
      <circle cx="140" cy="266" r="4" fill="#C4B5FD" className="hg-twinkle" style={{ animationDelay: "-2.6s" }} />
    </svg>
  );
}
