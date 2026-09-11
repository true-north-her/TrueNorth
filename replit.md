# TrueNorth — A calmer way to live

TrueNorth is a calm, community-first landing page for young women and students who want a smaller, more genuine space online.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/truenorth-landing/src/App.tsx` — the landing page sections, configurable channel links, and lightweight interactions
- `artifacts/truenorth-landing/src/index.css` — brand tokens, typography, motion, and responsive styles
- `artifacts/truenorth-landing/index.html` — page metadata and favicon reference
- `artifacts/truenorth-landing/public/favicon.svg` — TrueNorth favicon

## Architecture decisions

- The site is intentionally frontend-only: the first public home base links visitors to Discord and Substack without inventing product or community data.
- Discord and Substack destinations are centralized in one `LINKS` object so the real URLs can be swapped in without hunting through the page.
- The visual system favors editorial typography, strong color fields, fine rules, and restrained motion over card-heavy startup patterns.

## Product

- Explains TrueNorth’s purpose and philosophy.
- Introduces the community, the community → insight → product approach, Discord, Substack, and the Founding Circle.
- Provides responsive navigation, external channel CTAs, a mobile menu, scroll reveals, and an interactive Founding Circle interest form.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
