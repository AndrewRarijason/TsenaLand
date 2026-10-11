"use client";

import { CARDS, DECK_LABEL } from "@/game/cards";
import { findPlayer } from "@/game/rules";
import type { GameState } from "@/game/types";
import type { CardPrompt } from "@/lib/client/playback";
import { ChestIcon } from "../icons";
import { Button } from "../ui";

/**
 * Carte tirée. Pour le joueur concerné : d'abord le nom du paquet et un bouton
 * « Ouvrir », puis la carte se retourne. Pour les autres : une notification.
 */
export function CardModal({
  prompt,
  state,
  onOpen,
  onClose,
}: {
  prompt: CardPrompt | null;
  state: GameState;
  onOpen: () => void;
  onClose: () => void;
}) {
  if (!prompt) return null;
  const def = CARDS[prompt.event.cardId];
  const who = findPlayer(state, prompt.event.playerId);
  const chance = prompt.deck === "chance";
  const label = DECK_LABEL[prompt.deck];

  if (!prompt.mine) {
    return (
      <button
        type="button"
        onClick={onClose}
        className={`toast-in fixed inset-x-3 top-16 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border-2 border-white p-3 text-left shadow-2xl ${
          chance ? "bg-orange-400" : "bg-sky-300"
        }`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/80 text-xl font-black text-orange-600">
          {chance ? "?" : <ChestIcon className="h-7" />}
        </span>
        <span className="text-sm text-slate-900">
          <b>
            {who?.name} · {label}
          </b>
          <br />
          {def.text}
        </span>
      </button>
    );
  }

  return (
    <div className="backdrop-in fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-[3px]">
      <div className="sheet-in flex w-full max-w-xs flex-col items-center">
        <p className="mb-3 text-center text-sm font-semibold text-white/90 drop-shadow">
          {prompt.revealed ? `${who?.name} tire une carte` : `${who?.name} tombe sur la case`}
        </p>
        <div className={`flip-card ${prompt.revealed ? "flipped" : ""}`}>
          <div className="flip-inner">
            {/* Dos de la carte : le paquet */}
            <div className={`flip-face deck-back ${chance ? "is-chance" : "is-community"}`}>
              <div className="deck-back-frame">
                {chance ? <span className="deck-back-q">?</span> : <ChestIcon className="w-[55%]" />}
                <span className="deck-back-title">{label}</span>
              </div>
            </div>
            {/* Face de la carte : le texte */}
            <div className="flip-face card-front">
              <div className={`card-front-head ${chance ? "is-chance" : "is-community"}`}>
                {chance ? "?" : <ChestIcon className="h-6" />}
                <span>{label}</span>
              </div>
              <p className="card-front-text">{def.text}</p>
            </div>
          </div>
        </div>
        {prompt.revealed ? (
          <Button size="lg" variant="secondary" className="mt-4 w-full" onClick={onClose} autoFocus>
            OK
          </Button>
        ) : (
          <Button size="lg" className="pulse-cta mt-4 w-full" onClick={onOpen} autoFocus>
            Ouvrir
          </Button>
        )}
      </div>
    </div>
  );
}
