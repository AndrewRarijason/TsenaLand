import { requireUser } from "@/lib/server/auth";
import { handle } from "@/lib/server/http";
import { isMember, requireGame, stateResponse } from "@/lib/server/store";

/** État de la partie (au chargement de la page ou après une reconnexion). */
export async function GET(req: Request, ctx: RouteContext<"/api/games/[code]">) {
  return handle(async () => {
    const userId = await requireUser(req);
    const { code } = await ctx.params;
    const row = await requireGame(code);
    const member = await isMember(row.id, userId);
    return stateResponse(row.state, { gameId: row.id, member });
  });
}
