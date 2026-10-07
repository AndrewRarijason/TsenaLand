import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client Supabase côté serveur uniquement : utilise la clé secrète (contourne RLS).
// Ne jamais importer ce fichier depuis un composant client.

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY manquantes.");
  }
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return admin;
}
