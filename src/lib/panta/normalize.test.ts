import { describe, expect, it } from "vitest";

import {
  mergeMarketViews,
  mergePantaMarketRecords,
  toMarketView,
  type MarketView,
} from "./normalize";
import type { PantaMarket } from "./schemas";

const documentedMarket: PantaMarket = {
  marketId: "EventPda11111111111111111111111111111",
  category: "crypto",
  title: "ETH above 5k?",
  description: "A documented Panta example market.",
  images: [],
  phase: "primary",
  marketType: "standard",
  startTime: 1_767_225_600,
  endTime: 1_798_761_599,
  resolutionTime: 1_798_765_199,
  region: "Global",
  resolved: false,
  status: "open",
  volumeUsdc: "1200.00",
  campaignId: null,
  createdByPartner: true,
  yesPrice: "0.52",
  noPrice: "0.48",
  primaryYesPrice: "0.52",
  primaryNoPrice: "0.48",
  secondaryYesPrice: null,
  secondaryNoPrice: null,
};

function marketView(market: PantaMarket): MarketView {
  const normalized = toMarketView(market);
  if (normalized === null) throw new Error("Expected displayable market.");
  return normalized;
}

describe("toMarketView", () => {
  it("converts documented decimal prices and volume", () => {
    const result = marketView(documentedMarket);

    expect(result.yesProbability).toBe(52);
    expect(result.noProbability).toBe(48);
    expect(result.priceSource).toBe("spot");
    expect(result.volumeUsdc).toBe(1200);
    expect(result.endAt).toBe("2026-12-31T23:59:59.000Z");
  });

  it("does not fabricate a price when the catalog has null price fields", () => {
    const result = marketView({
      ...documentedMarket,
      yesPrice: null,
      noPrice: null,
      primaryYesPrice: null,
      primaryNoPrice: null,
    });

    expect(result.yesProbability).toBeNull();
    expect(result.noProbability).toBeNull();
    expect(result.priceSource).toBeNull();
  });

  it("uses the first non-empty description line when the title is blank", () => {
    const market = {
      ...documentedMarket,
      title: "   ",
      description:
        "\nWill the fictional launch happen on schedule?\nSource text.",
    };

    expect(marketView(market).title).toBe(
      "Will the fictional launch happen on schedule?",
    );
  });

  it("uses the documented secondary price fields when spot is absent", () => {
    const result = marketView({
      ...documentedMarket,
      phase: "secondary",
      yesPrice: null,
      noPrice: null,
      primaryYesPrice: null,
      primaryNoPrice: null,
      secondaryYesPrice: "0.675",
      secondaryNoPrice: "0.325",
    });

    expect(result.yesProbability).toBe(67.5);
    expect(result.noProbability).toBe(32.5);
    expect(result.priceSource).toBe("secondary");
  });

  it("treats an all-zero price pair as unavailable", () => {
    const result = marketView({
      ...documentedMarket,
      phase: "cancelled",
      yesPrice: "0",
      noPrice: "0.0",
    });

    expect(result.yesProbability).toBeNull();
    expect(result.noProbability).toBeNull();
    expect(result.priceSource).toBeNull();
  });

  it("preserves a missing upstream volume as unavailable", () => {
    expect(
      marketView({ ...documentedMarket, volumeUsdc: null }).volumeUsdc,
    ).toBeNull();
  });

  it("excludes a structural record with no display text", () => {
    expect(
      toMarketView({ ...documentedMarket, title: " ", description: "\n" }),
    ).toBeNull();
  });

  it("keeps known list volume, prices, and lifecycle fields over null detail fields", () => {
    const summary = {
      ...documentedMarket,
      phase: "resolved" as const,
      resolved: true,
      status: "resolved",
      volumeUsdc: "437.8",
      yesPrice: "1",
      noPrice: "0",
    };
    const detail = {
      ...documentedMarket,
      phase: "primary" as const,
      resolved: false,
      status: "open",
      volumeUsdc: null,
      yesPrice: null,
      noPrice: null,
    };

    const mergedRecord = mergePantaMarketRecords(summary, detail);
    const mergedView = mergeMarketViews(
      marketView(summary),
      marketView({ ...detail, title: "Detail title" }),
    );

    expect(mergedRecord).toMatchObject({
      phase: "resolved",
      resolved: true,
      status: "resolved",
      volumeUsdc: "437.8",
      yesPrice: "1",
      noPrice: "0",
    });
    expect(mergedView).toMatchObject({
      phase: "resolved",
      resolved: true,
      status: "resolved",
      volumeUsdc: 437.8,
      yesProbability: 100,
      noProbability: 0,
    });
  });

  it("keeps positive list values when detail reports zero or null", () => {
    const merged = mergePantaMarketRecords(
      {
        ...documentedMarket,
        volumeUsdc: "437.8",
        yesPrice: "1",
        noPrice: "0",
        phase: "resolved",
        resolved: true,
        status: "resolved",
      },
      {
        ...documentedMarket,
        volumeUsdc: "0",
        totalVolumeUsdc: "0",
        yesPrice: "0",
        noPrice: "0",
        phase: "primary",
        resolved: false,
        status: "open",
      },
    );

    expect(merged).toMatchObject({
      volumeUsdc: "437.8",
      yesPrice: "1",
      noPrice: "0",
      phase: "resolved",
      resolved: true,
      status: "resolved",
    });
  });

  it("uses a valid detail price pair when the list pair is zeroed", () => {
    const merged = mergePantaMarketRecords(
      { ...documentedMarket, yesPrice: "0", noPrice: "0" },
      { ...documentedMarket, yesPrice: "1", noPrice: "0" },
    );

    expect(marketView(merged)).toMatchObject({
      yesProbability: 100,
      noProbability: 0,
    });
  });

  it("uses a verified total volume only when direct volume is unavailable", () => {
    const merged = mergePantaMarketRecords(
      { ...documentedMarket, volumeUsdc: null, totalVolumeUsdc: "437.8" },
      { ...documentedMarket, volumeUsdc: null, totalVolumeUsdc: null },
    );

    expect(merged.volumeUsdc).toBe("437.8");
  });
});
