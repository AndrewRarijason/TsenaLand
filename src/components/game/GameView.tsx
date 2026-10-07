"use client";

import { findPlayer } from "@/game/rules";
import type { GameAction, GameState } from "@/game/types";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Board } from "./Board";
import { AssetsModal, AuctionModal, CardModal, PropertyModal, TradeModal, WinnerModal } from "./modals";
import { ActionPanel, LogPanel, PlayersPanel, TradesPanel } from "./panels";

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
  const [busy, setBusy] = useState(false);
  const [seenCard, setSeenCard] = useState(state.card?.seq ?? 0);

  const actorId = useMemo(() => pickActor(state, controlled), [state, controlled]);
  const actor = findPlayer(state, actorId);

  const run = useCallback(
    async (action: GameAction, asId?: string) => {
      setBusy(true);
      try {
        await send(action, asId ?? actorId);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Action impossible.");
      } finally {
        setBusy(false);
      }
    },
    [send, actorId],
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const card = state.card && state.card.seq > seenCard ? state.card : null;
  const closeCard = useCallback(() => setSeenCard(state.card?.seq ?? 0), [state.card?.seq]);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-2 pb-6 pt-2 lg:px-4 lg:pt-4">
      {header}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="board-wrap lg:sticky lg:top-4">
          <div className={`board-scroller${zoom ? " zoomed" : ""}`}>
            <Board state={state} onTileClick={setTileId} />
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
              state={state}
              actorId={actorId}
              run={run}
              busy={busy}
              mode={mode}
              onAssets={() => setAssetsOpen(true)}
              onTrade={() => setTradeOpen(true)}
            />
          )}
          <TradesPanel state={state} controlled={controlled} run={run} busy={busy} />
          <PlayersPanel state={state} online={online} meIds={controlled} />
          <LogPanel state={state} />
        </aside>
      </div>

      <PropertyModal state={state} tileId={tileId} actorId={actorId} run={run} busy={busy} onClose={() => setTileId(null)} />
      <AssetsModal state={state} actorId={actorId} open={assetsOpen} run={run} busy={busy} onClose={() => setAssetsOpen(false)} />
      <TradeModal state={state} actorId={actorId} open={tradeOpen} run={run} busy={busy} onClose={() => setTradeOpen(false)} />
      <AuctionModal state={state} controlled={controlled} run={run} busy={busy} now={now} />
      <CardModal card={card} state={state} onClose={closeCard} />
      <WinnerModal state={state} onNewGame={onNewGame} />

      {toast && (
        <div className="pop fixed inset-x-3 top-3 z-[60] mx-auto max-w-md rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
