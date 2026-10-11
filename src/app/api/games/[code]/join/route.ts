import { playerNameSchema, tokenSchema } from "@/game/actionSchema";
import { addPlayer } from "@/game/engine";
import { requireUser } from "@/lib/server/auth";
import { handle, HttpError, readJson } from "@/lib/server/http";
import { mutateGame, stateResponse } from "@/lib/server/store";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { PLAYERS_TABLE } from "@/lib/dbNames";

/** Rejoindre un salon, ou revenir dans une partie dont on fait déjà partie. */
export async function POST(req: Request, ctx: RouteContext<"/api/games/[code]/join">) {
  return handle(async () => {
    const userId = await requireUser(req);
    const { code } = await ctx.params;
    const body = await readJson(req);

    const { row, state } = await mutateGame(code, (r) => {
      if (r.state.players.some((p) => p.id === userId)) return null;
      const token = tokenSchema.safeParse(body.token).data;
      return addPlayer(r.state, { id: userId, name: playerNameSchema.parse(body.name ?? ""), token });
    });

    const me = state.players.find((p) => p.id === userId);
    if (!me) throw new HttpError(409, "Impossible de rejoindre cette partie.");
    if (me.bankrupt) throw new HttpError(410, "Vous avez été éliminé de cette partie.");

    const { error } = await supabaseAdmin()
      .from(PLAYERS_TABLE)
      .upsert(
        { game_id: row.id, user_id: userId, name: me.name, last_seen_at: new Date().toISOString() },
        { onConflict: "game_id,user_id" },
      );
    if (error) throw error;

    return stateResponse(state, { gameId: row.id, member: true });
  });
}
