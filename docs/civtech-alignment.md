# CivTech 12.2 — Alignment

**Challenge (as published by CivTech):** *"How can technology enable fast-growing digital public
service providers to dynamically scale their service-management capabilities?"*

**Sponsor:** Scottish Government — Directorate for Digital.
**Partnership context:** Ambidexters Ltd × The DataKirk SCIO.

> This document maps the **public** challenge framing to Relay's demonstrated capabilities. It does
> not invent or paraphrase confidential Scottish Government requirements, and it does not expose
> confidential partnership information. Where a requirement is inferred from the public challenge
> text, it is described as an interpretation.

## Requirement → capability map

| Challenge theme (public framing) | Relay capability | Workflow demonstrated | Integration relevance | Prototype status | Limitation | Future Accelerator work |
| --- | --- | --- | --- | --- | --- | --- |
| Scale service management without linear headcount growth | Orchestration layer that correlates, triages and automates | Command Centre KPIs, capacity model | Sits alongside Jira/ITSM | **Demonstrated** | Illustrative capacity model | Calibrate against real workload data |
| Reduce noise / alert fatigue | Event normalisation + correlation | Events → correlated incident | CloudWatch, telemetry, Jira | **Demonstrated** | Heuristic weights | Tune windows/weights on real telemetry |
| Faster, consistent triage | Deterministic triage engine | Incident Workspace triage panel | — | **Demonstrated** | Rules, not ML | Optional ML-assisted triage |
| Reduce mean time to acknowledge/resolve | MTTA/MTTR, routing, runbooks | Command Centre, Incident Workspace | ITSM routing | **Demonstrated** | Synthetic timings | Live SLO integration |
| Safe automation with human oversight | Human-in-the-loop approvals + simulated runbooks | Approve & execute on `INC-1001` | — | **Demonstrated** | Simulation only | Real, guarded connectors |
| Work alongside existing platforms | Adapter architecture | Integration Centre | Jira, CloudWatch, Exabeam, CrowdStrike | **Demonstrated (simulated)** | No live connections | Build production adapters |
| Security signal handling | Security/auth categories, escalation runbooks | `INC-1010` credential-access | Exabeam, CrowdStrike | **Demonstrated (simulated)** | No real detections | UEBA/EDR enrichment |
| Capacity planning / forecasting | Capacity intelligence + resource model | Capacity view | — | **Demonstrated** | Illustrative assumptions | Forecasting on real history |
| Auditability / accountability | Full audit trail | Audit view + per-incident trail | — | **Demonstrated** | Synthetic records | Tamper-evident audit store |
| Transparency of automated decisions | Explainable correlation/triage; Methodology page | Methodology, confidence + factors | — | **Demonstrated** | — | Model cards for any AI added |

## Referenced official systems

The challenge references systems including **Jira Service Desk, AWS CloudWatch, Exabeam and
CrowdStrike**. Relay accounts for these **architecturally** through a common adapter interface and
presents them as **simulated** connectors (see [`integration-architecture.md`](integration-architecture.md)).
Relay does **not** claim any real connection to these systems.

## What Relay deliberately does *not* claim

- It does not replace Jira, CloudWatch, Exabeam, CrowdStrike or any ITSM platform.
- It does not connect to real Scottish Government systems or data.
- It does not imply endorsement by the Scottish Government or CivTech.

## Alignment gaps (honest assessment)

- Correlation/triage weights are demonstrator defaults, not validated against real public-sector
  telemetry.
- Capacity and user-impact figures are illustrative models with stated assumptions.
- Real connector authentication, rate limiting and error handling are described conceptually, not
  implemented against live APIs.
