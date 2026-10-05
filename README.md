# Relay

**Intelligent service-management orchestration layer** — a CivTech 12.2 product demonstrator.

Relay helps fast-growing digital public-service providers manage increasing operational
complexity **without service-management staffing increasing linearly**. It ingests events from
existing monitoring and service-management platforms, normalises and correlates them into
incidents, triages by severity and impact, recommends runbooks, and executes **safe,
human-approved automation** — with a full audit trail and capacity intelligence.

> **Demonstrator notice.** Relay is a product demonstrator. All service telemetry is synthetic.
> Displayed connectors are simulated unless specifically stated otherwise. Automation operates
> only against demonstration services. Prototype recommendations are decision-support outputs.
> This does not imply Scottish Government or CivTech endorsement.

---

## Product purpose

Relay is an orchestration layer that sits **alongside** existing platforms (it does not replace
them). It demonstrates the full operational loop:

`event ingestion → normalisation → correlation → incident generation → triage → priority →
service impact → routing → runbook recommendation → safe automation → human approval →
resolution → audit → capacity intelligence`

## CivTech challenge

- **Challenge:** CivTech 12.2 — *"How can technology enable fast-growing digital public service
  providers to dynamically scale their service-management capabilities?"*
- **Sponsor:** Scottish Government — Directorate for Digital
- **Partnership context:** Ambidexters Ltd × The DataKirk SCIO
- **Referenced systems** (accounted for architecturally, simulated here): Jira Service Desk,
  AWS CloudWatch, Exabeam, CrowdStrike.

See [`docs/civtech-alignment.md`](docs/civtech-alignment.md) for the requirement-by-requirement map.

## Prototype disclaimer

This is a **prototype / demonstrator**, not a production system. Correlation, triage and runbook
recommendation use transparent deterministic logic (no external AI). All figures — especially
user-impact estimates and capacity models — are illustrative and based on synthetic data. See
[`docs/known-limitations.md`](docs/known-limitations.md) and
[`docs/responsible-ai.md`](docs/responsible-ai.md).

## Technical stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components, Server Actions, Route Handlers) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS (midnight-navy operations command-centre theme) |
| Database | Neon PostgreSQL |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Validation | Zod |
| Charts | Recharts |
| Tests | Vitest |

Domain logic is split into modular engines under `src/lib/engines/`:
`normalisation`, `correlation`, `triage`, `runbook`, `capacity`.

## Application map

`Command Centre` · `Services` · `Events` · `Incidents` (+ Incident Workspace) · `Automations` ·
`Capacity` · `Integrations` · `Audit` · `Methodology` · `Demo` · `About`

---

## Setup

### 1. Prerequisites

- Node.js ≥ 20
- A Neon PostgreSQL database (free tier is fine)

### 2. Install

```bash
npm install
```

### 3. Configure environment

Copy the example and provide your Neon connection string:

```bash
cp .env.example .env
# edit .env and set DATABASE_URL
```

**Never commit `.env`** — this repository is public. Only `.env.example` is tracked.

### 4. Database — migrate & seed

```bash
npm run db:migrate   # apply SQL migrations in ./drizzle to Neon
npm run db:seed      # deterministic synthetic seed (idempotent; truncates + reseeds)
```

The seed is deterministic (fixed PRNG seed) so it produces identical data every time. It runs the
real normalisation / correlation / triage / runbook engines so the seeded data is internally
consistent with the running application.

> **Self-provisioning.** On first request the app auto-seeds if the database looks empty
> (`src/db/ready.ts`), so a fresh deployment only needs `DATABASE_URL` set. Set
> `RELAY_DISABLE_AUTOSEED=1` to turn this off.

### 5. Run

```bash
npm run dev      # http://localhost:3000
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit tests |
| `npm run db:generate` | Generate a new Drizzle migration from the schema |
| `npm run db:migrate` | Apply migrations to Neon |
| `npm run db:seed` | Deterministic synthetic seed |

### Pre-deployment checklist

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

## Testing

Unit tests cover the deterministic engines and seed verification:
event normalisation, correlation, severity/triage, runbook recommendation, approval requirements,
capacity calculations, and seed invariants (10+ services, 150+ events, 20+ incidents, 5+ correlated).

```bash
npm run test
```

## Deploy to Vercel

The app is deploy-ready (`vercel.json`, dynamic rendering, self-provisioning). Two minutes to live:

1. In Vercel, **Add New → Project** and **Import** `Imomazin/relay`.
2. Because the demonstrator code lives on the `claude/relay-orchestration-build-ci23qf` branch (not
   `main`), either:
   - **Preview (recommended, no merge):** Project → **Settings → Git** and add
     `claude/relay-orchestration-build-ci23qf` as a deploy branch, then trigger a deployment of it;
     Vercel posts the **Preview URL** as a check on PR #1. _Or_
   - **Production:** set that branch as the **Production Branch** in Settings → Git.
3. Add the environment variable **`DATABASE_URL`** = your Neon **relay** pooled connection string
   (Settings → Environment Variables, all environments). The Neon database is already migrated and
   seeded, so the app shows data immediately. Optionally set `SEED_TOKEN` to enable the guarded
   `POST /api/seed` re-seed endpoint.
4. Deploy. Verify with `GET /api/health` → returns `{ ok, database: "connected", counts: {…} }`.

> **Why I couldn't deploy it for you:** this build sandbox's egress policy blocks `api.vercel.com`
> (403) and Neon's host, and no Vercel credentials are available here — so the deployment must be
> created once from your Vercel account. After that, pushes to the branch auto-deploy and the
> preview URL appears on the PR.

> Neon and Vercel are already linked at the account level (Neon org *"Vercel: eqar-platform"*). You
> can link the Neon **relay** project to the Vercel project so `DATABASE_URL` is injected
> automatically instead of pasting it.

## Demo

A repeatable 6–8 minute journey is documented in [`docs/demo-script.md`](docs/demo-script.md), and a
live walkthrough with an approve/reset control lives at `/demo`. The featured incident (`INC-1001`,
Payments) is pre-staged **Awaiting Approval** so a presenter can approve the simulated remediation
live and watch service health recover.

## Documentation

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/civtech-alignment.md`](docs/civtech-alignment.md)
- [`docs/data-model.md`](docs/data-model.md)
- [`docs/orchestration-methodology.md`](docs/orchestration-methodology.md)
- [`docs/integration-architecture.md`](docs/integration-architecture.md)
- [`docs/automation-safety.md`](docs/automation-safety.md)
- [`docs/responsible-ai.md`](docs/responsible-ai.md)
- [`docs/security.md`](docs/security.md)
- [`docs/demo-script.md`](docs/demo-script.md)
- [`docs/known-limitations.md`](docs/known-limitations.md)

## Known limitations

Rules are heuristic and tuned for a clear demonstration, not production accuracy; all data is
synthetic; connectors are simulated; user-impact and capacity figures are illustrative models with
stated assumptions. Full detail in [`docs/known-limitations.md`](docs/known-limitations.md).

## Security

This repository is **public**. No credentials, tokens, `DATABASE_URL`, private infrastructure
details or real telemetry are committed. See [`docs/security.md`](docs/security.md).

## Licence

Prototype / demonstrator. Not for production use.
