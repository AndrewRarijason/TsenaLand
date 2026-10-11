"use client";

import { useConfirm } from "@/components/confirm";
import { GameHeader, HeaderButton } from "@/components/GameHeader";
import { GameView } from "@/components/game/GameView";
import { TokenPicker } from "@/components/game/TokenPicker";
import { TokenBadge } from "@/components/tokens";
import { Button, Modal } from "@/components/ui";
import { MAX_PLAYERS, MIN_PLAYERS, NAME_MAX_LENGTH } from "@/game/constants";
import { tokenInfo, TOKENS } from "@/game/tokens";
import { usePlayerName } from "@/lib/client/playerName";
import { useLocalGame } from "@/lib/client/useLocalGame";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function LocalGamePage() {
  const confirm = useConfirm();
  const { state, loaded, start, send, reset, now } = useLocalGame();
  const controlled = useMemo(() => state?.players.map((p) => p.id) ?? [], [state?.players]);

  if (!loaded) return null;

  if (!state) return <LocalSetup onStart={start} />;

  return (
    <GameView
      state={state}
      controlled={controlled}
      send={send}
      now={now}
      online={null}
      mode="local"
      onNewGame={reset}
      header={
        <GameHeader
          right={
            <HeaderButton
              onClick={async () => {
                const ok = await confirm({
                  title: "Abandonner la partie ?",
                  tone: "danger",
                  message: "La partie locale en cours sera perdue.",
                  confirmLabel: "Nouvelle partie",
                });
                if (ok) reset();
              }}
            >
              Nouvelle partie
            </HeaderButton>
          }
        >
          <span className="text-xs font-semibold text-emerald-50/80">Partie locale</span>
        </GameHeader>
      }
    />
  );
}

interface SetupRow {
  name: string;
  token: string;
}

function LocalSetup({ onStart }: { onStart: (players: { name: string; token: string }[]) => void }) {
  const [myName] = usePlayerName();
  const [rows, setRows] = useState<SetupRow[]>([
    { name: "", token: TOKENS[0].id },
    { name: "", token: TOKENS[1].id },
  ]);
  const [picking, setPicking] = useState<number | null>(null);

  const placeholder = (i: number) => (i === 0 && myName.trim()) || `Joueur ${i + 1}`;
  const update = (i: number, patch: Partial<SetupRow>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => {
    const used = new Set(rows.map((r) => r.token));
    const free = TOKENS.find((t) => !used.has(t.id))!;
    setRows((all) => [...all, { name: "", token: free.id }]);
  };
  const takenBy = (except: number) =>
    Object.fromEntries(rows.flatMap((r, j) => (j === except ? [] : [[r.token, r.name.trim() || placeholder(j)]])));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-emerald-50/90 hover:underline">
        ← Accueil
      </Link>
      <section className="pop rounded-3xl bg-white p-5 shadow-2xl">
        <h1 className="text-xl font-black text-slate-900">Partie sur cet appareil</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choisissez vos pions, puis passez-vous le téléphone ou l&apos;ordinateur à tour de rôle.
        </p>
        <div className="mt-4 space-y-2">
          {rows.map((r, i) => {
            const info = tokenInfo(r.token)!;
            return (
              <div key={i} className="fade-in flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPicking(i)}
                  className="group relative shrink-0 rounded-full transition hover:scale-105"
                  title="Changer de pion"
                >
                  <TokenBadge token={r.token} color={info.color} size={44} />
                  <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] shadow ring-1 ring-slate-200">
                    ✏️
                  </span>
                </button>
                <input
                  value={r.name}
                  placeholder={placeholder(i)}
                  maxLength={NAME_MAX_LENGTH}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-[#c8102e]/20"
                />
                {rows.length > MIN_PLAYERS && (
                  <button
                    type="button"
                    onClick={() => setRows((all) => all.filter((_, j) => j !== i))}
                    className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Retirer ce joueur"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {rows.length < MAX_PLAYERS && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={addRow}>
            + Ajouter un joueur
          </Button>
        )}
        <Button
          size="lg"
          className="mt-4 w-full"
          onClick={() => onStart(rows.map((r, i) => ({ name: r.name.trim() || placeholder(i), token: r.token })))}
        >
          Lancer la partie
        </Button>
      </section>

      <Modal open={picking !== null} onClose={() => setPicking(null)} title="Choisir un pion">
        {picking !== null && (
          <TokenPicker
            value={rows[picking]?.token ?? null}
            takenBy={takenBy(picking)}
            onChange={(token) => {
              update(picking, { token });
              setPicking(null);
            }}
          />
        )}
      </Modal>
    </main>
  );
}
