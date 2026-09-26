# Verified Panta API findings

Checked on 2026-09-24 against the official documentation at <https://docs.panta.market/> only.

## Base and authentication

- Documented production base: `https://live-api.panta.market/api/v1`
- Trailing slashes are required.
- Product/catalog routes require either `X-Api-Key: pk_test_...|pk_live_...` or `Authorization: Bearer <access>`.
- Panta recommends `X-Api-Key` for server-to-server product calls.
- Keys in query strings are rejected. Panta credentials must not be shipped to a browser.

## Endpoints used

### `GET /markets/`

Paginated USDC catalog. Query fields: `category`, `status` (`primary|secondary|resolved|cancelled`), `createdBy=me`, opaque `cursor`, and `limit` (default 20, maximum 50).

Response: `{ items, nextCursor }`. Each item documents:

`marketId`, `category`, `title`, `description`, `images`, `phase`, `marketType`, `startTime`, `endTime`, `resolutionTime`, `region`, `resolved`, `status`, `volumeUsdc`, `campaignId`, `createdByPartner`, `yesPrice`, `noPrice`, `primaryYesPrice`, `primaryNoPrice`, `secondaryYesPrice`, `secondaryNoPrice`.

Important: list price fields are documented as `null`; list rows are registry data, not live RPC prices.

### `GET /markets/{marketId}/`

Returns the same market shape and fills spot price fields from on-chain state when RPC is available. Errors include `UNAUTHORIZED`, `RATE_LIMITED`, and `MARKET_NOT_FOUND`.

### `GET /markets/{marketId}/trades/`

Returns `{ marketId, items }`. The only documented query field is `limit` (default 50, maximum 200); cursor pagination and response ordering are not documented. Each item contains `id`, `marketId`, `wallet`, `isPrimary`, `yesAmount`, `noAmount`, `feePaid`, nullable Unix-second `blockTime`, `signature`, and `quoteAsset`.

The contract exposes share amounts but no execution price. A verified price history cannot be derived from this endpoint alone.

### `GET /categories/`

Returns `{ categories: string[] }`; the documented allowlist example is sports, crypto, politics, entertainment, finance, science, world, other.

## Errors and limits

Error envelope: `{ code, message, field?, fields? }`. The app switches primarily on `code`, with HTTP status as the failure class. Authenticated catalog reads are documented at a default 120 requests per 60 seconds; a `429` may include `Retry-After` plus `X-RateLimit-*` headers.

## Live verification status

Authenticated responses were checked on 2026-09-24. All three requests returned HTTP 200 with `Content-Type: application/json`.

| Endpoint                          | Documented                                                  | Observed                                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /markets/`                   | `{ items, nextCursor }`; timestamps are Unix-second numbers | `{ items, nextCursor, disclaimer }`; market fields match the documented list, but `startTime`, `endTime`, and `resolutionTime` are ISO UTC strings with second precision |
| `GET /categories/`                | `{ categories: string[] }`                                  | `{ categories, disclaimer }`; `categories` is a string array                                                                                                             |
| `GET /markets/{marketId}/`        | Flat market object; timestamps are Unix-second numbers      | Flat market object with the same ISO UTC timestamp strings, plus `creatorAddress`, `onChain`, and `disclaimer`                                                           |
| `GET /markets/{marketId}/trades/` | `{ marketId, items }` with up to 200 trades                 | `{ marketId, items, disclaimer }`; the checked sandbox market returned an empty `items` array                                                                            |

The timestamp schema accepts only the documented safe integer seconds or the observed ISO UTC second format, then normalizes both to Unix seconds. Required market fields remain validated. `nextCursor` is explicitly nullable/optional, unknown supplemental metadata is not exposed to the UI, and an empty `items` array is valid. The API routes always return one internal `MarketView[]` shape and never substitute demo data.

The live catalog returned a market outside a requested category during verification. The server route therefore rechecks the category and phase of every validated row before returning it to the UI.

Live diagnostics recorded only status, content type, field names, structural types, and Zod issue paths. No credentials or production payloads were stored.

Trade rows are runtime-validated and normalized to a stable activity model. Known timestamps are sorted newest-first locally, while rows without a block time remain last. The workspace shows the exact empty state when no trades exist and does not render a price chart without price-bearing history.

## Official pages

- <https://docs.panta.market/quickstart>
- <https://docs.panta.market/api-reference/markets/list>
- <https://docs.panta.market/api-reference/markets/get>
- <https://docs.panta.market/api-reference/markets/categories>
- <https://docs.panta.market/api-reference/markets/trades>
- <https://docs.panta.market/guides/authentication>
- <https://docs.panta.market/guides/errors>
