import { BOARD, isBuyable } from "./board";
import { CARDS, DECK_LABEL, deckCardIds, jailFreeCardId } from "./cards";
import * as C from "./constants";
import { money } from "./format";
import {
  activePlayers,
  buildError,
  currentPlayer,
  diceTotal,
  findPlayer,
  managementBlocked,
  mortgageError,
  mortgageInterest,
  ownedTiles,
  rentOf,
  sellError,
  tradeTileError,
  unmortgageCost,
  unmortgageError,
} from "./rules";
import type {
  Continuation,
  DeckName,
  GameAction,
  GameState,
  Player,
  Trade,
  TradeOffer,
} from "./types";

// Moteur du jeu : fonctions pures. Chaque appel reçoit un état, renvoie un nouvel
// état, et lève une GameError (message en français) si l'action est interdite.
// Le serveur l'utilise pour arbitrer les parties en ligne ; le mode local l'exécute
// directement dans le navigateur.

export class GameError extends Error {}

export interface EngineContext {
  /** Nombre aléatoire dans [0, 1). */
  rng: () => number;
  /** Horodatage en millisecondes. */
  now: number;
}

const FINISH: Continuation = { kind: "finishMove" };

function fail(message: string): never {
  throw new GameError(message);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function log(s: GameState, text: string) {
  s.logSeq += 1;
  s.log.push({ id: s.logSeq, text });
  if (s.log.length > C.LOG_LIMIT) s.log.splice(0, s.log.length - C.LOG_LIMIT);
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPlayer(s: GameState, id: string): Player {
  return findPlayer(s, id) ?? fail("Joueur introuvable.");
}

// ---------------------------------------------------------------- Salon

export function createGame(host: { id: string; name: string }): GameState {
  const s: GameState = {
    version: 0,
    status: "lobby",
    hostId: host.id,
    players: [],
    current: 0,
    phase: { kind: "lobby" },
    props: {},
    bankHouses: C.TOTAL_HOUSES,
    bankHotels: C.TOTAL_HOTELS,
    decks: { chance: [], community: [] },
    dice: null,
    rollSeq: 0,
    doubles: 0,
    extraRoll: false,
    debts: [],
    afterDebts: null,
    auction: null,
    trades: [],
    card: null,
    cardSeq: 0,
    log: [],
    logSeq: 0,
    winnerId: null,
    turn: 0,
  };
  for (const t of BOARD) if (isBuyable(t)) s.props[t.id] = { owner: null, houses: 0, mortgaged: false };
  pushPlayer(s, host);
  return s;
}

function pushPlayer(s: GameState, p: { id: string; name: string }) {
  const used = new Set(s.players.map((x) => x.token));
  const style = C.PLAYER_STYLES.find((st) => !used.has(st.token)) ?? C.PLAYER_STYLES[0];
  s.players.push({
    id: p.id,
    name: p.name,
    token: style.token,
    color: style.color,
    cash: C.START_CASH,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailCards: [],
    bankrupt: false,
  });
  log(s, `${p.name} rejoint la partie.`);
}

export function addPlayer(state: GameState, p: { id: string; name: string }): GameState {
  if (state.status !== "lobby") fail("La partie a déjà commencé.");
  if (state.players.some((x) => x.id === p.id)) return state;
  if (state.players.length >= C.MAX_PLAYERS) fail(`La partie est complète (${C.MAX_PLAYERS} joueurs maximum).`);
  const s = clone(state);
  pushPlayer(s, p);
  s.version += 1;
  return s;
}

export function removeLobbyPlayer(state: GameState, playerId: string): GameState {
  if (state.status !== "lobby") fail("La partie a déjà commencé.");
  const s = clone(state);
  const p = s.players.find((x) => x.id === playerId);
  if (!p) return state;
  s.players = s.players.filter((x) => x.id !== playerId);
  log(s, `${p.name} quitte le salon.`);
  if (s.hostId === playerId && s.players.length > 0) {
    s.hostId = s.players[0].id;
    log(s, `${s.players[0].name} devient l'hôte.`);
  }
  s.version += 1;
  return s;
}

/** Élimination forcée (déconnexion trop longue) : les biens retournent à la Banque. */
export function eliminatePlayer(state: GameState, playerId: string, reason: string, ctx: EngineContext): GameState {
  const p = findPlayer(state, playerId);
  if (!p || p.bankrupt || state.status !== "playing") return state;
  const s = clone(state);
  log(s, reason);
  removeFromGame(s, playerId, ctx);
  s.version += 1;
  return s;
}

/** Retire un joueur en cours de partie et fait avancer le jeu si nécessaire. */
function removeFromGame(s: GameState, playerId: string, ctx: EngineContext) {
  const wasCurrent = currentPlayer(s).id === playerId;
  goBankrupt(s, playerId, null);
  if (s.status !== "playing") return;
  if (s.phase.kind === "debt") {
    if (s.debts.length === 0) runContinuation(s, s.afterDebts ?? FINISH, ctx);
  } else if (s.phase.kind === "auction") {
    // L'enchère continue ; le tour passera à la fin de l'enchère.
  } else if (wasCurrent) {
    advanceTurn(s);
  }
}

/** Version de l'état envoyée aux navigateurs (ordre des cartes masqué). */
export function toPublicState(state: GameState): GameState {
  return { ...state, decks: { chance: [], community: [] } };
}

// ---------------------------------------------------------------- Actions

export function applyAction(state: GameState, actorId: string, action: GameAction, ctx: EngineContext): GameState {
  const s = clone(state);
  const actor = getPlayer(s, actorId);

  if (action.type === "start") {
    startGame(s, actorId, ctx);
    s.version += 1;
    return s;
  }
  if (action.type === "leave") {
    if (s.status === "lobby") return removeLobbyPlayer(state, actorId);
    if (s.status === "playing" && !actor.bankrupt) {
      log(s, `${actor.name} quitte la partie : ses biens retournent à la Banque.`);
      removeFromGame(s, actorId, ctx);
      s.version += 1;
    }
    return s;
  }

  if (s.status !== "playing") fail("La partie n'est pas en cours.");
  if (actor.bankrupt) fail("Vous êtes éliminé.");

  const isCurrent = currentPlayer(s).id === actorId;
  const requireTurn = (...phases: GameState["phase"]["kind"][]) => {
    if (!isCurrent) fail("Ce n'est pas votre tour.");
    if (!phases.includes(s.phase.kind)) fail("Action impossible pour le moment.");
  };

  switch (action.type) {
    case "roll":
      requireTurn("roll");
      roll(s, actor, ctx);
      break;

    case "payJail":
      requireTurn("roll");
      if (!actor.inJail) fail("Vous n'êtes pas à Tsiafahy.");
      if (actor.cash < C.JAIL_FINE) fail("Fonds insuffisants.");
      actor.cash -= C.JAIL_FINE;
      actor.inJail = false;
      actor.jailTurns = 0;
      log(s, `${actor.name} paie ${money(C.JAIL_FINE)} et sort de Tsiafahy.`);
      break;

    case "useJailCard": {
      requireTurn("roll");
      if (!actor.inJail) fail("Vous n'êtes pas à Tsiafahy.");
      const deck = actor.jailCards.pop() ?? fail("Vous n'avez pas de carte « Libéré de Tsiafahy ».");
      s.decks[deck].push(jailFreeCardId(deck));
      actor.inJail = false;
      actor.jailTurns = 0;
      log(s, `${actor.name} utilise sa carte « Libéré de Tsiafahy ».`);
      break;
    }

    case "buy": {
      requireTurn("buy");
      const tileId = (s.phase as { tileId: number }).tileId;
      const tile = BOARD[tileId];
      if (actor.cash < tile.price!) fail("Fonds insuffisants : hypothéquez ou mettez aux enchères.");
      actor.cash -= tile.price!;
      s.props[tileId].owner = actor.id;
      log(s, `${actor.name} achète ${tile.name} pour ${money(tile.price!)}.`);
      finishMove(s);
      break;
    }

    case "declineBuy": {
      requireTurn("buy");
      const tileId = (s.phase as { tileId: number }).tileId;
      s.auction = { id: s.logSeq + 1, tileId, bid: 0, bidderId: null, endsAt: ctx.now + C.AUCTION_START_MS };
      s.phase = { kind: "auction" };
      log(s, `${BOARD[tileId].name} est mise aux enchères.`);
      break;
    }

    case "bid": {
      if (s.phase.kind !== "auction" || !s.auction) fail("Aucune enchère en cours.");
      const a = s.auction;
      if (ctx.now > a.endsAt + 500) fail("L'enchère est terminée.");
      const amount = Math.floor(action.amount);
      if (!(amount > a.bid)) fail(`L'offre doit dépasser ${money(a.bid)}.`);
      if (amount > actor.cash) fail("Vous n'avez pas assez d'argent.");
      a.bid = amount;
      a.bidderId = actor.id;
      a.endsAt = Math.max(a.endsAt, ctx.now + C.AUCTION_EXTEND_MS);
      log(s, `${actor.name} enchérit à ${money(amount)}.`);
      break;
    }

    case "resolveAuction": {
      if (s.phase.kind !== "auction" || !s.auction) fail("Aucune enchère en cours.");
      if (ctx.now < s.auction.endsAt - 300) fail("L'enchère n'est pas terminée.");
      resolveAuction(s);
      break;
    }

    case "endTurn":
      requireTurn("endTurn");
      advanceTurn(s);
      break;

    case "build": {
      const err = buildError(s, actorId, action.tileId);
      if (err) fail(err);
      const tile = BOARD[action.tileId];
      const o = s.props[action.tileId];
      actor.cash -= tile.houseCost!;
      if (o.houses === 4) {
        s.bankHotels -= 1;
        s.bankHouses += 4;
      } else {
        s.bankHouses -= 1;
      }
      o.houses += 1;
      log(s, `${actor.name} construit ${o.houses === 5 ? "un hôtel" : "une maison"} sur ${tile.name}.`);
      break;
    }

    case "sellBuilding": {
      const err = sellError(s, actorId, action.tileId);
      if (err) fail(err);
      const tile = BOARD[action.tileId];
      const o = s.props[action.tileId];
      const half = tile.houseCost! / 2;
      if (o.houses === 5) {
        // L'hôtel redevient 4 maisons si la Banque en a assez, sinon on garde ce qu'elle a.
        const back = Math.min(4, s.bankHouses);
        s.bankHotels += 1;
        s.bankHouses -= back;
        o.houses = back;
        actor.cash += half * (5 - back);
        log(s, `${actor.name} vend l'hôtel de ${tile.name} (+${money(half * (5 - back))}).`);
      } else {
        o.houses -= 1;
        s.bankHouses += 1;
        actor.cash += half;
        log(s, `${actor.name} vend une maison sur ${tile.name} (+${money(half)}).`);
      }
      break;
    }

    case "mortgage": {
      const err = mortgageError(s, actorId, action.tileId);
      if (err) fail(err);
      const tile = BOARD[action.tileId];
      s.props[action.tileId].mortgaged = true;
      actor.cash += tile.mortgage!;
      log(s, `${actor.name} hypothèque ${tile.name} (+${money(tile.mortgage!)}).`);
      break;
    }

    case "unmortgage": {
      const err = unmortgageError(s, actorId, action.tileId);
      if (err) fail(err);
      const tile = BOARD[action.tileId];
      const cost = unmortgageCost(tile);
      s.props[action.tileId].mortgaged = false;
      actor.cash -= cost;
      log(s, `${actor.name} lève l'hypothèque de ${tile.name} (−${money(cost)}).`);
      break;
    }

    case "payDebt": {
      const d = s.debts[0];
      if (s.phase.kind !== "debt" || !d || d.debtorId !== actorId) fail("Vous n'avez pas de dette à régler.");
      if (actor.cash < d.amount) fail("Fonds insuffisants : vendez des maisons ou hypothéquez.");
      actor.cash -= d.amount;
      const creditor = d.creditorId ? findPlayer(s, d.creditorId) : undefined;
      if (creditor) creditor.cash += d.amount;
      log(s, `${actor.name} paie ${money(d.amount)} à ${creditor ? creditor.name : "la Banque"} (${d.reason}).`);
      s.debts.shift();
      if (s.debts.length === 0) runContinuation(s, s.afterDebts ?? FINISH, ctx);
      break;
    }

    case "bankrupt": {
      const d = s.debts[0];
      if (s.phase.kind !== "debt" || !d || d.debtorId !== actorId) fail("Vous n'avez pas de dette en cours.");
      goBankrupt(s, actorId, d.creditorId);
      if (s.status === "playing" && s.debts.length === 0) runContinuation(s, s.afterDebts ?? FINISH, ctx);
      break;
    }

    case "cardChoice": {
      requireTurn("cardChoice");
      const amount = (s.phase as { amount: number }).amount;
      if (action.choice === "pay") {
        charge(s, actor.id, null, amount, "amende");
        settle(s, FINISH, ctx);
      } else {
        drawCard(s, "chance", ctx);
      }
      break;
    }

    case "proposeTrade":
      proposeTrade(s, actor, action.toId, action.give, action.take, ctx);
      break;

    case "cancelTrade": {
      const t = s.trades.find((x) => x.id === action.tradeId);
      if (!t || t.fromId !== actorId) fail("Proposition introuvable.");
      s.trades = s.trades.filter((x) => x.id !== t.id);
      log(s, `${actor.name} retire sa proposition d'échange.`);
      break;
    }

    case "respondTrade":
      respondTrade(s, actor, action.tradeId, action.accept);
      break;

    default:
      fail("Action inconnue.");
  }

  s.version += 1;
  return s;
}

// ---------------------------------------------------------------- Déroulement

function startGame(s: GameState, actorId: string, ctx: EngineContext) {
  if (s.status !== "lobby") fail("La partie a déjà commencé.");
  if (actorId !== s.hostId) fail("Seul l'hôte peut lancer la partie.");
  if (s.players.length < C.MIN_PLAYERS) fail(`Il faut au moins ${C.MIN_PLAYERS} joueurs.`);
  s.players = shuffle(s.players, ctx.rng);
  s.decks = {
    chance: shuffle(deckCardIds("chance"), ctx.rng),
    community: shuffle(deckCardIds("community"), ctx.rng),
  };
  s.status = "playing";
  s.phase = { kind: "roll" };
  s.current = 0;
  s.turn = 1;
  log(s, `La partie commence ! ${s.players[0].name} joue en premier.`);
}

function roll(s: GameState, p: Player, ctx: EngineContext) {
  const d1 = 1 + Math.floor(ctx.rng() * 6);
  const d2 = 1 + Math.floor(ctx.rng() * 6);
  const total = d1 + d2;
  const isDouble = d1 === d2;
  s.dice = [d1, d2];
  s.rollSeq += 1;
  log(s, `${p.name} lance les dés : ${d1} + ${d2} = ${total}${isDouble ? " (double !)" : ""}.`);

  if (p.inJail) {
    s.extraRoll = false;
    if (isDouble) {
      p.inJail = false;
      p.jailTurns = 0;
      log(s, `${p.name} fait un double et sort de Tsiafahy.`);
      moveBy(s, p, total);
      resolveLanding(s, ctx);
      return;
    }
    p.jailTurns += 1;
    if (p.jailTurns >= C.MAX_JAIL_TURNS) {
      p.inJail = false;
      p.jailTurns = 0;
      log(s, `${p.name} échoue pour la 3e fois : il doit payer ${money(C.JAIL_FINE)} pour sortir.`);
      charge(s, p.id, null, C.JAIL_FINE, "sortie de Tsiafahy");
      settle(s, { kind: "moveAfterJail", steps: total }, ctx);
      return;
    }
    log(s, `${p.name} reste à Tsiafahy (${p.jailTurns}/${C.MAX_JAIL_TURNS}).`);
    s.phase = { kind: "endTurn" };
    return;
  }

  if (isDouble) {
    s.doubles += 1;
    if (s.doubles >= 3) {
      log(s, `Trois doubles de suite : ${p.name} va directement à Tsiafahy !`);
      sendToJail(s, p);
      s.phase = { kind: "endTurn" };
      return;
    }
  }
  s.extraRoll = isDouble;
  moveBy(s, p, total);
  resolveLanding(s, ctx);
}

function moveBy(s: GameState, p: Player, steps: number) {
  const from = p.position;
  if (steps > 0 && from + steps >= C.BOARD_SIZE) {
    p.cash += C.GO_SALARY;
    log(s, `${p.name} passe par la case Départ et reçoit ${money(C.GO_SALARY)}.`);
  }
  p.position = (((from + steps) % C.BOARD_SIZE) + C.BOARD_SIZE) % C.BOARD_SIZE;
}

function moveForwardTo(s: GameState, p: Player, to: number) {
  if (to < p.position) {
    p.cash += C.GO_SALARY;
    log(s, `${p.name} passe par la case Départ et reçoit ${money(C.GO_SALARY)}.`);
  }
  p.position = to;
}

function sendToJail(s: GameState, p: Player) {
  p.position = C.JAIL_POSITION;
  p.inJail = true;
  p.jailTurns = 0;
  s.extraRoll = false;
  s.doubles = 0;
}

function resolveLanding(s: GameState, ctx: EngineContext) {
  const p = currentPlayer(s);
  const tile = BOARD[p.position];
  switch (tile.kind) {
    case "go":
    case "jail":
    case "parking":
      finishMove(s);
      return;
    case "gotojail":
      log(s, `${p.name} va directement à Tsiafahy !`);
      sendToJail(s, p);
      finishMove(s);
      return;
    case "tax":
      charge(s, p.id, null, tile.amount!, tile.name);
      settle(s, FINISH, ctx);
      return;
    case "chance":
      drawCard(s, "chance", ctx);
      return;
    case "community":
      drawCard(s, "community", ctx);
      return;
    default: {
      const o = s.props[tile.id];
      if (!o.owner) {
        s.phase = { kind: "buy", tileId: tile.id };
        return;
      }
      if (o.owner === p.id) {
        finishMove(s);
        return;
      }
      if (o.mortgaged) {
        log(s, `${tile.name} est hypothéquée : pas de loyer.`);
        finishMove(s);
        return;
      }
      charge(s, p.id, o.owner, rentOf(s, tile.id, diceTotal(s)), `loyer de ${tile.name}`);
      settle(s, FINISH, ctx);
    }
  }
}

function drawCard(s: GameState, deck: DeckName, ctx: EngineContext) {
  const p = currentPlayer(s);
  if (s.decks[deck].length === 0) {
    // Ne devrait jamais arriver ; on reconstitue le paquet par sécurité.
    const held = new Set(s.players.flatMap((x) => x.jailCards.map(jailFreeCardId)));
    s.decks[deck] = shuffle(deckCardIds(deck).filter((id) => !held.has(id)), ctx.rng);
  }
  const cardId = s.decks[deck].shift()!;
  const card = CARDS[cardId];
  if (card.effect.kind !== "jailFree") s.decks[deck].push(cardId);
  s.cardSeq += 1;
  s.card = { seq: s.cardSeq, deck, cardId, playerId: p.id };
  log(s, `${p.name} tire une carte ${DECK_LABEL[deck]} : « ${card.text} »`);

  const e = card.effect;
  switch (e.kind) {
    case "advance":
      moveForwardTo(s, p, e.to);
      resolveLanding(s, ctx);
      return;
    case "back":
      moveBy(s, p, -e.steps);
      resolveLanding(s, ctx);
      return;
    case "goBackTo":
      p.position = e.to;
      resolveLanding(s, ctx);
      return;
    case "gain":
      p.cash += e.amount;
      finishMove(s);
      return;
    case "pay":
      charge(s, p.id, null, e.amount, `carte ${DECK_LABEL[deck]}`);
      settle(s, FINISH, ctx);
      return;
    case "repairs": {
      let houses = 0;
      let hotels = 0;
      for (const t of ownedTiles(s, p.id)) {
        const h = s.props[t.id].houses;
        if (h === 5) hotels += 1;
        else houses += h;
      }
      const amount = houses * e.house + hotels * e.hotel;
      if (amount === 0) log(s, `${p.name} n'a aucune construction : rien à payer.`);
      charge(s, p.id, null, amount, "réparations");
      settle(s, FINISH, ctx);
      return;
    }
    case "jail":
      sendToJail(s, p);
      finishMove(s);
      return;
    case "jailFree":
      p.jailCards.push(deck);
      finishMove(s);
      return;
    case "birthday":
      for (const other of activePlayers(s)) {
        if (other.id !== p.id) charge(s, other.id, p.id, e.amount, "anniversaire");
      }
      settle(s, FINISH, ctx);
      return;
    case "payOrChance":
      s.phase = { kind: "cardChoice", amount: e.amount };
      return;
  }
}

/** Paie tout de suite si possible, sinon inscrit une dette à régler. */
function charge(s: GameState, debtorId: string, creditorId: string | null, amount: number, reason: string) {
  if (amount <= 0) return;
  const debtor = getPlayer(s, debtorId);
  const creditor = creditorId ? getPlayer(s, creditorId) : undefined;
  if (debtor.cash >= amount) {
    debtor.cash -= amount;
    if (creditor) creditor.cash += amount;
    log(s, `${debtor.name} paie ${money(amount)} à ${creditor ? creditor.name : "la Banque"} (${reason}).`);
    return;
  }
  s.debts.push({ debtorId, creditorId, amount, reason });
  log(
    s,
    `${debtor.name} doit ${money(amount)} à ${creditor ? creditor.name : "la Banque"} (${reason}) mais n'a que ${money(debtor.cash)}.`,
  );
}

function settle(s: GameState, next: Continuation, ctx: EngineContext) {
  if (s.debts.length > 0) {
    s.phase = { kind: "debt" };
    s.afterDebts = next;
  } else {
    runContinuation(s, next, ctx);
  }
}

function runContinuation(s: GameState, next: Continuation, ctx: EngineContext) {
  s.afterDebts = null;
  if (s.status !== "playing") return;
  const p = currentPlayer(s);
  if (p.bankrupt) {
    advanceTurn(s);
    return;
  }
  if (next.kind === "moveAfterJail") {
    moveBy(s, p, next.steps);
    resolveLanding(s, ctx);
    return;
  }
  finishMove(s);
}

function finishMove(s: GameState) {
  const p = currentPlayer(s);
  if (p.bankrupt) {
    advanceTurn(s);
    return;
  }
  s.phase = s.extraRoll && !p.inJail ? { kind: "roll" } : { kind: "endTurn" };
}

function advanceTurn(s: GameState) {
  if (checkWinner(s)) return;
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const j = (s.current + k) % n;
    if (!s.players[j].bankrupt) {
      s.current = j;
      break;
    }
  }
  s.doubles = 0;
  s.extraRoll = false;
  s.phase = { kind: "roll" };
  s.turn += 1;
}

function checkWinner(s: GameState): boolean {
  const alive = activePlayers(s);
  if (s.status !== "playing" || alive.length > 1) return false;
  s.status = "finished";
  s.phase = { kind: "finished" };
  s.winnerId = alive[0]?.id ?? null;
  s.auction = null;
  s.debts = [];
  s.afterDebts = null;
  s.trades = [];
  log(s, alive[0] ? `🏆 ${alive[0].name} remporte la partie !` : "La partie est terminée.");
  return true;
}

function resolveAuction(s: GameState) {
  const a = s.auction!;
  const tile = BOARD[a.tileId];
  const winner = a.bidderId ? findPlayer(s, a.bidderId) : undefined;
  if (winner && !winner.bankrupt && winner.cash >= a.bid) {
    winner.cash -= a.bid;
    s.props[a.tileId].owner = winner.id;
    log(s, `${winner.name} remporte ${tile.name} aux enchères pour ${money(a.bid)}.`);
  } else {
    log(s, `Aucune offre : ${tile.name} reste à la Banque.`);
  }
  s.auction = null;
  finishMove(s);
}

/**
 * Faillite. Envers un joueur : il récupère l'argent (constructions revendues à
 * la Banque), les propriétés et les cartes. Envers la Banque : tout lui revient.
 */
function goBankrupt(s: GameState, playerId: string, creditorId: string | null) {
  const p = getPlayer(s, playerId);
  const creditor = creditorId ? findPlayer(s, creditorId) : undefined;
  p.bankrupt = true;
  p.inJail = false;
  log(s, `💸 ${p.name} fait faillite${creditor ? ` au profit de ${creditor.name}` : ""}.`);

  s.debts = s.debts.filter((d) => d.debtorId !== playerId);
  for (const d of s.debts) if (d.creditorId === playerId) d.creditorId = null;
  s.trades = s.trades.filter((t) => t.fromId !== playerId && t.toId !== playerId);
  if (s.auction?.bidderId === playerId) {
    s.auction.bid = 0;
    s.auction.bidderId = null;
  }

  let interest = 0;
  for (const tile of ownedTiles(s, playerId)) {
    const o = s.props[tile.id];
    if (o.houses > 0) {
      if (o.houses === 5) s.bankHotels += 1;
      else s.bankHouses += o.houses;
      p.cash += (o.houses * tile.houseCost!) / 2;
      o.houses = 0;
    }
    if (creditor) {
      o.owner = creditor.id;
      if (o.mortgaged) interest += mortgageInterest(tile);
    } else {
      o.owner = null;
      o.mortgaged = false;
    }
  }

  if (creditor) {
    creditor.cash += p.cash;
    creditor.jailCards.push(...p.jailCards);
  } else {
    for (const deck of p.jailCards) s.decks[deck].push(jailFreeCardId(deck));
  }
  p.cash = 0;
  p.jailCards = [];
  if (checkWinner(s)) return;
  // Le nouveau propriétaire paie 10 % d'intérêts sur chaque bien hypothéqué reçu.
  if (creditor && interest > 0) charge(s, creditor.id, null, interest, "intérêts d'hypothèque");
}

// ---------------------------------------------------------------- Échanges

function normalizeOffer(o: TradeOffer): TradeOffer {
  return {
    cash: Math.max(0, Math.floor(Number(o.cash) || 0)),
    tiles: [...new Set(o.tiles.map(Number))],
    jailCards: Math.max(0, Math.floor(Number(o.jailCards) || 0)),
  };
}

function offerError(s: GameState, playerId: string, o: TradeOffer): string | null {
  const p = findPlayer(s, playerId);
  if (!p || p.bankrupt) return "Joueur inactif.";
  if (o.cash > p.cash) return `${p.name} n'a pas assez d'argent.`;
  if (o.jailCards > p.jailCards.length) return `${p.name} n'a pas assez de cartes « Libéré de Tsiafahy ».`;
  for (const id of o.tiles) {
    const err = tradeTileError(s, playerId, id);
    if (err) return err;
  }
  return null;
}

function proposeTrade(
  s: GameState,
  actor: Player,
  toId: string,
  giveRaw: TradeOffer,
  takeRaw: TradeOffer,
  ctx: EngineContext,
) {
  const blocked = managementBlocked(s);
  if (blocked) fail(blocked);
  const target = getPlayer(s, toId);
  if (target.id === actor.id || target.bankrupt) fail("Partenaire d'échange invalide.");
  const give = normalizeOffer(giveRaw);
  const take = normalizeOffer(takeRaw);
  const empty = (o: TradeOffer) => o.cash === 0 && o.tiles.length === 0 && o.jailCards === 0;
  if (empty(give) && empty(take)) fail("La proposition est vide.");
  const err = offerError(s, actor.id, give) ?? offerError(s, target.id, take);
  if (err) fail(err);
  s.trades = s.trades.filter((t) => t.fromId !== actor.id);
  const id = `${s.logSeq + 1}-${Math.floor(ctx.rng() * 1e9).toString(36)}`;
  s.trades.push({ id, fromId: actor.id, toId: target.id, give, take });
  log(s, `${actor.name} propose un échange à ${target.name}.`);
}

function respondTrade(s: GameState, actor: Player, tradeId: string, accept: boolean) {
  const t = s.trades.find((x) => x.id === tradeId);
  if (!t || t.toId !== actor.id) fail("Proposition introuvable.");
  const from = getPlayer(s, t.fromId);
  if (!accept) {
    s.trades = s.trades.filter((x) => x.id !== t.id);
    log(s, `${actor.name} refuse l'échange proposé par ${from.name}.`);
    return;
  }
  const blocked = managementBlocked(s);
  if (blocked) fail(blocked);
  const invalid = offerError(s, from.id, t.give) ?? offerError(s, actor.id, t.take);
  if (invalid) {
    s.trades = s.trades.filter((x) => x.id !== t.id);
    log(s, `L'échange entre ${from.name} et ${actor.name} n'est plus possible (${invalid})`);
    return;
  }
  // 10 % d'intérêts sur chaque propriété hypothéquée reçue.
  const interestOn = (tiles: number[]) =>
    tiles.filter((id) => s.props[id].mortgaged).reduce((sum, id) => sum + mortgageInterest(BOARD[id]), 0);
  const fromInterest = interestOn(t.take.tiles);
  const toInterest = interestOn(t.give.tiles);
  if (from.cash - t.give.cash + t.take.cash - fromInterest < 0) fail(`${from.name} ne peut pas payer les intérêts.`);
  if (actor.cash - t.take.cash + t.give.cash - toInterest < 0) fail("Vous ne pouvez pas payer les intérêts.");

  applyTransfer(s, from, actor, t);
  from.cash -= fromInterest;
  actor.cash -= toInterest;
  s.trades = s.trades.filter((x) => x.id !== t.id);
  const interestNote = fromInterest + toInterest > 0 ? " (intérêts d'hypothèque payés)" : "";
  log(s, `🤝 ${actor.name} accepte l'échange avec ${from.name}${interestNote}.`);
}

function applyTransfer(s: GameState, from: Player, to: Player, t: Trade) {
  from.cash += t.take.cash - t.give.cash;
  to.cash += t.give.cash - t.take.cash;
  for (const id of t.give.tiles) s.props[id].owner = to.id;
  for (const id of t.take.tiles) s.props[id].owner = from.id;
  to.jailCards.push(...from.jailCards.splice(0, t.give.jailCards));
  from.jailCards.push(...to.jailCards.splice(0, t.take.jailCards));
}
