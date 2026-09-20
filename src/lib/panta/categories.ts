import type { MarketView } from "./normalize";

export function mergeMarketCategories(
  upstreamCategories: string[],
  markets: MarketView[],
): string[] {
  return [
    ...new Set([
      ...upstreamCategories,
      ...markets.map((market) => market.category),
    ]),
  ].sort((left, right) => left.localeCompare(right));
}
