import { z } from "zod";

import { listMarketTrades } from "@/lib/panta/client";
import { toPublicApiError } from "@/lib/panta/errors";
import { normalizeTrades } from "@/lib/panta/trades";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

const marketIdSchema = z
  .string()
  .min(20)
  .max(64)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/);

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ marketId: string }> },
) {
  const { marketId } = await context.params;
  const idResult = marketIdSchema.safeParse(marketId);
  const url = new URL(request.url);
  const queryResult = querySchema.safeParse({
    limit: url.searchParams.get("limit") || undefined,
  });

  if (!idResult.success || !queryResult.success) {
    return Response.json(
      { code: "INVALID_QUERY", message: "The trade request is invalid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const history = await listMarketTrades(
      idResult.data,
      queryResult.data.limit,
    );
    return Response.json(
      {
        marketId: history.marketId,
        items: normalizeTrades(history.items),
        meta: {
          source: "panta",
          retrievedAt: new Date().toISOString(),
          order: "newest_first",
          priceHistory: "unavailable",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const publicError = toPublicApiError(error);
    return Response.json(publicError, {
      status: publicError.status,
      headers: {
        "Cache-Control": "no-store",
        ...(publicError.retryAfterSeconds === undefined
          ? {}
          : { "Retry-After": String(publicError.retryAfterSeconds) }),
      },
    });
  }
}
