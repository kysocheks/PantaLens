import { describe, expect, it } from "vitest";

import { sortMarkets } from "./market-order";
import type { MarketView } from "./panta/normalize";

const market = (
  marketId: string,
  phase: MarketView["phase"],
  volumeUsdc: number,
): MarketView => ({
  marketId,
  category: "crypto",
  title: "Fictional market",
  description: "",
  imageUrl: null,
  phase,
  marketType: "standard",
  region: "Global",
  resolved: phase === "resolved",
  status: "open",
  volumeUsdc,
  campaignId: null,
  createdByPartner: false,
  startAt: "2026-01-01T00:00:00.000Z",
  endAt: "2026-01-02T00:00:00.000Z",
  resolutionAt: "2026-01-02T01:00:00.000Z",
  yesProbability: null,
  noProbability: null,
  priceSource: null,
});

describe("sortMarkets", () => {
  it("keeps active markets ahead of resolved and cancelled markets by default", () => {
    expect(
      sortMarkets(
        [
          market("cancelled", "cancelled", 500),
          market("resolved", "resolved", 400),
          market("active-low", "primary", 100),
          market("active-high", "secondary", 200),
        ],
        "volume",
      ).map((item) => item.marketId),
    ).toEqual(["active-high", "active-low", "resolved", "cancelled"]);
  });
});
