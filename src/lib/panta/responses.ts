import { z } from "zod";

import { marketViewSchema } from "./normalize";
import { tradeViewSchema } from "./trades";

export const catalogResponseSchema = z
  .object({
    items: z.array(marketViewSchema),
    categories: z.array(z.string().min(1)),
    nextCursor: z.string().nullable(),
    meta: z
      .object({
        source: z.literal("panta"),
        environment: z.enum(["sandbox", "live", "unknown"]),
        retrievedAt: z.iso.datetime(),
        detailFailures: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const tradeResponseSchema = z
  .object({
    marketId: z.string().min(1),
    items: z.array(tradeViewSchema),
    meta: z
      .object({
        source: z.literal("panta"),
        retrievedAt: z.iso.datetime(),
        order: z.literal("newest_first"),
        priceHistory: z.literal("unavailable"),
      })
      .strict(),
  })
  .strict();

export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
export type TradeResponse = z.infer<typeof tradeResponseSchema>;
