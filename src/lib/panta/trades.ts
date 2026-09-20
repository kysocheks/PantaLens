import { z } from "zod";

import type { PantaTrade } from "./schemas";

export const tradeViewSchema = z
  .object({
    id: z.string().min(1),
    marketId: z.string().min(1),
    wallet: z.string().min(1),
    phase: z.enum(["primary", "secondary"]),
    side: z.enum(["yes", "no", "mixed", "unknown"]),
    yesShares: z.number().finite().nonnegative(),
    noShares: z.number().finite().nonnegative(),
    feePaid: z.number().finite().nonnegative(),
    tradedAt: z.iso.datetime().nullable(),
    signature: z.string().min(1),
    quoteAsset: z.string().min(1),
  })
  .strict();

export type TradeView = z.infer<typeof tradeViewSchema>;

function tradeSide(yesShares: number, noShares: number): TradeView["side"] {
  if (yesShares > 0 && noShares === 0) return "yes";
  if (noShares > 0 && yesShares === 0) return "no";
  if (yesShares > 0 && noShares > 0) return "mixed";
  return "unknown";
}

export function toTradeView(trade: PantaTrade): TradeView {
  const yesShares = Number(trade.yesAmount);
  const noShares = Number(trade.noAmount);

  return {
    id: String(trade.id),
    marketId: trade.marketId,
    wallet: trade.wallet,
    phase: trade.isPrimary ? "primary" : "secondary",
    side: tradeSide(yesShares, noShares),
    yesShares,
    noShares,
    feePaid: Number(trade.feePaid),
    tradedAt:
      trade.blockTime === null
        ? null
        : new Date(trade.blockTime * 1_000).toISOString(),
    signature: trade.signature,
    quoteAsset: trade.quoteAsset,
  };
}

export function normalizeTrades(trades: PantaTrade[]): TradeView[] {
  return trades.map(toTradeView).sort((left, right) => {
    if (left.tradedAt === null && right.tradedAt === null) {
      return left.id.localeCompare(right.id);
    }
    if (left.tradedAt === null) return 1;
    if (right.tradedAt === null) return -1;
    return Date.parse(right.tradedAt) - Date.parse(left.tradedAt);
  });
}
