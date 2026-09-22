import type { MarketView } from "./panta/normalize";

export type MarketSort = "volume" | "probability" | "closing" | "newest";

function activityRank(market: MarketView): number {
  if (market.phase === "primary" || market.phase === "secondary") return 0;
  if (market.phase === "resolved") return 1;
  return 2;
}

export function sortMarkets(
  markets: MarketView[],
  sort: MarketSort,
): MarketView[] {
  return markets.toSorted((left, right) => {
    if (sort === "probability")
      return (right.yesProbability ?? -1) - (left.yesProbability ?? -1);
    if (sort === "closing")
      return Date.parse(left.endAt) - Date.parse(right.endAt);
    if (sort === "newest")
      return Date.parse(right.startAt) - Date.parse(left.startAt);

    const activityDifference = activityRank(left) - activityRank(right);
    return (
      activityDifference || (right.volumeUsdc ?? -1) - (left.volumeUsdc ?? -1)
    );
  });
}
