import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";
import { START_CASH } from "./constants";
import { addPlayer, applyAction, createGame, eliminatePlayer, GameError, type EngineContext } from "./engine";
import type { GameAction, GameState } from "./types";

/** rng qui produit les dés demandés, dans l'ordre. */
function dice(...values: number[]): EngineContext {
  const queue = values.map((d) => (d - 0.5) / 6);
  return { rng: () => queue.shift() ?? 0.5, now: 1_000_000 };
}

const ctx0: EngineContext = { rng: () => 0.42, now: 1_000_000 };

function setup(names = ["a", "b"]): GameState {
  let s = createGame({ id: names[0], name: names[0].toUpperCase() });
  for (const n of names.slice(1)) s = addPlayer(s, { id: n, name: n.toUpperCase() });
  s = applyAction(s, names[0], { type: "start" }, ctx0);
  // Ordre de jeu fixe pour les tests.
  s.players.sort((x, y) => names.indexOf(x.id) - names.indexOf(y.id));
  s.current = 0;
  return s;
}

function act(s: GameState, who: string, action: GameAction, ctx: EngineContext = ctx0) {
  return applyAction(s, who, action, ctx);
}

const P = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;

describe("déplacement et achat", () => {
  it("avance, propose l'achat et achète", () => {
    let s = setup();
    s = act(s, "a", { type: "roll" }, dice(1, 2));
    expect(P(s, "a").position).toBe(3);
    expect(s.phase).toEqual({ kind: "buy", tileId: 3 });
    s = act(s, "a", { type: "buy" });
    expect(s.props[3].owner).toBe("a");
    expect(P(s, "a").cash).toBe(START_CASH - 60);
    expect(s.phase.kind).toBe("endTurn");
  });

  it("refuse une action hors de son tour", () => {
    const s = setup();
    expect(() => act(s, "b", { type: "roll" })).toThrow(GameError);
  });

  it("verse 200 en passant par Départ", () => {
    let s = setup();
    P(s, "a").position = 36;
    s = act(s, "a", { type: "roll" }, dice(1, 3));
    expect(P(s, "a").position).toBe(0);
    expect(P(s, "a").cash).toBe(START_CASH + 200);
  });

  it("un double donne un nouveau lancer, trois doubles envoient à Tsiafahy", () => {
    let s = setup();
    s = act(s, "a", { type: "roll" }, dice(5, 5)); // case 10 (simple visite)
    expect(s.phase.kind).toBe("roll");
    s = act(s, "a", { type: "roll" }, dice(1, 1)); // case 12 : Jirama Jiro
    expect(s.phase.kind).toBe("buy");
    s = act(s, "a", { type: "buy" });
    expect(s.phase.kind).toBe("roll");
    s = act(s, "a", { type: "roll" }, dice(2, 2));
    expect(P(s, "a").inJail).toBe(true);
    expect(P(s, "a").position).toBe(10);
    expect(s.phase.kind).toBe("endTurn");
  });
});

describe("loyers", () => {
  it("double le loyer d'un terrain nu si le groupe est complet", () => {
    let s = setup();
    s.props[1].owner = "b";
    s.props[3].owner = "b";
    P(s, "a").position = 0;
    s = act(s, "a", { type: "roll" }, dice(1, 2)); // Rue Andriba, loyer 4 x2
    expect(P(s, "a").cash).toBe(START_CASH - 8);
    expect(P(s, "b").cash).toBe(START_CASH + 8);
  });

  it("gares : 25 / 50 / 100 / 200", () => {
    let s = setup();
    s.props[5].owner = "b";
    s.props[15].owner = "b";
    s.props[25].owner = "b";
    s = act(s, "a", { type: "roll" }, dice(2, 3));
    expect(P(s, "a").cash).toBe(START_CASH - 100);
  });

  it("compagnies : 4x ou 10x les dés", () => {
    let s = setup();
    s.props[12].owner = "b";
    s.props[28].owner = "b";
    P(s, "a").position = 9;
    s = act(s, "a", { type: "roll" }, dice(1, 2));
    expect(P(s, "a").cash).toBe(START_CASH - 30);
  });

  it("pas de loyer sur une propriété hypothéquée", () => {
    let s = setup();
    s.props[3].owner = "b";
    s.props[3].mortgaged = true;
    s = act(s, "a", { type: "roll" }, dice(1, 2));
    expect(P(s, "a").cash).toBe(START_CASH);
  });
});

