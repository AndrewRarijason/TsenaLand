"use client";

import { BOARD, GROUP_COLORS, tileLabel } from "@/game/board";
import { GO_SALARY, JAIL_POSITION } from "@/game/constants";
import { money } from "@/game/format";
import { currentPlayer, findPlayer } from "@/game/rules";
import type { GameState, Player, Tile } from "@/game/types";
import type { CSSProperties } from "react";
import {
  BulbIcon,
  CarIcon,
  ChestIcon,
  JailBarsIcon,
  PoliceIcon,
  RingIcon,
  TapIcon,
  TaxiBrousseIcon,
} from "../icons";
import { lighten, TokenBadge, TokenIcon } from "../tokens";
import { Dice } from "./Dice";

type Side = "bottom" | "left" | "top" | "right" | "corner";

/** Largeur relative des 11 colonnes (et lignes) : les coins sont plus grands. */
const TRACK = [1.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.6];
const TRACK_TOTAL = TRACK.reduce((a, b) => a + b, 0);

/** Position de chaque case dans la grille 11 x 11 (case 0 en bas à droite). */
function placement(id: number): { row: number; col: number; side: Side } {
  if (id === 0) return { row: 11, col: 11, side: "corner" };
  if (id < 10) return { row: 11, col: 11 - id, side: "bottom" };
  if (id === 10) return { row: 11, col: 1, side: "corner" };
  if (id < 20) return { row: 21 - id, col: 1, side: "left" };
  if (id === 20) return { row: 1, col: 1, side: "corner" };
  if (id < 30) return { row: 1, col: id - 19, side: "top" };
  if (id === 30) return { row: 1, col: 11, side: "corner" };
  return { row: id - 29, col: 11, side: "right" };
}

/** Centre d'une ligne ou colonne de la grille, en % du plateau. */
function axisCenter(index: number): number {
  const start = TRACK.slice(0, index - 1).reduce((a, b) => a + b, 0);
  return ((start + TRACK[index - 1] / 2) / TRACK_TOTAL) * 100;
}

/** Taille d'un pion en % du plateau (doit correspondre à --token-size dans le CSS). */
const TOKEN_PCT = 3.7;

/** Disposition des pions qui partagent une case (en tailles de pion). */
const CLUSTER: [number, number][][] = [
  [[0, 0]],
  [[-0.55, 0], [0.55, 0]],
  [[-0.55, 0.48], [0.55, 0.48], [0, -0.5]],
  [[-0.55, -0.5], [0.55, -0.5], [-0.55, 0.5], [0.55, 0.5]],
  [[-1.1, -0.5], [0, -0.5], [1.1, -0.5], [-0.55, 0.5], [0.55, 0.5]],
  [[-1.1, -0.5], [0, -0.5], [1.1, -0.5], [-1.1, 0.5], [0, 0.5], [1.1, 0.5]],
];

interface BoardProps {
  state: GameState;
  positions: Record<string, number>;
  movingId: string | null;
  jumpingId: string | null;
  dice: [number, number] | null;
  diceKey: number;
  /** Pion à mettre en évidence (le vôtre en ligne, le joueur courant en local). */
  highlightId: string | null;
  highlightLabel: string;
  onTileClick: (tileId: number) => void;
}

export function Board(props: BoardProps) {
  const { state, positions, onTileClick } = props;
  const cur = state.status === "playing" ? currentPlayer(state) : null;
  const activeTile = cur ? (positions[cur.id] ?? cur.position) : -1;

  return (
    <div className="board" role="grid" aria-label="Plateau de jeu">
      {BOARD.map((tile) => {
        const { row, col, side } = placement(tile.id);
        return (
          <TileView
            key={tile.id}
            tile={tile}
            side={side}
            state={state}
            active={tile.id === activeTile}
            style={{ gridRow: row, gridColumn: col }}
            onClick={() => onTileClick(tile.id)}
          />
        );
      })}
      <BoardCenter state={state} dice={props.dice} diceKey={props.diceKey} />
      <TokenLayer {...props} currentId={cur?.id ?? null} />
    </div>
  );
}

