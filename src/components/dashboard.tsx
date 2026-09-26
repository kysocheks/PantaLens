"use client";

import { ChevronDown, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import {
  type ApiFailure,
  type DetailState,
  MarketIntelligencePanel,
  type TradeState,
} from "@/components/market-intelligence-panel";
import { BrandWordmark } from "@/components/brand-wordmark";
import { MobileMarketDialog } from "@/components/mobile-market-dialog";
import {
  readMarketSelection,
  resolveMarketSelection,
  updateMarketSelectionUrl,
} from "@/lib/market-selection";
import { sortMarkets, type MarketSort } from "@/lib/market-order";
import {
  marketViewSchema,
  mergeMarketViews,
  type MarketView,
} from "@/lib/panta/normalize";
import {
  catalogResponseSchema,
  type CatalogResponse,
  tradeResponseSchema,
} from "@/lib/panta/responses";

const apiFailureSchema = z.object({
  code: z.string(),
  message: z.string(),
  status: z.number().optional(),
  retryAfterSeconds: z.number().optional(),
});

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: ApiFailure }
  | { status: "ready"; data: CatalogResponse };

type Phase = "all" | MarketView["phase"];
type SortKey = MarketSort;

const phaseSchema = z.enum([
  "all",
  "primary",
  "secondary",
  "resolved",
  "cancelled",
]);
const sortSchema = z.enum(["volume", "probability", "closing", "newest"]);

