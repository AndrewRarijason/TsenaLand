import { DISCONNECT_LIMIT_MS } from "@/game/constants";
import { eliminatePlayer, removeLobbyPlayer } from "@/game/engine";
import { requireUser } from "@/lib/server/auth";
import { handle, HttpError } from "@/lib/server/http";
import { isMember, mutateGame, requireGame, secureRandom, stateResponse } from "@/lib/server/store";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { GAMES_TABLE, PLAYERS_TABLE } from "@/lib/dbNames";

/**
 * Appelé par un joueur connecté quand son signal de présence indique qu'un
 * autre joueur est absent depuis plus de 5 minutes : ce dernier est éliminé
 * (ses biens retournent à la Banque) et retiré de la partie.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/games/[code]/timeouts">) {
  return handle(async () => {
    const userId = await requireUser(req);
    const { code } = await ctx.params;
    const sb = supabaseAdmin();
    const game = await requireGame(code);
    if (!(await isMember(game.id, userId))) throw new HttpError(403, "Vous ne faites pas partie de cette partie.");

    const limit = new Date(Date.now() - DISCONNECT_LIMIT_MS).toISOString();
    const { data: staleRows, error } = await sb
      .from(PLAYERS_TABLE)
      .select("user_id")
      .eq("game_id", game.id)
      .lt("last_seen_at", limit);
    if (error) throw error;
    const stale = (staleRows ?? []).map((r) => r.user_id as string).filter((id) => id !== userId);
    if (stale.length === 0) return stateResponse(game.state);

    const { row, state } = await mutateGame(code, (r) => {
      let s = r.state;
      for (const id of stale) {
        const p = s.players.find((x) => x.id === id);
        if (!p) continue;
        if (s.status === "lobby") {
          s = removeLobbyPlayer(s, id);
        } else {
          s = eliminatePlayer(
            s,
            id,
            `⏱️ ${p.name} est déconnecté depuis plus de 5 minutes : il est éliminé et ses biens retournent à la Banque.`,
            { rng: secureRandom, now: Date.now() },
          );
        }
      }
      return s;
    });

    await sb.from(PLAYERS_TABLE).delete().eq("game_id", row.id).in("user_id", stale);
    if (state.status === "lobby" && state.players.length === 0) await sb.from(GAMES_TABLE).delete().eq("id", row.id);

    return stateResponse(state);
  });
}