function TileView({
  tile,
  side,
  state,
  active,
  style,
  onClick,
}: {
  tile: Tile;
  side: Side;
  state: GameState;
  active: boolean;
  style: CSSProperties;
  onClick: () => void;
}) {
  const own = state.props[tile.id];
  const owner = own?.owner ? findPlayer(state, own.owner) : undefined;
  const classes = ["tile", side];
  if (side === "corner") classes.push("corner");
  if (own?.mortgaged) classes.push("mortgaged");
  if (active) classes.push("active");

  return (
    <div
      className={classes.join(" ")}
      style={{ ...style, ...(owner ? ({ "--owner": owner.color } as CSSProperties) : {}) }}
      onClick={onClick}
      role="gridcell"
      aria-label={tile.name}
      title={tile.name}
    >
      {side === "corner" ? (
        <CornerContent tile={tile} />
      ) : (
        <>
          {tile.group && (
            <div className="band" style={{ background: GROUP_COLORS[tile.group] }}>
              {own && own.houses > 0 && own.houses < 5 && Array.from({ length: own.houses }, (_, i) => <span key={i} className="house" />)}
              {own?.houses === 5 && <span className="hotel" />}
            </div>
          )}
          <div className="body">
            <TileBody tile={tile} />
          </div>
        </>
      )}
      {owner && <span className="owner-strip" />}
    </div>
  );
}

/** Nom de case : la police s'adapte au mot le plus long pour éviter de le couper. */
function TileName({ label }: { label: string }) {
  const longest = Math.max(...label.split(" ").map((w) => w.length));
  // Largeur utile d'une case ≈ 7,6 % du plateau ; une majuscule grasse ≈ 0,72 em.
  const fit = (9.5 / longest).toFixed(2);
  return (
    <span className="name" style={{ fontSize: `clamp(4.2px, ${fit}cqw, max(1.15cqw, 6px))` }}>
      {label}
    </span>
  );
}

function TileBody({ tile }: { tile: Tile }) {
  switch (tile.kind) {
    case "property":
      return (
        <>
          <TileName label={tileLabel(tile)} />
          <span className="price">{money(tile.price!)}</span>
        </>
      );
    case "station":
      return (
        <>
          <TileName label={tileLabel(tile)} />
          <TaxiBrousseIcon className="tile-icon" />
          <span className="price">{money(tile.price!)}</span>
        </>
      );
    case "utility":
      return (
        <>
          <TileName label={tile.name} />
          {tile.id === 12 ? <BulbIcon className="tile-icon" /> : <TapIcon className="tile-icon" />}
          <span className="price">{money(tile.price!)}</span>
        </>
      );
    case "chance":
      return (
        <>
          <TileName label="Chance" />
          <span className="chance-mark">?</span>
          <span />
        </>
      );
    case "community":
      return (
        <>
          <TileName label="Caisse de communauté" />
          <ChestIcon className="tile-icon" />
          <span />
        </>
      );
    case "tax":
      return (
        <>
          <TileName label={tile.name} />
          {tile.id === 38 ? <RingIcon className="tile-icon" /> : <span className="text-[2.4cqw] leading-none">◆</span>}
          <span className="price">Payez {money(tile.amount!)}</span>
        </>
      );
    default:
      return null;
  }
}

function CornerContent({ tile }: { tile: Tile }) {
  switch (tile.kind) {
    case "go":
      return (
        <div className="body">
          <span className="text-center font-semibold">Recevez {money(GO_SALARY)} en passant</span>
          <span className="font-black text-[#c8102e]" style={{ fontSize: "2.5cqw", lineHeight: 1 }}>
            DÉPART
          </span>
          <span className="go-arrow">⬅</span>
        </div>
      );
    case "jail":
      return (
        <div className="body">
          <JailBarsIcon className="w-[55%]" />
          <span className="name">À Tsiafahy</span>
          <span className="text-[0.85em] font-semibold opacity-75">Simple visite</span>
        </div>
      );
    case "parking":
      return (
        <div className="body">
          <span className="name">Parc</span>
          <CarIcon className="w-[70%]" />
          <span className="name">gratuit</span>
        </div>
      );
    case "gotojail":
      return (
        <div className="body">
          <span className="name">Allez à</span>
          <PoliceIcon className="w-[50%]" />
          <span className="name">Tsiafahy</span>
        </div>
      );
    default:
      return null;
  }
}

