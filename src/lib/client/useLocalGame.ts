"use client";

import { addPlayer, applyAction, createGame, type EngineContext } from "@/game/engine";
import type { GameAction, GameState } from "@/game/types";
import { useCallback, useEffect, useRef, useState } from "react";

// Mode local : tout le jeu tourne dans le navigateur, sans serveur ni base de données.
// La partie est gardée dans le stockage du navigateur pour survivre à un rechargement.

const STORAGE_KEY = "monopoly-gasy-local";

const ctx = (): EngineContext => ({ rng: Math.random, now: Date.now() });

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

function save(state: GameState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // stockage indisponible (navigation privée) : la partie reste en mémoire
  }
}

export function useLocalGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<GameState | null>(null);

  const commit = useCallback((next: GameState | null) => {
    ref.current = next;
    setState(next);
    save(next);
  }, []);

  useEffect(() => {
    const saved = load();
    ref.current = saved?.status === "playing" ? saved : null;
    setState(ref.current);
    setLoaded(true);
  }, []);

  const start = useCallback(
    (names: string[]) => {
      let s = createGame({ id: "j1", name: names[0] });
      names.slice(1).forEach((name, i) => {
        s = addPlayer(s, { id: `j${i + 2}`, name });
      });
      commit(applyAction(s, "j1", { type: "start" }, ctx()));
    },
    [commit],
  );

  const send = useCallback(
    async (action: GameAction, asId: string) => {
      if (!ref.current) return;
      commit(applyAction(ref.current, asId, action, ctx()));
    },
    [commit],
  );

  const reset = useCallback(() => commit(null), [commit]);

  // Clôture automatique des enchères à la fin du compte à rebours.
  const auctionEnd = state?.phase.kind === "auction" ? state.auction?.endsAt : undefined;
  useEffect(() => {
    if (!auctionEnd) return;
    const id = setTimeout(
      () => {
        const s = ref.current;
        if (s?.phase.kind === "auction") commit(applyAction(s, s.players[s.current].id, { type: "resolveAuction" }, ctx()));
      },
      Math.max(0, auctionEnd - Date.now()) + 50,
    );
    return () => clearTimeout(id);
  }, [auctionEnd, commit]);

  return { state, loaded, start, send, reset, now: Date.now };
}
