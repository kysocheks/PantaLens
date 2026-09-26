# Panta Lens

Panta Lens is a read-only interface for exploring Panta prediction markets. It keeps the catalog, market details, lifecycle, current prices, and recorded activity in one place without inventing data that the upstream API does not provide.

The app is useful when a market needs a quick, verifiable read: its current state, available prices, resolution window, source identifier, and recent activity. It reads live Panta API data and clearly shows upstream or validation failures instead of substituting sample content.

## What it includes

- A searchable, filterable market catalog with category, phase, and sort controls.
- A focused market view with a probability lens, lifecycle facts, source ID, and copyable deep link.
- Independent loading, empty, retry, and error states for the catalog, detail, and activity feed.
- Keyboard navigation, responsive layouts, and reduced-motion support.

## Requirements

- Node.js 24+
- npm 11+
- A Panta API key (`pk_test_...` or `pk_live_...`)

## Local setup

```bash
npm install
copy .env.example .env.local
```

Set these values yourself in `.env.local` (never paste a key into source control):

```dotenv
PANTA_API_BASE_URL=https://live-api.panta.market/api/v1
PANTA_API_KEY=your_panta_api_key
```

Then run:

```bash
npm run dev
```

Open the local URL printed by Next.js.

## Architecture and security

The browser calls same-origin route handlers only. Those handlers use a `server-only` Panta client, validate upstream payloads with Zod, normalize them into the UI model, and return a stable public error envelope. The client bundle does not receive `PANTA_API_KEY`, and request URLs do not contain credentials.

`PANTA_API_BASE_URL` must use HTTPS. `PANTA_API_KEY` must use a recognized Panta key prefix. Missing or malformed configuration fails closed with a service error. The routes run on the Node.js runtime, apply an 8-second upstream timeout, and allow at most 10 seconds per serverless request.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

## Current data limits

Panta currently returns one sandbox market and an empty trade history for this environment. Panta Lens displays that state as received. It does not connect wallets, place trades, manage positions, or create markets. The repository contains no mock markets or fabricated market activity.

## Deployment

Deploy to Vercel with `PANTA_API_BASE_URL` and `PANTA_API_KEY` configured as server-side environment variables. Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS deployment URL so social metadata uses the canonical domain. Do not expose either Panta value through a `NEXT_PUBLIC_` variable. `.env.local` remains local and ignored by Git; `.env.example` contains safe placeholders only.

See [`docs/API_FINDINGS.md`](docs/API_FINDINGS.md) for the verified Panta contract and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the request flow.
