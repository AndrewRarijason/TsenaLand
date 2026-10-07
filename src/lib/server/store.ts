import { toPublicState } from "@/game/engine";
import type { GameState } from "@/game/types";
import { HttpError, json } from "./http";
import { supabaseAdmin } from "./supabaseAdmin";
import { GAMES_TABLE, gameTopic, PLAYERS_TABLE } from "@/lib/dbNames";

// Accès à la base : une partie = une ligne `mg_games` dont la colonne `state`
// contient tout l'état. Chaque écriture vérifie le numéro de version pour
// éviter que deux coups simultanés s'écrasent.

export interface GameRow {
  id: string;
  code: string;
  status: GameState["status"];
  version: number;
  state: GameState;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function loadGame(code: string): Promise<GameRow | null> {
  const { data, error } = await supabaseAdmin()
    .from(GAMES_TABLE)
    .select("id, code, status, version, state")
    .eq("code", normalizeCode(code))
    .maybeSingle();
  if (error) throw error;
  return (data as GameRow | null) ?? null;
}

export async function requireGame(code: string): Promise<GameRow> {
  const row = await loadGame(code);
  if (!row) throw new HttpError(404, "Partie introuvable : elle est terminée ou a été supprimée.");
  return row;
}

export async function isMember(gameId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from(PLAYERS_TABLE)
    .select("user_id")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function saveGame(row: GameRow, next: GameState): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from(GAMES_TABLE)
    .update({ state: next, version: next.version, status: next.status, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("version", row.version)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Envoie le nouvel état à tous les joueurs via Supabase Realtime (sans passer par la base). */
export async function broadcastState(gameId: string, state: GameState) {
  const sb = supabaseAdmin();
  const channel = sb.channel(gameTopic(gameId), { config: { private: true } });
  try {
    const res = await channel.httpSend("state", { state: toPublicState(state), serverNow: Date.now() });
    if (!res.success) console.warn("Diffusion temps réel échouée :", res.status, res.error);
  } catch (e) {
    console.warn("Diffusion temps réel échouée :", e);
  } finally {
    await sb.removeChannel(channel);
  }
}

/**
 * Lit la partie, applique `fn` puis réécrit l'état et le diffuse.
 * Si `fn` renvoie null (ou l'état inchangé), rien n'est écrit.
 */
export async function mutateGame(
  code: string,
  fn: (row: GameRow) => GameState | null,
): Promise<{ row: GameRow; state: GameState }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await requireGame(code);
    const next = fn(row);
    if (!next || next === row.state) return { row, state: row.state };
    if (await saveGame(row, next)) {
      await broadcastState(row.id, next);
      return { row, state: next };
    }
  }
  throw new HttpError(409, "Trop de coups en même temps, réessayez.");
}

export function stateResponse(state: GameState, extra: Record<string, unknown> = {}) {
  return json({ state: toPublicState(state), serverNow: Date.now(), ...extra });
}
