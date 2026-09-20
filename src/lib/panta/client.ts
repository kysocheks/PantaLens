import "server-only";

import { unstable_cache } from "next/cache";
import type { ZodType } from "zod";

import { parsePantaConfig } from "./config";
import { PantaApiError, PantaTimeoutError } from "./errors";
import {
  pantaCategoriesSchema,
  pantaErrorSchema,
  pantaMarketListSchema,
  pantaMarketSchema,
  pantaTradeListSchema,
} from "./schemas";
import { createTtlCache } from "./ttl-cache";

const REQUEST_TIMEOUT_MS = 8_000;
const CATEGORY_CACHE_MS = 10 * 60 * 1_000;
const MARKET_DETAIL_CACHE_MS = 5 * 60 * 1_000;
const MARKET_DETAIL_REVALIDATE_SECONDS = 180;

let categoryCache: { categories: string[]; expiresAt: number } | undefined;
const marketDetailCache = createTtlCache<import("./schemas").PantaMarket>(
  MARKET_DETAIL_CACHE_MS,
);

function getConfig() {
  return parsePantaConfig(
    process.env.PANTA_API_BASE_URL,
    process.env.PANTA_API_KEY,
  );
}

export type PantaEnvironment = "sandbox" | "live" | "unknown";

export function getPantaEnvironment(): PantaEnvironment {
  const { apiKey } = getConfig();
  if (apiKey.startsWith("pk_test_")) return "sandbox";
  if (apiKey.startsWith("pk_live_")) return "live";
  return "unknown";
}

async function pantaFetch<T>(
  path: string,
  schema: ZodType<T>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(REQUEST_TIMEOUT_MS, Math.max(1, timeoutMs)),
  );

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
      signal: controller.signal,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const parsedError = pantaErrorSchema.safeParse(payload);
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfter = retryAfterHeader
        ? Number.parseInt(retryAfterHeader, 10)
        : undefined;

      throw new PantaApiError(
        response.status,
        parsedError.success ? parsedError.data.code : "UPSTREAM_ERROR",
        parsedError.success && parsedError.data.message
          ? parsedError.data.message
          : "Panta returned an unsuccessful response.",
        Number.isFinite(retryAfter) ? retryAfter : undefined,
      );
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new PantaApiError(
        502,
        "UPSTREAM_INVALID_RESPONSE",
        "Panta returned a response that did not match its documented schema.",
      );
    }

    return parsed.data;
  } catch (error) {
    if (controller.signal.aborted) throw new PantaTimeoutError();
    if (error instanceof PantaApiError) throw error;

    throw new PantaApiError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "Panta could not be reached.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export type MarketListFilters = {
  category?: string;
  status?: "primary" | "secondary" | "resolved" | "cancelled";
  cursor?: string;
  limit: number;
};

export async function listMarkets(filters: MarketListFilters) {
  const query = new URLSearchParams({ limit: String(filters.limit) });
  if (filters.category) query.set("category", filters.category);
  if (filters.status) query.set("status", filters.status);
  if (filters.cursor) query.set("cursor", filters.cursor);

  return pantaFetch(`/markets/?${query.toString()}`, pantaMarketListSchema);
}

export function getMarket(marketId: string, timeoutMs?: number) {
  return pantaFetch(
    `/markets/${encodeURIComponent(marketId)}/`,
    pantaMarketSchema,
    timeoutMs,
  );
}

export function getCachedMarket(marketId: string, timeoutMs?: number) {
  const environment = getPantaEnvironment();
  return marketDetailCache.get(`${environment}:${marketId}`, () =>
    unstable_cache(
      () => getMarket(marketId, timeoutMs),
      ["panta-market-detail", environment, marketId],
      { revalidate: MARKET_DETAIL_REVALIDATE_SECONDS },
    )(),
  );
}

export function listMarketTrades(marketId: string, limit: number) {
  const query = new URLSearchParams({ limit: String(limit) });
  return pantaFetch(
    `/markets/${encodeURIComponent(marketId)}/trades/?${query.toString()}`,
    pantaTradeListSchema,
  );
}

export async function listCategories(): Promise<string[]> {
  if (categoryCache && categoryCache.expiresAt > Date.now()) {
    return categoryCache.categories;
  }

  const response = await pantaFetch("/categories/", pantaCategoriesSchema);
  categoryCache = {
    categories: response.categories,
    expiresAt: Date.now() + CATEGORY_CACHE_MS,
  };
  return response.categories;
}
