import { z } from "zod";

import type { PantaMarket } from "./schemas";

export type PriceSource = "spot" | "primary" | "secondary" | null;

const probabilitySchema = z.number().min(0).max(100).nullable();

export const marketViewSchema = z
  .object({
    marketId: z.string().min(1),
    category: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    imageUrl: z.string().nullable(),
    phase: z.enum(["primary", "secondary", "resolved", "cancelled"]),
    marketType: z.string().min(1),
    region: z.string(),
    resolved: z.boolean(),
    status: z.string(),
    volumeUsdc: z.number().finite().nullable(),
    campaignId: z.string().nullable(),
    createdByPartner: z.boolean(),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    resolutionAt: z.iso.datetime(),
    yesProbability: probabilitySchema,
    noProbability: probabilitySchema,
    priceSource: z.enum(["spot", "primary", "secondary"]).nullable(),
  })
  .strict();

export type MarketView = z.infer<typeof marketViewSchema>;

type NullableDecimal = string | null | undefined;

function decimalValue(value: NullableDecimal): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function preferredVolume(...candidates: NullableDecimal[]): string | null {
  const positive = candidates.find((value) => (decimalValue(value) ?? 0) > 0);
  if (positive !== undefined && positive !== null) return positive;

  const present = candidates.find(
    (value) =>
      value !== null && value !== undefined && decimalValue(value) !== null,
  );
  return present ?? null;
}

function hasUsablePricePair(
  yes: NullableDecimal,
  no: NullableDecimal,
): boolean {
  const yesValue = decimalValue(yes);
  const noValue = decimalValue(no);
  if (yesValue === null && noValue === null) return false;

  return !(
    yesValue !== null &&
    noValue !== null &&
    yesValue <= 0 &&
    noValue <= 0
  );
}

function preferredPricePair(
  summaryYes: string | null,
  summaryNo: string | null,
  detailYes: string | null,
  detailNo: string | null,
) {
  if (hasUsablePricePair(summaryYes, summaryNo)) {
    return { yes: summaryYes, no: summaryNo };
  }
  if (hasUsablePricePair(detailYes, detailNo)) {
    return { yes: detailYes, no: detailNo };
  }
  return { yes: summaryYes, no: summaryNo };
}

export function mergePantaMarketRecords(
  summary: PantaMarket,
  detail: PantaMarket,
): PantaMarket {
  const spot = preferredPricePair(
    summary.yesPrice,
    summary.noPrice,
    detail.yesPrice,
    detail.noPrice,
  );
  const primary = preferredPricePair(
    summary.primaryYesPrice,
    summary.primaryNoPrice,
    detail.primaryYesPrice,
    detail.primaryNoPrice,
  );
  const secondary = preferredPricePair(
    summary.secondaryYesPrice,
    summary.secondaryNoPrice,
    detail.secondaryYesPrice,
    detail.secondaryNoPrice,
  );

  return {
    ...detail,
    category: summary.category,
    title: summary.title.trim() ? summary.title : detail.title,
    description: summary.description.trim()
      ? summary.description
      : detail.description,
    images: summary.images.length > 0 ? summary.images : detail.images,
    phase: summary.phase,
    marketType: summary.marketType,
    startTime: summary.startTime,
    endTime: summary.endTime,
    resolutionTime: summary.resolutionTime,
    region: summary.region,
    resolved: summary.resolved,
    status: summary.status,
    volumeUsdc: preferredVolume(
      summary.volumeUsdc,
      detail.volumeUsdc,
      summary.totalVolumeUsdc,
      detail.totalVolumeUsdc,
    ),
    totalVolumeUsdc: preferredVolume(
      summary.totalVolumeUsdc,
      detail.totalVolumeUsdc,
      summary.volumeUsdc,
      detail.volumeUsdc,
    ),
    volumeUsdcBase: summary.volumeUsdcBase ?? detail.volumeUsdcBase,
    totalVolumeUsdcBase:
      summary.totalVolumeUsdcBase ?? detail.totalVolumeUsdcBase,
    campaignId: summary.campaignId ?? detail.campaignId,
    createdByPartner: summary.createdByPartner,
    yesPrice: spot.yes,
    noPrice: spot.no,
    primaryYesPrice: primary.yes,
    primaryNoPrice: primary.no,
    secondaryYesPrice: secondary.yes,
    secondaryNoPrice: secondary.no,
  };
}

