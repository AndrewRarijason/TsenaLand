import { HttpError } from "./http";
import { supabaseAdmin } from "./supabaseAdmin";

// Vérifie le jeton de session (connexion anonyme Supabase) envoyé par le navigateur.
// Petit cache mémoire pour éviter un appel à Supabase Auth à chaque coup.

const cache = new Map<string, { userId: string; expires: number }>();
const CACHE_MS = 5 * 60_000;

export async function requireUser(req: Request): Promise<string> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Session manquante.");

  const hit = cache.get(token);
  if (hit && hit.expires > Date.now()) return hit.userId;

  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expirée.");

  if (cache.size > 1000) cache.clear();
  cache.set(token, { userId: data.user.id, expires: Date.now() + CACHE_MS });
  return data.user.id;
}
