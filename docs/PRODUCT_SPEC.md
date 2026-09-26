# Panta Lens product spec

## Goal

Deliver a public, read-only market workspace that lets a judge discover and inspect verified Panta prediction markets without exposing a Panta credential to the browser.

## Primary flow

1. Open the dashboard and load the Panta USDC catalog.
2. Search titles and descriptions; filter by Panta category and phase.
3. Sort by volume, YES price, end time, or recency.
4. Keep one market selected in a permanent desktop detail panel and a focused mobile detail view.
5. Restore the selected market from the URL.
6. Read YES/NO spot prices, lifecycle facts, and verified activity when each source is available.
7. See explicit unavailable and insufficient-data states instead of inferred values.

## Required states

- Initial and supplemental loading
- No Panta markets / no local filter matches
- Missing server configuration
- Unauthorized Panta credential
- Rate limit with `Retry-After`
- Timeout, invalid upstream response, and general API failure
- Independent detail and activity retry without a full-page reload

## Non-goals

Trading, wallet connection, user accounts, persistence, alerts, market comparison, and fabricated production markets are out of scope. Price history is not shown until Panta exposes a verified price-bearing history source.

## Experience

Restrained dark research UI, neutral graphite surfaces, one muted green accent for YES and active states, clear keyboard focus, mobile-safe detail navigation, reduced-motion support, and visible Panta attribution.
