# Relay — Architecture

Relay is a database-backed Next.js application that demonstrates an intelligent
service-management orchestration layer.

## High-level

```
Sources (simulated adapters)
  AWS CloudWatch · Jira Service Desk · Exabeam · CrowdStrike · Application Telemetry
        │  raw events
        ▼
  Normalisation engine            src/lib/engines/normalisation.ts
        │  normalised events (severity, category, correlation key)
        ▼
  Correlation engine              src/lib/engines/correlation.ts
        │  clusters (confidence + factors)
        ▼
  Incident generation + Triage    src/lib/engines/triage.ts
        │  severity, urgency, impact, approval requirement
        ▼
  Runbook recommendation          src/lib/engines/runbook.ts
        │  recommended runbook + approval gate
        ▼
  Human approval → Safe simulated automation   src/lib/actions.ts
        │  audit trail, service health recovery
        ▼
  Capacity intelligence           src/lib/engines/capacity.ts
```

## Layers

- **Database** — Neon PostgreSQL via Drizzle ORM. Schema in `src/db/schema.ts`, migrations in
  `drizzle/`, deterministic seed in `src/db/seed-data.ts` + `src/db/apply.ts`.
- **Engines** (`src/lib/engines/`) — pure, deterministic, unit-tested functions with no I/O and no
  external AI. They are the single source of correlation/triage/runbook/capacity logic, used by both
  the seed and (conceptually) the live ingestion path.
- **Data access** (`src/lib/queries.ts`) — server-only functions that read from Neon and shape data
  for the UI. Every entry point calls `ensureSeeded()` for self-provisioning.
- **Server Actions** (`src/lib/actions.ts`) — the live, simulated automation flow (approve, execute,
  resolve, reset-demo). Mutations touch only Relay's own demonstration rows.
- **UI** (`src/app/`, `src/components/`) — App Router Server Components with a small number of
  client components (`nav`, `charts`, `live-toggle`, `automation-actions`).

## Rendering

All data pages are `dynamic = "force-dynamic"` — Relay renders per-request against live database
state, so approving an automation or resetting the demo is reflected immediately.

## Determinism & self-provisioning

- A fixed PRNG (`src/lib/rng.ts`) makes the seed reproducible.
- `src/db/ready.ts` seeds the database on first request if it looks empty, so a deployment only needs
  `DATABASE_URL`.

## Module boundaries (kept separate on purpose)

`event ingestion` · `normalisation` · `correlation` · `triage` · `automation` · `capacity analysis`
· `UI`. Each concern is isolated so it can evolve (or be replaced with a real connector / a future AI
component) without touching the others.

## Deployment

Next.js on Vercel serverless; Neon serverless HTTP driver (`@neondatabase/serverless`) is
connection-pool friendly for serverless functions. See the README for deployment steps.
