import { z } from "zod";
import { NAME_MAX_LENGTH } from "./constants";
import type { GameAction } from "./types";

const tileId = z.number().int().min(0).max(39);
const offer = z.object({
  cash: z.number().int().min(0).max(1_000_000),
  tiles: z.array(tileId).max(28),
  jailCards: z.number().int().min(0).max(2),
});

export const actionSchema: z.ZodType<GameAction> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("roll") }),
  z.object({ type: z.literal("payJail") }),
  z.object({ type: z.literal("useJailCard") }),
  z.object({ type: z.literal("buy") }),
  z.object({ type: z.literal("declineBuy") }),
  z.object({ type: z.literal("bid"), amount: z.number().int().min(1).max(1_000_000) }),
  z.object({ type: z.literal("resolveAuction") }),
  z.object({ type: z.literal("endTurn") }),
  z.object({ type: z.literal("build"), tileId }),
  z.object({ type: z.literal("sellBuilding"), tileId }),
  z.object({ type: z.literal("mortgage"), tileId }),
  z.object({ type: z.literal("unmortgage"), tileId }),
  z.object({ type: z.literal("payDebt") }),
  z.object({ type: z.literal("bankrupt") }),
  z.object({ type: z.literal("cardChoice"), choice: z.enum(["pay", "draw"]) }),
  z.object({ type: z.literal("proposeTrade"), toId: z.string().min(1).max(64), give: offer, take: offer }),
  z.object({ type: z.literal("cancelTrade"), tradeId: z.string().min(1).max(64) }),
  z.object({ type: z.literal("respondTrade"), tradeId: z.string().min(1).max(64), accept: z.boolean() }),
  z.object({ type: z.literal("leave") }),
]);

export const playerNameSchema = z
  .string()
  .transform((s) => s.replace(/[\u0000-\u001f\u007f<>]/g, "").trim())
  .pipe(z.string().min(1, "Choisissez un pseudo.").max(NAME_MAX_LENGTH, "Pseudo trop long."));
