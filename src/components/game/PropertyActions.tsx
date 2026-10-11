"use client";

import { BOARD } from "@/game/board";
import { money } from "@/game/format";
import { buildError, mortgageError, sellError, unmortgageCost, unmortgageError } from "@/game/rules";
import type { GameAction, GameState } from "@/game/types";
import { useConfirm } from "../confirm";
import { Button } from "../ui";

export type Run = (action: GameAction, asId?: string) => Promise<void>;

/** Boutons construire / vendre / hypothéquer pour une propriété du joueur. */
export function PropertyActions({
  state,
  actorId,
  tileId,
  run,
  busy,
  compact = false,
}: {
  state: GameState;
  actorId: string;
  tileId: number;
  run: Run;
  busy: boolean;
  compact?: boolean;
}) {
  const confirm = useConfirm();
  const tile = BOARD[tileId];
  const o = state.props[tileId];
  if (!o || o.owner !== actorId) return null;

  const buildErr = tile.kind === "property" ? buildError(state, actorId, tileId) : null;
  const sellErr = tile.kind === "property" ? sellError(state, actorId, tileId) : null;
  const mortErr = mortgageError(state, actorId, tileId);
  const unmortErr = unmortgageError(state, actorId, tileId);
  const size = compact ? "sm" : "md";

  const mortgage = async () => {
    const ok = await confirm({
      title: "Hypothéquer cette propriété ?",
      icon: "🏦",
      message: (
        <>
          <b>{tile.name}</b> sera hypothéquée et vous recevrez <b>{money(tile.mortgage!)}</b>.
          <br />
          Tant que l&apos;hypothèque n&apos;est pas levée, vous ne toucherez <b>aucun loyer</b> sur cette case. La lever
          coûtera {money(unmortgageCost(tile))}.
        </>
      ),
      confirmLabel: `Hypothéquer (+${money(tile.mortgage!)})`,
    });
    if (ok) await run({ type: "mortgage", tileId });
  };

  const unmortgage = async () => {
    const cost = unmortgageCost(tile);
    const ok = await confirm({
      title: "Lever l'hypothèque ?",
      icon: "🔓",
      message: (
        <>
          Lever l&apos;hypothèque de <b>{tile.name}</b> coûte <b>{money(cost)}</b> (valeur hypothécaire{" "}
          {money(tile.mortgage!)} + 10 % d&apos;intérêts).
          <br />
          La propriété rapportera de nouveau des loyers.
        </>
      ),
      confirmLabel: `Payer ${money(cost)}`,
    });
    if (ok) await run({ type: "unmortgage", tileId });
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-3"}`}>
      {tile.kind === "property" && !o.mortgaged && (
        <>
          <Button
            size={size}
            variant="success"
            disabled={busy || !!buildErr}
            title={buildErr ?? `Coût : ${money(tile.houseCost!)}`}
            onClick={() => run({ type: "build", tileId })}
          >
            {o.houses === 4 ? "+ Hôtel" : "+ Maison"}
            {!compact && ` (${money(tile.houseCost!)})`}
          </Button>
          {o.houses > 0 && (
            <Button
              size={size}
              variant="secondary"
              disabled={busy || !!sellErr}
              title={sellErr ?? `Rapporte ${money(tile.houseCost! / 2)}`}
              onClick={() => run({ type: "sellBuilding", tileId })}
            >
              {o.houses === 5 ? "− Hôtel" : "− Maison"}
            </Button>
          )}
        </>
      )}
      {o.mortgaged ? (
        <Button size={size} variant="secondary" disabled={busy || !!unmortErr} title={unmortErr ?? undefined} onClick={unmortgage}>
          🔓 Lever l&apos;hypothèque ({money(unmortgageCost(tile))})
        </Button>
      ) : (
        <Button size={size} variant="secondary" disabled={busy || !!mortErr} title={mortErr ?? undefined} onClick={mortgage}>
          🏦 Hypothéquer (+{money(tile.mortgage!)})
        </Button>
      )}
      {!compact && buildErr && o.houses === 0 && !o.mortgaged && tile.kind === "property" && (
        <p className="w-full text-xs text-slate-500">{buildErr}</p>
      )}
    </div>
  );
}
