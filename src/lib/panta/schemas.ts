import { z } from "zod";

const nullablePrice = z.string().nullable();
const decimalAmount = z.union([
  z.number().finite().nonnegative(),
  z.string().regex(/^\d+(?:\.\d+)?$/),
]);

const unixSecondsSchema = z.number().int().nonnegative().safe();
const isoUtcSecondsSchema = z.iso
  .datetime({ offset: false, local: false, precision: 0 })
  .transform((value) => Date.parse(value) / 1_000)
  .pipe(unixSecondsSchema);

const pantaTimestampSchema = z.union([unixSecondsSchema, isoUtcSecondsSchema]);

const pantaMarketBaseSchema = z.object({
  marketId: z.string().min(1),
  category: z.string().min(1),
  title: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  phase: z.enum(["primary", "secondary", "resolved", "cancelled"]),
  marketType: z.string().min(1),
  startTime: pantaTimestampSchema,
  endTime: pantaTimestampSchema,
  resolutionTime: pantaTimestampSchema,
  region: z.string(),
  resolved: z.boolean(),
  status: z.string(),
  volumeUsdc: z.string().nullable(),
  totalVolumeUsdc: z.string().nullable().optional(),
  volumeUsdcBase: z.string().nullable().optional(),
  totalVolumeUsdcBase: z.string().nullable().optional(),
  campaignId: z.string().nullable(),
  createdByPartner: z.boolean(),
  yesPrice: nullablePrice,
  noPrice: nullablePrice,
  primaryYesPrice: nullablePrice,
  primaryNoPrice: nullablePrice,
  secondaryYesPrice: nullablePrice,
  secondaryNoPrice: nullablePrice,
});

export const pantaMarketListItemSchema = pantaMarketBaseSchema;

export const pantaMarketSchema = pantaMarketBaseSchema;

export const pantaMarketListSchema = z.object({
  items: z.array(pantaMarketListItemSchema),
  nextCursor: z.string().nullable().optional(),
});

export const pantaCategoriesSchema = z.object({
  categories: z.array(z.string().min(1)),
});

export const pantaTradeSchema = z.object({
  id: z.union([z.string().min(1), z.number().finite()]),
  marketId: z.string().min(1),
  wallet: z.string().min(1),
  isPrimary: z.boolean(),
  yesAmount: decimalAmount,
  noAmount: decimalAmount,
  feePaid: decimalAmount,
  blockTime: z.number().int().nonnegative().nullable(),
  signature: z.string().min(1),
  quoteAsset: z.string().min(1),
});

export const pantaTradeListSchema = z.object({
  marketId: z.string().min(1),
  items: z.array(pantaTradeSchema),
});

export const pantaErrorSchema = z.object({
  code: z.string(),
  message: z.string().optional(),
  field: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

export type PantaMarket = z.infer<typeof pantaMarketSchema>;
export type PantaMarketListItem = z.infer<typeof pantaMarketListItemSchema>;
export type PantaTrade = z.infer<typeof pantaTradeSchema>;