// ------------------------------------------------------------ Pions

function TokenLayer({
  state,
  positions,
  movingId,
  jumpingId,
  highlightId,
  highlightLabel,
  currentId,
}: BoardProps & { currentId: string | null }) {
  if (state.status === "lobby") return null;
  const alive = state.players.filter((p) => !p.bankrupt);

  // Regroupe les pions par case (et sépare détenus / visiteurs à Tsiafahy).
  const groups = new Map<string, Player[]>();
  for (const p of alive) {
    const pos = positions[p.id] ?? p.position;
    const jailed = pos === JAIL_POSITION && p.inJail && movingId !== p.id && jumpingId !== p.id;
    const key = `${pos}${jailed ? "j" : ""}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return (
    <div className="token-layer" aria-hidden>
      {[...groups.entries()].flatMap(([key, players]) => {
        const pos = Number.parseInt(key, 10);
        const jailed = key.endsWith("j");
        const { row, col, side } = placement(pos);
        let x = axisCenter(col);
        let y = axisCenter(row);
        if (pos === JAIL_POSITION) {
          // Détenus dans la cellule (en haut à droite), visiteurs sur le bord.
          x += jailed ? 2.2 : -2.6;
          y += jailed ? -2.2 : 2.6;
        }
        const layout = CLUSTER[Math.min(players.length, CLUSTER.length) - 1];
        const tall = side === "top" || side === "bottom";
        return players.map((p, i) => {
          const [ox, oy] = layout[i] ?? [0, 0];
          const [dx, dy] = tall ? [oy, ox] : [ox, oy];
          const left = x + dx * TOKEN_PCT * 1.05;
          const top = y + dy * TOKEN_PCT * 1.05;
          const isMe = p.id === highlightId;
          const classes = ["token-pos"];
          if (isMe) classes.push("is-me");
          if (jumpingId === p.id) classes.push("jumping");
          return (
            <div
              key={p.id}
              className={classes.join(" ")}
              style={{ left: `${left}%`, top: `${top}%`, "--c": p.color, "--c-light": lighten(p.color) } as CSSProperties}
            >
              <div
                className={`token-disc${movingId === p.id ? " hopping" : ""}${p.id === currentId ? " is-current" : ""}${
                  p.inJail ? " jailed" : ""
                }`}
              >
                <TokenIcon token={p.token} color={p.color} />
              </div>
              {isMe && <div className={`me-flag${top < 14 ? " below" : ""}`}>{highlightLabel}</div>}
            </div>
          );
        });
      })}
    </div>
  );
}

// ------------------------------------------------------------ Centre du plateau

function BoardCenter({ state, dice, diceKey }: { state: GameState; dice: [number, number] | null; diceKey: number }) {
  const cur = state.status === "playing" ? currentPlayer(state) : null;
  const winner = state.winnerId ? findPlayer(state, state.winnerId) : null;
  return (
    <div className="board-center">
      <div className="deck-pile community" aria-hidden>
        <ChestIcon className="h-[45%]" />
        <span>Caisse de communauté</span>
      </div>
      <div className="deck-pile chance" aria-hidden>
        <span className="deck-q">?</span>
        <span>Chance</span>
      </div>
      <div className="logo">
        MONOPOLY
        <small>GASY</small>
      </div>
      <div className="flag-stripe" aria-hidden>
        <span className="flex-1 bg-white" />
        <span className="flex flex-1 flex-col">
          <span className="flex-1 bg-[#fc3d32]" />
          <span className="flex-1 bg-[#007e3a]" />
        </span>
      </div>
      {dice && <Dice values={dice} rollKey={diceKey} />}
      <div className="center-status">
        {winner ? (
          `🏆 ${winner.name} a gagné !`
        ) : cur ? (
          <span className="inline-flex items-center gap-[0.4em]">
            <TokenBadge token={cur.token} color={cur.color} size={18} />
            Au tour de {cur.name}
          </span>
        ) : (
          "En attente des joueurs…"
        )}
      </div>
    </div>
  );
}
