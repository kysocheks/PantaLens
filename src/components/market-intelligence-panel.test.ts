import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MarketIntelligencePanel } from "./market-intelligence-panel";

const market = {
  marketId: "7YgTqF3mK9vR2cN8sW4xP6hD1jL5bE",
  category: "crypto",
  title: "Will the example threshold be reached?",
  description: "A minimal verified market fixture.",
  imageUrl: null,
  phase: "primary" as const,
  marketType: "binary",
  region: "global",
  resolved: false,
  status: "open",
  volumeUsdc: 125,
  campaignId: null,
  createdByPartner: false,
  startAt: "2026-01-01T00:00:00.000Z",
  endAt: "2026-12-31T00:00:00.000Z",
  resolutionAt: "2027-01-01T00:00:00.000Z",
  yesProbability: null,
  noProbability: null,
  priceSource: null,
};

describe("MarketIntelligencePanel", () => {
  it("keeps verified market details visible when activity fails", () => {
    const html = renderToStaticMarkup(
      createElement(MarketIntelligencePanel, {
        summary: market,
        detail: { status: "ready", market },
        trades: {
          status: "error",
          error: { code: "UPSTREAM_ERROR", message: "Activity failed." },
        },
        environment: "sandbox",
        syncedAt: "2026-09-24T00:00:00.000Z",
        onRetryDetail: vi.fn(),
        onRetryTrades: vi.fn(),
      }),
    );

    expect(html).toContain(market.title);
    expect(html).toContain("Probability");
    expect(html).toContain("Trade history unavailable");
  });

  it("keeps the catalog summary visible when detail loading or retry fails", () => {
    const loadingHtml = renderToStaticMarkup(
      createElement(MarketIntelligencePanel, {
        summary: market,
        detail: { status: "loading" },
        trades: { status: "loading" },
        environment: "sandbox",
        syncedAt: "2026-09-24T00:00:00.000Z",
        onRetryDetail: vi.fn(),
        onRetryTrades: vi.fn(),
      }),
    );
    const errorHtml = renderToStaticMarkup(
      createElement(MarketIntelligencePanel, {
        summary: market,
        detail: {
          status: "error",
          error: { code: "UPSTREAM_ERROR", message: "Details failed." },
        },
        trades: {
          status: "error",
          error: { code: "UPSTREAM_ERROR", message: "Activity failed." },
        },
        environment: "sandbox",
        syncedAt: "2026-09-24T00:00:00.000Z",
        onRetryDetail: vi.fn(),
        onRetryTrades: vi.fn(),
      }),
    );

    expect(loadingHtml).toContain("Loading market details");
    expect(loadingHtml).toContain("Loading recorded activity");
    expect(errorHtml).toContain(market.title);
    expect(errorHtml).toContain("Detailed market data is unavailable");
    expect(errorHtml).toContain("Retry details");
    expect(errorHtml).toContain("Retry activity");
  });

  it("shows unavailable prices and a compact empty activity state", () => {
    const html = renderToStaticMarkup(
      createElement(MarketIntelligencePanel, {
        summary: market,
        detail: { status: "ready", market },
        trades: {
          status: "ready",
          data: {
            marketId: market.marketId,
            items: [],
            meta: {
              source: "panta",
              retrievedAt: "2026-09-24T00:00:00.000Z",
              order: "newest_first",
              priceHistory: "unavailable",
            },
          },
        },
        environment: "sandbox",
        syncedAt: "2026-09-24T00:00:00.000Z",
        onRetryDetail: vi.fn(),
        onRetryTrades: vi.fn(),
      }),
    );

    expect(html).toContain("Unavailable");
    expect(html).not.toContain(">0.0%<");
    expect(html).not.toContain("data-yes-probability");
    expect(html).not.toContain("data-probability-axis");
    expect(html).toContain("No recorded activity for this market.");
    expect(html).toContain("Panta returned an empty verified trade list.");
    expect(html).toContain("No split is shown.");
  });

  it("keeps a long market title complete in the editorial heading", () => {
    const longTitle =
      "Will the combined protocol milestone remain above the verified threshold through the final resolution window?";
    const longTitleMarket = { ...market, title: longTitle };
    const html = renderToStaticMarkup(
      createElement(MarketIntelligencePanel, {
        summary: longTitleMarket,
        detail: { status: "ready", market: longTitleMarket },
        trades: { status: "loading" },
        environment: "sandbox",
        syncedAt: "2026-09-24T00:00:00.000Z",
        onRetryDetail: vi.fn(),
        onRetryTrades: vi.fn(),
      }),
    );

    expect(html).toContain(longTitle);
    expect(html).toContain("text-balance");
    expect(html).not.toContain("line-clamp");
  });

  it.each([
    [1, 99],
    [25, 75],
    [50, 50],
    [75, 25],
    [99, 1],
  ])("renders a verified %s/%s probability split", (yes, no) => {
    const pricedMarket = {
      ...market,
      yesProbability: yes,
      noProbability: no,
      priceSource: "spot" as const,
    };
    const html = renderToStaticMarkup(
      createElement(MarketIntelligencePanel, {
        summary: pricedMarket,
        detail: { status: "ready", market: pricedMarket },
        trades: {
          status: "ready",
          data: {
            marketId: market.marketId,
            items: [],
            meta: {
              source: "panta",
              retrievedAt: "2026-09-24T00:00:00.000Z",
              order: "newest_first",
              priceHistory: "unavailable",
            },
          },
        },
        environment: "sandbox",
        syncedAt: "2026-09-24T00:00:00.000Z",
        onRetryDetail: vi.fn(),
        onRetryTrades: vi.fn(),
      }),
    );

    expect(html).toContain(`${yes}% YES and ${no}% NO`);
    expect(html).toContain(`data-yes-probability="${yes}"`);
    expect(html).toContain("data-probability-axis");
    expect(html).toContain(`data-probability-focus="${yes}"`);
    expect(html).toContain(`width:${yes}%`);
    expect(html).toContain(`left:${yes}%`);
    expect(html).not.toContain("No split is shown.");
  });
});
