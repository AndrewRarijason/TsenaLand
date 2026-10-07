"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { APP_TAG } from "@/lib/dbNames";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isOnlineConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase n'est pas configuré (voir .env.local).");
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "monopoly-gasy-auth" },
    });
  }
  return client;
}

let pending: Promise<Session> | null = null;

/**
 * Session anonyme (pseudo seulement, sans email ni mot de passe). Elle reste
 * enregistrée dans le navigateur : en revenant sur la page, on retrouve sa partie.
 */
export function ensureSession(): Promise<Session> {
  if (!pending) {
    pending = (async () => {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      if (data.session) return data.session;
      const { data: signed, error } = await sb.auth.signInAnonymously({ options: { data: { app: APP_TAG } } });
      if (error || !signed.session) {
        throw new Error(
          error?.message.includes("Anonymous sign-ins are disabled")
            ? "Connexion anonyme désactivée dans Supabase (voir README)."
            : "Connexion impossible, réessayez.",
        );
      }
      return signed.session;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

/** Repart d'une session neuve (compte anonyme supprimé ou jeton invalide). */
export async function resetSession(): Promise<Session> {
  await getSupabase().auth.signOut({ scope: "local" });
  return ensureSession();
}
