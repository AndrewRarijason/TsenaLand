import { BOARD, GROUP_TILES, STATION_IDS, UTILITY_IDS } from "./board";
import type { GameState, Player, Tile } from "./types";

// Fonctions de lecture pures, partagées par le moteur (validation) et l'interface
// (boutons actifs / désactivés). Les fonctions `...Error` renvoient la raison d'un
// refus, ou null si l'action est permise.

export function findPlayer(s: GameState, id: string): Player | undefined {
  return s.players.find((p) => p.id === id);
}

export function currentPlayer(s: GameState): Player {
  return s.players[s.current];
}

export function activePlayers(s: GameState): Player[] {
  return s.players.filter((p) => !p.bankrupt);
}

export function ownedTiles(s: GameState, playerId: string): Tile[] {
  return BOARD.filter((t) => s.props[t.id]?.owner === playerId);
}

export function ownsWholeGroup(s: GameState, playerId: string, tile: Tile): boolean {
  if (!tile.group) return false;
  return GROUP_TILES[tile.group].every((id) => s.props[id].owner === playerId);
}

export function groupHasBuildings(s: GameState, tile: Tile): boolean {
  if (!tile.group) return false;
  return GROUP_TILES[tile.group].some((id) => s.props[id].houses > 0);
}

export function diceTotal(s: GameState): number {
  return s.dice ? s.dice[0] + s.dice[1] : 0;
}

/** Loyer dû en tombant sur la case (0 si libre, hypothéquée ou sans propriétaire). */
export function rentOf(s: GameState, tileId: number, dice: number): number {
  const tile = BOARD[tileId];
  const o = s.props[tileId];
  if (!o?.owner || o.mortgaged) return 0;
  if (tile.kind === "property") {
    if (o.houses > 0) return tile.rents![o.houses];
    return tile.rents![0] * (ownsWholeGroup(s, o.owner, tile) ? 2 : 1);
  }
  if (tile.kind === "station") {
    const n = STATION_IDS.filter((id) => s.props[id].owner === o.owner).length;
    return 25 * 2 ** (n - 1);
  }
  if (tile.kind === "utility") {
    const n = UTILITY_IDS.filter((id) => s.props[id].owner === o.owner).length;
    return (n === 2 ? 10 : 4) * dice;
  }
  return 0;
}

export function mortgageInterest(tile: Tile): number {
  return Math.ceil((tile.mortgage ?? 0) / 10);
}

export function unmortgageCost(tile: Tile): number {
  return (tile.mortgage ?? 0) + mortgageInterest(tile);
}

export function managementBlocked(s: GameState): string | null {
  if (s.status !== "playing") return "La partie n'est pas en cours.";
  if (s.phase.kind === "auction") return "Impossible pendant une enchère.";
  return null;
}

function ownerCheck(s: GameState, playerId: string, tileId: number): string | null {
  const p = findPlayer(s, playerId);
  if (!p || p.bankrupt) return "Joueur inactif.";
  const tile = BOARD[tileId];
  if (!tile || !s.props[tileId]) return "Case invalide.";
  if (s.props[tileId].owner !== playerId) return "Vous ne possédez pas cette propriété.";
  return null;
}

export function buildError(s: GameState, playerId: string, tileId: number): string | null {
  const base = managementBlocked(s) ?? ownerCheck(s, playerId, tileId);
  if (base) return base;
  const tile = BOARD[tileId];
  const o = s.props[tileId];
  if (tile.kind !== "property") return "On ne construit que sur les terrains.";
  if (!ownsWholeGroup(s, playerId, tile)) return "Il faut posséder tout le groupe de couleur.";
  const group = GROUP_TILES[tile.group!];
  if (group.some((id) => s.props[id].mortgaged)) return "Un terrain du groupe est hypothéqué.";
  if (o.houses >= 5) return "Il y a déjà un hôtel.";
  const min = Math.min(...group.map((id) => s.props[id].houses));
  if (o.houses > min) return "Construisez uniformément sur le groupe.";
  if (o.houses === 4 && s.bankHotels < 1) return "La Banque n'a plus d'hôtel.";
  if (o.houses < 4 && s.bankHouses < 1) return "La Banque n'a plus de maison.";
  if (findPlayer(s, playerId)!.cash < tile.houseCost!) return "Fonds insuffisants.";
  return null;
}

export function sellError(s: GameState, playerId: string, tileId: number): string | null {
  const base = managementBlocked(s) ?? ownerCheck(s, playerId, tileId);
  if (base) return base;
  const tile = BOARD[tileId];
  const o = s.props[tileId];
  if (tile.kind !== "property" || o.houses === 0) return "Aucune construction à vendre.";
  const max = Math.max(...GROUP_TILES[tile.group!].map((id) => s.props[id].houses));
  if (o.houses < max) return "Vendez uniformément sur le groupe.";
  return null;
}

export function mortgageError(s: GameState, playerId: string, tileId: number): string | null {
  const base = managementBlocked(s) ?? ownerCheck(s, playerId, tileId);
  if (base) return base;
  const tile = BOARD[tileId];
  if (s.props[tileId].mortgaged) return "Déjà hypothéquée.";
  if (groupHasBuildings(s, tile)) return "Vendez d'abord les constructions du groupe.";
  return null;
}

export function unmortgageError(s: GameState, playerId: string, tileId: number): string | null {
  const base = managementBlocked(s) ?? ownerCheck(s, playerId, tileId);
  if (base) return base;
  const tile = BOARD[tileId];
  if (!s.props[tileId].mortgaged) return "Cette propriété n'est pas hypothéquée.";
  if (findPlayer(s, playerId)!.cash < unmortgageCost(tile)) return "Fonds insuffisants.";
  return null;
}

/** Une propriété peut être échangée si son groupe n'a aucune construction. */
export function tradeTileError(s: GameState, playerId: string, tileId: number): string | null {
  const base = ownerCheck(s, playerId, tileId);
  if (base) return base;
  if (groupHasBuildings(s, BOARD[tileId])) return `${BOARD[tileId].name} : vendez d'abord les constructions du groupe.`;
  return null;
}

/** Valeur totale (argent + propriétés + constructions), pour l'affichage. */
export function netWorth(s: GameState, playerId: string): number {
  const p = findPlayer(s, playerId);
  if (!p) return 0;
  let total = p.cash;
  for (const t of ownedTiles(s, playerId)) {
    const o = s.props[t.id];
    total += o.mortgaged ? t.mortgage! : t.price!;
    total += o.houses * (t.houseCost ?? 0);
  }
  return total;
}
