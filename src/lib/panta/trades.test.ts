import { describe, expect, it } from "vitest";

import { pantaTradeListSchema } from "./schemas";
import { normalizeTrades } from "./trades";

const trade = {
  id: "trade-example-1",
  marketId: "market-example-001",
  wallet: "wallet-example-001",
  isPrimary: true,
  yesAmount: "10.5",
  noAmount: 0,
  feePaid: "0.05",
  blockTime: 1_767_225_600,
  signature: "signature-example-001",
  quoteAsset: "USDC",
};

describe("Panta trades", () => {
  it("accepts the documented contract and normalizes amounts", () => {
    const response = pantaTradeListSchema.parse({
      marketId: trade.marketId,
      items: [trade],
    });
    expect(normalizeTrades(response.items)[0]).toMatchObject({
      side: "yes",
      phase: "primary",
      yesShares: 10.5,
      noShares: 0,
      feePaid: 0.05,
      tradedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("accepts empty history and nullable block time", () => {
    expect(
      pantaTradeListSchema.parse({ marketId: trade.marketId, items: [] }).items,
    ).toEqual([]);
    const response = pantaTradeListSchema.parse({
      marketId: trade.marketId,
      items: [{ ...trade, blockTime: null }],
    });
    expect(normalizeTrades(response.items)[0]?.tradedAt).toBeNull();
  });

  it("rejects invalid or negative amounts", () => {
    expect(
      pantaTradeListSchema.safeParse({
        marketId: trade.marketId,
        items: [{ ...trade, yesAmount: "not-a-number" }],
      }).success,
    ).toBe(false);
    expect(
      pantaTradeListSchema.safeParse({
        marketId: trade.marketId,
        items: [{ ...trade, feePaid: -1 }],
      }).success,
    ).toBe(false);
  });

  it("sorts known timestamps newest first and null timestamps last", () => {
    const response = pantaTradeListSchema.parse({
      marketId: trade.marketId,
      items: [
        trade,
        { ...trade, id: "trade-example-2", blockTime: 1_767_312_000 },
        { ...trade, id: "trade-example-3", blockTime: null },
      ],
    });
    expect(normalizeTrades(response.items).map((item) => item.id)).toEqual([
      "trade-example-2",
      "trade-example-1",
      "trade-example-3",
    ]);
  });
});
