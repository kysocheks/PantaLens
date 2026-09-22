export type LifecycleState =
  | "upcoming"
  | "active"
  | "awaiting_resolution"
  | "resolved"
  | "cancelled"
  | "unknown";

export type LifecycleInput = {
  phase: "primary" | "secondary" | "resolved" | "cancelled";
  resolved: boolean;
  startAt: string | null;
  endAt: string | null;
  resolutionAt: string | null;
};

export type TimelineStepState = "complete" | "current" | "upcoming" | "unknown";

export type TimelineStep = {
  key: "start" | "trading" | "end" | "resolution";
  label: string;
  at: string | null;
  state: TimelineStepState;
};

export type PricePoint = {
  observedAt: string;
  yesProbability: number | null;
};

export type MarketPulse = {
  status: "ready" | "insufficient";
  trend: "rising" | "falling" | "stable" | null;
  range: { min: number; max: number } | null;
  latest: { observedAt: string; yesProbability: number } | null;
  activity: "none" | "low" | "moderate" | "high";
  confidence: "unavailable" | "low" | "medium" | "high";
  pointCount: number;
  tradeCount: number;
};

function timeValue(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getLifecycleState(
  market: LifecycleInput,
  now: number,
): LifecycleState {
  if (market.phase === "cancelled") return "cancelled";
  if (market.resolved || market.phase === "resolved") return "resolved";

  const start = timeValue(market.startAt);
  const end = timeValue(market.endAt);
  if (start === null || end === null || end < start) return "unknown";
  if (now < start) return "upcoming";
  if (now < end) return "active";
  return "awaiting_resolution";
}

export function buildLifecycleTimeline(
  market: LifecycleInput,
  now: number,
): TimelineStep[] {
  const lifecycle = getLifecycleState(market, now);
  const start = timeValue(market.startAt);
  const end = timeValue(market.endAt);
  const resolution = timeValue(market.resolutionAt);

  if (lifecycle === "unknown") {
    return [
      { key: "start", label: "Start", at: market.startAt, state: "unknown" },
      {
        key: "trading",
        label: "Trading window",
        at: null,
        state: "unknown",
      },
      { key: "end", label: "Ends", at: market.endAt, state: "unknown" },
      {
        key: "resolution",
        label: "Resolution",
        at: market.resolutionAt,
        state: "unknown",
      },
    ];
  }

  return [
    {
      key: "start",
      label: "Start",
      at: market.startAt,
      state: start !== null && now >= start ? "complete" : "current",
    },
    {
      key: "trading",
      label: "Trading window",
      at: null,
      state:
        lifecycle === "active"
          ? "current"
          : lifecycle === "upcoming"
            ? "upcoming"
            : "complete",
    },
    {
      key: "end",
      label: "Ends",
      at: market.endAt,
      state: end !== null && now >= end ? "complete" : "upcoming",
    },
    {
      key: "resolution",
      label: "Resolution",
      at: market.resolutionAt,
      state:
        lifecycle === "resolved"
          ? "complete"
          : lifecycle === "awaiting_resolution"
            ? "current"
            : resolution === null
              ? "unknown"
              : "upcoming",
    },
  ];
}

export function formatCountdown(endAt: string | null, now: number): string {
  const end = timeValue(endAt);
  if (end === null) return "Unavailable";
  const remaining = end - now;
  if (remaining <= 0) return "Ended";

  const totalMinutes = Math.floor(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function activityLevel(tradeCount: number): MarketPulse["activity"] {
  if (tradeCount === 0) return "none";
  if (tradeCount < 5) return "low";
  if (tradeCount < 20) return "moderate";
  return "high";
}

export function calculateMarketPulse(
  points: PricePoint[],
  tradeCount: number,
  now: number,
): MarketPulse {
  const validPoints = points
    .filter(
      (point): point is { observedAt: string; yesProbability: number } =>
        point.yesProbability !== null &&
        Number.isFinite(point.yesProbability) &&
        point.yesProbability >= 0 &&
        point.yesProbability <= 100 &&
        timeValue(point.observedAt) !== null,
    )
    .sort(
      (left, right) =>
        Date.parse(left.observedAt) - Date.parse(right.observedAt),
    );
  const activity = activityLevel(Math.max(0, Math.floor(tradeCount)));
  const latestPoint = validPoints.at(-1);
  const latest = latestPoint
    ? {
        observedAt: latestPoint.observedAt,
        yesProbability: latestPoint.yesProbability,
      }
    : null;

  if (validPoints.length < 2 || latest === null) {
    return {
      status: "insufficient",
      trend: null,
      range: null,
      latest,
      activity,
      confidence: "unavailable",
      pointCount: validPoints.length,
      tradeCount: Math.max(0, Math.floor(tradeCount)),
    };
  }

  const probabilities = validPoints.map((point) => point.yesProbability);
  const first = probabilities[0];
  const last = probabilities.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("Validated price points must contain endpoints.");
  }
  const latestAge = Math.max(0, now - Date.parse(latest.observedAt));
  const confidence =
    validPoints.length >= 6 && latestAge <= 24 * 60 * 60 * 1_000
      ? "high"
      : latestAge <= 7 * 24 * 60 * 60 * 1_000
        ? "medium"
        : "low";

  return {
    status: "ready",
    trend: last > first ? "rising" : last < first ? "falling" : "stable",
    range: { min: Math.min(...probabilities), max: Math.max(...probabilities) },
    latest,
    activity,
    confidence,
    pointCount: validPoints.length,
    tradeCount: Math.max(0, Math.floor(tradeCount)),
  };
}
