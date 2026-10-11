"use client";

import { tokenInfo } from "@/game/tokens";
import type { CSSProperties } from "react";

// Pions dessinés en silhouettes blanches ; les détails (roues, hublots…) prennent
// la couleur du disque via la variable CSS --token-bg.

const D = "var(--token-bg, #1f2937)";

function Car() {
  return (
    <>
      <path d="M5 39c0-3.2 2.2-5.4 5.3-6.1l8.2-1.9 7.6-8.4c1.9-2 4.1-3 6.9-3h10.4c2.8 0 5 1.1 6.8 3.2l5.6 6.6 4.6 1.2c3.1.8 5.1 3 5.1 6.1v5.1c0 1.3-1 2.2-2.2 2.2H7.2C6 44 5 43.1 5 41.8z" />
      <path d="M28.6 24.2c.9-1 2-1.6 3.6-1.6h3.4v8.6H22.4z" fill={D} />
      <path d="M38.6 22.6h4.8c1.7 0 2.9.6 3.9 1.8l5.4 6.8H38.6z" fill={D} />
      <circle cx="18" cy="45" r="7.5" />
      <circle cx="18" cy="45" r="3" fill={D} />
      <circle cx="47.5" cy="45" r="7.5" />
      <circle cx="47.5" cy="45" r="3" fill={D} />
    </>
  );
}

function Dog() {
  return (
    <>
      <path d="M11 14l5.5 14H41l2.6-8.6L46 11l3.6 7 3-7 2 9.5 5.6 5.6v5.5l-6 1.2-2.4 4.4-1.6 5.3V52h-5.6l-1.1-8.6H23.2L21.8 52h-5.6l-.9-9.6-3.8-4.6L9.7 30z" />
      <circle cx="51" cy="23" r="1.8" fill={D} />
    </>
  );
}

function Ship() {
  return (
    <>
      <rect x="24" y="8" width="6" height="14" rx="1" />
      <rect x="34" y="11" width="6" height="11" rx="1" />
      <rect x="24" y="12" width="6" height="2.5" fill={D} />
      <rect x="34" y="14.5" width="6" height="2.5" fill={D} />
      <rect x="17" y="21" width="30" height="8" rx="1.5" />
      <rect x="11" y="28" width="42" height="8" rx="1.5" />
      <path d="M3 36h58l-7.5 15H11z" />
      {[16, 25, 34, 43].map((x) => (
        <circle key={x} cx={x} cy="42.5" r="2.2" fill={D} />
      ))}
    </>
  );
}

function Tank() {
  return (
    <>
      <rect x="31" y="22.5" width="29" height="4" rx="2" />
      <path d="M17 33l3.5-10h18l3.5 10z" />
      <rect x="24" y="18" width="10" height="5" rx="1.5" />
      <path d="M7 41l4-8h40l4 8z" />
      <rect x="4" y="40" width="54" height="13" rx="6.5" />
      {[11, 19, 27, 35, 43, 51].map((x) => (
        <circle key={x} cx={x} cy="46.5" r="3" fill={D} />
      ))}
    </>
  );
}

function Hat() {
  return (
    <>
      <path d="M17 10h30l-2.4 32H19.4z" />
      <ellipse cx="32" cy="45" rx="27" ry="6.5" />
      <path d="M18.6 33.5h26.8l-.5 6.5H19.1z" fill={D} />
    </>
  );
}

function Boot() {
  return (
    <>
      <path d="M21 5h19v28c7.6.9 15.2 3.6 18.3 8.8.9 1.5 1.2 3 1.2 4.6V53H13v-8.4c0-3.7 2.8-6.6 8-8.1z" />
      <rect x="21" y="9.5" width="19" height="3" fill={D} />
      <rect x="13" y="47.5" width="46.5" height="2" fill={D} />
    </>
  );
}

function Cat() {
  return (
    <>
      <path d="M47 57c8-1 11-6 10-12-.6-3.4-3-5.7-5.8-6.2" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M17 58c0-12.5 5.2-21 15-21s15 8.5 15 21z" />
      <path d="M20.5 24.5l.8-15.5 9.2 8.3zM43.5 24.5l-.8-15.5-9.2 8.3z" />
      <circle cx="32" cy="27" r="12" />
      <ellipse cx="27.3" cy="26" rx="1.8" ry="2.8" fill={D} />
      <ellipse cx="36.7" cy="26" rx="1.8" ry="2.8" fill={D} />
      <path d="M30.4 31.5h3.2L32 33.5z" fill={D} />
    </>
  );
}

function Wheelbarrow() {
  return (
    <>
      <path d="M5 20h38l-6.5 17H13z" />
      <path d="M36 35l7 6M14 36l-4 15M33 37l-2 9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M43 20l15-6" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="44" cy="45" r="8.5" />
      <circle cx="44" cy="45" r="3.2" fill={D} />
    </>
  );
}

const ICONS: Record<string, () => React.ReactElement> = {
  car: Car,
  dog: Dog,
  ship: Ship,
  tank: Tank,
  hat: Hat,
  boot: Boot,
  cat: Cat,
  wheelbarrow: Wheelbarrow,
};

export function TokenIcon({ token, className, color }: { token: string; className?: string; color?: string }) {
  const Icon = ICONS[token];
  if (!Icon) {
    // Ancien format (émoji) : on l'affiche tel quel.
    return <span className={className}>{token}</span>;
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="currentColor"
      aria-hidden
      style={{ "--token-bg": color ?? tokenInfo(token)?.color } as CSSProperties}
    >
      <Icon />
    </svg>
  );
}

/** Pion dans son disque de couleur. */
export function TokenBadge({
  token,
  color,
  size = 24,
  className = "",
  title,
}: {
  token: string;
  color: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full border-2 border-white text-white shadow-md ${className}`}
      style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, ${lighten(color)}, ${color} 70%)` }}
      title={title}
    >
      <TokenIcon token={token} color={color} className="h-[72%] w-[72%]" />
    </span>
  );
}

/** Version plus claire d'une couleur #rrggbb (reflet du disque). */
export function lighten(hex: string, amount = 0.35): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.round(v + (255 - v) * amount);
  };
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}
