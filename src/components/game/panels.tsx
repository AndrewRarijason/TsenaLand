"use client";

import { BOARD, GROUP_COLORS } from "@/game/board";
import { JAIL_FINE, MAX_JAIL_TURNS } from "@/game/constants";
import { money } from "@/game/format";
import { currentPlayer, findPlayer, ownedTiles } from "@/game/rules";
import type { GameState, Trade, TradeOffer } from "@/game/types";
import type { ReactNode } from "react";
import { Button, Panel, PlayerChip } from "../ui";
import type { Run } from "./PropertyActions";
import { TitleDeed } from "./TitleDeed";

// ------------------------------------------------------------ Actions

export function ActionPanel({
  state,
  actorId,
  run,
  busy,
  mode,
  onAssets,
  onTrade,
}: {
  state: GameState;
  actorId: string;
  run: Run;
  busy: boolean;
  mode: "online" | "local";
  onAssets: () => void;
  onTrade: () => void;
}) {
  const cur = currentPlayer(state);
  const actor = findPlayer(state, actorId);
  if (!actor) return null;
  const myTurn = cur.id === actorId;
  const phase = state.phase;
  const lastEvent = state.log.at(-1)?.text;

  let content: ReactNode = null;

  if (state.status === "finished") {
    content = <p className="text-sm text-slate-700">La partie est terminée.</p>;
  } else if (actor.bankrupt) {
    content = <p className="text-sm text-slate-700">Vous êtes éliminé. Vous pouvez suivre la fin de la partie.</p>;
  } else if (phase.kind === "debt") {
    const d = state.debts[0];
    const debtor = findPlayer(state, d.debtorId)!;
    const creditor = d.creditorId ? findPlayer(state, d.creditorId) : null;
    if (d.debtorId === actorId) {
      content = (
        <div className="space-y-2">
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200">
            Vous devez <b>{money(d.amount)}</b> à {creditor ? creditor.name : "la Banque"} ({d.reason}).
            <br />
            Il vous manque <b>{money(Math.max(0, d.amount - actor.cash))}</b> : vendez des maisons, hypothéquez ou
            échangez.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={busy || actor.cash < d.amount} onClick={() => run({ type: "payDebt" })}>
              Payer {money(d.amount)}
            </Button>
            <Button variant="secondary" onClick={onAssets}>
              Gérer mes biens
            </Button>
          </div>
          <Button
            variant="danger"
            className="w-full"
            disabled={busy}
            onClick={() => {
              if (confirm("Déclarer faillite ? Vous serez éliminé de la partie.")) run({ type: "bankrupt" });
            }}
          >
            Déclarer faillite
          </Button>
        </div>
      );
    } else {
      content = <Waiting>{debtor.name} doit trouver {money(d.amount)}…</Waiting>;
    }
  } else if (!myTurn) {
    const waiting: Record<string, string> = {
      roll: `${cur.name} va lancer les dés…`,
      buy: `${cur.name} réfléchit à un achat…`,
      auction: "Enchères en cours…",
      cardChoice: `${cur.name} fait un choix…`,
      endTurn: `${cur.name} termine son tour…`,
    };
    content = <Waiting>{waiting[phase.kind] ?? "…"}</Waiting>;
  } else if (phase.kind === "roll") {
    content = actor.inJail ? (
      <div className="space-y-2">
        <p className="text-sm text-slate-700">
          🔒 Vous êtes à Tsiafahy (essai {actor.jailTurns + 1}/{MAX_JAIL_TURNS}).
        </p>
        <Button size="lg" className="w-full" disabled={busy} onClick={() => run({ type: "roll" })}>
          🎲 Tenter un double
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy || actor.cash < JAIL_FINE} onClick={() => run({ type: "payJail" })}>
            Payer {money(JAIL_FINE)}
          </Button>
          <Button
            variant="secondary"
            disabled={busy || actor.jailCards.length === 0}
            onClick={() => run({ type: "useJailCard" })}
          >
            Utiliser la carte
          </Button>
        </div>
      </div>
    ) : (
      <div className="space-y-2">
        {state.extraRoll && <p className="text-sm font-semibold text-emerald-700">Double ! Relancez les dés.</p>}
        <Button size="lg" className="w-full" disabled={busy} onClick={() => run({ type: "roll" })}>
          🎲 Lancer les dés
        </Button>
      </div>
    );
  } else if (phase.kind === "buy") {
    const tile = BOARD[phase.tileId];
    content = (
      <div className="space-y-2">
        <TitleDeed tile={tile} compact />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="success" disabled={busy || actor.cash < tile.price!} onClick={() => run({ type: "buy" })}>
            Acheter {money(tile.price!)}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => run({ type: "declineBuy" })}>
            Mettre aux enchères
          </Button>
        </div>
        {actor.cash < tile.price! && (
          <p className="text-xs text-slate-500">Pas assez d&apos;argent : hypothéquez un bien ou lancez les enchères.</p>
        )}
      </div>
    );
  } else if (phase.kind === "cardChoice") {
    content = (
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={busy} onClick={() => run({ type: "cardChoice", choice: "pay" })}>
          Payer {money(phase.amount)}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => run({ type: "cardChoice", choice: "draw" })}>
          Tirer une carte Chance
        </Button>
      </div>
    );
  } else if (phase.kind === "endTurn") {
    content = (
      <Button size="lg" className="w-full" disabled={busy} onClick={() => run({ type: "endTurn" })}>
        Terminer le tour ➜
      </Button>
    );
  } else if (phase.kind === "auction") {
    content = <Waiting>Enchères en cours…</Waiting>;
  }

  const title =
    state.status === "finished"
      ? "Fin de partie"
      : mode === "local" || !myTurn
        ? `Au tour de ${cur.name}`
        : "À vous de jouer !";

  return (
    <Panel title={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <PlayerChip token={actor.token} color={actor.color} name={mode === "local" ? actor.name : `${actor.name} (vous)`} />
        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-base font-bold text-emerald-800">{money(actor.cash)}</span>
      </div>
      {lastEvent && <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{lastEvent}</p>}
      {content}
      {!actor.bankrupt && state.status === "playing" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={onAssets}>
            🏠 Mes biens
          </Button>
          <Button variant="secondary" size="sm" onClick={onTrade}>
            🤝 Proposer un échange
          </Button>
        </div>
      )}
    </Panel>
  );
}

