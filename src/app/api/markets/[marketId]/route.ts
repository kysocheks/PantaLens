import { z } from "zod";

import { getCachedMarket } from "@/lib/panta/client";
import { toPublicApiError } from "@/lib/panta/errors";
import { toMarketView } from "@/lib/panta/normalize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

const marketIdSchema = z
  .string()
  .min(20)
  .max(64)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/);

export async function GET(
  _request: Request,
  context: { params: Promise<{ marketId: string }> },
) {
  const { marketId } = await context.params;
  const parsed = marketIdSchema.safeParse(marketId);

  if (!parsed.success) {
    return Response.json(
      { code: "INVALID_MARKET_ID", message: "The market id is invalid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const market = await getCachedMarket(parsed.data);
    const normalized = toMarketView(market);
    if (normalized === null) {
      return Response.json(
        {
          code: "UPSTREAM_INCOMPLETE_RESPONSE",
          message: "Panta did not provide displayable market data.",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(normalized, {
      headers: { "Cache-Control": "no-store" },
    });
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
