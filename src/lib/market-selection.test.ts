import { describe, expect, it } from "vitest";

import {
  readMarketSelection,
  resolveMarketSelection,
  updateMarketSelectionUrl,
} from "./market-selection";

const firstId = "FirstMarket111111111111111111111111111111";
const secondId = "SecondMarket11111111111111111111111111111";

describe("market URL selection", () => {
  it("accepts only bounded base58 market ids", () => {
    expect(readMarketSelection(`?market=${firstId}`)).toBe(firstId);
    expect(readMarketSelection("?market=../../secret")).toBeNull();
    expect(readMarketSelection("?market=short")).toBeNull();
  });

  it("restores a requested market and falls back when filters remove it", () => {
    expect(
      resolveMarketSelection({
        requestedId: secondId,
        currentId: null,
        visibleIds: [firstId],
        preserveRequested: true,
      }),
    ).toBe(secondId);
    expect(
      resolveMarketSelection({
        requestedId: secondId,
        currentId: secondId,
        visibleIds: [firstId],
        preserveRequested: false,
      }),
    ).toBe(firstId);
  });

  it("updates only the market query parameter", () => {
    expect(
      updateMarketSelectionUrl(
        "https://example.test/?category=crypto#markets",
        firstId,
      ),
    ).toBe(`/?category=crypto&market=${firstId}#markets`);
    expect(
      updateMarketSelectionUrl(
        `https://example.test/?market=${firstId}&category=crypto`,
        null,
      ),
    ).toBe("/?category=crypto");
  });
});
