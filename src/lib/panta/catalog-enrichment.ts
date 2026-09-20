import { type PantaMarket, type PantaMarketListItem } from "./schemas";

function enrichmentPriority(market: PantaMarketListItem): number {
  if (market.phase === "primary" || market.phase === "secondary") return 0;
  if (market.phase === "resolved") return 1;
  return 2;
}

export function partitionCatalogMarkets(markets: PantaMarketListItem[]): {
  immediatelyUsable: PantaMarket[];
  requiresDetail: PantaMarketListItem[];
} {
  const immediatelyUsable: PantaMarket[] = [];
  const requiresDetail: PantaMarketListItem[] = [];

  for (const market of markets) {
    if (
      market.title.trim().length > 0 ||
      market.description.trim().length > 0
    ) {
      immediatelyUsable.push(market);
    } else {
      requiresDetail.push(market);
    }
  }

  return {
    immediatelyUsable,
    requiresDetail: requiresDetail.toSorted(
      (left, right) => enrichmentPriority(left) - enrichmentPriority(right),
    ),
  };
}