describe("Tsiafahy", () => {
  it("après 3 échecs, paie 50 et avance", () => {
    let s = setup();
    const a = P(s, "a");
    a.inJail = true;
    a.position = 10;
    a.jailTurns = 2;
    s = act(s, "a", { type: "roll" }, dice(1, 2));
    expect(P(s, "a").inJail).toBe(false);
    expect(P(s, "a").position).toBe(13);
    expect(P(s, "a").cash).toBe(START_CASH - 50);
  });

  it("un double libère sans relancer", () => {
    let s = setup();
    P(s, "a").inJail = true;
    P(s, "a").position = 10;
    s = act(s, "a", { type: "roll" }, dice(3, 3));
    expect(P(s, "a").inJail).toBe(false);
    expect(P(s, "a").position).toBe(16);
    s = act(s, "a", { type: "declineBuy" });
    s = act(s, "a", { type: "resolveAuction" }, { ...ctx0, now: ctx0.now + 60_000 });
    expect(s.phase.kind).toBe("endTurn");
  });
});

describe("constructions et hypothèques", () => {
  it("impose la construction uniforme puis l'hôtel", () => {
    let s = setup();
    s.props[37].owner = "a";
    s.props[39].owner = "a";
    P(s, "a").cash = 5000;
    s = act(s, "a", { type: "build", tileId: 39 });
    expect(() => act(s, "a", { type: "build", tileId: 39 })).toThrow("uniformément");
    for (let i = 0; i < 4; i++) {
      s = act(s, "a", { type: "build", tileId: 37 });
      if (i < 3) s = act(s, "a", { type: "build", tileId: 39 });
    }
    // 37 : 4 maisons + hôtel ; 39 : 4 maisons
    expect(s.props[37].houses).toBe(4);
    s = act(s, "a", { type: "build", tileId: 39 });
    s = act(s, "a", { type: "build", tileId: 37 });
    expect(s.props[37].houses).toBe(5);
    expect(s.bankHotels).toBe(10);
    expect(s.bankHouses).toBe(32);
    expect(P(s, "a").cash).toBe(5000 - 10 * 200);
  });

  it("hypothèque puis lève l'hypothèque avec 10 %", () => {
    let s = setup();
    s.props[16].owner = "a";
    s = act(s, "a", { type: "mortgage", tileId: 16 });
    expect(P(s, "a").cash).toBe(START_CASH + 90);
    s = act(s, "a", { type: "unmortgage", tileId: 16 });
    expect(P(s, "a").cash).toBe(START_CASH + 90 - 99);
  });
});

describe("dettes et faillite", () => {
  it("transfère les biens au créancier", () => {
    let s = setup(["a", "b", "c"]);
    s.props[39].owner = "b";
    s.props[37].owner = "b";
    s.props[39].houses = 5;
    s.props[37].houses = 4;
    s.props[5].owner = "a";
    s.props[5].mortgaged = true;
    P(s, "a").cash = 100;
    P(s, "a").position = 36;
    s = act(s, "a", { type: "roll" }, dice(1, 2)); // Avenue de l'Indépendance avec hôtel : 2000
    expect(s.phase.kind).toBe("debt");
    expect(() => act(s, "a", { type: "payDebt" })).toThrow();
    s = act(s, "a", { type: "bankrupt" });
    expect(P(s, "a").bankrupt).toBe(true);
    expect(s.props[5].owner).toBe("b");
    // b reçoit 100 € puis paie 10 € d'intérêts sur la gare hypothéquée
    expect(P(s, "b").cash).toBe(START_CASH + 100 - 10);
    expect(s.players[s.current].id).toBe("b");
    expect(s.phase.kind).toBe("roll");
  });

  it("dernier joueur restant gagne", () => {
    let s = setup();
    P(s, "a").cash = 10;
    s = act(s, "a", { type: "roll" }, dice(1, 3)); // Impôts : 200
    expect(s.phase.kind).toBe("debt");
    s = act(s, "a", { type: "bankrupt" });
    expect(s.status).toBe("finished");
    expect(s.winnerId).toBe("b");
  });
});

