# CLAUDE.md

Guidance for working in the **Relay** repository (CivTech 12.2 service-management
orchestration demonstrator).

## What this is

A database-backed Next.js app demonstrating an intelligent service-management orchestration layer:
event ingestion → normalisation → correlation → incident triage → runbook recommendation →
human-approved **simulated** automation → audit → capacity intelligence.

**It is a demonstrator.** All telemetry is synthetic; all connectors are simulated; automation
touches only Relay's own demonstration rows. Keep it that way — see `docs/automation-safety.md`.

## Commands

```bash
npm run dev         # dev server
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest
npm run build       # production build
npm run db:migrate  # apply drizzle/ migrations to Neon
npm run db:seed     # deterministic synthetic seed
```

Before committing, run: `npm run lint && npm run typecheck && npm run test && npm run build`.

## Architecture (where things live)

- `src/lib/engines/` — pure, deterministic, unit-tested domain logic. **No I/O, no external AI.**
  `normalisation`, `correlation`, `triage`, `runbook`, `capacity`, `scenario`.
- `src/lib/domain.ts` — the single source of truth for every enum/label. Add new statuses/categories
  here first.
- `src/db/` — Drizzle schema (`schema.ts`), deterministic seed (`seed-data.ts` + `apply.ts`),
  runtime self-provisioning (`ready.ts`), CLI scripts (`seed.ts`, `migrate.ts`, `seed-emit.ts`).
- `src/lib/queries.ts` — server-only data access; every entry calls `ensureSeeded()`.
- `src/lib/actions.ts` — Server Actions (approve/execute/resolve/reset + live replay inject/clear).
  Mutations must only touch Relay's own rows.
- `src/app/` — App Router pages (all data pages are `force-dynamic`), `src/components/` — UI.

## Conventions

- **TypeScript strict.** Keep engines pure and deterministic; drive any randomness through
  `src/lib/rng.ts` (fixed seed) so the seed and tests stay reproducible.
- **Design:** midnight-navy operations command-centre theme; Tailwind tokens in `tailwind.config.ts`
  and component classes in `globals.css`. Avoid cyberpunk/neon/hacker styling.
- **Accessibility:** keyboard focus states, semantic tables, `aria-label`s on charts/graphs, visible
  status text, good contrast. Target WCAG 2.2 AA.
- **Security:** this repo is **public**. Never commit `DATABASE_URL`, tokens, keys or real data.
  Only `.env.example` is tracked.

## Adding features

- New engine logic → add a pure function in `src/lib/engines/` **with a Vitest test**.
- New table/field → update `src/db/schema.ts`, run `npm run db:generate`, then `npm run db:migrate`,
  and extend `src/db/seed-data.ts`.
- New enum value → add it to `src/lib/domain.ts` (and its label map) first.

## Branch / PR

- Development happens on `claude/relay-orchestration-build-ci23qf`; the PR targets `main` and must
  **not** be merged (demonstrator review line). Never force-push.
