import { playerNameSchema } from "@/game/actionSchema";
import { createGame } from "@/game/engine";
import { requireUser } from "@/lib/server/auth";
import { handle, HttpError, json, readJson } from "@/lib/server/http";
import { generateCode } from "@/lib/server/store";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { GAMES_TABLE, PLAYERS_TABLE } from "@/lib/dbNames";

/** Crée une partie et y inscrit son créateur (l'hôte). */
export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUser(req);
    const body = await readJson(req);
    const name = playerNameSchema.parse(body.name ?? "");
    const state = createGame({ id: userId, name });
    const sb = supabaseAdmin();

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { data, error } = await sb
        .from(GAMES_TABLE)
        .insert({ code, status: state.status, version: state.version, state })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") continue; // code déjà pris : on en tire un autre
        throw error;
      }
      const { error: memberError } = await sb.from(PLAYERS_TABLE).insert({ game_id: data.id, user_id: userId, name });
      if (memberError) throw memberError;
      return json({ code });
    }
    throw new HttpError(500, "Impossible de créer la partie, réessayez.");
  });
}
