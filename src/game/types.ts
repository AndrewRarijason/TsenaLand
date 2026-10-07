export type ColorGroup =
  | "brown"
  | "lightblue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "darkblue";

export type TileKind =
  | "go"
  | "property"
  | "station"
  | "utility"
  | "chance"
  | "community"
  | "tax"
  | "jail"
  | "parking"
  | "gotojail";

export interface Tile {
  id: number;
  kind: TileKind;
  name: string;
  /** Quartier (affiché sur le titre de propriété). */
  district?: string;
  group?: ColorGroup;
  price?: number;
  /** Terrains : [nu, 1 maison, 2, 3, 4, hôtel]. */
  rents?: number[];
  houseCost?: number;
  mortgage?: number;
  /** Cases impôt / taxe. */
  amount?: number;
}

export type DeckName = "chance" | "community";

export interface Player {
  id: string;
  name: string;
  token: string;
  color: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  /** Cartes « Libéré de Tsiafahy » détenues (on retient leur paquet d'origine). */
  jailCards: DeckName[];
  bankrupt: boolean;
}

export interface Ownership {
  owner: string | null;
  /** 0 à 4 maisons, 5 = hôtel. */
  houses: number;
  mortgaged: boolean;
}

export interface Debt {
  debtorId: string;
  /** null = la Banque. */
  creditorId: string | null;
  amount: number;
  reason: string;
}

export type Continuation =
  | { kind: "finishMove" }
  | { kind: "moveAfterJail"; steps: number };

export type Phase =
  | { kind: "lobby" }
  | { kind: "roll" }
  | { kind: "buy"; tileId: number }
  | { kind: "auction" }
  | { kind: "debt" }
  | { kind: "cardChoice"; amount: number }
  | { kind: "endTurn" }
  | { kind: "finished" };

export interface Auction {
  id: number;
  tileId: number;
  bid: number;
  bidderId: string | null;
  endsAt: number;
}

export interface TradeOffer {
  cash: number;
  tiles: number[];
  jailCards: number;
}

export interface Trade {
  id: string;
  fromId: string;
  toId: string;
  /** Ce que l'auteur de la proposition donne. */
  give: TradeOffer;
  /** Ce qu'il demande en échange. */
  take: TradeOffer;
}

export interface LogEntry {
  id: number;
  text: string;
}

export interface CardShown {
  seq: number;
  deck: DeckName;
  cardId: number;
  playerId: string;
}

export interface GameState {
  version: number;
  status: "lobby" | "playing" | "finished";
  hostId: string;
  players: Player[];
  /** Index du joueur dont c'est le tour. */
  current: number;
  phase: Phase;
  props: Record<number, Ownership>;
  bankHouses: number;
  bankHotels: number;
  /** Ordre des cartes : masqué dans l'état envoyé aux navigateurs. */
  decks: Record<DeckName, number[]>;
  dice: [number, number] | null;
  rollSeq: number;
  doubles: number;
  extraRoll: boolean;
  debts: Debt[];
  afterDebts: Continuation | null;
  auction: Auction | null;
  trades: Trade[];
  card: CardShown | null;
  cardSeq: number;
  log: LogEntry[];
  logSeq: number;
  winnerId: string | null;
  turn: number;
}

export type GameAction =
  | { type: "start" }
  | { type: "roll" }
  | { type: "payJail" }
  | { type: "useJailCard" }
  | { type: "buy" }
  | { type: "declineBuy" }
  | { type: "bid"; amount: number }
  | { type: "resolveAuction" }
  | { type: "endTurn" }
  | { type: "build"; tileId: number }
  | { type: "sellBuilding"; tileId: number }
  | { type: "mortgage"; tileId: number }
  | { type: "unmortgage"; tileId: number }
  | { type: "payDebt" }
  | { type: "bankrupt" }
  | { type: "cardChoice"; choice: "pay" | "draw" }
  | { type: "proposeTrade"; toId: string; give: TradeOffer; take: TradeOffer }
  | { type: "cancelTrade"; tradeId: string }
  | { type: "respondTrade"; tradeId: string; accept: boolean }
  | { type: "leave" };
