# Relay — Integration Architecture

Relay works **alongside** existing monitoring and service-management platforms via a common adapter
interface. In this demonstrator every connector is **simulated** — no real credentials, no live data.

## Adapter interface

Every source implements the same conceptual contract:

```
ingest(rawPayload)  →  RawEvent            // source-native shape
normalise(RawEvent) →  NormalisedEvent     // Relay's canonical model
```

`RawEvent` and `NormalisedEvent` are defined in `src/lib/engines/normalisation.ts`. A real adapter
adds authentication, delivery (webhook or poll), retry and rate handling around this contract; the
normalisation and downstream correlation/triage are **source-agnostic**.

## Event flow

```
Source system → adapter (auth, ingest) → RawEvent
  → normalise() → NormalisedEvent (severity, category, correlation_key)
  → correlation engine → incident
  → triage → runbook recommendation → approval → automation → audit
```

## Connectors (all simulated here)

| Connector | Purpose | Data expected | Authentication concept | Data flow |
| --- | --- | --- | --- | --- |
| AWS CloudWatch | Infra/app metrics, alarms | Alarm state changes, metric datapoints | IAM role assumption, scoped read-only policy; no keys stored in Relay | CloudWatch → EventBridge → ingest webhook → normalise |
| Jira Service Desk | Correlate tickets with signals | Ticket created/updated, priority, affected service | OAuth 2.0 (3LO), read scope on service-desk projects | Jira automation webhook → adapter → normalise |
| Exabeam | UEBA security signals | Risk score changes, anomalous sessions | API token via secrets manager, least-privilege read | Exabeam alert API → poller → normalise |
| CrowdStrike | EDR detections | Detection summaries, severity, host, tactic/technique | OAuth2 client credentials, `detections:read` scope | Falcon Streaming API → adapter → normalise |
| Application Telemetry | RED metrics, health, SLOs | Rate/errors/duration, health checks | mTLS between collectors and Relay OTLP endpoint | Service OTLP exporter → collector → normalise |

Statuses shown in the Integration Centre: **Demo Adapter**, **Ready for Configuration**,
**Not Connected**.

## Security

- No credentials are stored in Relay in the demonstrator; production adapters would use a secrets
  manager and short-lived, least-privilege credentials (IAM roles, OAuth scopes, mTLS).
- Inbound webhooks would be signature-verified; outbound polls would use scoped read-only tokens.
- All connector configuration and secrets are out of scope of this public repository.

## Rate handling & error handling (production concept)

- **Rate handling:** per-source token buckets; backpressure into a durable ingest queue; batch
  normalisation.
- **Error handling:** dead-letter queue for un-normalisable payloads; idempotent ingestion keyed on
  the source's external reference; circuit breakers per connector; retries with exponential backoff.

## Future real connectors

Live EventBridge subscription and metric backfill (CloudWatch); bi-directional Jira sync (raise/attach
work items from Relay incidents); streaming Exabeam/CrowdStrike ingestion with incident enrichment;
trace-linked root-cause hints and SLO burn-rate incident creation (telemetry).
