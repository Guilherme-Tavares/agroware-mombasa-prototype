export default function PastoralScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 800"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F9F4E8" />
          <stop offset="55%" stopColor="#EDD9A3" />
          <stop offset="100%" stopColor="#D4A558" />
        </linearGradient>
        <linearGradient id="ps-hill-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A8BE82" />
          <stop offset="100%" stopColor="#8BA068" />
        </linearGradient>
        <linearGradient id="ps-hill-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7EA050" />
          <stop offset="100%" stopColor="#5D7A35" />
        </linearGradient>
        <linearGradient id="ps-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6B8F3D" />
          <stop offset="100%" stopColor="#4A6628" />
        </linearGradient>
        <radialGradient id="ps-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3C4" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFF3C4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="600" height="800" fill="url(#ps-sky)" />

      {/* Sun glow */}
      <circle cx="460" cy="200" r="90" fill="url(#ps-sun-glow)" />
      {/* Sun core */}
      <circle cx="460" cy="200" r="48" fill="#F9C842" opacity="0.92" />
      <circle cx="460" cy="200" r="38" fill="#FDD835" />

      {/* Far hills */}
      <path
        d="M 0,520 Q 80,460 180,490 Q 280,520 360,475 Q 430,440 500,465 Q 560,485 600,455 L 600,800 L 0,800 Z"
        fill="url(#ps-hill-far)"
        opacity="0.75"
      />

      {/* Mid hills */}
      <path
        d="M 0,590 Q 60,550 140,565 Q 230,582 310,545 Q 390,510 470,540 Q 540,565 600,535 L 600,800 L 0,800 Z"
        fill="url(#ps-hill-near)"
      />

      {/* Ground */}
      <path
        d="M 0,650 Q 100,630 200,645 Q 320,662 440,635 Q 530,618 600,628 L 600,800 L 0,800 Z"
        fill="url(#ps-ground)"
      />

      {/* Tree left */}
      <g opacity="0.85">
        <rect x="102" y="528" width="7" height="40" rx="2" fill="#4E3B28" />
        <ellipse cx="106" cy="518" rx="18" ry="22" fill="#4A6628" />
        <ellipse cx="106" cy="510" rx="13" ry="16" fill="#5D7A35" />
      </g>

      {/* Tree right (smaller, background) */}
      <g opacity="0.65">
        <rect x="492" y="505" width="5" height="32" rx="2" fill="#4E3B28" />
        <ellipse cx="495" cy="496" rx="13" ry="16" fill="#4A6628" />
        <ellipse cx="495" cy="489" rx="9" ry="12" fill="#5D7A35" />
      </g>

      {/* ── Cattle silhouettes ─────────────────────────────── */}

      {/* Cow 1 — large, foreground left */}
      <g transform="translate(155,672)" fill="#4E342E">
        {/* body */}
        <ellipse cx="0" cy="-14" rx="44" ry="22" />
        {/* hump */}
        <path d="M -6,-36 Q 10,-54 26,-36" />
        {/* neck + head */}
        <path d="M 30,-20 Q 46,-28 52,-18 Q 56,-8 50,-2 Q 44,6 36,-4 Z" />
        {/* dewlap */}
        <path d="M 38,-2 Q 46,10 40,16" strokeWidth="0" />
        {/* ear */}
        <ellipse cx="52" cy="-22" rx="5" ry="3" transform="rotate(-20,52,-22)" />
        {/* tail */}
        <path d="M -44,-12 Q -58,-22 -54,-36" fill="none" stroke="#4E342E" strokeWidth="4" strokeLinecap="round" />
        {/* legs */}
        <rect x="-30" y="6" width="8" height="28" rx="3" />
        <rect x="-16" y="6" width="8" height="26" rx="3" />
        <rect x="10" y="6" width="8" height="28" rx="3" />
        <rect x="24" y="6" width="8" height="26" rx="3" />
      </g>

      {/* Cow 2 — medium, background center */}
      <g transform="translate(320,648) scale(0.72)" fill="#5D4037">
        <ellipse cx="0" cy="-14" rx="44" ry="22" />
        <path d="M -6,-36 Q 10,-54 26,-36" />
        <path d="M 30,-20 Q 46,-28 52,-18 Q 56,-8 50,-2 Q 44,6 36,-4 Z" />
        <path d="M -44,-12 Q -58,-22 -54,-36" fill="none" stroke="#5D4037" strokeWidth="5" strokeLinecap="round" />
        <rect x="-30" y="6" width="8" height="28" rx="3" />
        <rect x="-16" y="6" width="8" height="26" rx="3" />
        <rect x="10" y="6" width="8" height="28" rx="3" />
        <rect x="24" y="6" width="8" height="26" rx="3" />
      </g>

      {/* Cow 3 — small, far background */}
      <g transform="translate(430,632) scale(0.48)" fill="#6D4C41" opacity="0.8">
        <ellipse cx="0" cy="-14" rx="44" ry="22" />
        <path d="M -6,-36 Q 10,-54 26,-36" />
        <path d="M 30,-20 Q 46,-28 52,-18 Q 56,-8 50,-2 Q 44,6 36,-4 Z" />
        <rect x="-30" y="6" width="8" height="28" rx="3" />
        <rect x="-16" y="6" width="8" height="26" rx="3" />
        <rect x="10" y="6" width="8" height="28" rx="3" />
        <rect x="24" y="6" width="8" height="26" rx="3" />
      </g>

      {/* Grass blades foreground */}
      <g stroke="#4A6628" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M 30,760 Q 28,748 32,738" fill="none" />
        <path d="M 38,758 Q 42,744 38,734" fill="none" />
        <path d="M 70,762 Q 68,750 72,742" fill="none" />
        <path d="M 220,755 Q 218,743 222,733" fill="none" />
        <path d="M 228,758 Q 232,744 228,734" fill="none" />
        <path d="M 520,750 Q 518,738 522,728" fill="none" />
        <path d="M 528,753 Q 532,741 528,731" fill="none" />
        <path d="M 560,748 Q 558,736 562,726" fill="none" />
      </g>

      {/* Subtle horizon haze */}
      <rect x="0" y="450" width="600" height="60" fill="white" opacity="0.06" />
    </svg>
  )
}