function Waiting({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-600">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      {children}
    </p>
  );
}

// ------------------------------------------------------------ Joueurs

export function PlayersPanel({
  state,
  online,
  meIds,
}: {
  state: GameState;
  online: Set<string> | null;
  meIds: string[];
}) {
  const cur = state.status === "playing" ? currentPlayer(state) : null;
  return (
    <Panel title="Joueurs">
      <ul className="space-y-1.5">
        {state.players.map((p) => {
          const tiles = ownedTiles(state, p.id);
          const isOnline = online ? online.has(p.id) : true;
          return (
            <li
              key={p.id}
              className={`rounded-xl px-2.5 py-2 ${cur?.id === p.id ? "bg-amber-50 ring-1 ring-amber-300" : "bg-slate-50"} ${p.bankrupt ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {online && (
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`}
                      title={isOnline ? "Connecté" : "Déconnecté"}
                    />
                  )}
                  <PlayerChip token={p.token} color={p.color} name={p.name + (meIds.length === 1 && meIds[0] === p.id ? " (vous)" : "")} />
                </div>
                <span className={`shrink-0 text-sm font-bold ${p.bankrupt ? "line-through" : "text-slate-800"}`}>
                  {money(p.cash)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 pl-1">
                {p.bankrupt && <Badge className="bg-slate-200 text-slate-700">Éliminé</Badge>}
                {p.inJail && <Badge className="bg-orange-100 text-orange-800">🔒 Tsiafahy</Badge>}
                {p.jailCards.length > 0 && <Badge className="bg-sky-100 text-sky-800">🎫 ×{p.jailCards.length}</Badge>}
                {online && !isOnline && !p.bankrupt && (
                  <Badge className="bg-red-100 text-red-700">Hors ligne</Badge>
                )}
                {tiles.map((t) => (
                  <span
                    key={t.id}
                    title={t.name}
                    className={`h-3 w-2.5 rounded-[2px] border border-slate-700/40 ${state.props[t.id].mortgaged ? "opacity-40" : ""}`}
                    style={{ background: t.group ? GROUP_COLORS[t.group] : t.kind === "station" ? "#334155" : "#e2e8f0" }}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {online && (
        <p className="mt-2 text-[11px] text-slate-500">
          Un joueur hors ligne depuis plus de 5 minutes est éliminé (ses biens retournent à la Banque).
        </p>
      )}
    </Panel>
  );
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${className}`}>{children}</span>;
}

// ------------------------------------------------------------ Journal

export function LogPanel({ state }: { state: GameState }) {
  const entries = [...state.log].reverse().slice(0, 40);
  return (
    <Panel title="Journal">
      <ol className="max-h-64 space-y-1 overflow-y-auto pr-1 text-xs text-slate-700">
        {entries.map((e) => (
          <li key={e.id} className="border-b border-slate-100 pb-1 last:border-0">
            {e.text}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

// ------------------------------------------------------------ Échanges en cours

export function describeOffer(o: TradeOffer): string {
  const parts = [
    ...(o.cash ? [money(o.cash)] : []),
    ...o.tiles.map((id) => BOARD[id].name),
    ...(o.jailCards ? [`${o.jailCards} carte(s) « Libéré de Tsiafahy »`] : []),
  ];
  return parts.length ? parts.join(", ") : "rien";
}

export function TradesPanel({
  state,
  controlled,
  run,
  busy,
}: {
  state: GameState;
  controlled: string[];
  run: Run;
  busy: boolean;
}) {
  const mine = state.trades.filter((t) => controlled.includes(t.fromId) || controlled.includes(t.toId));
  if (mine.length === 0) return null;
  return (
    <Panel title="Échanges proposés" className="ring-2 ring-amber-300">
      <ul className="space-y-2">
        {mine.map((t) => (
          <TradeItem key={t.id} state={state} trade={t} controlled={controlled} run={run} busy={busy} />
        ))}
      </ul>
    </Panel>
  );
}

function TradeItem({
  state,
  trade,
  controlled,
  run,
  busy,
}: {
  state: GameState;
  trade: Trade;
  controlled: string[];
  run: Run;
  busy: boolean;
}) {
  const from = findPlayer(state, trade.fromId)!;
  const to = findPlayer(state, trade.toId)!;
  const incoming = controlled.includes(trade.toId);
  return (
    <li className="rounded-xl bg-slate-50 p-3 text-sm">
      <p className="font-semibold text-slate-800">
        {from.name} → {to.name}
      </p>
      <p className="mt-1 text-slate-700">
        <b>{from.name}</b> donne : {describeOffer(trade.give)}
      </p>
      <p className="text-slate-700">
        <b>{to.name}</b> donne : {describeOffer(trade.take)}
      </p>
      <div className="mt-2 flex gap-2">
        {incoming ? (
          <>
            <Button
              size="sm"
              variant="success"
              disabled={busy}
              onClick={() => run({ type: "respondTrade", tradeId: trade.id, accept: true }, trade.toId)}
            >
              Accepter
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => run({ type: "respondTrade", tradeId: trade.id, accept: false }, trade.toId)}
            >
              Refuser
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => run({ type: "cancelTrade", tradeId: trade.id }, trade.fromId)}
          >
            Annuler ma proposition
          </Button>
        )}
      </div>
    </li>
  );
}
