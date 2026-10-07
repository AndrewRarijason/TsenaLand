"use client";

import { BOARD, GROUP_COLORS } from "@/game/board";
import { GO_SALARY } from "@/game/constants";
import { money } from "@/game/format";
import { currentPlayer, findPlayer } from "@/game/rules";
import type { GameState, Player, Tile } from "@/game/types";
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
import { Dice } from "./Dice";

type Side = "bottom" | "left" | "top" | "right" | "corner";

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

/** Nom affiché sur la case (sans le préfixe « Rue », trop long sur petit écran). */
function shortName(tile: Tile) {
  return tile.name.replace(/^(Rue|Route|Boulevard|Avenue|Gare routière)\s+(de\s+l'|de\s+la\s+|des\s+|de\s+|du\s+)?/i, "");
}

interface BoardProps {
  state: GameState;
  onTileClick: (tileId: number) => void;
}

export function Board({ state, onTileClick }: BoardProps) {
  const cur = state.status === "playing" ? currentPlayer(state) : null;
  const byTile = new Map<number, Player[]>();
  for (const p of state.players) {
    if (p.bankrupt || state.status === "lobby") continue;
    byTile.set(p.position, [...(byTile.get(p.position) ?? []), p]);
  }

  return (
    <div className="board" role="grid" aria-label="Plateau de jeu">
      {BOARD.map((tile) => {
        const { row, col, side } = placement(tile.id);
        return (
          <TileView
            key={tile.id}
            tile={tile}
            side={side === "corner" ? "corner" : side}
            state={state}
            players={byTile.get(tile.id) ?? []}
            currentId={cur?.id}
            style={{ gridRow: row, gridColumn: col }}
            onClick={() => onTileClick(tile.id)}
          />
        );
      })}
      <BoardCenter state={state} />
    </div>
  );
}

function TileView({
  tile,
  side,
  state,
  players,
  currentId,
  style,
  onClick,
}: {
  tile: Tile;
  side: Side;
  state: GameState;
  players: Player[];
  currentId?: string;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  const own = state.props[tile.id];
  const owner = own?.owner ? findPlayer(state, own.owner) : undefined;
  const active = players.some((p) => p.id === currentId);
  const classes = ["tile", side];
  if (side === "corner") classes.push("corner");
  if (own?.mortgaged) classes.push("mortgaged");
  if (active) classes.push("active");

  return (
    <div
      className={classes.join(" ")}
      style={{ ...style, ...(owner ? ({ "--owner": owner.color } as React.CSSProperties) : {}) }}
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
      {players.length > 0 && (
        <div className="tokens">
          {players.map((p) => (
            <span
              key={p.id}
              className={`token${p.id === currentId ? " current" : ""}${p.inJail ? " jailed" : ""}`}
              style={{ background: p.color }}
              title={p.name}
            >
              {p.token}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TileBody({ tile }: { tile: Tile }) {
  switch (tile.kind) {
    case "property":
      return (
        <>
          <span className="name">{shortName(tile)}</span>
          <span className="price">{money(tile.price!)}</span>
        </>
      );
    case "station":
      return (
        <>
          <span className="name">{shortName(tile)}</span>
          <TaxiBrousseIcon className="tile-icon" />
          <span className="price">{money(tile.price!)}</span>
        </>
      );
    case "utility":
      return (
        <>
          <span className="name">{tile.name}</span>
          {tile.id === 12 ? <BulbIcon className="tile-icon" /> : <TapIcon className="tile-icon" />}
          <span className="price">{money(tile.price!)}</span>
        </>
      );
    case "chance":
      return (
        <>
          <span className="name">Chance</span>
          <span className="font-black text-[#ea580c]" style={{ fontSize: "3.6cqw", lineHeight: 1 }}>
            ?
          </span>
          <span />
        </>
      );
    case "community":
      return (
        <>
          <span className="name">Caisse de communauté</span>
          <ChestIcon className="tile-icon" />
          <span />
        </>
      );
    case "tax":
      return (
        <>
          <span className="name">{tile.name}</span>
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
          <span className="font-black text-[#c8102e]" style={{ fontSize: "3.2cqw", lineHeight: 1 }}>
            ⬅
          </span>
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

function BoardCenter({ state }: { state: GameState }) {
  const cur = state.status === "playing" ? currentPlayer(state) : null;
  const winner = state.winnerId ? findPlayer(state, state.winnerId) : null;
  return (
    <div className="board-center">
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
      {state.dice && <Dice values={state.dice} seq={state.rollSeq} />}
      <div className="center-status">
        {winner
          ? `🏆 ${winner.name} a gagné !`
          : cur
            ? (
                <>
                  <span style={{ color: cur.color }}>{cur.token}</span> Au tour de {cur.name}
                </>
              )
            : "En attente des joueurs…"}
      </div>
    </div>
  );
}
