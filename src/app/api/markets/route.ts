import { z } from "zod";

import {
  getCachedMarket,
  getPantaEnvironment,
  listCategories,
  listMarkets,
} from "@/lib/panta/client";
import { mergeMarketCategories } from "@/lib/panta/categories";
import { partitionCatalogMarkets } from "@/lib/panta/catalog-enrichment";
import { PantaApiError, toPublicApiError } from "@/lib/panta/errors";
import { mergePantaMarketRecords, toMarketView } from "@/lib/panta/normalize";
import {
  type PantaMarket,
  type PantaMarketListItem,
} from "@/lib/panta/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

const DETAIL_CONCURRENCY = 20;
const CATALOG_ROUTE_BUDGET_MS = 18_000;
const DETAIL_RETRY_DELAY_MS = 250;

const querySchema = z.object({
  category: z.string().min(1).max(64).optional(),
  status: z.enum(["primary", "secondary", "resolved", "cancelled"]).optional(),
  cursor: z.string().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchDetailWithRetry(marketId: string, deadline: number) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0)
      throw new Error("Catalog enrichment budget exceeded.");

    try {
      return await getCachedMarket(marketId, remainingMs);
    } catch (error) {
      if (
        !(error instanceof PantaApiError) ||
        error.status !== 429 ||
        attempt === 1
      ) {
        throw error;
      }

      const retryDelayMs = Math.max(
        DETAIL_RETRY_DELAY_MS,
        (error.retryAfterSeconds ?? 0) * 1_000,
      );
      if (retryDelayMs >= deadline - Date.now()) throw error;
      await pause(retryDelayMs);
    }
  }

  throw new Error("Catalog enrichment retry unexpectedly ended.");
}

async function enrichMarkets(markets: PantaMarketListItem[], budgetMs: number) {
  const enriched: PantaMarket[] = [];
  let detailFailures = 0;
  const deadline = Date.now() + Math.max(0, budgetMs);

  for (let index = 0; index < markets.length; index += DETAIL_CONCURRENCY) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      detailFailures += markets.length - index;
      break;
    }

    const batch = markets.slice(index, index + DETAIL_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((market) => fetchDetailWithRetry(market.marketId, deadline)),
    );

    results.forEach((result, resultIndex) => {
      if (result.status === "fulfilled") {
        const summary = batch[resultIndex];
        if (summary) {
          enriched.push(mergePantaMarketRecords(summary, result.value));
        }
      } else {
        detailFailures += 1;
      }
    });
  }

  return { enriched, detailFailures };
}

function matchesRequestedFilters(
  market: PantaMarketListItem,
  filters: { category?: string; status?: PantaMarket["phase"] },
) {
  const categoryMatches =
    filters.category === undefined ||
    market.category.toLowerCase() === filters.category.toLowerCase();
  const phaseMatches =
    filters.status === undefined || market.phase === filters.status;
  return categoryMatches && phaseMatches;
}

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: url.searchParams.get("category") || undefined,
    status: url.searchParams.get("status") || undefined,
    cursor: url.searchParams.get("cursor") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    return json(
      {
        code: "INVALID_QUERY",
        message: "One or more catalog filters are invalid.",
      },
      400,
    );
  }

  try {
    const [catalog, categories] = await Promise.all([
      listMarkets(parsed.data),
      listCategories(),
    ]);
    const matchingItems = catalog.items.filter((market) =>
      matchesRequestedFilters(market, parsed.data),
    );
    const { immediatelyUsable, requiresDetail } =
      partitionCatalogMarkets(matchingItems);
    const remainingBudget = CATALOG_ROUTE_BUDGET_MS - (Date.now() - startedAt);
    const { enriched, detailFailures } = await enrichMarkets(
      requiresDetail,
      remainingBudget,
    );
    const items = [...immediatelyUsable, ...enriched].flatMap((market) => {
      const normalized = toMarketView(market);
      return normalized === null ? [] : [normalized];
    });

    return json({
      items,
      categories: mergeMarketCategories(categories, items),
      nextCursor: catalog.nextCursor ?? null,
      meta: {
        source: "panta",
        environment: getPantaEnvironment(),
        retrievedAt: new Date().toISOString(),
        detailFailures,
      },
    });
  } catch (error) {
    const publicError = toPublicApiError(error);
    const retryHeaders =
      publicError.retryAfterSeconds === undefined
        ? undefined
        : { "Retry-After": String(publicError.retryAfterSeconds) };
    return json(publicError, publicError.status, retryHeaders);
  }
}
