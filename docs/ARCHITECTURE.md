# Architecture

```text
Browser dashboard
  -> GET /api/markets (same origin)
     -> server-only Panta client
        -> GET /markets/
        -> GET /categories/ (10-minute in-process cache)
        -> GET /markets/{marketId}/ (bounded detail enrichment)
  -> GET /api/markets/{marketId}
     -> server-only Panta client
        -> GET /markets/{marketId}/
  -> GET /api/markets/{marketId}/trades
     -> server-only Panta client
        -> GET /markets/{marketId}/trades/
```

## Boundaries

- `src/lib/panta/client.ts` is guarded by `server-only` and is the only module that reads `PANTA_API_KEY`.
- Route handlers validate query input and convert internal/upstream failures to a stable public error envelope.
- `src/lib/panta/schemas.ts` mirrors the documented Panta response fields with Zod runtime validation.
- `src/lib/panta/normalize.ts` converts decimal price/volume strings and Unix seconds into the UI model.
- `src/lib/panta/trades.ts` converts validated trade rows into the UI activity model and applies a deterministic newest-first order.
- Detail and activity requests have independent UI states, so one supplemental failure does not hide verified market data.
- The client component receives no environment variables and calls only same-origin handlers.

## Reliability

- Upstream timeout: 8 seconds per request.
- Catalog page is capped at 50 rows in the UI route; detail enrichment still runs in batches of four.
- Detail requests run four at a time. A failed enrichment leaves that market visible with an unavailable-price state.
- Route handlers are dynamic and return `Cache-Control: no-store`.
- Upstream `401`, `429`, `Retry-After`, timeouts, and schema failures are mapped to distinct UI states.
- Market selection is stored in a validated `market` query parameter for reloadable deep links.

## Security

Secrets have no `NEXT_PUBLIC_` prefix, never enter props, logs, documentation, or client modules, and `.env.local` remains ignored.
