"use client";

import { GameHeader, HeaderButton } from "@/components/GameHeader";
import { GameView } from "@/components/game/GameView";
import { Button } from "@/components/ui";
import { MAX_PLAYERS, MIN_PLAYERS, NAME_MAX_LENGTH, PLAYER_STYLES } from "@/game/constants";
import { usePlayerName } from "@/lib/client/playerName";
import { useLocalGame } from "@/lib/client/useLocalGame";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function LocalGamePage() {
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
              onClick={() => {
                if (confirm("Abandonner cette partie locale ?")) reset();
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

function LocalSetup({ onStart }: { onStart: (names: string[]) => void }) {
  const [myName] = usePlayerName();
  const [names, setNames] = useState<string[]>(["", ""]);

  const placeholder = (i: number) => (i === 0 && myName.trim()) || `Joueur ${i + 1}`;
  const finalNames = names.map((n, i) => n.trim() || placeholder(i));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-emerald-50/90 hover:underline">
        ← Accueil
      </Link>
      <section className="rounded-3xl bg-white/95 p-5 shadow-2xl">
        <h1 className="text-xl font-black text-slate-900">Partie sur cet appareil</h1>
        <p className="mt-1 text-sm text-slate-600">
          Passez-vous le téléphone ou l&apos;ordinateur à tour de rôle. Aucune connexion n&apos;est nécessaire.
        </p>
        <div className="mt-4 space-y-2">
          {names.map((n, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white text-base shadow"
                style={{ background: PLAYER_STYLES[i].color }}
              >
                {PLAYER_STYLES[i].token}
              </span>
              <input
                value={n}
                placeholder={placeholder(i)}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => setNames((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
              />
              {names.length > MIN_PLAYERS && (
                <button
                  type="button"
                  onClick={() => setNames((all) => all.filter((_, j) => j !== i))}
                  className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Retirer ce joueur"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {names.length < MAX_PLAYERS && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNames((all) => [...all, ""])}>
            + Ajouter un joueur
          </Button>
        )}
        <Button size="lg" className="mt-4 w-full" onClick={() => onStart(finalNames)}>
          Lancer la partie
        </Button>
      </section>
    </main>
  );
}
