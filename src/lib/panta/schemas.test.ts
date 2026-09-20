import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  emptyCatalogFixture,
  observedCatalogFixture,
  sparseLiveCatalogFixture,
} from "./fixtures/live-contract";
import { toMarketView } from "./normalize";
import { pantaMarketListSchema, pantaMarketSchema } from "./schemas";

const previousTimestampContract = z.object({
  items: z.array(
    z.object({
      startTime: z.number().int(),
      endTime: z.number().int(),
      resolutionTime: z.number().int(),
    }),
  ),
});

describe("Panta response schemas", () => {
  it("normalizes observed ISO timestamps after reproducing the old mismatch", () => {
    const previousResult = previousTimestampContract.safeParse(
      observedCatalogFixture,
    );

    expect(previousResult.success).toBe(false);
    if (!previousResult.success) {
      expect(previousResult.error.issues.map((issue) => issue.path)).toEqual([
        ["items", 0, "startTime"],
        ["items", 0, "endTime"],
        ["items", 0, "resolutionTime"],
      ]);
    }

    const catalog = pantaMarketListSchema.parse(observedCatalogFixture);
    const market = catalog.items[0];

    expect(market).toBeDefined();
    expect(market?.startTime).toBe(1_767_225_600);
    expect(market?.endTime).toBe(1_782_820_800);
    expect(market?.resolutionTime).toBe(1_782_824_400);
    expect(
      market ? toMarketView(market)?.yesProbability : undefined,
    ).toBeNull();
  });

  it("continues to accept documented Unix-second timestamps", () => {
    const documentedMarket = {
      ...observedCatalogFixture.items[0],
      startTime: 1_767_225_600,
      endTime: 1_782_820_800,
      resolutionTime: 1_782_824_400,
    };

    expect(pantaMarketSchema.parse(documentedMarket).startTime).toBe(
      1_767_225_600,
    );
  });

  it("accepts a live detail record with a null volume", () => {
    const detail = pantaMarketSchema.parse({
      ...observedCatalogFixture.items[0],
      volumeUsdc: null,
    });

    expect(toMarketView(detail)?.volumeUsdc).toBeNull();
  });

  it("rejects timestamp strings outside the observed ISO UTC format", () => {
    const invalidMarket = {
      ...observedCatalogFixture.items[0],
      startTime: "January 1, 2026",
    };

    expect(pantaMarketSchema.safeParse(invalidMarket).success).toBe(false);
  });

  it("accepts an empty catalog", () => {
    expect(pantaMarketListSchema.parse(emptyCatalogFixture)).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it("accepts sparse structural records for fail-closed normalization", () => {
    const catalog = pantaMarketListSchema.parse(sparseLiveCatalogFixture);
    const sparseWithDescription = catalog.items[0];
    const sparseWithoutText = catalog.items[1];

    expect(sparseWithDescription?.title).toBe("   ");
    expect(sparseWithoutText?.description).toBe("   ");
    expect(pantaMarketSchema.safeParse(sparseWithDescription).success).toBe(
      true,
    );
    expect(pantaMarketSchema.safeParse(sparseWithoutText).success).toBe(true);
    expect(
      sparseWithoutText ? toMarketView(sparseWithoutText) : undefined,
    ).toBeNull();
  });
});
