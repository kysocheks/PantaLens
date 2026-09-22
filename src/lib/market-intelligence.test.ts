import { describe, expect, it } from "vitest";

import {
  buildLifecycleTimeline,
  calculateMarketPulse,
  formatCountdown,
  getLifecycleState,
  type LifecycleInput,
} from "./market-intelligence";

const activeMarket: LifecycleInput = {
  phase: "primary",
  resolved: false,
  startAt: "2026-01-01T00:00:00.000Z",
  endAt: "2026-02-01T00:00:00.000Z",
  resolutionAt: "2026-02-02T00:00:00.000Z",
};

describe("market lifecycle", () => {
  it("derives future, active, awaiting, resolved, and cancelled states", () => {
    expect(
      getLifecycleState(activeMarket, Date.parse("2025-12-01T00:00:00Z")),
    ).toBe("upcoming");
    expect(
      getLifecycleState(activeMarket, Date.parse("2026-01-15T00:00:00Z")),
    ).toBe("active");
    expect(
      getLifecycleState(activeMarket, Date.parse("2026-02-01T12:00:00Z")),
    ).toBe("awaiting_resolution");
    expect(
      getLifecycleState(
        { ...activeMarket, phase: "resolved", resolved: true },
        Date.parse("2026-01-15T00:00:00Z"),
      ),
    ).toBe("resolved");
    expect(
      getLifecycleState(
        { ...activeMarket, phase: "cancelled" },
        Date.parse("2026-01-15T00:00:00Z"),
      ),
    ).toBe("cancelled");
  });

  it("keeps incomplete or invalid dates unknown", () => {
    expect(
      getLifecycleState(
        { ...activeMarket, startAt: null },
        Date.parse("2026-01-15T00:00:00Z"),
      ),
    ).toBe("unknown");
    expect(
      buildLifecycleTimeline(
        { ...activeMarket, endAt: "invalid" },
        Date.parse("2026-01-15T00:00:00Z"),
      ).every((step) => step.state === "unknown"),
    ).toBe(true);
  });

  it("formats countdowns without claiming time after the market ended", () => {
    expect(
      formatCountdown(
        "2026-01-03T03:30:00.000Z",
        Date.parse("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe("2d 3h");
    expect(
      formatCountdown(
        "2025-12-31T23:59:00.000Z",
        Date.parse("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe("Ended");
    expect(formatCountdown(null, Date.now())).toBe("Unavailable");
  });
});

describe("market pulse", () => {
  it("reports insufficient data when fewer than two verified points exist", () => {
    expect(calculateMarketPulse([], 0, Date.now())).toMatchObject({
      status: "insufficient",
      trend: null,
      activity: "none",
      confidence: "unavailable",
    });
  });

  it("filters null and invalid values before calculating a rising range", () => {
    const now = Date.parse("2026-01-02T00:00:00.000Z");
    const pulse = calculateMarketPulse(
      [
        { observedAt: "invalid", yesProbability: 80 },
        { observedAt: "2026-01-01T00:00:00.000Z", yesProbability: 40 },
        { observedAt: "2026-01-01T12:00:00.000Z", yesProbability: null },
        { observedAt: "2026-01-01T23:00:00.000Z", yesProbability: 55 },
      ],
      7,
      now,
    );

    expect(pulse).toMatchObject({
      status: "ready",
      trend: "rising",
      range: { min: 40, max: 55 },
      activity: "moderate",
      confidence: "medium",
      pointCount: 2,
    });
  });

  it("distinguishes falling and stable sequences", () => {
    const now = Date.parse("2026-01-02T00:00:00.000Z");
    const points = [
      { observedAt: "2026-01-01T00:00:00.000Z", yesProbability: 60 },
      { observedAt: "2026-01-01T23:00:00.000Z", yesProbability: 45 },
    ];
    expect(calculateMarketPulse(points, 1, now).trend).toBe("falling");
    expect(
      calculateMarketPulse(
        points.map((point) => ({ ...point, yesProbability: 50 })),
        1,
        now,
      ).trend,
    ).toBe("stable");
  });
});
