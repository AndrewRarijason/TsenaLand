"use client";

import { money } from "@/game/format";
import { findPlayer, netWorth } from "@/game/rules";
import type { GameState } from "@/game/types";
import Link from "next/link";
import { useState } from "react";
import { TokenBadge } from "../tokens";
import { Button, Modal } from "../ui";

const CONFETTI = ["#c8102e", "#facc15", "#16a34a", "#2563eb", "#f97316", "#ffffff"];

export function WinnerModal({ state, onNewGame }: { state: GameState; onNewGame?: () => void }) {
  const [open, setOpen] = useState(true);
  if (state.status !== "finished" || !open) return null;
  const winner = state.winnerId ? findPlayer(state, state.winnerId) : null;
  const ranking = [...state.players].sort((a, b) => netWorth(state, b.id) - netWorth(state, a.id));

  return (
    <Modal open onClose={() => setOpen(false)}>
      <div className="confetti" aria-hidden>
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: CONFETTI[i % CONFETTI.length],
              animationDelay: `${(i % 7) * 0.18}s`,
              animationDuration: `${2.2 + (i % 5) * 0.35}s`,
            }}
          />
        ))}
      </div>
      <div className="relative py-2 text-center">
        <div className="trophy text-6xl">🏆</div>
        {winner && (
          <>
            <div className="mt-3 flex justify-center">
              <TokenBadge token={winner.token} color={winner.color} size={56} />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{winner.name} gagne !</p>
            <p className="text-sm text-slate-600">avec {money(winner.cash)} en poche</p>
          </>
        )}
      </div>
      <ol className="mt-4 space-y-1.5">
        {ranking.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="w-5 font-black text-slate-400">{i + 1}</span>
            <TokenBadge token={p.token} color={p.color} size={24} />
            <span className="flex-1 truncate font-semibold text-slate-800">{p.name}</span>
            <span className="text-slate-600">{p.bankrupt ? "Faillite" : money(netWorth(state, p.id))}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {onNewGame && (
          <Button className="flex-1" onClick={onNewGame}>
            Nouvelle partie
          </Button>
        )}
        <Link
          href="/"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </Modal>
  );
}
