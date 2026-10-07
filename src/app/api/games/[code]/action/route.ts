import { actionSchema } from "@/game/actionSchema";
import { applyAction } from "@/game/engine";
import { requireUser } from "@/lib/server/auth";
import { handle, HttpError, readJson } from "@/lib/server/http";
import { mutateGame, secureRandom, stateResponse } from "@/lib/server/store";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { GAMES_TABLE, PLAYERS_TABLE } from "@/lib/dbNames";

/** Joue un coup. Le serveur est l'arbitre : il lance les dés et valide les règles. */
export async function POST(req: Request, ctx: RouteContext<"/api/games/[code]/action">) {
  return handle(async () => {
    const userId = await requireUser(req);
    const { code } = await ctx.params;
    const body = await readJson(req);
    const action = actionSchema.parse(body.action);

    const { row, state } = await mutateGame(code, (r) => {
      if (!r.state.players.some((p) => p.id === userId)) {
        throw new HttpError(403, "Vous ne faites pas partie de cette partie.");
      }
      return applyAction(r.state, userId, action, { rng: secureRandom, now: Date.now() });
    });

    if (action.type === "leave") {
      const sb = supabaseAdmin();
      await sb.from(PLAYERS_TABLE).delete().eq("game_id", row.id).eq("user_id", userId);
      if (state.status === "lobby" && state.players.length === 0) await sb.from(GAMES_TABLE).delete().eq("id", row.id);
    }

    return stateResponse(state);
  });
}
