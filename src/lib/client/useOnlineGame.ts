"use client";

import { HEARTBEAT_MS } from "@/game/constants";
import type { GameAction, GameState } from "@/game/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type StatePayload } from "./api";
import { ensureSession, getSupabase } from "./supabase";
import { gameTopic, HEARTBEAT_RPC } from "@/lib/dbNames";

export type OnlineStatus = "loading" | "ready" | "missing" | "error";

/**
 * Partie en ligne :
 * - l'état arrive par Supabase Realtime (diffusé par le serveur après chaque coup) ;
 * - Presence indique qui est connecté ;
 * - un signal « je suis là » part chaque minute pour la règle des 5 minutes ;
 * - si le temps réel ne répond pas, on interroge le serveur toutes les 4 s.
 */
export function useOnlineGame(code: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [member, setMember] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<OnlineStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<Set<string>>(() => new Set());
  const [realtimeOk, setRealtimeOk] = useState(false);
  const stateRef = useRef<GameState | null>(null);
  const offsetRef = useRef(0);
  const lastUpdateRef = useRef(0);

  const accept = useCallback((p: StatePayload) => {
    lastUpdateRef.current = Date.now();
    if (typeof p.serverNow === "number") offsetRef.current = p.serverNow - Date.now();
    const cur = stateRef.current;
    if (!cur || p.state.version >= cur.version) {
      stateRef.current = p.state;
      setState(p.state);
    }
    if (p.gameId) setGameId(p.gameId);
    if (typeof p.member === "boolean") setMember(p.member);
  }, []);

  const refresh = useCallback(async () => {
    try {
      accept(await api.getGame(code));
      setStatus("ready");
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inattendue.";
      if (e instanceof ApiError && e.status === 404) {
        // Partie terminée puis supprimée : on garde l'écran de fin.
        if (stateRef.current?.status === "finished") return;
        setStatus("missing");
        setError(message);
      } else if (!stateRef.current) {
        setStatus("error");
        setError(message);
      }
    }
  }, [code, accept]);

  // Session anonyme puis premier chargement.
  useEffect(() => {
    let cancelled = false;
    const sb = getSupabase();
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    ensureSession()
      .then((s) => {
        if (cancelled) return;
        setUserId(s.user.id);
        refresh();
      })
      .catch((e: Error) => {
        setStatus("error");
        setError(e.message);
      });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  // Canal temps réel privé de la partie.
  useEffect(() => {
    if (!gameId || !member || !userId) return;
    const sb = getSupabase();
    let channel: RealtimeChannel | null = null;
    let closed = false;
    (async () => {
      await sb.realtime.setAuth();
      if (closed) return;
      const ch = sb.channel(gameTopic(gameId), { config: { private: true, presence: { key: userId } } });
      channel = ch;
      ch.on("broadcast", { event: "state" }, ({ payload }) => accept(payload as StatePayload))
        .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
        .subscribe(async (st) => {
          if (st === "SUBSCRIBED") {
            setRealtimeOk(true);
            await ch.track({ at: Date.now() });
            refresh();
          } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
            setRealtimeOk(false);
          }
        });
    })();
    return () => {
      closed = true;
      setRealtimeOk(false);
      if (channel) sb.removeChannel(channel);
    };
  }, [gameId, member, userId, accept, refresh]);

  // « Je suis encore là » + détection des joueurs absents depuis plus de 5 minutes.
  useEffect(() => {
    if (!gameId || !member) return;
    const sb = getSupabase();
    let stopped = false;
    const beat = async () => {
      const { data, error: rpcError } = await sb.rpc(HEARTBEAT_RPC, { p_game_id: gameId });
      if (stopped || rpcError) return;
      const res = data as { ok: boolean; stale?: string[] };
      if (!res.ok) {
        refresh();
        return;
      }
      if (res.stale?.some((id) => id !== userId)) {
        try {
          accept(await api.timeouts(code));
        } catch {
          // un autre joueur l'a déjà fait
        }
      }
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        beat();
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [gameId, member, userId, code, accept, refresh]);

  // Secours si le temps réel est indisponible (ou salon vu par un non-membre).
  const inLobby = state?.status === "lobby";
  useEffect(() => {
    if (realtimeOk || (!member && !inLobby) || status !== "ready") return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [realtimeOk, member, inLobby, status, refresh]);

  // Filet de sécurité : un message temps réel perdu est rattrapé après 45 s de silence.
  useEffect(() => {
    if (!realtimeOk) return;
    const id = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > 45_000) refresh();
    }, 15_000);
    return () => clearInterval(id);
  }, [realtimeOk, refresh]);

  // Clôture des enchères : chaque navigateur tente sa chance, le serveur n'en retient qu'une.
  const auctionEnd = state?.phase.kind === "auction" ? state.auction?.endsAt : undefined;
  useEffect(() => {
    if (!auctionEnd || !member) return;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = (delay: number) => {
      timer = setTimeout(async () => {
        try {
          accept(await api.action(code, { type: "resolveAuction" }));
        } catch {
          if (stateRef.current?.phase.kind === "auction") attempt(1500);
        }
      }, delay);
    };
    attempt(Math.max(0, auctionEnd - (Date.now() + offsetRef.current)) + 200 + Math.random() * 600);
    return () => clearTimeout(timer);
  }, [auctionEnd, member, code, accept]);

  const send = useCallback(
    async (action: GameAction) => {
      try {
        accept(await api.action(code, action));
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) refresh();
        throw e;
      }
    },
    [code, accept, refresh],
  );

  const join = useCallback(
    async (name: string, token?: string) => {
      accept(await api.joinGame(code, name, token));
      setMember(true);
    },
    [code, accept],
  );

  const now = useCallback(() => Date.now() + offsetRef.current, []);

  return { state, status, error, member, userId, online, realtimeOk, send, join, refresh, now };
}
