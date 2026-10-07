"use client";

import { GROUP_COLORS } from "@/game/board";
import { GO_SALARY, JAIL_FINE } from "@/game/constants";
import { money } from "@/game/format";
import { unmortgageCost } from "@/game/rules";
import type { Tile } from "@/game/types";
import { BulbIcon, TapIcon, TaxiBrousseIcon } from "../icons";

/** Titre de propriété, comme la carte du jeu de société. */
export function TitleDeed({ tile, compact = false }: { tile: Tile; compact?: boolean }) {
  if (tile.kind === "property") {
    const r = tile.rents!;
    return (
      <div className="overflow-hidden rounded-xl border-2 border-slate-900 bg-white text-slate-900">
        <div className="border-b-2 border-slate-900 px-3 py-2 text-center" style={{ background: GROUP_COLORS[tile.group!] }}>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Titre de propriété</div>
          <div className="text-base font-black uppercase leading-tight">{tile.name}</div>
          {tile.district && <div className="text-xs font-semibold opacity-80">{tile.district}, Antananarivo</div>}
        </div>
        {!compact && (
          <div className="space-y-0.5 px-4 py-3 text-sm">
            <Row label="Loyer terrain nu" value={money(r[0])} />
            <p className="pb-1 text-center text-[11px] text-slate-500">Loyer doublé si tout le groupe est possédé</p>
            <Row label="Avec 1 maison" value={money(r[1])} />
            <Row label="Avec 2 maisons" value={money(r[2])} />
            <Row label="Avec 3 maisons" value={money(r[3])} />
            <Row label="Avec 4 maisons" value={money(r[4])} />
            <Row label="Avec un hôtel" value={money(r[5])} bold />
            <div className="my-2 border-t border-slate-200" />
            <Row label="Prix d'une maison" value={money(tile.houseCost!)} />
            <Row label="Prix d'un hôtel" value={`${money(tile.houseCost!)} + 4 maisons`} />
            <Row label="Valeur hypothécaire" value={money(tile.mortgage!)} />
            <Row label="Lever l'hypothèque" value={money(unmortgageCost(tile))} />
          </div>
        )}
      </div>
    );
  }

  if (tile.kind === "station" || tile.kind === "utility") {
    return (
      <div className="overflow-hidden rounded-xl border-2 border-slate-900 bg-white text-slate-900">
        <div className="flex flex-col items-center gap-1 border-b-2 border-slate-900 px-3 py-3">
          {tile.kind === "station" ? (
            <TaxiBrousseIcon className="h-12" />
          ) : tile.id === 12 ? (
            <BulbIcon className="h-12" />
          ) : (
            <TapIcon className="h-12" />
          )}
          <div className="text-center text-base font-black uppercase leading-tight">{tile.name}</div>
        </div>
        {!compact && (
          <div className="space-y-0.5 px-4 py-3 text-sm">
            {tile.kind === "station" ? (
              <>
                <Row label="Loyer" value={money(25)} />
                <Row label="Avec 2 gares routières" value={money(50)} />
                <Row label="Avec 3 gares routières" value={money(100)} />
                <Row label="Avec 4 gares routières" value={money(200)} />
              </>
            ) : (
              <p className="text-slate-700">
                Si vous possédez une compagnie Jirama, le loyer vaut <b>4 fois</b> le résultat des dés. Avec Jirama Jiro
                et Jirama Rano, il vaut <b>10 fois</b> le résultat des dés.
              </p>
            )}
            <div className="my-2 border-t border-slate-200" />
            <Row label="Valeur hypothécaire" value={money(tile.mortgage!)} />
            <Row label="Lever l'hypothèque" value={money(unmortgageCost(tile))} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-slate-900 bg-white px-4 py-4 text-center text-slate-900">
      <div className="text-base font-black uppercase">{tile.name}</div>
      <p className="mt-2 text-sm text-slate-700">{describe(tile)}</p>
    </div>
  );
}

function describe(tile: Tile): string {
  switch (tile.kind) {
    case "go":
      return `Recevez ${money(GO_SALARY)} à chaque passage par la case Départ.`;
    case "jail":
      return `Envoyé à Tsiafahy, on en sort en payant ${money(JAIL_FINE)}, avec une carte « Libéré de Tsiafahy » ou en faisant un double (3 essais). Si on tombe ici en jouant normalement, c'est une simple visite.`;
    case "parking":
      return "Rien ne se passe : profitez de la pause !";
    case "gotojail":
      return `Allez directement à Tsiafahy, sans passer par la case Départ ni recevoir ${money(GO_SALARY)}.`;
    case "chance":
      return "Tirez une carte Chance et suivez ses instructions.";
    case "community":
      return "Tirez une carte Caisse de communauté et suivez ses instructions.";
    case "tax":
      return `Payez ${money(tile.amount!)} à la Banque.`;
    default:
      return "";
  }
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}
