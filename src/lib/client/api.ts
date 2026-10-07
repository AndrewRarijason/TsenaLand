"use client";

import type { GameAction, GameState } from "@/game/types";
import { ensureSession, resetSession } from "./supabase";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface StatePayload {
  state: GameState;
  serverNow: number;
  gameId?: string;
  member?: boolean;
}

async function request<T>(path: string, method: "GET" | "POST", body?: unknown, retry = true): Promise<T> {
  const session = await ensureSession();
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Connexion perdue. Vérifiez votre réseau.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && retry) {
    await resetSession();
    return request<T>(path, method, body, false);
  }
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Erreur inattendue.");
  return data as T;
}

export const api = {
  createGame: (name: string) => request<{ code: string }>("/api/games", "POST", { name }),
  getGame: (code: string) => request<StatePayload>(`/api/games/${code}`, "GET"),
  joinGame: (code: string, name: string) => request<StatePayload>(`/api/games/${code}/join`, "POST", { name }),
  action: (code: string, action: GameAction) => request<StatePayload>(`/api/games/${code}/action`, "POST", { action }),
  timeouts: (code: string) => request<StatePayload>(`/api/games/${code}/timeouts`, "POST", {}),
};
