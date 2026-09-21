# Relay — Responsible AI

## Core stance

Relay's product **does not require any external LLM or paid AI API**. Correlation, triage and runbook
recommendation use transparent, deterministic, unit-tested logic. The application works fully without
OpenAI, Anthropic, Gemini or any other paid AI service.

This is a deliberate design choice for a public-sector demonstrator: decisions must be explainable,
reproducible and auditable, and the system must not depend on an external model to function.

## Why deterministic first

- **Explainability:** every correlation reports its factors and confidence; every triage decision
  reports its rationale. An operator can always answer "why did Relay do that?".
- **Reproducibility:** the same inputs always produce the same outputs (fixed logic, fixed seed).
- **Auditability:** the full decision chain is recorded in the audit trail.
- **No data egress:** synthetic telemetry never leaves the system to a third-party model.

## Future AI extension points (documented, optional, additive)

If AI is added later, it augments — never silently replaces — the deterministic core, and remains
decision-support with human oversight:

| Extension point | Role | Guardrail |
| --- | --- | --- |
| Incident summarisation | Human-readable summary of a correlated incident | Summary is advisory; underlying events remain the source of truth |
| Root-cause hypothesis | Ranked candidate causes with evidence links | Presented as hypotheses, not conclusions; human confirms |
| Knowledge retrieval | Surface relevant past incidents / runbooks | Retrieval only; no autonomous action |
| Event classification | Assist normalisation for novel/ambiguous events | Falls back to deterministic rules; confidence surfaced |
| Runbook recommendation ranking | Re-rank candidate runbooks | Approval gates unchanged; high-risk still needs a human |

## Principles for any added AI

- **Human-in-the-loop for anything mutating.** AI never approves or executes automation on its own.
- **Transparency.** Any AI-produced text is labelled as such; a model card documents its purpose,
  data and limitations.
- **Data minimisation & residency.** Prefer models that keep public-sector data in-region; avoid
  sending sensitive telemetry to third parties.
- **Bias & error awareness.** AI outputs are advisory, bounded, and always reversible by a human.
- **Graceful degradation.** If an AI component is unavailable, Relay continues on deterministic logic.

## Current status

No AI is used in this demonstrator. This document exists so that a future Accelerator phase can add AI
responsibly, with the guardrails above already agreed.
