import { describe, expect, it } from "vitest";
import { BOARD } from "./board";
import { TOTAL_HOTELS, TOTAL_HOUSES } from "./constants";
import { addPlayer, applyAction, createGame, eliminatePlayer, GameError, type EngineContext } from "./engine";
import { buildError, currentPlayer, mortgageError, ownedTiles, sellError } from "./rules";
import type { GameAction, GameState } from "./types";

// Parties jouées au hasard par des robots : vérifie qu'aucune erreur inattendue
// ne survient et que les invariants du jeu sont toujours respectés.

function seeded(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 2 ** 32;
  };
}

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

function checkInvariants(s: GameState) {
  let houses = 0;
  let hotels = 0;
  for (const t of BOARD) {
    const o = s.props[t.id];
    if (!o) continue;
    if (o.houses === 5) hotels += 1;
    else houses += o.houses;
    if (o.owner) assert(s.players.find((p) => p.id === o.owner)?.bankrupt === false, `${t.name} appartient à un éliminé`);
    if (o.houses > 0) assert(!o.mortgaged, `${t.name} hypothéquée avec des maisons`);
  }
  assert(houses + s.bankHouses === TOTAL_HOUSES, "stock de maisons incohérent");
  assert(hotels + s.bankHotels === TOTAL_HOTELS, "stock d'hôtels incohérent");
  for (const p of s.players) assert(p.cash >= 0, `${p.name} a un solde négatif`);
  if (s.status === "playing") {
    // Le joueur courant peut être éliminé pendant une enchère ou une dette : son tour passe à la fin.
    if (s.phase.kind !== "auction" && s.phase.kind !== "debt") {
      assert(!currentPlayer(s).bankrupt, "joueur courant éliminé");
    }
    const cards =
      s.decks.chance.length + s.decks.community.length + s.players.reduce((n, p) => n + p.jailCards.length, 0);
    assert(cards === 32, "nombre de cartes incohérent");
  }
}

function pickAction(s: GameState, rnd: () => number): [string, GameAction] | null {
  const cur = currentPlayer(s);
  const p = s.phase;
  if (p.kind === "auction") {
    const a = s.auction!;
    const bidders = s.players.filter((x) => !x.bankrupt && x.cash > a.bid + 10);
    if (bidders.length && rnd() < 0.6) {
      const b = bidders[Math.floor(rnd() * bidders.length)];
      return [b.id, { type: "bid", amount: Math.min(b.cash, a.bid + 1 + Math.floor(rnd() * 40)) }];
    }
    return [cur.id, { type: "resolveAuction" }];
  }
  if (p.kind === "debt") {
    const d = s.debts[0];
    const debtor = s.players.find((x) => x.id === d.debtorId)!;
    if (debtor.cash >= d.amount) return [debtor.id, { type: "payDebt" }];
    for (const t of ownedTiles(s, debtor.id)) {
      if (!sellError(s, debtor.id, t.id)) return [debtor.id, { type: "sellBuilding", tileId: t.id }];
    }
    for (const t of ownedTiles(s, debtor.id)) {
      if (!mortgageError(s, debtor.id, t.id)) return [debtor.id, { type: "mortgage", tileId: t.id }];
    }
    return [debtor.id, { type: "bankrupt" }];
  }
  if (p.kind === "buy") return [cur.id, { type: rnd() < 0.75 ? "buy" : "declineBuy" }];
  if (p.kind === "cardChoice") return [cur.id, { type: "cardChoice", choice: rnd() < 0.5 ? "pay" : "draw" }];
  if (p.kind === "roll") {
    if (cur.inJail && cur.jailCards.length && rnd() < 0.5) return [cur.id, { type: "useJailCard" }];
    if (cur.inJail && cur.cash > 300 && rnd() < 0.5) return [cur.id, { type: "payJail" }];
    return [cur.id, { type: "roll" }];
  }
  if (p.kind === "endTurn") {
    if (rnd() < 0.5) {
      for (const t of ownedTiles(s, cur.id)) {
        if (!buildError(s, cur.id, t.id) && cur.cash > 400) return [cur.id, { type: "build", tileId: t.id }];
      }
    }
    if (rnd() < 0.05) {
      const others = s.players.filter((x) => !x.bankrupt && x.id !== cur.id);
      const mine = ownedTiles(s, cur.id).map((t) => t.id);
      const theirs = ownedTiles(s, others[0].id).map((t) => t.id);
      if (mine.length && theirs.length) {
        return [
          cur.id,
          {
            type: "proposeTrade",
            toId: others[0].id,
            give: { cash: 0, tiles: [mine[0]], jailCards: 0 },
            take: { cash: 0, tiles: [theirs[0]], jailCards: 0 },
          },
        ];
      }
    }
    if (s.trades.length && rnd() < 0.5) {
      const t = s.trades[0];
      return [t.toId, { type: "respondTrade", tradeId: t.id, accept: rnd() < 0.5 }];
    }
    return [cur.id, { type: "endTurn" }];
  }
  return null;
}

describe("simulation de parties aléatoires", () => {
  it("respecte les invariants sur 60 parties", () => {
    let finished = 0;
    for (let game = 0; game < 60; game++) {
      const rnd = seeded(game + 1);
      let now = 1_000_000;
      const ctx = (): EngineContext => ({ rng: rnd, now });
      const n = 2 + (game % 5);
      let s = createGame({ id: "p0", name: "P0" });
      for (let i = 1; i < n; i++) s = addPlayer(s, { id: `p${i}`, name: `P${i}` });
      s = applyAction(s, "p0", { type: "start" }, ctx());

      for (let step = 0; step < 3000 && s.status === "playing"; step++) {
        if (game % 7 === 0 && step === 300) {
          s = eliminatePlayer(s, currentPlayer(s).id, "déconnexion", ctx());
          checkInvariants(s);
          continue;
        }
        const choice = pickAction(s, rnd);
        if (!choice) break;
        const [who, action] = choice;
        if (action.type === "resolveAuction") now = s.auction!.endsAt + 1;
        try {
          s = applyAction(s, who, action, ctx());
        } catch (e) {
          if (!(e instanceof GameError)) throw e;
          if (action.type === "respondTrade") {
            s = applyAction(s, who, { type: "respondTrade", tradeId: action.tradeId, accept: false }, ctx());
          } else if (action.type === "buy") {
            s = applyAction(s, who, { type: "declineBuy" }, ctx());
          } else if (action.type === "proposeTrade") {
            s = applyAction(s, who, { type: "endTurn" }, ctx());
          } else {
            throw new Error(`Action refusée inattendue ${JSON.stringify(action)} : ${e.message}`);
          }
        }
        now += 1000;
        checkInvariants(s);
      }
      if (s.status === "finished") finished += 1;
    }
    expect(finished).toBeGreaterThan(10);
  }, 60_000);
});
