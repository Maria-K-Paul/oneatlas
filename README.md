# OneAtlas

An AI model discovery and intelligence platform. Developers, AI engineers and researchers can
browse, compare and evaluate models across labs and providers: specs, pricing, capabilities and
benchmarks in one place.

Built with Next.js, React, TypeScript, Tailwind CSS, PostgreSQL and Prisma. Architecture,
database schema and the reasoning behind each decision are in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> **Sample data.** The catalog is a curated, illustrative dataset based on public information
> about models released up to late 2025. Prices and benchmark scores are approximate.

## Quick start

Requires Node.js 22+. No Docker needed: Prisma ships a local Postgres.

```bash
npm install
cp .env.example .env
npm run db:dev              # start Prisma's local Postgres; match the port it prints in .env
npm run db:deploy           # apply migrations
npm run ingest              # load data/ into the database
npm run dev                 # http://localhost:3000
```

Check it's working: <http://localhost:3000/api/v1/health> reports the database status and row
counts.

## Scripts

| Command                    | What it does                                                                   |
| -------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`              | Development server                                                             |
| `npm run build` / `start`  | Production build / server                                                      |
| `npm run check`            | Typecheck + lint + unit tests                                                  |
| `npm test`                 | Unit tests, including validation of the committed dataset (no DB)              |
| `npm run test:integration` | Pipeline tests against Postgres at `TEST_DATABASE_URL`                         |
| `npm run ingest`           | Validate `data/` and sync it to the database (`-- --dry-run` to only validate) |
| `npm run db:migrate`       | Create a migration after editing `prisma/schema.prisma`                        |
| `npm run db:deploy`        | Apply pending migrations                                                       |
| `npm run format`           | Prettier                                                                       |

## Project layout

```
data/              curated dataset: labs, providers, benchmarks, models/<lab>.json
prisma/            schema and migrations
scripts/ingest/    validate → normalize → sync pipeline
src/app/           routing only: pages and API route handlers (/api/v1/*)
src/modules/       feature modules: catalog, compare, rankings, search, labs, providers
src/platform/      shared foundation: db client, HTTP errors, validation, formatting, UI, layout
docs/              architecture and decisions
```

Feature modules expose a client-safe entry point (`@/modules/<name>`) and a server-only one
(`@/modules/<name>/server`). ESLint enforces these boundaries; see
[docs/ARCHITECTURE.md §13](docs/ARCHITECTURE.md#13-modules).

## Deployment (Vercel + Neon)

1. Create a Neon project. Put its **pooled** connection string in `DATABASE_URL` and the **direct** one in `DIRECT_URL`.
2. Load the database once from your machine: `npm run db:deploy` and then `npm run ingest`, with `DIRECT_URL` set to Neon.
3. Import the repo into Vercel and add `DATABASE_URL` (pooled). Leave `NEXT_BUILD_CPUS` and `DATABASE_POOL_MAX` unset.
4. Deploy. The build prerenders the catalog from Neon, so the database must be reachable at build time.
