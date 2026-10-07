import { BOARD, toPlace } from "./board";
import { GO_SALARY } from "./constants";
import { money } from "./format";
import type { DeckName } from "./types";

export type CardEffect =
  /** Avance jusqu'à la case (salaire si on passe par Départ). */
  | { kind: "advance"; to: number }
  | { kind: "back"; steps: number }
  /** Va directement sur la case, sans passer par Départ. */
  | { kind: "goBackTo"; to: number }
  | { kind: "gain"; amount: number }
  | { kind: "pay"; amount: number }
  | { kind: "repairs"; house: number; hotel: number }
  | { kind: "jail" }
  | { kind: "jailFree" }
  | { kind: "birthday"; amount: number }
  | { kind: "payOrChance"; amount: number };

export interface CardDef {
  id: number;
  deck: DeckName;
  text: string;
  effect: CardEffect;
}

const name = (id: number) => BOARD[id].name;
const passGo = `Si vous passez par la case Départ, recevez ${money(GO_SALARY)}.`;

const CHANCE: Omit<CardDef, "id" | "deck">[] = [
  { text: "Avancez jusqu'à la case Départ.", effect: { kind: "advance", to: 0 } },
  { text: `Rendez-vous ${toPlace(name(39))}.`, effect: { kind: "advance", to: 39 } },
  { text: `Avancez ${toPlace(name(11))}. ${passGo}`, effect: { kind: "advance", to: 11 } },
  { text: `Rendez-vous ${toPlace(name(24))}. ${passGo}`, effect: { kind: "advance", to: 24 } },
  { text: `Allez ${toPlace(name(15))}. ${passGo}`, effect: { kind: "advance", to: 15 } },
  { text: "Reculez de trois cases.", effect: { kind: "back", steps: 3 } },
  {
    text: `Allez à Tsiafahy ! Rendez-vous directement à Tsiafahy. Ne passez pas par la case Départ, ne recevez pas ${money(GO_SALARY)}.`,
    effect: { kind: "jail" },
  },
  {
    text: "Vous êtes libéré de Tsiafahy. Cette carte peut être conservée jusqu'à ce qu'elle soit utilisée ou vendue.",
    effect: { kind: "jailFree" },
  },
  {
    text: `Faites des réparations dans toutes vos maisons : versez ${money(25)} pour chaque maison et ${money(100)} pour chaque hôtel.`,
    effect: { kind: "repairs", house: 25, hotel: 100 },
  },
  {
    text: `Vous êtes imposé pour les réparations de voirie : ${money(40)} par maison et ${money(115)} par hôtel.`,
    effect: { kind: "repairs", house: 40, hotel: 115 },
  },
  { text: `Amende pour excès de vitesse : payez ${money(15)}.`, effect: { kind: "pay", amount: 15 } },
  { text: `Payez pour frais de scolarité : ${money(150)}.`, effect: { kind: "pay", amount: 150 } },
  { text: `Amende pour ivresse : payez ${money(20)}.`, effect: { kind: "pay", amount: 20 } },
  { text: `La banque vous verse un dividende de ${money(50)}.`, effect: { kind: "gain", amount: 50 } },
  {
    text: `Votre immeuble et votre prêt rapportent. Vous devez toucher ${money(150)}.`,
    effect: { kind: "gain", amount: 150 },
  },
  { text: `Vous avez gagné le prix de mots croisés. Recevez ${money(100)}.`, effect: { kind: "gain", amount: 100 } },
];

const COMMUNITY: Omit<CardDef, "id" | "deck">[] = [
  { text: "Placez-vous sur la case Départ.", effect: { kind: "advance", to: 0 } },
  { text: `Erreur de la banque en votre faveur. Recevez ${money(200)}.`, effect: { kind: "gain", amount: 200 } },
  { text: `Payez la note du médecin : ${money(50)}.`, effect: { kind: "pay", amount: 50 } },
  { text: `La vente de votre stock vous rapporte ${money(50)}.`, effect: { kind: "gain", amount: 50 } },
  {
    text: "Vous êtes libéré de Tsiafahy. Cette carte peut être conservée jusqu'à ce qu'elle soit utilisée ou vendue.",
    effect: { kind: "jailFree" },
  },
  {
    text: `Allez à Tsiafahy ! Rendez-vous directement à Tsiafahy. Ne passez pas par la case Départ, ne recevez pas ${money(GO_SALARY)}.`,
    effect: { kind: "jail" },
  },
  { text: `Retournez ${toPlace(name(1))}.`, effect: { kind: "goBackTo", to: 1 } },
  { text: `Recevez votre revenu annuel : ${money(100)}.`, effect: { kind: "gain", amount: 100 } },
  {
    text: `C'est votre anniversaire : chaque joueur doit vous donner ${money(10)}.`,
    effect: { kind: "birthday", amount: 10 },
  },
  { text: `Les contributions vous remboursent la somme de ${money(20)}.`, effect: { kind: "gain", amount: 20 } },
  { text: `Recevez votre intérêt sur l'emprunt à 7 % : ${money(25)}.`, effect: { kind: "gain", amount: 25 } },
  { text: `Payez votre police d'assurance : ${money(50)}.`, effect: { kind: "pay", amount: 50 } },
  {
    text: `Payez une amende de ${money(10)} ou bien tirez une carte Chance.`,
    effect: { kind: "payOrChance", amount: 10 },
  },
  { text: `Payez à l'hôpital ${money(100)}.`, effect: { kind: "pay", amount: 100 } },
  { text: `Vous héritez de ${money(100)}.`, effect: { kind: "gain", amount: 100 } },
  {
    text: `Vous avez gagné le deuxième prix de beauté. Recevez ${money(10)}.`,
    effect: { kind: "gain", amount: 10 },
  },
];

export const CARDS: CardDef[] = [
  ...CHANCE.map((c, i) => ({ ...c, id: i, deck: "chance" as const })),
  ...COMMUNITY.map((c, i) => ({ ...c, id: CHANCE.length + i, deck: "community" as const })),
];

export const DECK_LABEL: Record<DeckName, string> = {
  chance: "Chance",
  community: "Caisse de communauté",
};

export function deckCardIds(deck: DeckName): number[] {
  return CARDS.filter((c) => c.deck === deck).map((c) => c.id);
}

export function jailFreeCardId(deck: DeckName): number {
  return CARDS.find((c) => c.deck === deck && c.effect.kind === "jailFree")!.id;
}
