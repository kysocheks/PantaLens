"use client";

import { Check, Clipboard, RefreshCw } from "lucide-react";
import { useState } from "react";

import {
  buildLifecycleTimeline,
  formatCountdown,
  getLifecycleState,
} from "@/lib/market-intelligence";
import type { MarketView } from "@/lib/panta/normalize";
import type { TradeResponse } from "@/lib/panta/responses";

export type ApiFailure = {
  code: string;
  message: string;
  status?: number;
  retryAfterSeconds?: number;
};

export type DetailState =
  | { status: "loading" }
  | { status: "error"; error: ApiFailure }
  | { status: "ready"; market: MarketView };

export type TradeState =
  | { status: "loading" }
  | { status: "error"; error: ApiFailure }
  | { status: "ready"; data: TradeResponse };

type Props = {
  summary: MarketView;
  detail: DetailState;
  trades: TradeState;
  environment: "sandbox" | "live" | "unknown";
  syncedAt: string;
  onRetryDetail: () => void;
  onRetryTrades: () => void;
};

const compactDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const compactNumber = new Intl.NumberFormat("en", {
  maximumFractionDigits: 2,
});

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : compactDate.format(date);
}

function formatProbability(value: number | null): string {
  return value === null ? "Unavailable" : `${value.toFixed(1)}%`;
}

