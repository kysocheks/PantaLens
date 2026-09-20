export const observedCatalogFixture = {
  disclaimer: "Example market data for regression testing.",
  items: [
    {
      marketId: "market-example-001",
      category: "science",
      title: "Will the sample mission launch on schedule?",
      description: "A fictional market used to verify response parsing.",
      images: [],
      phase: "primary",
      marketType: "standard",
      startTime: "2026-01-01T00:00:00Z",
      endTime: "2026-06-30T12:00:00Z",
      resolutionTime: "2026-06-30T13:00:00Z",
      region: "Global",
      resolved: false,
      status: "open",
      volumeUsdc: "125.50",
      campaignId: null,
      createdByPartner: true,
      yesPrice: null,
      noPrice: null,
      primaryYesPrice: null,
      primaryNoPrice: null,
      secondaryYesPrice: null,
      secondaryNoPrice: null,
    },
  ],
  nextCursor: null,
} as const;

export const emptyCatalogFixture = {
  disclaimer: "Example empty market catalog.",
  items: [],
  nextCursor: null,
} as const;

export const sparseLiveCatalogFixture = {
  items: [
    {
      ...observedCatalogFixture.items[0],
      marketId: "market-sparse-001",
      title: "   ",
      description:
        "Will the fictional network launch before July 2026?\nSource: example.",
    },
    {
      ...observedCatalogFixture.items[0],
      marketId: "market-sparse-002",
      title: "",
      description: "   ",
    },
  ],
  nextCursor: null,
} as const;
