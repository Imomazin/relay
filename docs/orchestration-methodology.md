# Relay — Orchestration Methodology

Relay's correlation, triage and runbook recommendation are **deterministic and transparent**. No
external AI is used. Every recommendation can be explained from its inputs. This document records the
rules and their limitations.

## 1. Normalisation (`src/lib/engines/normalisation.ts`)

Each source adapter maps its native payload onto one normalised event:

- **Severity** is mapped from the source's own vocabulary (`P1`, `ALARM`, `warning`, …) onto Relay's
  five-level scale (critical/high/medium/low/info); if absent, keyword inspection of the message is
  used as a fallback.
- **Normalised category** is derived from keywords + source: latency, error_rate, saturation,
  availability, security, capacity, dependency, authentication.
- **Correlation key** = `service:category` — a stable signal fingerprint.

## 2. Correlation (`src/lib/engines/correlation.ts`)

Events are grouped **by affected service within a time window** (default 30 minutes). Grouping by
service — rather than by exact signal — lets different signal types on the same service collapse into
one incident (e.g. a latency alarm + an HTTP 500 spike + citizen tickets → one incident).

Confidence is the sum of weighted factors, capped at 99%:

| Factor | Weight |
| --- | --- |
| Same service | 30 |
| Shared correlation key (repeating fingerprint) | 25 |
| Time proximity (scaled within window) | up to 15 |
| Similar error category | 12 |
| Shared infrastructure dependency (across services) | 10 |
| Corroborating sources (multiple systems) | 8 |

Each cluster reports its factors and a human-readable reason. A gap longer than the window starts a
new incident (a later recurrence is a new incident, not the same one).

## 3. Triage (`src/lib/engines/triage.ts`)

Severity starts from the peak event severity, then escalates:

- **+1** for a tier-1 (mission-critical) service.
- **+1** when the blast radius reaches 4+ services.
- **+1** when 3+ independent monitoring sources corroborate.
- **+1** for security-sensitive categories (security/authentication).

**Estimated user impact** is a bounded function of the service's monthly active users × a
severity factor × a category factor, amplified slightly for multi-service incidents. It is an
estimate, not a measurement.

**Approval requirement** — human approval is required when the incident is high/critical, the service
is tier-1, or the category is security/authentication.

## 4. Runbook recommendation (`src/lib/engines/runbook.ts`)

The triaged category maps to the best-fit runbook, ranked by: exact category match (+50),
service-criticality applicability (+20), synthetic success rate (×0.2), and a preference for
lower-risk runbooks. If no category-appropriate runbook exists, Relay recommends collecting
diagnostics and escalating to a human (a safe default). High-risk runbooks and high/critical
incidents always require approval.

## 5. Capacity model (`src/lib/engines/capacity.ts`)

An illustrative resource model estimates service-management effort:

- baseline = every incident handled fully manually;
- automated incidents still cost human-review minutes (human-in-the-loop);
- escalated incidents always cost full manual handling.

It reports estimated manual/automated workload hours, hours potentially avoided, and capacity
utilisation — all **illustrative**, with assumptions printed alongside the numbers.

## Limitations

- Rules are heuristic and tuned for a clear demonstration, not production accuracy.
- All data is synthetic; correlation windows and weights would need calibration against real
  telemetry.
- User-impact and capacity figures are illustrative models with stated assumptions.
- Relay presents these as **decision support**, never as autonomous authority.

## Future AI extension points (documented, not required)

Incident summarisation · root-cause hypothesis generation · knowledge retrieval · event
classification · runbook recommendation ranking. See [`responsible-ai.md`](responsible-ai.md).
