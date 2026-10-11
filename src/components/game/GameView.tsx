"use client";

import { currentPlayer, findPlayer } from "@/game/rules";
import type { GameAction, GameState } from "@/game/types";
import { usePlayback } from "@/lib/client/playback";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { TokenBadge } from "../tokens";
import { Board } from "./Board";
import { CardModal } from "./CardModal";
import { AssetsModal, AuctionModal, PropertyModal, TradeModal } from "./modals";
import { ActionPanel, LogPanel, PlayersPanel, TradesPanel } from "./panels";
import { WinnerModal } from "./WinnerModal";

export interface GameViewProps {
  state: GameState;
  /** Joueurs que cet écran contrôle (un seul en ligne, tous en mode local). */
  controlled: string[];
  send: (action: GameAction, asId: string) => Promise<void>;
  /** Horloge synchronisée avec le serveur (comptes à rebours). */
  now: () => number;
  online: Set<string> | null;
  mode: "online" | "local";
  header: ReactNode;
  onNewGame?: () => void;
}

/** Joueur pour qui l'écran agit : débiteur, joueur courant ou soi-même. */
function pickActor(s: GameState, controlled: string[]): string {
  const debtor = s.phase.kind === "debt" ? s.debts[0]?.debtorId : undefined;
  if (debtor && controlled.includes(debtor)) return debtor;
  const current = s.players[s.current]?.id;
  if (current && controlled.includes(current)) return current;
  return controlled[0];
}

export function GameView({ state, controlled, send, now, online, mode, header, onNewGame }: GameViewProps) {
  const [tileId, setTileId] = useState<number | null>(null);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // L'écran affiche `view` : l'état précédent tant que l'animation du coup n'est pas finie.
  const pb = usePlayback(state, controlled);
  const view = pb.view;
  const busy = sending || pb.busy;

  const actorId = useMemo(() => pickActor(view, controlled), [view, controlled]);
  const actor = findPlayer(view, actorId);
  const cur = view.status === "playing" ? currentPlayer(view) : null;
  const highlightId = mode === "online" ? (controlled[0] ?? null) : (cur?.id ?? null);
  const highlightLabel = mode === "online" ? "VOUS" : (cur?.name ?? "");

  const run = useCallback(
    async (action: GameAction, asId?: string) => {
      setSending(true);
      try {
        await send(action, asId ?? actorId);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Action impossible.");
      } finally {
        setSending(false);
      }
    },
    [send, actorId],
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-2 pb-6 pt-2 lg:px-4 lg:pt-4">
      {header}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="board-wrap lg:sticky lg:top-4">
          <div className={`board-scroller${zoom ? " zoomed" : ""}`}>
            <Board
              state={view}
              positions={pb.positions}
              movingId={pb.movingId}
              jumpingId={pb.jumpingId}
              dice={pb.dice}
              diceKey={pb.diceKey}
              highlightId={highlightId}
              highlightLabel={highlightLabel}
              onTileClick={setTileId}
            />
          </div>
          <div className="mt-2 flex justify-end lg:hidden">
            <button
              type="button"
              onClick={() => setZoom((z) => !z)}
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25"
            >
              {zoom ? "🔍 Vue d'ensemble" : "🔍 Agrandir le plateau"}
            </button>
          </div>
        </div>

        <aside className="flex w-full flex-col gap-3 lg:w-[400px] lg:shrink-0">
          {actor && (
            <ActionPanel
              state={view}
              actorId={actorId}
              run={run}
              busy={busy}
              animating={pb.busy}
              mode={mode}
              onAssets={() => setAssetsOpen(true)}
              onTrade={() => setTradeOpen(true)}
            />
          )}
          <TradesPanel state={view} controlled={controlled} run={run} busy={busy} />
          <PlayersPanel state={view} online={online} meIds={controlled} mode={mode} />
          <LogPanel state={view} />
        </aside>
      </div>

      <PropertyModal state={view} tileId={tileId} actorId={actorId} run={run} busy={busy} onClose={() => setTileId(null)} />
      <AssetsModal state={view} actorId={actorId} open={assetsOpen} run={run} busy={busy} onClose={() => setAssetsOpen(false)} />
      <TradeModal state={view} actorId={actorId} open={tradeOpen} run={run} busy={busy} onClose={() => setTradeOpen(false)} />
      {!pb.busy && <AuctionModal state={view} controlled={controlled} run={run} busy={busy} now={now} />}
      <CardModal prompt={pb.card} state={view} onOpen={pb.openCard} onClose={pb.closeCard} />
      {!pb.busy && <WinnerModal state={view} onNewGame={onNewGame} />}
      {cur && !pb.busy && <TurnBanner key={`${view.turn}-${cur.id}`} state={view} mine={mode === "online" && cur.id === controlled[0]} />}

      {toast && (
        <div className="toast-in fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl ring-1 ring-white/10">
          <span className="text-lg">⚠️</span>
          {toast}
        </div>
      )}
    </div>
  );
}

/** Bandeau éphémère au changement de tour. */
function TurnBanner({ state, mine }: { state: GameState; mine: boolean }) {
  const cur = currentPlayer(state);
  return (
    <div className="turn-banner pointer-events-none fixed inset-x-0 top-[18%] z-40 flex justify-center px-4" aria-live="polite">
      <div
        className={`flex items-center gap-3 rounded-full py-2.5 pl-2.5 pr-6 text-white shadow-2xl ring-4 ring-white/70 ${mine ? "text-lg" : "text-base"}`}
        style={{ background: `linear-gradient(135deg, ${cur.color}, #0f172a)` }}
      >
        <TokenBadge token={cur.token} color={cur.color} size={mine ? 44 : 36} />
        <span className="font-black tracking-wide">{mine ? "À vous de jouer !" : `Au tour de ${cur.name}`}</span>
      </div>
    </div>
  );
}
