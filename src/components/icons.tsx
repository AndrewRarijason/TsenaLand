// Illustrations du plateau, dessinées en SVG pour rester nettes à toutes les tailles.

type IconProps = { className?: string };

/** Gare routière : taxi-brousse avec bagages sur le toit. */
export function TaxiBrousseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden>
      <rect x="13" y="1.5" width="12" height="7.5" rx="1.5" fill="#b45309" stroke="#1f2937" strokeWidth="0.8" />
      <rect x="27" y="3" width="10" height="6" rx="1.5" fill="#2563eb" stroke="#1f2937" strokeWidth="0.8" />
      <rect x="39" y="0.5" width="9" height="8.5" rx="1.5" fill="#16a34a" stroke="#1f2937" strokeWidth="0.8" />
      <rect x="9" y="9" width="44" height="2" rx="1" fill="#374151" />
      <path
        d="M7 12h43c3 0 5 1.5 6.2 4L60 24v9c0 1.2-.8 2-2 2H6c-1.2 0-2-.8-2-2V15c0-1.7 1.3-3 3-3z"
        fill="#f8fafc"
        stroke="#1f2937"
        strokeWidth="1.6"
      />
      <rect x="4.8" y="25.5" width="54.4" height="3.2" fill="#dc2626" />
      <rect x="8.5" y="15" width="9" height="7.5" rx="1" fill="#93c5fd" stroke="#1f2937" strokeWidth="0.8" />
      <rect x="19.5" y="15" width="9" height="7.5" rx="1" fill="#93c5fd" stroke="#1f2937" strokeWidth="0.8" />
      <rect x="30.5" y="15" width="9" height="7.5" rx="1" fill="#93c5fd" stroke="#1f2937" strokeWidth="0.8" />
      <path d="M42 15h8.3l4.2 7.5H42z" fill="#93c5fd" stroke="#1f2937" strokeWidth="0.8" />
      <circle cx="16" cy="35" r="5.5" fill="#111827" />
      <circle cx="16" cy="35" r="2.2" fill="#9ca3af" />
      <circle cx="48" cy="35" r="5.5" fill="#111827" />
      <circle cx="48" cy="35" r="2.2" fill="#9ca3af" />
      <circle cx="58" cy="29.5" r="1.4" fill="#fde047" />
    </svg>
  );
}

/** Jirama Jiro : ampoule. */
export function BulbIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden>
      <path d="M20 3C11.7 3 6 9.2 6 16.6c0 5.3 3 8.6 5.6 11.4 1.6 1.8 2.4 3.6 2.4 5.5h12c0-1.9.8-3.7 2.4-5.5C31 25.2 34 21.9 34 16.6 34 9.2 28.3 3 20 3z" fill="#fde047" stroke="#1f2937" strokeWidth="2" />
      <path d="M16 33.5l1-8-3-4M24 33.5l-1-8 3-4" fill="none" stroke="#b45309" strokeWidth="1.4" />
      <rect x="13.5" y="34" width="13" height="4" rx="1" fill="#9ca3af" stroke="#1f2937" strokeWidth="1.5" />
      <rect x="14.5" y="38" width="11" height="4" rx="1" fill="#9ca3af" stroke="#1f2937" strokeWidth="1.5" />
      <path d="M17 42h6l-1.5 3h-3z" fill="#4b5563" />
      <path d="M3 8l3 2M37 8l-3 2M20 0v-2" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Jirama Rano : robinet et goutte d'eau. */
export function TapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="17" y="4" width="14" height="4" rx="2" fill="#475569" stroke="#1f2937" strokeWidth="1.4" />
      <rect x="22" y="8" width="4" height="6" fill="#64748b" stroke="#1f2937" strokeWidth="1.2" />
      <path d="M4 16h26c5.5 0 9 3.5 9 9v3h-8v-3c0-1.2-.8-2-2-2H4z" fill="#94a3b8" stroke="#1f2937" strokeWidth="1.8" />
      <rect x="1" y="14" width="5" height="11" rx="1" fill="#64748b" stroke="#1f2937" strokeWidth="1.4" />
      <path d="M35 32c0 0-5 6.5-5 9.5a5 5 0 0010 0C40 38.5 35 32 35 32z" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" />
    </svg>
  );
}

export function ChestIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden>
      <path d="M4 16C4 8 10 4 24 4s20 4 20 12z" fill="#b45309" stroke="#1f2937" strokeWidth="1.8" />
      <rect x="4" y="16" width="40" height="20" rx="2" fill="#d97706" stroke="#1f2937" strokeWidth="1.8" />
      <rect x="4" y="14" width="40" height="4" fill="#78350f" />
      <rect x="20" y="14" width="8" height="10" rx="1.5" fill="#fbbf24" stroke="#1f2937" strokeWidth="1.4" />
      <circle cx="24" cy="20" r="1.4" fill="#1f2937" />
    </svg>
  );
}

export function RingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 44" className={className} aria-hidden>
      <path d="M13 6h14l5 7-12 9-12-9z" fill="#bae6fd" stroke="#0369a1" strokeWidth="1.6" />
      <path d="M8 13h24M17 6l3 16M23 6l-3 16" stroke="#0369a1" strokeWidth="0.9" />
      <circle cx="20" cy="31" r="10" fill="none" stroke="#eab308" strokeWidth="4" />
    </svg>
  );
}

export function PoliceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M8 18c0-6 7-12 16-12s16 6 16 12z" fill="#1e3a8a" stroke="#0f172a" strokeWidth="1.6" />
      <rect x="6" y="17" width="36" height="5" rx="2" fill="#0f172a" />
      <path d="M24 8l2.4 4.6 5 .7-3.6 3.4.9 5-4.7-2.4-4.7 2.4.9-5-3.6-3.4 5-.7z" fill="#facc15" />
      <circle cx="24" cy="31" r="10" fill="#f5d0a9" stroke="#0f172a" strokeWidth="1.4" />
      <circle cx="20.5" cy="30" r="1.3" fill="#0f172a" />
      <circle cx="27.5" cy="30" r="1.3" fill="#0f172a" />
      <path d="M20 35.5c2.5 1.8 5.5 1.8 8 0" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 64 36" className={className} aria-hidden>
      <path d="M6 22l4-9c1-2.4 3-4 6-4h26c3 0 5 1.2 6.5 3.6L54 20l4 1.5c1.5.6 2 1.6 2 3V28H4v-3c0-1.6.8-2.6 2-3z" fill="#dc2626" stroke="#1f2937" strokeWidth="1.6" />
      <path d="M15 19l3-6.5h11V19zM33 19v-6.5h8.5L46 19z" fill="#bfdbfe" stroke="#1f2937" strokeWidth="1" />
      <circle cx="16" cy="28" r="5" fill="#111827" />
      <circle cx="16" cy="28" r="2" fill="#9ca3af" />
      <circle cx="48" cy="28" r="5" fill="#111827" />
      <circle cx="48" cy="28" r="2" fill="#9ca3af" />
    </svg>
  );
}

export function JailBarsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="2" y="2" width="36" height="36" fill="#f97316" stroke="#1f2937" strokeWidth="2" />
      {[9, 16, 23, 30].map((x) => (
        <rect key={x} x={x} y="2" width="2.6" height="36" fill="#1f2937" />
      ))}
      <rect x="2" y="18" width="36" height="2.6" fill="#1f2937" />
    </svg>
  );
}
