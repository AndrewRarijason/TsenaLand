"use client";

import { BOARD, GROUP_COLORS, isBuyable } from "@/game/board";
import { CARDS, DECK_LABEL } from "@/game/cards";
import { money } from "@/game/format";
import { activePlayers, findPlayer, netWorth, ownedTiles, rentOf, tradeTileError } from "@/game/rules";
import type { CardShown, GameState, TradeOffer } from "@/game/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Modal, PlayerChip } from "../ui";
import { PropertyActions, type Run } from "./PropertyActions";
import { TitleDeed } from "./TitleDeed";

// ------------------------------------------------------------ Case du plateau

export function PropertyModal({
  state,
  tileId,
  actorId,
  run,
  busy,
  onClose,
}: {
  state: GameState;
  tileId: number | null;
  actorId: string;
  run: Run;
  busy: boolean;
  onClose: () => void;
}) {
  if (tileId === null) return null;
  const tile = BOARD[tileId];
  const o = state.props[tileId];
  const owner = o?.owner ? findPlayer(state, o.owner) : null;
  return (
    <Modal open onClose={onClose}>
      <TitleDeed tile={tile} />
      {isBuyable(tile) && (
        <div className="mt-3 space-y-1 text-sm text-slate-700">
          <p>
            Propriétaire :{" "}
            {owner ? <PlayerChip token={owner.token} color={owner.color} name={owner.name} /> : <b>la Banque (à vendre {money(tile.price!)})</b>}
          </p>
          {o && o.houses > 0 && <p>Constructions : {o.houses === 5 ? "1 hôtel" : `${o.houses} maison(s)`}</p>}
          {o?.mortgaged && <p className="font-semibold text-amber-700">Hypothéquée : aucun loyer n&apos;est perçu.</p>}
          {owner && !o.mortgaged && tile.kind !== "utility" && <p>Loyer actuel : <b>{money(rentOf(state, tileId, 0))}</b></p>}
        </div>
      )}
      <PropertyActions state={state} actorId={actorId} tileId={tileId} run={run} busy={busy} />
    </Modal>
  );
}

// ------------------------------------------------------------ Mes biens

