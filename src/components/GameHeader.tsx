"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function GameHeader({ children, right }: { children?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 text-white">
      <div className="flex items-center gap-2">
        <Link href="/" className="rounded-md bg-[#c8102e] px-2 py-1 text-xs font-black tracking-wider shadow ring-1 ring-white/70">
          MONOPOLY GASY
        </Link>
        {children}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}

export function HeaderButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 hover:bg-white/20"
    >
      {children}
    </button>
  );
}