describe("enchères", () => {
  it("le plus offrant remporte la propriété", () => {
    let s = setup(["a", "b", "c"]);
    s = act(s, "a", { type: "roll" }, dice(2, 4)); // Route Digue
    s = act(s, "a", { type: "declineBuy" });
    s = act(s, "b", { type: "bid", amount: 20 });
    s = act(s, "c", { type: "bid", amount: 45 });
    expect(() => act(s, "b", { type: "bid", amount: 40 })).toThrow();
    expect(() => act(s, "a", { type: "resolveAuction" })).toThrow("pas terminée");
    s = act(s, "a", { type: "resolveAuction" }, { ...ctx0, now: s.auction!.endsAt });
    expect(s.props[6].owner).toBe("c");
    expect(P(s, "c").cash).toBe(START_CASH - 45);
    expect(s.phase.kind).toBe("endTurn");
  });
});

describe("cartes", () => {
  it("anniversaire : chaque joueur paie 10", () => {
    let s = setup(["a", "b", "c"]);
    const birthday = CARDS.find((c) => c.effect.kind === "birthday")!;
    s.decks.community = [birthday.id, ...s.decks.community.filter((id) => id !== birthday.id)];
    s = act(s, "a", { type: "roll" }, dice(1, 1)); // case 2 : Caisse de communauté
    expect(P(s, "a").cash).toBe(START_CASH + 20);
    expect(P(s, "b").cash).toBe(START_CASH - 10);
  });

  it("carte « Libéré de Tsiafahy » conservée puis rendue au paquet", () => {
    let s = setup();
    const free = CARDS.find((c) => c.deck === "chance" && c.effect.kind === "jailFree")!;
    s.decks.chance = [free.id, ...s.decks.chance.filter((id) => id !== free.id)];
    s = act(s, "a", { type: "roll" }, dice(3, 4)); // case 7 : Chance
    expect(P(s, "a").jailCards).toEqual(["chance"]);
    expect(s.decks.chance).not.toContain(free.id);
    P(s, "a").inJail = true;
    s.phase = { kind: "roll" };
    s = act(s, "a", { type: "useJailCard" });
    expect(P(s, "a").inJail).toBe(false);
    expect(s.decks.chance.at(-1)).toBe(free.id);
  });

  it("amende ou carte Chance", () => {
    let s = setup();
    const choice = CARDS.find((c) => c.effect.kind === "payOrChance")!;
    s.decks.community = [choice.id, ...s.decks.community.filter((id) => id !== choice.id)];
    s = act(s, "a", { type: "roll" }, dice(1, 1));
    expect(s.phase).toEqual({ kind: "cardChoice", amount: 10 });
    s = act(s, "a", { type: "cardChoice", choice: "pay" });
    expect(P(s, "a").cash).toBe(START_CASH - 10);
  });
});

