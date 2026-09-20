import { describe, expect, it } from "vitest";

import { mergeMarketCategories } from "./categories";
import type { MarketView } from "./normalize";

const market = (category: string): MarketView => ({
  marketId: `market-${category}`,
  category,
  title: "Fictional market",
  description: "",
  imageUrl: null,
  phase: "primary",
  marketType: "standard",
  region: "Global",
  resolved: false,
  status: "open",
  volumeUsdc: 0,
  campaignId: null,
  createdByPartner: false,
  startAt: "2026-01-01T00:00:00.000Z",
  endAt: "2026-01-02T00:00:00.000Z",
  resolutionAt: "2026-01-02T01:00:00.000Z",
  yesProbability: null,
  noProbability: null,
  priceSource: null,
});

describe("mergeMarketCategories", () => {
  it("keeps documented categories and adds categories in normalized markets", () => {
    expect(
      mergeMarketCategories(
        ["crypto", "sports"],
        [market("weather"), market("crypto")],
      ),
    ).toEqual(["crypto", "sports", "weather"]);
  });
});
