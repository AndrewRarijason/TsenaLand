// Pions disponibles. Chaque pion a sa couleur, qui identifie aussi le joueur sur le plateau.

export const TOKENS = [
  { id: "car", label: "Voiture", color: "#dc2626" },
  { id: "dog", label: "Chien", color: "#2563eb" },
  { id: "ship", label: "Bateau", color: "#0d9488" },
  { id: "tank", label: "Char", color: "#4d7c0f" },
  { id: "hat", label: "Chapeau", color: "#be185d" },
  { id: "boot", label: "Botte", color: "#ea580c" },
  { id: "cat", label: "Chat", color: "#7c3aed" },
  { id: "wheelbarrow", label: "Brouette", color: "#a16207" },
] as const;

export type TokenId = (typeof TOKENS)[number]["id"];

export const TOKEN_IDS = TOKENS.map((t) => t.id) as [TokenId, ...TokenId[]];

export function tokenInfo(id: string) {
  return TOKENS.find((t) => t.id === id);
}
