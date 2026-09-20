import { describe, expect, it } from "vitest";

import { partitionCatalogMarkets } from "./catalog-enrichment";
import { observedCatalogFixture } from "./fixtures/live-contract";
import { pantaMarketListItemSchema, type PantaMarketListItem } from "./schemas";

const baseMarket = pantaMarketListItemSchema.parse(
  observedCatalogFixture.items[0],
);

describe("partitionCatalogMarkets", () => {
  it("preserves rows with display text without requiring a detail request", () => {
    const { immediatelyUsable, requiresDetail } = partitionCatalogMarkets([
      baseMarket,
      { ...baseMarket, marketId: "market-sparse", title: "", description: " " },
    ]);

    expect(immediatelyUsable).toHaveLength(1);
    expect(immediatelyUsable[0]?.marketId).toBe(baseMarket.marketId);
    expect(requiresDetail.map((market) => market.marketId)).toEqual([
      "market-sparse",
    ]);
  });

  it("prioritizes active sparse rows before resolved and cancelled rows", () => {
    const sparse = (marketId: string, phase: PantaMarketListItem["phase"]) => ({
      ...baseMarket,
      marketId,
      phase,
      title: "",
      description: "",
    });

    const { requiresDetail } = partitionCatalogMarkets([
      sparse("cancelled", "cancelled"),
      sparse("resolved", "resolved"),
      sparse("primary", "primary"),
      sparse("secondary", "secondary"),
    ]);

    expect(requiresDetail.map((market) => market.marketId)).toEqual([
      "primary",
      "secondary",
      "resolved",
      "cancelled",
    ]);
  });
});