const phases: { value: Phase; label: string }[] = [
  { value: "all", label: "All phases" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "resolved", label: "Resolved" },
  { value: "cancelled", label: "Cancelled" },
];

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function failureFrom(response: Response, payload: unknown): ApiFailure {
  const parsed = apiFailureSchema.safeParse(payload);
  if (parsed.success) return { ...parsed.data, status: response.status };
  return {
    code: "REQUEST_FAILED",
    message: "The verified market service did not return a usable response.",
    status: response.status,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatProbability(value: number | null): string {
  return value === null ? "Unavailable" : `${value.toFixed(1)}%`;
}

function formatClosing(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatLastSync(value?: string): string {
  if (!value) return "Not synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sync time unavailable";
  return `Last updated ${new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

function Header({
  state,
  environment,
  syncedAt,
  onRefresh,
}: {
  state: LoadState["status"];
  environment?: CatalogResponse["meta"]["environment"];
  syncedAt?: string;
  onRefresh: () => void;
}) {
  const status =
    state === "ready"
      ? "Connected"
      : state === "error"
        ? "Unavailable"
        : "Connecting";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--canvas)]">
      <div className="mx-auto flex min-h-[52px] max-w-[1560px] items-center justify-between gap-4 px-4 sm:px-7">
        <a
          href="#workspace"
          className="min-w-0 text-[var(--text)]"
          aria-label="Panta Lens home"
        >
          <BrandWordmark descriptor />
        </a>
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)]">
          <span
            className={`inline-flex items-center gap-2 ${
              state === "ready"
                ? "text-[var(--accent-strong)]"
                : state === "error"
                  ? "text-[var(--negative)]"
                  : "text-[var(--text-muted)]"
            }`}
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                state === "ready"
                  ? "bg-[var(--accent)]"
                  : state === "error"
                    ? "bg-[var(--negative)]"
                    : "bg-[var(--text-dim)]"
              }`}
            />
            {status}
          </span>
          {environment ? (
            <span className="hidden border-l border-[var(--border)] pl-3 sm:inline">
              {environment === "sandbox"
                ? "Sandbox"
                : environment === "live"
                  ? "Live"
                  : "Panta API"}
            </span>
          ) : null}
          <span className="hidden border-l border-[var(--border)] pl-3 xl:inline">
            {formatLastSync(syncedAt)}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={state === "loading"}
            aria-busy={state === "loading"}
            className="inline-flex size-8 items-center justify-center rounded-[4px] border border-[var(--border)] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--text-dim)] hover:bg-[var(--surface)] hover:text-[var(--text)] active:border-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
            aria-label="Refresh market data"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${state === "loading" ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}

function MarketRow({
  market,
  active,
  onSelect,
}: {
  market: MarketView;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`group relative w-full border-b border-[var(--border-soft)] px-3 py-4 text-left transition-colors duration-150 focus-visible:z-10 focus-visible:outline-offset-[-2px] ${
        active
          ? "bg-white/[0.018] shadow-[inset_2px_0_0_var(--accent)]"
          : "hover:bg-white/[0.025] active:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)]">
        <span className="min-w-0 truncate">{titleCase(market.category)}</span>
        <span aria-hidden="true">·</span>
        <span className="shrink-0 text-[var(--text-muted)]">
          {titleCase(market.phase)}
        </span>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-4">
        <h2 className="line-clamp-3 min-w-0 text-[14px] font-semibold leading-[1.4] tracking-[-0.01em] text-[var(--text)]">
          {market.title}
        </h2>
        <span className="flex shrink-0 flex-col items-end text-right">
          <span className="block text-[18px] font-semibold leading-5 tracking-[-0.035em] text-[var(--accent-strong)] tabular-nums">
            {formatProbability(market.yesProbability)}
          </span>
          <span className="mt-0.5 block text-[10px] font-medium text-[var(--text-dim)]">
            YES
          </span>
        </span>
      </div>
      <dl className="mt-3.5 grid grid-cols-[0.8fr_1.2fr] gap-3 text-[11px] tabular-nums">
        <div>
          <dt className="text-[var(--text-dim)]">Volume</dt>
          <dd className="mt-0.5 text-[var(--text-muted)]">
            {market.volumeUsdc === null
              ? "Unavailable"
              : compactNumber.format(market.volumeUsdc)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-dim)]">End date</dt>
          <dd className="mt-0.5 text-[var(--text-muted)]">
            {formatClosing(market.endAt)}
          </dd>
        </div>
      </dl>
    </button>
  );
}

function CatalogError({
  error,
  onRetry,
}: {
  error: ApiFailure;
  onRetry: () => void;
}) {
  const isAuth = error.status === 401 || error.code === "UNAUTHORIZED";
  return (
    <div className="border-l-2 border-[var(--negative)] py-1 pl-4">
      <h2 className="text-sm font-medium text-[var(--text)]">
        {isAuth ? "API access required" : "Market catalog unavailable"}
      </h2>
      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {error.message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-[4px] border border-[var(--border)] px-3 text-xs font-medium text-[var(--text)] hover:border-[var(--text-dim)]"
      >
        <RefreshCw aria-hidden="true" className="size-4" /> Retry
      </button>
    </div>
  );
}

export function Dashboard() {
  const [catalog, setCatalog] = useState<LoadState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<Phase>("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("volume");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>({ status: "loading" });
  const [trades, setTrades] = useState<TradeState>({ status: "loading" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const requestedId = useRef<string | null>(null);
  const initializedSelection = useRef(false);

  const loadCatalog = useCallback(async () => {
    try {
      const response = await fetch("/api/markets?limit=50", {
        cache: "no-store",
      });
      const payload = await readJson(response);
      if (!response.ok) throw failureFrom(response, payload);
      const parsed = catalogResponseSchema.safeParse(payload);
      if (!parsed.success)
        throw {
          code: "CONTRACT_MISMATCH",
          message: "The market catalog response could not be verified.",
          status: 502,
        } satisfies ApiFailure;
      setCatalog({ status: "ready", data: parsed.data });
    } catch (error) {
      const parsed = apiFailureSchema.safeParse(error);
      setCatalog({
        status: "error",
        error: parsed.success
          ? parsed.data
          : {
              code: "NETWORK_ERROR",
              message: "The market catalog could not be reached.",
            },
      });
    }
  }, []);

  useEffect(() => {
    requestedId.current = readMarketSelection(window.location.search);
    const frame = window.requestAnimationFrame(() => void loadCatalog());
    return () => window.cancelAnimationFrame(frame);
  }, [loadCatalog]);

  const markets = useMemo(
    () => (catalog.status === "ready" ? catalog.data.items : []),
    [catalog],
  );
  const visibleMarkets = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = markets
      .filter((market) => phase === "all" || market.phase === phase)
      .filter((market) => category === "all" || market.category === category)
      .filter(
        (market) =>
          !query ||
          `${market.title} ${market.description} ${market.category} ${market.region}`
            .toLowerCase()
            .includes(query),
      );
    return sortMarkets(filtered, sort);
  }, [category, markets, phase, search, sort]);

  useEffect(() => {
    if (catalog.status !== "ready") return;
    const next = resolveMarketSelection({
      requestedId: requestedId.current,
      currentId: selectedId,
      visibleIds: visibleMarkets.map((market) => market.marketId),
      preserveRequested:
        !initializedSelection.current && requestedId.current !== null,
    });
    if (!initializedSelection.current) {
      initializedSelection.current = true;
      if (requestedId.current && window.innerWidth < 1024) setMobileOpen(true);
    }
    if (next !== selectedId) setSelectedId(next);
    const nextUrl = updateMarketSelectionUrl(window.location.href, next);
    if (
      `${window.location.pathname}${window.location.search}${window.location.hash}` !==
      nextUrl
    ) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [catalog.status, selectedId, visibleMarkets]);

  const loadDetail = useCallback(
    async (marketId: string, signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/markets/${encodeURIComponent(marketId)}`,
          { cache: "no-store", signal },
        );
        const payload = await readJson(response);
        if (!response.ok) throw failureFrom(response, payload);
        const parsed = marketViewSchema.safeParse(payload);
        if (!parsed.success)
          throw {
            code: "CONTRACT_MISMATCH",
            message: "The market detail response could not be verified.",
            status: 502,
          } satisfies ApiFailure;
        setDetail({ status: "ready", market: parsed.data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        const parsed = apiFailureSchema.safeParse(error);
        setDetail({
          status: "error",
          error: parsed.success
            ? parsed.data
            : {
                code: "NETWORK_ERROR",
                message: "Market details could not be reached.",
              },
        });
      }
    },
    [],
  );

  const loadTrades = useCallback(
    async (marketId: string, signal?: AbortSignal) => {
      try {
        const response = await fetch(
          `/api/markets/${encodeURIComponent(marketId)}/trades?limit=200`,
          { cache: "no-store", signal },
        );
        const payload = await readJson(response);
        if (!response.ok) throw failureFrom(response, payload);
        const parsed = tradeResponseSchema.safeParse(payload);
        if (!parsed.success)
          throw {
            code: "CONTRACT_MISMATCH",
            message: "The trade history response could not be verified.",
            status: 502,
          } satisfies ApiFailure;
        setTrades({ status: "ready", data: parsed.data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        const parsed = apiFailureSchema.safeParse(error);
        setTrades({
          status: "error",
          error: parsed.success
            ? parsed.data
            : {
                code: "NETWORK_ERROR",
                message: "Trade history could not be reached.",
              },
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => {
      void loadDetail(selectedId, controller.signal);
      void loadTrades(selectedId, controller.signal);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [loadDetail, loadTrades, selectedId]);

  const selectedSummary =
    markets.find((market) => market.marketId === selectedId) ??
    (detail.status === "ready" && detail.market.marketId === selectedId
      ? detail.market
      : null);
  const selectedDetail: DetailState =
    detail.status === "ready" && detail.market.marketId !== selectedId
      ? { status: "loading" }
      : detail;
  const selectedTrades: TradeState =
    trades.status === "ready" && trades.data.marketId !== selectedId
      ? { status: "loading" }
      : trades;
  const panel =
    selectedSummary && catalog.status === "ready" ? (
      <MarketIntelligencePanel
        key={selectedSummary.marketId}
        summary={selectedSummary}
        detail={
          selectedDetail.status === "ready"
            ? {
                status: "ready",
                market: mergeMarketViews(
                  selectedSummary,
                  selectedDetail.market,
                ),
              }
            : selectedDetail
        }
        trades={selectedTrades}
        environment={catalog.data.meta.environment}
        syncedAt={catalog.data.meta.retrievedAt}
        onRetryDetail={() => {
          if (!selectedId) return;
          setDetail({ status: "loading" });
          void loadDetail(selectedId);
        }}
        onRetryTrades={() => {
          if (!selectedId) return;
          setTrades({ status: "loading" });
          void loadTrades(selectedId);
        }}
      />
    ) : null;

  const activeCount = markets.filter(
    (market) => market.phase === "primary" || market.phase === "secondary",
  ).length;
  const totalVolume = markets.reduce(
    (sum, market) => sum + (market.volumeUsdc ?? 0),
    0,
  );

  function selectMarket(marketId: string) {
    if (marketId !== selectedId) {
      setDetail({ status: "loading" });
      setTrades({ status: "loading" });
      setSelectedId(marketId);
    }
    setMobileOpen(window.innerWidth < 1024);
  }

  return (
    <div className="min-h-screen overflow-x-clip text-[var(--text)]">
      <Header
        state={catalog.status}
        environment={
          catalog.status === "ready" ? catalog.data.meta.environment : undefined
        }
        syncedAt={
          catalog.status === "ready" ? catalog.data.meta.retrievedAt : undefined
        }
        onRefresh={() => void loadCatalog()}
      />
      <main
        id="workspace"
        className="mx-auto max-w-[1560px] px-4 py-6 sm:px-7 lg:py-8"
      >
        <div className="lg:grid lg:grid-cols-[minmax(280px,300px)_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-16">
          <section
            className="min-w-0 self-start lg:sticky lg:top-[76px] lg:flex lg:max-h-[calc(100dvh-92px)] lg:flex-col"
            aria-label="Markets"
          >
            <div className="border-b border-[var(--border)] pb-3">
              <div className="flex items-baseline justify-between gap-4">
                <h1 className="text-[16px] font-semibold tracking-[-0.015em]">
                  Market index
                </h1>
                <span className="text-xs text-[var(--text-dim)]">
                  {visibleMarkets.length} shown
                </span>
              </div>
              {catalog.status === "ready" ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {markets.length} total · {activeCount} active ·{" "}
                  {compactNumber.format(totalVolume)} USDC volume
                </p>
              ) : null}
              <label className="relative mt-4 block">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-dim)]"
                />
                <span className="sr-only">Search markets</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search markets"
                  className="market-control min-h-9 w-full rounded-[4px] border py-1.5 pl-9 pr-3 text-[13px] text-[var(--text)] transition-colors duration-150 placeholder:text-[var(--text-dim)]"
                />
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <label className="relative min-w-0">
                  <span className="sr-only">Phase</span>
                  <select
                    value={phase}
                    onChange={(event) => {
                      const parsed = phaseSchema.safeParse(event.target.value);
                      if (parsed.success) setPhase(parsed.data);
                    }}
                    className="market-control min-h-8 min-w-0 w-full rounded-[4px] border py-1 pl-2 pr-7 text-[11px] transition-colors duration-150"
                  >
                    {phases.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-dim)]"
                  />
                </label>
                <label className="relative min-w-0">
                  <span className="sr-only">Category</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="market-control min-h-8 min-w-0 w-full rounded-[4px] border py-1 pl-2 pr-7 text-[11px] transition-colors duration-150"
                  >
                    <option value="all">All categories</option>
                    {(catalog.status === "ready"
                      ? catalog.data.categories
                      : []
                    ).map((item) => (
                      <option key={item} value={item}>
                        {titleCase(item)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-dim)]"
                  />
                </label>
                <label className="relative col-span-2 min-w-0">
                  <span className="sr-only">Sort markets</span>
                  <select
                    value={sort}
                    onChange={(event) => {
                      const parsed = sortSchema.safeParse(event.target.value);
                      if (parsed.success) setSort(parsed.data);
                    }}
                    className="market-control min-h-8 min-w-0 w-full rounded-[4px] border py-1 pl-2 pr-7 text-[11px] transition-colors duration-150"
                  >
                    <option value="volume">Volume</option>
                    <option value="probability">Probability</option>
                    <option value="closing">Closing</option>
                    <option value="newest">Newest</option>
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-dim)]"
                  />
                </label>
              </div>
            </div>

            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {catalog.status === "loading" ? (
                <div
                  className="border-t border-[var(--border-soft)]"
                  aria-busy="true"
                  aria-label="Loading market catalog"
                >
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className="border-b border-[var(--border-soft)] px-3 py-5"
                    >
                      <div className="skeleton h-3 w-1/4 rounded bg-white/6" />
                      <div className="skeleton mt-3 h-4 w-4/5 rounded bg-white/6" />
                      <div className="skeleton mt-3 h-3 w-1/2 rounded bg-white/6" />
                    </div>
                  ))}
                </div>
              ) : catalog.status === "error" ? (
                <div className="mt-5">
                  <CatalogError
                    error={catalog.error}
                    onRetry={() => {
                      setCatalog({ status: "loading" });
                      void loadCatalog();
                    }}
                  />
                </div>
              ) : visibleMarkets.length === 0 ? (
                <div className="border-t border-[var(--border-soft)] px-1 py-8">
                  <p className="text-sm font-medium text-[var(--text)]">
                    No markets match these filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPhase("all");
                      setCategory("all");
                    }}
                    className="mt-3 min-h-9 rounded-[4px] border border-[var(--border)] px-3 text-xs font-medium text-[var(--text)] hover:border-[var(--text-dim)]"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="border-t border-[var(--border-soft)]">
                  {visibleMarkets.map((market) => (
                    <MarketRow
                      key={market.marketId}
                      market={market}
                      active={market.marketId === selectedId}
                      onSelect={() => selectMarket(market.marketId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside
            className="hidden min-w-0 lg:block"
            aria-label="Market details"
          >
            {panel ?? (
              <div className="grid min-h-[28rem] place-items-center border-l border-[var(--border-soft)] p-8 text-sm text-[var(--text-dim)]">
                Select a market to view details.
              </div>
            )}
          </aside>
        </div>
      </main>

      {selectedSummary ? (
        <MobileMarketDialog
          open={mobileOpen}
          title={selectedSummary.title}
          onClose={() => setMobileOpen(false)}
        >
          {panel}
        </MobileMarketDialog>
      ) : null}
    </div>
  );
}
