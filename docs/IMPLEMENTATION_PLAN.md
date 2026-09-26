# Implementation plan

## Stage 1: complete

- Verified the catalog, detail, category, authentication, and error contracts.
- Added the server-only Panta client, runtime schemas, normalized market model, and same-origin routes.
- Delivered the searchable and filterable read-only catalog with explicit failure states.

## Stage 2: complete

- Added the permanent desktop detail panel and full-screen mobile detail flow.
- Added URL-based market selection, lifecycle derivation, verified activity, and independent retry states.
- Added deterministic Market Pulse calculations with an explicit insufficient-data result.
- Confirmed that the trade feed has no execution-price field, so no historical price chart is rendered.

## Deferred

Price history and price-driven trend summaries require an official price-bearing history source. Comparison, trading, wallets, user accounts, and persistence remain outside the current product scope.
