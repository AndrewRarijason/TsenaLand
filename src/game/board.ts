import type { ColorGroup, Tile } from "./types";

// Plateau classique (prix, loyers et couleurs inchangés), noms adaptés à Antananarivo.
// Noms vérifiés sur OpenStreetMap (quartier indiqué entre parenthèses dans `district`).
// Pour renommer une rue, il suffit de modifier son `name` : les cartes Chance /
// Caisse de communauté reprennent automatiquement le nouveau nom.

export const GROUP_COLORS: Record<ColorGroup, string> = {
  brown: "#8B4513",
  lightblue: "#AAE0FA",
  pink: "#D93A96",
  orange: "#F7941D",
  red: "#ED1B24",
  yellow: "#FEF200",
  green: "#1FB25A",
  darkblue: "#0072BB",
};

function property(
  id: number,
  name: string,
  district: string,
  group: ColorGroup,
  price: number,
  rents: number[],
  houseCost: number,
): Tile {
  return { id, kind: "property", name, district, group, price, rents, houseCost, mortgage: price / 2 };
}

function station(id: number, name: string): Tile {
  return { id, kind: "station", name, price: 200, mortgage: 100 };
}

function utility(id: number, name: string): Tile {
  return { id, kind: "utility", name, price: 150, mortgage: 75 };
}

export const BOARD: Tile[] = [
  { id: 0, kind: "go", name: "Départ" },
  property(1, "Boulevard de l'Europe", "67 Ha", "brown", 60, [2, 10, 30, 90, 160, 250], 50),
  { id: 2, kind: "community", name: "Caisse de communauté" },
  property(3, "Rue Pasteur Rahajason", "Anosibe", "brown", 60, [4, 20, 60, 180, 320, 450], 50),
  { id: 4, kind: "tax", name: "Impôts sur le revenu", amount: 200 },
  station(5, "Gare routière Fisandratana"),
  property(6, "Route Digue", "Andranovaky", "lightblue", 100, [6, 30, 90, 270, 400, 550], 50),
  { id: 7, kind: "chance", name: "Chance" },
  property(8, "Rue Rabezavana", "Behoririka", "lightblue", 100, [6, 30, 90, 270, 400, 550], 50),
  property(9, "Rue Rainibetsimisaraka", "Soarano", "lightblue", 120, [8, 40, 100, 300, 450, 600], 50),
  { id: 10, kind: "jail", name: "À Tsiafahy" },
  property(11, "Rue Patrice Lumumba", "Soarano", "pink", 140, [10, 50, 150, 450, 625, 750], 100),
  utility(12, "Jirama Jiro"),
  property(13, "Rue Ingereza", "Tsaralalàna", "pink", 140, [10, 50, 150, 450, 625, 750], 100),
  property(14, "Rue Rainizanabololona", "Antanimena", "pink", 160, [12, 60, 180, 500, 700, 900], 100),
  station(15, "Gare routière Ampasapito"),
  property(16, "Rue Ramanankirahina", "Mahamasina", "orange", 180, [14, 70, 200, 550, 750, 950], 100),
  { id: 17, kind: "community", name: "Caisse de communauté" },
  property(18, "Route Circulaire", "Tsimbazaza", "orange", 180, [14, 70, 200, 550, 750, 950], 100),
  property(19, "Rue Pasteur Rabary", "Ankadivato", "orange", 200, [16, 80, 220, 600, 800, 1000], 100),
  { id: 20, kind: "parking", name: "Parc gratuit" },
  property(21, "Rue Ravelojaona", "Andohalo", "red", 220, [18, 90, 250, 700, 875, 1050], 150),
  { id: 22, kind: "chance", name: "Chance" },
  property(23, "Rue Docteur Raharinosy", "Andohalo", "red", 220, [18, 90, 250, 700, 875, 1050], 150),
  property(24, "Rue Rainandriamampandry", "Analakely", "red", 240, [20, 100, 300, 750, 925, 1100], 150),
  station(25, "Gare routière Maki"),
  property(26, "Rue Docteur Villette", "Isoraka", "yellow", 260, [22, 110, 330, 800, 975, 1150], 150),
  property(27, "Rue de Russie", "Isoraka", "yellow", 260, [22, 110, 330, 800, 975, 1150], 150),
  utility(28, "Jirama Rano"),
  property(29, "Rue Ratsimilaho", "Antaninarenina", "yellow", 280, [24, 120, 360, 850, 1025, 1200], 150),
  { id: 30, kind: "gotojail", name: "Allez à Tsiafahy" },
  property(31, "Rue Prince Ratsimamanga", "Antaninarenina", "green", 300, [26, 130, 390, 900, 1100, 1275], 200),
  property(32, "Rue Rainitovo", "Antsahavola", "green", 300, [26, 130, 390, 900, 1100, 1275], 200),
  { id: 33, kind: "community", name: "Caisse de communauté" },
  property(34, "Route des Hydrocarbures", "Ankorondrano", "green", 320, [28, 150, 450, 1000, 1200, 1400], 200),
  station(35, "Gare routière Parkazy"),
  { id: 36, kind: "chance", name: "Chance" },
  property(37, "Rue Ravoninahitriniarivo", "Ankorondrano", "darkblue", 350, [35, 175, 500, 1100, 1300, 1500], 200),
  { id: 38, kind: "tax", name: "Taxe de luxe", amount: 100 },
  property(39, "Avenue de l'Indépendance", "Analakely", "darkblue", 400, [50, 200, 600, 1400, 1700, 2000], 200),
];

export const BUYABLE_KINDS = new Set(["property", "station", "utility"]);

export function isBuyable(tile: Tile): boolean {
  return BUYABLE_KINDS.has(tile.kind);
}

export const GROUP_TILES: Record<ColorGroup, number[]> = BOARD.reduce(
  (acc, t) => {
    if (t.group) acc[t.group].push(t.id);
    return acc;
  },
  { brown: [], lightblue: [], pink: [], orange: [], red: [], yellow: [], green: [], darkblue: [] } as Record<
    ColorGroup,
    number[]
  >,
);

export const STATION_IDS = BOARD.filter((t) => t.kind === "station").map((t) => t.id);
export const UTILITY_IDS = BOARD.filter((t) => t.kind === "utility").map((t) => t.id);

/** « à la Rue X », « au Boulevard X », « à l'Avenue X ». */
export function toPlace(name: string): string {
  if (/^Boulevard\b/i.test(name)) return `au ${name}`;
  if (/^[AEIOUYÉÈH]/i.test(name)) return `à l'${name}`;
  return `à la ${name}`;
}