describe("échanges", () => {
  it("échange propriétés et argent", () => {
    let s = setup();
    s.props[1].owner = "a";
    s.props[3].owner = "b";
    s.props[3].mortgaged = true;
    s = act(s, "a", {
      type: "proposeTrade",
      toId: "b",
      give: { cash: 100, tiles: [1], jailCards: 0 },
      take: { cash: 0, tiles: [3], jailCards: 0 },
    });
    s = act(s, "b", { type: "respondTrade", tradeId: s.trades[0].id, accept: true });
    expect(s.props[1].owner).toBe("b");
    expect(s.props[3].owner).toBe("a");
    expect(P(s, "a").cash).toBe(START_CASH - 100 - 3); // 3 € d'intérêts
    expect(P(s, "b").cash).toBe(START_CASH + 100);
    expect(s.trades).toHaveLength(0);
  });

  it("interdit d'échanger un groupe avec constructions", () => {
    const s = setup();
    s.props[1].owner = "a";
    s.props[3].owner = "a";
    s.props[3].houses = 1;
    expect(() =>
      act(s, "a", {
        type: "proposeTrade",
        toId: "b",
        give: { cash: 0, tiles: [1], jailCards: 0 },
        take: { cash: 10, tiles: [], jailCards: 0 },
      }),
    ).toThrow("constructions");
  });
});

describe("déconnexion", () => {
  it("élimine le joueur absent et passe son tour", () => {
    let s = setup(["a", "b", "c"]);
    s.props[1].owner = "a";
    s = eliminatePlayer(s, "a", "A est déconnecté.", ctx0);
    expect(P(s, "a").bankrupt).toBe(true);
    expect(s.props[1].owner).toBeNull();
    expect(s.players[s.current].id).toBe("b");
    expect(s.status).toBe("playing");
    s = eliminatePlayer(s, "c", "C est déconnecté.", ctx0);
    expect(s.status).toBe("finished");
    expect(s.winnerId).toBe("b");
  });
});

describe("pions", () => {
  it("chaque joueur choisit un pion libre dans le salon", () => {
    let s = createGame({ id: "a", name: "A", token: "dog" });
    s = addPlayer(s, { id: "b", name: "B", token: "dog" }); // déjà pris : pion libre attribué
    expect(P(s, "a").token).toBe("dog");
    expect(P(s, "b").token).not.toBe("dog");
    s = act(s, "b", { type: "chooseToken", token: "tank" });
    expect(P(s, "b").token).toBe("tank");
    expect(P(s, "b").color).toBe("#4d7c0f");
    expect(() => act(s, "b", { type: "chooseToken", token: "dog" })).toThrow("déjà pris");
    s = act(s, "a", { type: "start" });
    expect(() => act(s, "a", { type: "chooseToken", token: "cat" })).toThrow();
  });
});

describe("événements pour l'animation", () => {
  it("enregistre le lancer puis le déplacement case par case", () => {
    let s = setup();
    s = act(s, "a", { type: "roll" }, dice(1, 2));
    const fresh = s.events.slice(-2);
    expect(fresh[0]).toMatchObject({ kind: "roll", playerId: "a", dice: [1, 2] });
    expect(fresh[1]).toMatchObject({ kind: "move", playerId: "a", from: 0, to: 3, mode: "forward" });
    expect(fresh[1].seq).toBe(s.eventSeq);
  });

  it("la case « Allez à Tsiafahy » enchaîne marche puis saut", () => {
    let s = setup();
    P(s, "a").position = 27;
    s = act(s, "a", { type: "roll" }, dice(1, 2));
    const moves = s.events.filter((e) => e.kind === "move").slice(-2);
    expect(moves[0]).toMatchObject({ from: 27, to: 30, mode: "forward" });
    expect(moves[1]).toMatchObject({ from: 30, to: 10, mode: "jump" });
  });

  it("une carte apparaît entre les déplacements", () => {
    let s = setup();
    const goTo39 = CARDS.find((c) => c.effect.kind === "advance" && c.effect.to === 39)!;
    s.decks.chance = [goTo39.id, ...s.decks.chance.filter((id) => id !== goTo39.id)];
    s = act(s, "a", { type: "roll" }, dice(3, 4)); // case 7 : Chance
    const kinds = s.events.slice(-4).map((e) => e.kind);
    expect(kinds).toEqual(["roll", "move", "card", "move"]);
    expect(P(s, "a").position).toBe(39);
  });
});
