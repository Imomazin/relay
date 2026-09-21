# Relay — Demo Script (6–8 minutes)

**Audience:** service owners, operations leaders, technical directors, incident managers.
**Goal:** show the full loop — correlation → triage → service impact → human-approved safe
automation → recovery → audit → capacity impact.

**Before you start:** open `/demo` and, if the featured incident is not *Awaiting Approval*, click
**Reset demo**. This stages `INC-1001` (Payments) ready to approve live.

---

## Click path & speaking points

**1. Command Centre (`/`)** — ~45s
> "This is Relay's operational picture across every service. Service health, open incidents,
> critical/high counts, events ingested in the last hour, automation rate, MTTA/MTTR and SLA risk —
> all from live database state, not a static mock."

Point at the KPI grid and the priority-incidents table.

**2. Services (`/services`)** — ~30s
> "Relay knows the service catalogue: ownership, criticality, SLA, live health. Open a service to see
> its dependency graph — which services it depends on and which depend on it."

Open **Payments Service** and show dependencies + health trend.

**3. Events (`/events`)** — ~45s
> "Every source — CloudWatch, application telemetry, Jira-style tickets, Exabeam, CrowdStrike — is
> normalised into one event model. Filter by source or severity; pause the live feed to inspect."

Filter to **Payments** / severity **critical**.

**4. Open the incident (`/incidents/INC-1001`)** — ~90s
> "Relay correlated three signals into ONE incident: a CloudWatch latency alarm, an application HTTP
> 500 spike, and citizen-reported failed transactions. Not three tickets — one problem."

Walk through, in order:
- **Correlation reason & confidence** — why these events are one incident.
- **Affected services (blast radius)** — Payments plus downstream.
- **Triage** — severity, estimated users impacted, and *why approval is required*.
- **Recommended runbook** — *Scale Simulated Worker Pool*, its steps, expected outcome, rollback.

**5. Approve the automation** — ~60s
> "High-impact action on a tier-1 service, so a human must approve. I'll review the evidence and
> expected result, then approve."

Click **Approve & execute (simulated)**.
> "Relay executes the simulated remediation: service health recovers, the incident moves to
> Monitoring, and every step is written to the audit trail. Nothing real is touched — this is a
> demonstration service."

**6. Show the audit trail** — ~30s
> "Approval requested, approval granted, automation executed, outcome recorded, status changed —
> a complete, accountable record."

**7. Resolve** — ~15s
Click **Mark resolved**. Show the incident close out.

**8. Capacity (`/capacity`)** — ~60s
> "Now the strategic view: support workload over time with a forecast, manual vs automated handling,
> and an illustrative resource model. Under our stated assumptions, supervised automation absorbs a
> large share of the effort — so service management scales with complexity, not headcount. These are
> illustrative figures on synthetic data, not guaranteed savings."

**9. Integrations & Methodology (optional, ~30s)**
> "Relay works alongside existing platforms via adapters — here simulated. And every decision is
> explainable: the Methodology page documents exactly how correlation, triage and runbooks work."

**10. Reset for the next run**
Back to `/demo` → **Reset demo**.

---

## Timing summary

| Segment | Target |
| --- | --- |
| Command Centre + Services + Events | ~2:00 |
| Incident correlation + triage + runbook | ~1:30 |
| Approve + execute + recovery | ~1:00 |
| Audit + resolve | ~0:45 |
| Capacity impact | ~1:00 |
| Integrations/Methodology + reset | ~1:00 |
| **Total** | **~7:15** |

## Fallback

If the live approve action can't be run, `INC-1003` (API Gateway) and other *monitoring/resolved*
incidents show the **completed** journey (health 62 → 95, granted approval, full audit trail) for a
narrated walkthrough.
