"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { TokenBadge } from "./tokens";

type Variant = "primary" | "secondary" | "success" | "danger" | "dangerSolid" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-[#e0213f] to-[#b10d28] text-white shadow-[0_4px_14px_-4px_rgb(200_16_46/0.7)] hover:brightness-110",
  secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 hover:ring-slate-400",
  success:
    "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_4px_14px_-4px_rgb(5_150_105/0.7)] hover:brightness-110",
  danger: "bg-white text-red-700 ring-1 ring-red-300 hover:bg-red-50",
  dangerSolid: "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_4px_14px_-4px_rgb(220_38_38/0.7)] hover:brightness-110",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3.5 text-base" };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:brightness-100 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Panel({
  title,
  icon,
  children,
  className = "",
  right,
  accent,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
  /** Couleur du liseré supérieur (ex. couleur du joueur). */
  accent?: string;
}) {
  return (
    <section
      className={`panel relative overflow-hidden rounded-2xl bg-white p-3 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.5)] ring-1 ring-black/5 sm:p-4 ${className}`}
    >
      {accent && <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />}
      {title && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-slate-500">
            {icon && <span className="text-base leading-none">{icon}</span>}
            {title}
          </h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  if (!open) return null;
  return (
    <div
      className="backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal
        className={`sheet-in max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-5 ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto -mt-1 mb-2 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        {(title || dismissible) && (
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                className="-m-1 rounded-full p-1.5 text-slate-500 transition hover:rotate-90 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function PlayerChip({
  token,
  color,
  name,
  size = 26,
}: {
  token: string;
  color: string;
  name: string;
  size?: number;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
      <TokenBadge token={token} color={color} size={size} />
      <span className="truncate">{name}</span>
    </span>
  );
}
