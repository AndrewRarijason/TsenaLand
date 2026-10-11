"use client";

import { TOKENS } from "@/game/tokens";
import { TokenBadge } from "../tokens";

/** Grille de choix du pion ; les pions déjà pris sont grisés avec le nom du joueur. */
export function TokenPicker({
  value,
  takenBy,
  onChange,
  disabled = false,
}: {
  value: string | null;
  /** Pion -> nom du joueur qui l'a déjà choisi. */
  takenBy: Record<string, string>;
  onChange: (token: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TOKENS.map((t) => {
        const owner = takenBy[t.id];
        const selected = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled || (!!owner && !selected)}
            onClick={() => onChange(t.id)}
            className={`group relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition ${
              selected
                ? "bg-amber-50 text-slate-900 ring-2 ring-amber-400"
                : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none`}
            title={owner && !selected ? `Pris par ${owner}` : t.label}
          >
            <TokenBadge token={t.id} color={t.color} size={40} className={selected ? "token-selected" : "transition group-hover:scale-110"} />
            <span className="max-w-full truncate">{owner && !selected ? owner : t.label}</span>
            {selected && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[10px] text-white">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