export function AssetsModal({
  state,
  actorId,
  open,
  run,
  busy,
  onClose,
}: {
  state: GameState;
  actorId: string;
  open: boolean;
  run: Run;
  busy: boolean;
  onClose: () => void;
}) {
  const p = findPlayer(state, actorId);
  if (!open || !p) return null;
  const tiles = ownedTiles(state, actorId);
  return (
    <Modal open onClose={onClose} title={`Biens de ${p.name}`} wide>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Argent" value={money(p.cash)} />
        <Stat label="Patrimoine" value={money(netWorth(state, actorId))} />
        <Stat label="Cartes Tsiafahy" value={String(p.jailCards.length)} />
      </div>
      {tiles.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Aucune propriété pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {tiles.map((t) => {
            const o = state.props[t.id];
            return (
              <li key={t.id} className="rounded-xl bg-slate-50 p-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-6 w-2 shrink-0 rounded-sm border border-slate-700/30"
                    style={{ background: t.group ? GROUP_COLORS[t.group] : "#334155" }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{t.name}</span>
                  <span className="shrink-0 text-xs text-slate-600">
                    {o.mortgaged ? "Hypothéquée" : o.houses === 5 ? "🏨 Hôtel" : o.houses > 0 ? `🏠 ×${o.houses}` : ""}
                  </span>
                </div>
                <div className="mt-2">
                  <PropertyActions state={state} actorId={actorId} tileId={t.id} run={run} busy={busy} compact />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Pour construire, il faut tout le groupe de couleur, sans hypothèque, et construire uniformément. Banque :{" "}
        {state.bankHouses} maisons, {state.bankHotels} hôtels disponibles.
      </p>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 px-2 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-bold text-slate-900">{value}</div>
    </div>
  );
}

// ------------------------------------------------------------ Proposer un échange

const emptyOffer = (): TradeOffer => ({ cash: 0, tiles: [], jailCards: 0 });

interface TradeModalProps {
  state: GameState;
  actorId: string;
  open: boolean;
  run: Run;
  busy: boolean;
  onClose: () => void;
}

export function TradeModal(props: TradeModalProps) {
  if (!props.open) return null;
  // Monté à chaque ouverture : le formulaire repart de zéro.
  return <TradeForm key={props.actorId} {...props} />;
}

function TradeForm({ state, actorId, run, busy, onClose }: TradeModalProps) {
  const partners = activePlayers(state).filter((p) => p.id !== actorId);
  const [partnerId, setPartnerId] = useState<string>(() => partners[0]?.id ?? "");
  const [give, setGive] = useState<TradeOffer>(emptyOffer);
  const [take, setTake] = useState<TradeOffer>(emptyOffer);

  const me = findPlayer(state, actorId);
  const partner = findPlayer(state, partnerId);
  if (!me) return null;

  const submit = async () => {
    if (!partner) return;
    await run({ type: "proposeTrade", toId: partner.id, give, take });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Proposer un échange" wide>
      {partners.length === 0 ? (
        <p className="text-sm text-slate-600">Aucun partenaire disponible.</p>
      ) : (
        <>
          <label className="mb-3 block text-sm font-semibold text-slate-700">
            Avec
            <select
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
              value={partnerId}
              onChange={(e) => {
                setPartnerId(e.target.value);
                setTake(emptyOffer());
              }}
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.token} {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <OfferEditor title={`${me.name} donne`} state={state} playerId={me.id} offer={give} onChange={setGive} />
            {partner && (
              <OfferEditor title={`${partner.name} donne`} state={state} playerId={partner.id} offer={take} onChange={setTake} />
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Les propriétés d&apos;un groupe avec maisons ne peuvent pas être échangées. Recevoir une propriété hypothéquée
            coûte 10 % d&apos;intérêts.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button disabled={busy || !partner} onClick={submit}>
              Envoyer la proposition
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function OfferEditor({
  title,
  state,
  playerId,
  offer,
  onChange,
}: {
  title: string;
  state: GameState;
  playerId: string;
  offer: TradeOffer;
  onChange: (o: TradeOffer) => void;
}) {
  const p = findPlayer(state, playerId)!;
  const tiles = ownedTiles(state, playerId);
  const toggle = (id: number) =>
    onChange({ ...offer, tiles: offer.tiles.includes(id) ? offer.tiles.filter((x) => x !== id) : [...offer.tiles, id] });
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <h3 className="mb-2 text-sm font-bold text-slate-800">{title}</h3>
      <label className="block text-xs font-semibold text-slate-600">
        Argent (max {money(p.cash)})
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={p.cash}
          value={offer.cash || ""}
          placeholder="0"
          onChange={(e) => onChange({ ...offer, cash: Math.max(0, Math.min(p.cash, Math.floor(Number(e.target.value) || 0))) })}
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
        />
      </label>
      {p.jailCards.length > 0 && (
        <label className="mt-2 block text-xs font-semibold text-slate-600">
          Cartes « Libéré de Tsiafahy » (max {p.jailCards.length})
          <input
            type="number"
            min={0}
            max={p.jailCards.length}
            value={offer.jailCards}
            onChange={(e) =>
              onChange({ ...offer, jailCards: Math.max(0, Math.min(p.jailCards.length, Math.floor(Number(e.target.value) || 0))) })
            }
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
      )}
      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {tiles.length === 0 && <p className="text-xs text-slate-500">Aucune propriété.</p>}
        {tiles.map((t) => {
          const err = tradeTileError(state, playerId, t.id);
          return (
            <label
              key={t.id}
              className={`flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm ${err ? "opacity-45" : "hover:bg-white"}`}
              title={err ?? undefined}
            >
              <input type="checkbox" disabled={!!err} checked={offer.tiles.includes(t.id)} onChange={() => toggle(t.id)} />
              <span
                className="h-4 w-1.5 shrink-0 rounded-sm"
                style={{ background: t.group ? GROUP_COLORS[t.group] : "#334155" }}
              />
              <span className="truncate text-slate-800">{t.name}</span>
              {state.props[t.id].mortgaged && <span className="text-[10px] text-amber-700">(hyp.)</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Enchères

function useTick(active: boolean, ms = 250) {
  const [, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}

export function AuctionModal({
  state,
  controlled,
  run,
  busy,
  now,
}: {
  state: GameState;
  controlled: string[];
  run: Run;
  busy: boolean;
  now: () => number;
}) {
  const a = state.phase.kind === "auction" ? state.auction : null;
  // Masquée pour une enchère précise : la suivante se réaffiche d'elle-même.
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  const [custom, setCustom] = useState<Record<string, string>>({});
  useTick(!!a);
  if (!a) return null;
  const hidden = hiddenId === a.id;
  const setHidden = (h: boolean) => setHiddenId(h ? a.id : null);

  const tile = BOARD[a.tileId];
  const leader = a.bidderId ? findPlayer(state, a.bidderId) : null;
  const left = Math.max(0, Math.ceil((a.endsAt - now()) / 1000));
  const bidders = state.players.filter((p) => controlled.includes(p.id) && !p.bankrupt);

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed inset-x-3 bottom-3 z-40 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-900 shadow-xl sm:inset-x-auto sm:right-4"
      >
        🔨 Enchère : {tile.name} — {money(a.bid)} ({left}s) · Afficher
      </button>
    );
  }

  return (
    <Modal open onClose={() => setHidden(true)} title="🔨 Enchères" dismissible>
      <TitleDeed tile={tile} compact />
      <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
        <div>
          <div className="text-xs uppercase tracking-wide text-amber-800">Meilleure offre</div>
          <div className="text-xl font-black text-slate-900">{money(a.bid)}</div>
          <div className="text-sm text-slate-700">
            {leader ? <PlayerChip token={leader.token} color={leader.color} name={leader.name} /> : "Aucune offre"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-amber-800">Fin dans</div>
          <div className={`text-3xl font-black tabular-nums ${left <= 3 ? "text-red-600" : "text-slate-900"}`}>{left}s</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Tout le monde peut enchérir. Chaque offre relance le compte à rebours. Sans offre, la propriété reste à la Banque.
      </p>
      <div className="mt-3 space-y-3">
        {bidders.map((p) => (
          <div key={p.id} className="rounded-xl bg-slate-50 p-2.5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <PlayerChip token={p.token} color={p.color} name={p.name} />
              <span className="font-semibold text-slate-700">{money(p.cash)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 10, 50, 100].map((inc) => (
                <Button
                  key={inc}
                  size="sm"
                  variant={inc === 10 ? "primary" : "secondary"}
                  disabled={busy || a.bid + inc > p.cash || a.bidderId === p.id}
                  onClick={() => run({ type: "bid", amount: a.bid + inc }, p.id)}
                >
                  +{inc}
                </Button>
              ))}
              <input
                type="number"
                inputMode="numeric"
                placeholder="Montant"
                value={custom[p.id] ?? ""}
                onChange={(e) => setCustom((c) => ({ ...c, [p.id]: e.target.value }))}
                className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !(Number(custom[p.id]) > a.bid) || Number(custom[p.id]) > p.cash}
                onClick={() => {
                  run({ type: "bid", amount: Math.floor(Number(custom[p.id])) }, p.id);
                  setCustom((c) => ({ ...c, [p.id]: "" }));
                }}
              >
                Offrir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ Carte tirée

export function CardModal({ card, state, onClose }: { card: CardShown | null; state: GameState; onClose: () => void }) {
  useEffect(() => {
    if (!card) return;
    const id = setTimeout(onClose, 9000);
    return () => clearTimeout(id);
  }, [card, onClose]);
  if (!card) return null;
  const def = CARDS[card.cardId];
  const who = findPlayer(state, card.playerId);
  const chance = card.deck === "chance";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onClick={onClose}>
      <div
        className={`pop w-full max-w-sm rounded-3xl border-4 border-white p-6 text-center shadow-2xl ${chance ? "bg-[#f97316]" : "bg-[#7dd3fc]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-900/70">{who?.name} tire une carte</div>
        <div className="mt-1 text-2xl font-black uppercase text-slate-900">{DECK_LABEL[card.deck]}</div>
        <div className="my-4 text-5xl">{chance ? "❓" : "🧰"}</div>
        <p className="rounded-2xl bg-white/90 p-4 text-base font-semibold leading-snug text-slate-900">{def.text}</p>
        <Button className="mt-4 w-full" variant="secondary" onClick={onClose}>
          OK
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Fin de partie

export function WinnerModal({ state, onNewGame }: { state: GameState; onNewGame?: () => void }) {
  const [open, setOpen] = useState(true);
  if (state.status !== "finished" || !open) return null;
  const winner = state.winnerId ? findPlayer(state, state.winnerId) : null;
  return (
    <Modal open onClose={() => setOpen(false)} title="Fin de la partie">
      <div className="py-4 text-center">
        <div className="text-6xl">🏆</div>
        {winner && (
          <p className="mt-3 text-xl font-black text-slate-900">
            {winner.token} {winner.name} remporte la partie avec {money(winner.cash)} !
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {onNewGame && (
          <Button className="flex-1" onClick={onNewGame}>
            Nouvelle partie
          </Button>
        )}
        <Link
          href="/"
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </Modal>
  );
}
