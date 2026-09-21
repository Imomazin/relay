# Relay — Known Limitations

Relay is a **product demonstrator**, not a production system. This document is an honest inventory of
what is and isn't real.

## Data

- **All telemetry is synthetic** and deterministically generated (`src/db/seed-data.ts`). No real
  monitoring data, tickets, detections or user data are used.
- User-impact estimates are **illustrative models**, not measurements.
- Capacity figures (workload hours, hours avoided, forecasts) are **illustrative**, based on stated
  assumptions on synthetic data — **not guaranteed savings**.

## Connectors

- Jira Service Desk, AWS CloudWatch, Exabeam, CrowdStrike and Application Telemetry are **simulated
  adapters**. There are no live connections and no credentials. Statuses shown ("Demo Adapter",
  "Ready for Configuration", "Not Connected") describe demonstrator state, not real connectivity.

## Engines

- Correlation/triage/runbook logic is **heuristic** and tuned for a clear demonstration, not
  production accuracy. Time windows and factor weights would need calibration against real telemetry.
- The correlation window and grouping (by service) are deliberately simple; real systems may need
  topology-aware and cross-service correlation.

## Automation

- All automation is **simulated** and touches only Relay's own database rows. No real infrastructure
  is ever mutated. See [`automation-safety.md`](automation-safety.md).

## Application

- No authentication/authorisation: any visitor can approve/execute/reset the **simulated** demo
  actions. Acceptable for a demonstrator; unacceptable for production.
- Pages render per-request (`force-dynamic`); there is no caching layer tuned for scale.
- Time-relative data ("events last hour") ages against real wall-clock time; re-seed before a demo
  for freshest "last hour" counts.

## Operational

- Local development against Neon requires network egress to Neon; in restricted sandboxes the schema
  and seed may be applied via tooling instead of the local driver.
- The auto-seed guard reseeds only when the database looks empty (events < 100); it will not "repair"
  a partially-populated database — run `npm run db:seed` for a clean reseed.

## Not claimed

- No Scottish Government or CivTech endorsement.
- No connection to real Scottish Government systems or data.
- Not a replacement for Jira, CloudWatch, Exabeam, CrowdStrike or any ITSM platform.

## Recommended next steps

See the PR description and [`civtech-alignment.md`](civtech-alignment.md) "Future Accelerator work"
column for the roadmap from demonstrator to pilot.