function sourceLabel(value: Props["environment"]): string {
  if (value === "sandbox") return "Panta sandbox";
  if (value === "live") return "Panta live API";
  return "Panta API";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-[var(--text-dim)]">{label}</dt>
      <dd className="mt-1.5 break-words text-[14px] font-semibold leading-5 tracking-[-0.012em] text-[var(--text)] tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="space-y-3 py-2" aria-label={label} aria-busy="true">
      <div className="skeleton h-3 w-2/3 rounded-[2px] bg-white/6" />
      <div className="skeleton h-3 w-2/5 rounded-[2px] bg-white/6" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function RetryBlock({
  title,
  message,
  action,
  onRetry,
}: {
  title: string;
  message: string;
  action: string;
  onRetry: () => void;
}) {
  return (
    <div className="border-l-2 border-[var(--negative)] pl-4">
      <p className="text-[14px] font-medium text-[var(--text)]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-[4px] border border-[var(--border)] px-3 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--text-dim)] hover:bg-[var(--surface)] active:border-[var(--accent)]"
      >
        <RefreshCw aria-hidden="true" className="size-4" /> {action}
      </button>
    </div>
  );
}

function ProbabilityLens({ market }: { market: MarketView }) {
  const yesProbability = market.yesProbability;
  const noProbability = market.noProbability;
  const hasPrices = yesProbability !== null && noProbability !== null;
  const focusLabelPosition = hasPrices
    ? Math.min(94, Math.max(6, yesProbability))
    : 50;

  return (
    <section aria-labelledby="probability-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h3
          id="probability-heading"
          className="text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]"
        >
          Probability
        </h3>
        <span className="text-[11px] text-[var(--text-dim)]">
          {market.priceSource
            ? `${titleCase(market.priceSource)} price`
            : "Price unavailable"}
        </span>
      </div>

      {hasPrices ? (
        <div
          className="mt-5"
          role="img"
          aria-label={`${yesProbability}% YES and ${noProbability}% NO`}
          data-yes-probability={yesProbability}
        >
          <div className="grid grid-cols-2 items-end gap-5 tabular-nums">
            <div>
              <p className="text-xs font-medium text-[var(--accent-strong)]">
                YES
              </p>
              <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.055em] text-[var(--text)] sm:text-[56px]">
                {formatProbability(yesProbability)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-[var(--negative)]">NO</p>
              <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.055em] text-[var(--text)] sm:text-[56px]">
                {formatProbability(noProbability)}
              </p>
            </div>
          </div>

          <div
            className="lens-reveal relative mt-4 h-10"
            aria-hidden="true"
            data-probability-axis
          >
            <div className="absolute inset-x-0 top-1/2 flex h-px -translate-y-1/2">
              <span
                className="bg-[var(--accent)]"
                style={{ width: `${yesProbability}%` }}
              />
              <span className="flex-1 bg-[var(--negative)]" />
            </div>
            <span className="absolute left-0 top-1/2 h-2 w-px -translate-y-1/2 bg-[var(--accent)]" />
            <span className="absolute right-0 top-1/2 h-2 w-px -translate-y-1/2 bg-[var(--negative)]" />
            <span
              className="absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--text-muted)] bg-[var(--canvas)]"
              style={{ left: `${yesProbability}%` }}
              data-probability-focus={yesProbability}
            >
              <span className="absolute inset-[5px] rotate-45 border border-[var(--text)]" />
              <span className="absolute left-1/2 top-1/2 size-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-strong)]" />
            </span>
          </div>
          <div className="relative h-4 text-[11px] text-[var(--text-dim)] tabular-nums">
            <span className="absolute left-0">0</span>
            <span
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${focusLabelPosition}%` }}
            >
              {yesProbability.toFixed(1)} focus
            </span>
            <span className="absolute right-0">100</span>
          </div>
        </div>
      ) : (
        <div className="mt-5 border-y border-[var(--border)] py-5">
          <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">
            Unavailable
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Panta did not return a verified market price. No split is shown.
          </p>
        </div>
      )}
    </section>
  );
}

function ActivitySection({
  state,
  onRetry,
}: {
  state: TradeState;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return <LoadingBlock label="Loading recorded activity" />;
  }

  if (state.status === "error") {
    return (
      <RetryBlock
        title="Trade history unavailable"
        message={state.error.message}
        action="Retry activity"
        onRetry={onRetry}
      />
    );
  }

  if (state.data.items.length === 0) {
    return (
      <div className="py-1">
        <p className="text-[14px] font-medium text-[var(--text)]">
          No recorded activity for this market.
        </p>
        <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
          Panta returned an empty verified trade list.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-[var(--border)] text-[var(--text-dim)]">
          <tr>
            <th className="py-2.5 pr-3 font-medium">Time</th>
            <th className="px-3 py-2.5 font-medium">Side</th>
            <th className="px-3 py-2.5 font-medium">Shares</th>
            <th className="py-2.5 pl-3 font-medium">Phase</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-soft)]">
          {state.data.items.map((trade) => {
            const shares =
              trade.side === "no" ? trade.noShares : trade.yesShares;
            return (
              <tr key={trade.id} className="text-[var(--text-muted)]">
                <td className="whitespace-nowrap py-3 pr-3 font-mono text-[11px]">
                  {formatDate(trade.tradedAt)}
                </td>
                <td
                  className={
                    trade.side === "no"
                      ? "px-3 py-3 font-medium text-[var(--negative)]"
                      : "px-3 py-3 font-medium text-[var(--accent-strong)]"
                  }
                >
                  {titleCase(trade.side)}
                </td>
                <td className="px-3 py-3">{compactNumber.format(shares)}</td>
                <td className="py-3 pl-3">{titleCase(trade.phase)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MarketIntelligencePanel({
  summary,
  detail,
  trades,
  environment,
  syncedAt,
  onRetryDetail,
  onRetryTrades,
}: Props) {
  const [copied, setCopied] = useState(false);
  const market =
    detail.status === "ready" && detail.market.marketId === summary.marketId
      ? detail.market
      : summary;
  const [now] = useState(() => Date.now());
  const lifecycle = getLifecycleState(market, now);
  const timeline = buildLifecycleTimeline(market, now);

  async function copyMarketId() {
    await navigator.clipboard.writeText(market.marketId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <article className="detail-enter min-w-0">
      <header className="border-b border-[var(--border-soft)] pb-6 sm:pb-7">
        <p className="text-[11px] text-[var(--text-dim)]">Market detail</p>
        <h2 className="mt-3 max-w-[1000px] text-balance text-[34px] font-semibold leading-[1.04] tracking-[-0.047em] text-[var(--text)] sm:text-[44px] xl:text-[52px]">
          {market.title}
        </h2>
        {market.description ? (
          <p className="mt-4 max-w-3xl text-[15px] leading-6 text-[var(--text-muted)] sm:text-[16px]">
            {market.description}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--text-dim)]">
          <span>{titleCase(market.category)}</span>
          <span aria-hidden="true">/</span>
          <span>{titleCase(market.phase)} phase</span>
          <span aria-hidden="true">/</span>
          <span
            className={`inline-flex items-center gap-2 ${
              lifecycle === "cancelled"
                ? "text-[var(--negative)]"
                : "text-[var(--accent-strong)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                lifecycle === "cancelled"
                  ? "bg-[var(--negative)]"
                  : "bg-[var(--accent)]"
              }`}
            />
            {titleCase(lifecycle)}
          </span>
        </div>
      </header>

      <div className="pt-6 sm:pt-7">
        <ProbabilityLens market={market} />

        {detail.status === "loading" ? (
          <div className="mt-6 max-w-md">
            <LoadingBlock label="Loading market details" />
          </div>
        ) : null}
        {detail.status === "error" ? (
          <section className="mt-6" aria-label="Market detail error">
            <RetryBlock
              title="Detailed market data is unavailable"
              message={`The catalog summary remains visible. ${detail.error.message}`}
              action="Retry details"
              onRetry={onRetryDetail}
            />
          </section>
        ) : null}

        <div className="mt-9 grid gap-x-12 gap-y-8 lg:grid-cols-12 xl:gap-x-16">
          <section
            className="border-t border-[var(--border-soft)] pt-5 lg:col-span-7"
            aria-labelledby="market-facts-heading"
          >
            <h3
              id="market-facts-heading"
              className="text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]"
            >
              Key facts
            </h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              <Metric
                label="Volume"
                value={
                  market.volumeUsdc === null
                    ? "Unavailable"
                    : `${compactNumber.format(market.volumeUsdc)} USDC`
                }
              />
              <Metric label="Region" value={market.region || "Unavailable"} />
              <Metric label="Starts" value={formatDate(market.startAt)} />
              <Metric label="Ends" value={formatDate(market.endAt)} />
              <Metric
                label="Resolution"
                value={formatDate(market.resolutionAt)}
              />
              <Metric
                label="Time remaining"
                value={formatCountdown(market.endAt, now)}
              />
            </dl>
          </section>

          <section
            className="border-t border-[var(--border-soft)] pt-5 lg:col-span-5"
            aria-labelledby="lifecycle-heading"
          >
            <h3
              id="lifecycle-heading"
              className="text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]"
            >
              Lifecycle
            </h3>
            <ol className="mt-4">
              {timeline.map((step, index) => {
                const cancelledStep =
                  lifecycle === "cancelled" && step.key === "trading";
                const highlighted =
                  step.state === "complete" || step.state === "current";
                return (
                  <li
                    key={step.key}
                    className="relative min-h-12 pb-3 pl-7 last:min-h-0 last:pb-0"
                  >
                    {index < timeline.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-0 left-[5px] top-[11px] w-px ${
                          highlighted
                            ? "bg-[var(--accent)]"
                            : "bg-[var(--border)]"
                        }`}
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-1 size-[11px] rounded-full border-2 ${
                        cancelledStep
                          ? "border-[var(--negative)] bg-[var(--negative)]"
                          : step.state === "current"
                            ? "border-[var(--accent-strong)] bg-[var(--canvas)]"
                            : step.state === "complete"
                              ? "border-[var(--accent)] bg-[var(--accent)]"
                              : step.state === "unknown"
                                ? "border-dashed border-[var(--text-dim)] bg-[var(--canvas)]"
                                : "border-[var(--border)] bg-[var(--canvas)]"
                      }`}
                    />
                    <p
                      className={`text-xs font-medium ${
                        cancelledStep
                          ? "text-[var(--negative)]"
                          : step.state === "current"
                            ? "text-[var(--accent-strong)]"
                            : "text-[var(--text)]"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--text-dim)]">
                      {step.at
                        ? formatDate(step.at)
                        : step.key === "trading"
                          ? titleCase(lifecycle)
                          : "Unavailable"}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section
            className="border-t border-[var(--border-soft)] pt-5 lg:col-span-7"
            aria-labelledby="activity-heading"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3
                id="activity-heading"
                className="text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]"
              >
                Recent activity
              </h3>
              {trades.status === "ready" ? (
                <span className="text-[11px] text-[var(--text-dim)]">
                  {trades.data.items.length} records
                </span>
              ) : null}
            </div>
            <div className="mt-4">
              <ActivitySection state={trades} onRetry={onRetryTrades} />
            </div>
            {trades.status === "ready" && trades.data.items.length > 0 ? (
              <p className="mt-4 text-xs leading-5 text-[var(--text-dim)]">
                Price history is unavailable because Panta trade records do not
                include an execution price.
              </p>
            ) : null}
          </section>

          <section
            className="border-t border-[var(--border-soft)] pt-5 lg:col-span-5"
            aria-labelledby="provenance-heading"
          >
            <h3
              id="provenance-heading"
              className="text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]"
            >
              Source
            </h3>
            <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
              Read-only view of verified {sourceLabel(environment)} responses.
              Last updated {formatDate(syncedAt)}.
            </p>
            <div className="mt-4 flex min-w-0 items-end gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[var(--text-dim)]">
                  Panta Market ID
                </p>
                <code className="mt-1.5 block truncate font-mono text-[11px] text-[var(--text-muted)]">
                  {market.marketId}
                </code>
              </div>
              <button
                type="button"
                onClick={copyMarketId}
                className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[4px] px-2 text-xs text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--text)] active:text-[var(--accent-strong)]"
                aria-label="Copy market ID"
              >
                {copied ? (
                  <Check
                    aria-hidden="true"
                    className="size-4 text-[var(--accent-strong)]"
                  />
                ) : (
                  <Clipboard aria-hidden="true" className="size-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
