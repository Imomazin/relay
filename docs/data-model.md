# Relay — Data Model

PostgreSQL (Neon) via Drizzle ORM. Schema: `src/db/schema.ts`. Text primary keys are used for
human-meaningful, shareable identifiers (e.g. `INC-1001`, `svc-payments`, `rb-scale-worker`).

## Entities

| Table | Purpose | Key fields |
| --- | --- | --- |
| `services` | Service catalogue | id, name, criticality, status, health_score, sla_*, monthly_active_users, tags |
| `service_dependencies` | Dependency graph edges | service_id → depends_on_id, kind (hard/soft) |
| `integrations` | Source adapters | kind, status (demo_adapter/ready/not_connected), auth_concept, data_flow |
| `events` | Normalised events | source, severity, occurred_at, normalised_category, correlation_key, incident_id |
| `incidents` | Correlated incidents | severity, status, service_id, affected_service_ids, confidence, correlation_*, recommended_runbook_id |
| `incident_events` | Incident↔event join | incident_id, event_id, correlation_reason, is_seed |
| `triage_decisions` | Triage output | severity, urgency, estimated_user_impact, approval_required, rationale |
| `runbooks` | Simulated runbooks | risk, category, approval_required, synthetic_success_rate, execution_count |
| `runbook_steps` | Ordered steps | ordinal, title, simulated_action |
| `automation_executions` | Automation runs | status, risk, health_before/after, proposed/started/completed_at |
| `approvals` | Human approvals | status, risk_level, evidence, approver, requested/decided_at |
| `audit_events` | Immutable-style audit trail | action, actor, summary, incident/service/event/runbook refs |
| `service_metrics` | Time-series health | captured_at, health_score, latency_ms, error_rate, throughput, saturation |
| `capacity_forecasts` | Weekly actuals + forecast | is_forecast, event/incident counts, workload hours, automation_rate |
| `resource_scenarios` | Illustrative resource model inputs | manual_handling_mins, automated_handling_pct, human_review_mins, escalation_pct |
| `notifications` | Operator notifications | severity, incident_id, read |

## Relationships

- A **service** has many dependencies (`service_dependencies`), events, incidents and metrics.
- An **incident** belongs to one primary service, lists `affected_service_ids` (blast radius), and
  aggregates many events (via `events.incident_id` and the `incident_events` join).
- An **incident** has one triage decision, zero-or-more automation executions, and zero-or-more
  approvals.
- A **runbook** has ordered steps and is referenced by incidents and automation executions.
- **Audit events** reference incidents/services/events/runbooks by id for a complete trail.

## Enumerations (source of truth: `src/lib/domain.ts`)

- **Severity:** critical, high, medium, low, info
- **Service status:** healthy, degraded, impaired, down
- **Criticality:** tier1, tier2, tier3
- **Incident status:** detected → triaged → assigned → investigating → action_proposed →
  awaiting_approval → remediating → monitoring → resolved → closed
- **Event source:** cloudwatch, jira_service_desk, exabeam, crowdstrike, app_telemetry
- **Normalised category:** latency, error_rate, saturation, availability, security, capacity,
  dependency, authentication
- **Integration status:** demo_adapter, ready_for_configuration, not_connected
- **Risk:** low, medium, high
- **Approval status:** not_required, pending, granted, rejected
- **Automation status:** proposed, awaiting_approval, running, succeeded, failed, rolled_back
- **Audit action:** event_received, event_correlated, incident_created, triage_performed,
  owner_assigned, runbook_proposed, approval_requested, approval_granted, approval_rejected,
  automation_executed, automation_outcome, incident_status_changed, incident_resolved

## Indexes

Indexes exist on the hot query paths: event `service_id`/`source`/`severity`/`occurred_at`/
`incident_id`/`correlation_key`, incident `status`/`service_id`/`severity`, audit `at`/`incident_id`/
`action`, service-metric `(service_id, captured_at)`, and the dependency edges.

## Seeded volumes (deterministic)

12 services · 21 dependencies · 5 integrations · 10 runbooks · 22 incidents (14 multi-system) ·
176 events (66 correlated) · 18 automations · 18 approvals · 229 audit events · 348 metrics ·
16 capacity rows · 3 resource scenarios.
