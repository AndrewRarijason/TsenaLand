import { GameError } from "@/game/engine";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Transforme les erreurs connues en réponses JSON lisibles par l'interface. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof GameError) return json({ error: e.message }, 400);
    if (e instanceof ZodError) return json({ error: e.issues[0]?.message ?? "Requête invalide." }, 400);
    console.error(e);
    return json({ error: "Erreur serveur, réessayez." }, 500);
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}
