# Relay — Automation Safety

Relay demonstrates **safe, human-supervised automation**. This document records the safety model.

## Core guarantee

**No runbook performs destructive actions against real infrastructure.** Every automation in Relay
operates only on Relay's own demonstration database rows. Nothing touches real Vercel, Neon, AWS,
Jira, Exabeam, CrowdStrike or any external system.

## Simulation boundaries

- Runbook steps carry a `simulated_action` string (e.g. `simulate:scale(worker_pool,+3)`). These are
  **labels for a demo**, not executed commands.
- "Executing" a runbook (`src/lib/actions.ts`) updates incident/service/automation/approval/audit
  rows and inserts a synthetic service-metric point showing recovery. It calls no external API.
- The demo can be **reset** (`resetDemo`) to replay the journey; reset only touches the featured
  incident's own rows.

## Human-in-the-loop

- Triage sets an **approval requirement** for high/critical severity, tier-1 services, and
  security/authentication categories.
- High-risk runbooks always require approval regardless of severity.
- The Incident Workspace shows the proposed automation, its risk level, the evidence, the expected
  result and the rollback concept **before** any approval control is offered.
- Only after explicit operator approval does the simulated execution proceed.

## Risk classification

Runbooks are classified **low / medium / high**. Examples:

- **Low:** collect diagnostics, trigger health check, notify owner (read-only or notification-only).
- **Medium:** scale a simulated worker pool / service tier, rolling restart.
- **High:** clear a simulated queue (poison-message handling), fail over a simulated dependency.

## Rollback

Every runbook documents a **rollback concept** (e.g. scale back to prior replica count; quarantined
messages retained in a dead-letter store for replay; shift traffic back to primary once healthy).
Read-only runbooks have nothing to roll back.

## Audit

Every step is recorded in the audit trail: `approval_requested → approval_granted →
automation_executed → automation_outcome → incident_status_changed`. The audit trail is the evidence
base for accountable automation and is visible per-incident and on the Audit screen.

## Future production safeguards (out of scope for the demonstrator)

- Real connectors behind least-privilege, short-lived credentials and per-action authorisation.
- Policy engine gating which runbooks may auto-execute, per service and per environment.
- Dry-run / plan-and-confirm for every mutating action, with blast-radius preview.
- Rate limits and circuit breakers on automated actions; automatic halt on anomaly.
- Tamper-evident audit store; separation of duties between proposer and approver.
- Full rollback automation with verification.

## Real integration requirements (before any real automation)

Signed change-management approval; environment isolation; tested rollback; on-call escalation paths;
observability of the automation itself; and a documented risk assessment per runbook.