export function mergeMarketViews(
  summary: MarketView,
  detail: MarketView,
): MarketView {
  return {
    ...detail,
    marketId: summary.marketId,
    category: summary.category,
    title: summary.title,
    description: summary.description || detail.description,
    imageUrl: summary.imageUrl ?? detail.imageUrl,
    phase: summary.phase,
    marketType: summary.marketType,
    region: summary.region,
    resolved: summary.resolved,
    status: summary.status,
    volumeUsdc:
      [summary.volumeUsdc, detail.volumeUsdc].find(
        (value) => value !== null && value > 0,
      ) ??
      summary.volumeUsdc ??
      detail.volumeUsdc,
    campaignId: summary.campaignId ?? detail.campaignId,
    createdByPartner: summary.createdByPartner,
    startAt: summary.startAt,
    endAt: summary.endAt,
    resolutionAt: summary.resolutionAt,
    ...(hasUsablePricePair(
      summary.yesProbability?.toString() ?? null,
      summary.noProbability?.toString() ?? null,
    )
      ? {
          yesProbability: summary.yesProbability,
          noProbability: summary.noProbability,
          priceSource: summary.priceSource,
        }
      : {
          yesProbability: detail.yesProbability,
          noProbability: detail.noProbability,
          priceSource: detail.priceSource,
        }),
  };
}

function toPercent(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(Math.min(1, Math.max(0, parsed)) * 1000) / 10;
}

function normalizedTitle(market: PantaMarket): string | null {
  const title = market.title.trim();
  if (title) return title;

  const descriptionLine = market.description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return descriptionLine ?? null;
}

function pricePair(market: PantaMarket): {
  yes: string | null;
  no: string | null;
  source: PriceSource;
} {
  if (market.yesPrice !== null || market.noPrice !== null) {
    return usablePricePair(market.yesPrice, market.noPrice, "spot");
  }
  if (market.secondaryYesPrice !== null || market.secondaryNoPrice !== null) {
    return usablePricePair(
      market.secondaryYesPrice,
      market.secondaryNoPrice,
      "secondary",
    );
  }
  if (market.primaryYesPrice !== null || market.primaryNoPrice !== null) {
    return usablePricePair(
      market.primaryYesPrice,
      market.primaryNoPrice,
      "primary",
    );
  }
  return { yes: null, no: null, source: null };
}

function usablePricePair(
  yes: string | null,
  no: string | null,
  source: Exclude<PriceSource, null>,
): { yes: string | null; no: string | null; source: PriceSource } {
  const bothNonPositive =
    yes !== null &&
    no !== null &&
    Number.isFinite(Number(yes)) &&
    Number.isFinite(Number(no)) &&
    Number(yes) <= 0 &&
    Number(no) <= 0;

  return bothNonPositive
    ? { yes: null, no: null, source: null }
    : { yes, no, source };
}

export function toMarketView(market: PantaMarket): MarketView | null {
  const title = normalizedTitle(market);
  if (title === null) return null;

  const prices = pricePair(market);
  const volume = market.volumeUsdc === null ? null : Number(market.volumeUsdc);

  return {
    marketId: market.marketId,
    category: market.category,
    title,
    description: market.description,
    imageUrl: market.images[0] ?? null,
    phase: market.phase,
    marketType: market.marketType,
    region: market.region,
    resolved: market.resolved,
    status: market.status,
    volumeUsdc: volume !== null && Number.isFinite(volume) ? volume : null,
    campaignId: market.campaignId,
    createdByPartner: market.createdByPartner,
    startAt: new Date(market.startTime * 1000).toISOString(),
    endAt: new Date(market.endTime * 1000).toISOString(),
    resolutionAt: new Date(market.resolutionTime * 1000).toISOString(),
    yesProbability: toPercent(prices.yes),
    noProbability: toPercent(prices.no),
    priceSource: prices.source,
  };
}
