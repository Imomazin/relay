"use server";

/**
 * Server Actions for the live, simulated automation flow.
 *
 * SAFETY: every action here mutates only Relay's own demonstration database
 * rows. Nothing touches real infrastructure, Neon, Vercel or external systems.
 * See docs/automation-safety.md.
 */
import { revalidatePath } from "next/cache";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { DEMO_INCIDENT_ID, DEMO_METRIC_PREFIX, SIM_PREFIX } from "@/lib/app-config";
import { buildScenario, type ScenarioServiceContext } from "@/lib/engines/scenario";
import type { RunbookCandidate } from "@/lib/engines/runbook";
import { EVENT_SOURCE_LABEL, type EventSource, type NormalisedCategory } from "@/lib/domain";

function revalidateAll(incidentId: string) {
  for (const p of ["/", "/incidents", `/incidents/${incidentId}`, "/queue", "/escalations", "/workflow", "/automations", "/audit", "/capacity", "/services", "/demo"]) {
    revalidatePath(p);
  }
}

async function addAudit(rows: (typeof schema.auditEvents.$inferInsert)[]) {
  if (rows.length) await db.insert(schema.auditEvents).values(rows);
}

const auditId = () => `AUD-act-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/**
 * Approve and execute the pending automation on an incident. Simulates the
 * remediation succeeding: service health recovers and the incident moves to
 * Monitoring. Records the full approval + execution audit trail.
 */
export async function executeAutomation(incidentId: string) {
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Incident not found." };

  const [automation] = await db
    .select()
    .from(schema.automationExecutions)
    .where(and(eq(schema.automationExecutions.incidentId, incidentId), inArray(schema.automationExecutions.status, ["proposed", "awaiting_approval"])))
    .limit(1);
  if (!automation) return { ok: false, message: "No automation awaiting approval on this incident." };

  const [service] = await db.select().from(schema.services).where(eq(schema.services.id, incident.serviceId)).limit(1);
  const healthBefore = automation.healthBefore ?? service?.healthScore ?? 60;
  const healthAfter = Math.min(98, Math.max(healthBefore + 30, 92));
  const now = new Date();

  await db
    .update(schema.automationExecutions)
    .set({ status: "succeeded", startedAt: now, completedAt: new Date(now.getTime() + 3000), outcome: "Simulated remediation succeeded; service health recovered.", healthBefore, healthAfter })
    .where(eq(schema.automationExecutions.id, automation.id));

  await db
    .update(schema.approvals)
    .set({ status: "granted", approver: "Incident Manager (demo operator)", decidedAt: now })
    .where(eq(schema.approvals.automationId, automation.id));

  if (service) {
    await db.update(schema.services).set({ healthScore: healthAfter, status: "healthy" }).where(eq(schema.services.id, service.id));
    await db.insert(schema.serviceMetrics).values({
      id: `${DEMO_METRIC_PREFIX}${service.slug}-${now.getTime()}`,
      serviceId: service.id,
      capturedAt: now,
      healthScore: healthAfter,
      latencyMs: 120,
      errorRate: 0.4,
      throughput: 1800,
      saturation: 42,
    });
  }

  await db.update(schema.incidents).set({ status: "monitoring", acknowledgedAt: incident.acknowledgedAt ?? now }).where(eq(schema.incidents.id, incidentId));

  // Bump runbook execution count.
  const [rb] = await db.select().from(schema.runbooks).where(eq(schema.runbooks.id, automation.runbookId)).limit(1);
  if (rb) {
    await db.update(schema.runbooks).set({ executionCount: rb.executionCount + 1, lastExecutedAt: now }).where(eq(schema.runbooks.id, rb.id));
  }

  await addAudit([
    { id: auditId(), at: now, action: "approval_granted", actor: "Incident Manager (demo operator)", summary: `Approval granted for ${rb?.name ?? "runbook"}`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: automation.runbookId, detail: {} },
    { id: auditId(), at: new Date(now.getTime() + 1000), action: "automation_executed", actor: "engine:automation", summary: `Executing ${rb?.name ?? "runbook"} (simulated)`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: automation.runbookId, detail: { healthBefore } },
    { id: auditId(), at: new Date(now.getTime() + 3000), action: "automation_outcome", actor: "engine:automation", summary: `Simulated remediation succeeded; health ${healthBefore} → ${healthAfter}`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: automation.runbookId, detail: { healthAfter } },
    { id: auditId(), at: new Date(now.getTime() + 3500), action: "incident_status_changed", actor: "engine:automation", summary: `Incident moved to Monitoring`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: { from: incident.status, to: "monitoring" } },
  ]);

  revalidateAll(incidentId);
  return { ok: true, message: "Automation approved and executed. Service recovering; incident is now Monitoring." };
}

/** Resolve a monitoring incident. */
export async function resolveIncident(incidentId: string) {
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Incident not found." };
  const now = new Date();
  await db.update(schema.incidents).set({ status: "resolved", resolvedAt: now }).where(eq(schema.incidents.id, incidentId));
  await addAudit([
    { id: auditId(), at: now, action: "incident_status_changed", actor: "Incident Manager (demo operator)", summary: "Incident moved to Resolved", incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: { from: incident.status, to: "resolved" } },
    { id: auditId(), at: new Date(now.getTime() + 500), action: "incident_resolved", actor: "Incident Manager (demo operator)", summary: `Incident ${incidentId} resolved`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: {} },
  ]);
  revalidateAll(incidentId);
  return { ok: true, message: "Incident resolved." };
}

/**
 * Reset the featured demo incident back to its "awaiting approval" starting
 * point so the automation journey can be replayed. Only touches the demo
 * incident's own rows.
 */
export async function resetDemo() {
  const incidentId = DEMO_INCIDENT_ID;
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Demo incident not found (seed the database first)." };

  await db.update(schema.incidents).set({ status: "awaiting_approval", resolvedAt: null }).where(eq(schema.incidents.id, incidentId));

  const [automation] = await db.select().from(schema.automationExecutions).where(eq(schema.automationExecutions.incidentId, incidentId)).limit(1);
  if (automation) {
    await db.update(schema.automationExecutions).set({ status: "awaiting_approval", startedAt: null, completedAt: null, outcome: null, healthAfter: null }).where(eq(schema.automationExecutions.id, automation.id));
    await db.update(schema.approvals).set({ status: "pending", approver: null, decidedAt: null }).where(eq(schema.approvals.automationId, automation.id));
  }

  await db.update(schema.services).set({ healthScore: 62, status: "impaired" }).where(eq(schema.services.id, incident.serviceId));

  // Remove post-approval audit + demo metric rows.
  await db.delete(schema.auditEvents).where(and(eq(schema.auditEvents.incidentId, incidentId), inArray(schema.auditEvents.action, ["approval_granted", "automation_executed", "automation_outcome", "incident_status_changed", "incident_resolved"])));
  await db.delete(schema.serviceMetrics).where(like(schema.serviceMetrics.id, `${DEMO_METRIC_PREFIX}%`));

  revalidateAll(incidentId);
  return { ok: true, message: "Demo reset. The Payments incident is awaiting approval again." };
}

// --- Live event-replay injection --------------------------------------------

/** Curated multi-signal scenarios the presenter can inject on demand. */
const REPLAY_SCENARIOS: { serviceId: string; category: NormalisedCategory; sources: EventSource[]; severities: string[] }[] = [
  { serviceId: "svc-payments", category: "saturation", sources: ["cloudwatch", "app_telemetry", "jira_service_desk"], severities: ["alarm", "error", "high"] },
  { serviceId: "svc-citizen-portal", category: "availability", sources: ["cloudwatch", "app_telemetry", "jira_service_desk"], severities: ["alarm", "error", "high"] },
  { serviceId: "svc-identity", category: "authentication", sources: ["app_telemetry", "jira_service_desk", "cloudwatch"], severities: ["error", "high", "alarm"] },
  { serviceId: "svc-api-gateway", category: "latency", sources: ["cloudwatch", "app_telemetry"], severities: ["alarm", "error"] },
  { serviceId: "svc-document", category: "error_rate", sources: ["app_telemetry", "jira_service_desk"], severities: ["error", "medium"] },
];

/**
 * Inject a brand-new incident live by running fresh synthetic signals through
 * the real pipeline (normalise → correlate → triage → recommend). Demonstrates
 * event ingestion and incident generation in real time. All injected rows carry
 * the INC-SIM- prefix and can be cleared with `clearSimulated()`.
 */
export async function injectScenario(index?: number) {
  const scenario = REPLAY_SCENARIOS[(index ?? Math.floor(Math.random() * REPLAY_SCENARIOS.length)) % REPLAY_SCENARIOS.length];

  const [service] = await db.select().from(schema.services).where(eq(schema.services.id, scenario.serviceId)).limit(1);
  if (!service) return { ok: false, message: "Target service not found (seed the database first)." };

  const [allDeps, runbooks] = await Promise.all([
    db.select().from(schema.serviceDependencies),
    db.select().from(schema.runbooks),
  ]);
  const dependencyIds = allDeps.filter((d) => d.serviceId === service.id).map((d) => d.dependsOnId);
  const dependentIds = allDeps.filter((d) => d.dependsOnId === service.id).map((d) => d.serviceId);

  const candidates: RunbookCandidate[] = runbooks.map((r) => ({
    id: r.id, name: r.name, category: r.category as NormalisedCategory, risk: r.risk as RunbookCandidate["risk"],
    approvalRequired: r.approvalRequired, applicableCriticalities: r.applicableCriticalities as string[], syntheticSuccessRate: r.syntheticSuccessRate,
  }));

  const ctx: ScenarioServiceContext = {
    id: service.id, name: service.name, slug: service.slug, criticality: service.criticality as ScenarioServiceContext["criticality"],
    ownerTeam: service.ownerTeam, ownerName: service.ownerName, monthlyActiveUsers: service.monthlyActiveUsers || 50000,
    downstreamCount: dependentIds.length, dependencyIds, dependentIds,
  };

  const now = new Date();
  const result = buildScenario({ service: ctx, category: scenario.category, sources: scenario.sources, severities: scenario.severities, now }, candidates);

  const incidentId = `${SIM_PREFIX}${now.getTime().toString(36).toUpperCase()}`;
  const rbDef = result.recommendation.runbookId ? runbooks.find((r) => r.id === result.recommendation.runbookId) : null;

  await db.insert(schema.incidents).values({
    id: incidentId,
    title: `[LIVE] ${service.name} ${result.category} incident`,
    summary: `Injected via event replay: ${scenario.sources.map((s) => EVENT_SOURCE_LABEL[s]).join(", ")} signals correlated on ${service.name}.`,
    severity: result.triage.severity,
    status: result.recommendation.runbookId ? "awaiting_approval" : "triaged",
    serviceId: service.id,
    affectedServiceIds: result.affectedServiceIds,
    affectedUsersEstimate: result.triage.estimatedUserImpact,
    category: result.category,
    urgency: result.triage.urgency,
    serviceImpact: result.triage.serviceImpact,
    likelyCause: "Live-injected scenario — see correlated events and triage rationale.",
    confidence: result.triage.confidence,
    correlationConfidence: result.confidence,
    correlationReason: result.reason,
    recommendedRunbookId: result.recommendation.runbookId,
    recommendedAction: result.recommendation.action,
    ownerTeam: service.ownerTeam,
    ownerName: service.ownerName,
    isMultiSystem: result.isMultiSystem,
    detectedAt: result.windowStart,
    acknowledgedAt: now,
    resolvedAt: null,
    windowStart: result.windowStart,
    windowEnd: result.windowEnd,
    createdAt: result.windowStart,
  });

  // Correlated events.
  const eventRows = result.normalised.map((n, i) => ({
    id: `EVT-SIM-${now.getTime().toString(36)}-${i}`,
    source: n.source, externalRef: n.externalRef, serviceId: n.serviceId, eventType: n.eventType, severity: n.severity,
    occurredAt: n.occurredAt, message: n.message, entity: n.entity, metric: n.metric, metricValue: n.metricValue,
    metricUnit: n.metricUnit, correlationKey: n.correlationKey, normalisedCategory: n.normalisedCategory,
    rawMetadata: n.rawMetadata, incidentId, createdAt: n.occurredAt,
  }));
  await db.insert(schema.events).values(eventRows);

  await db.insert(schema.triageDecisions).values({
    id: `${incidentId}-triage`, incidentId, severity: result.triage.severity, urgency: result.triage.urgency,
    serviceImpact: result.triage.serviceImpact, estimatedUserImpact: result.triage.estimatedUserImpact, category: result.category,
    recommendedOwner: result.triage.recommendedOwner, recommendedRunbookId: result.recommendation.runbookId,
    confidence: result.triage.confidence, approvalRequired: result.triage.approvalRequired, rationale: result.triage.rationale, createdAt: now,
  });

  if (rbDef) {
    const automationId = `${incidentId}-auto-1`;
    await db.insert(schema.automationExecutions).values({
      id: automationId, incidentId, runbookId: rbDef.id, status: "awaiting_approval", risk: rbDef.risk,
      reason: result.recommendation.reason, expectedResult: rbDef.expectedOutcome, approvalRequired: result.recommendation.approvalRequired,
      requestedBy: "engine:runbook", outcome: null, healthBefore: service.healthScore, healthAfter: null,
      proposedAt: now, startedAt: null, completedAt: null,
    });
    await db.insert(schema.approvals).values({
      id: `${incidentId}-appr-1`, incidentId, automationId, status: result.recommendation.approvalRequired ? "pending" : "not_required",
      riskLevel: rbDef.risk, evidence: `${result.normalised.length} correlated signals; ${result.reason}`, expectedResult: rbDef.expectedOutcome,
      requestedBy: "engine:runbook", approver: null, requestedAt: now, decidedAt: null,
    });
  }

  await addAudit([
    { id: auditId(), at: result.normalised[0].occurredAt, action: "event_received", actor: `adapter:${EVENT_SOURCE_LABEL[result.normalised[0].source]}`, summary: `Live event received for ${service.name}`, incidentId, serviceId: service.id, eventId: eventRows[0].id, runbookId: null, detail: {} },
    { id: auditId(), at: result.windowEnd, action: "event_correlated", actor: "engine:correlation", summary: `${result.normalised.length} live events correlated (${result.confidence}% confidence)`, incidentId, serviceId: service.id, eventId: null, runbookId: null, detail: { reason: result.reason } },
    { id: auditId(), at: now, action: "incident_created", actor: "engine:correlation", summary: `Incident ${incidentId} created for ${service.name}`, incidentId, serviceId: service.id, eventId: null, runbookId: null, detail: { severity: result.triage.severity } },
    { id: auditId(), at: now, action: "triage_performed", actor: "engine:triage", summary: `Triaged as ${result.triage.severity} / ${result.triage.urgency}`, incidentId, serviceId: service.id, eventId: null, runbookId: null, detail: {} },
    ...(rbDef ? [{ id: auditId(), at: now, action: "runbook_proposed", actor: "engine:runbook", summary: `Recommended runbook: ${rbDef.name}`, incidentId, serviceId: service.id, eventId: null, runbookId: rbDef.id, detail: {} }] : []),
  ]);

  revalidateAll(incidentId);
  return { ok: true, incidentId, message: `Live incident ${incidentId} generated on ${service.name} from ${result.normalised.length} correlated signals.` };
}

/** Remove all live-injected (INC-SIM-) incidents and their rows. */
export async function clearSimulated() {
  await db.delete(schema.auditEvents).where(like(schema.auditEvents.incidentId, `${SIM_PREFIX}%`));
  await db.delete(schema.notifications).where(like(schema.notifications.incidentId, `${SIM_PREFIX}%`));
  await db.delete(schema.events).where(like(schema.events.incidentId, `${SIM_PREFIX}%`));
  await db.delete(schema.incidents).where(like(schema.incidents.id, `${SIM_PREFIX}%`));
  revalidateAll(DEMO_INCIDENT_ID);
  return { ok: true, message: "Cleared all live-injected incidents." };
}

// --- Operator workflow actions ----------------------------------------------
// All mutate only Relay's own incident/audit rows.

const OPERATOR = "Operator (demo)";

/** Add a free-text investigation note to an incident's timeline. */
export async function addNote(incidentId: string, text: string) {
  const body = text.trim();
  if (!body) return { ok: false, message: "Note is empty." };
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Incident not found." };
  await addAudit([{ id: auditId(), at: new Date(), action: "note_added", actor: OPERATOR, summary: body, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: {} }]);
  revalidateAll(incidentId);
  return { ok: true, message: "Note added to the timeline." };
}

/** Reassign the incident owner. */
export async function assignOwner(incidentId: string, ownerTeam: string, ownerName: string) {
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Incident not found." };
  await db.update(schema.incidents).set({ ownerTeam, ownerName, status: incident.status === "detected" || incident.status === "triaged" ? "assigned" : incident.status }).where(eq(schema.incidents.id, incidentId));
  await addAudit([{ id: auditId(), at: new Date(), action: "owner_assigned", actor: OPERATOR, summary: `Reassigned to ${ownerTeam} (${ownerName})`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: {} }]);
  revalidateAll(incidentId);
  return { ok: true, message: `Assigned to ${ownerTeam}.` };
}

/** Change the incident priority/severity. */
export async function setPriority(incidentId: string, severity: string) {
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Incident not found." };
  const urgency = severity === "critical" ? "critical" : severity === "high" ? "high" : severity === "medium" ? "medium" : "low";
  await db.update(schema.incidents).set({ severity, urgency }).where(eq(schema.incidents.id, incidentId));
  await addAudit([{ id: auditId(), at: new Date(), action: "priority_changed", actor: OPERATOR, summary: `Priority changed ${incident.severity} → ${severity}`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: { from: incident.severity, to: severity } }]);
  revalidateAll(incidentId);
  return { ok: true, message: `Priority set to ${severity}.` };
}

/** Set an explicit incident status. */
export async function setStatus(incidentId: string, status: string) {
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Incident not found." };
  const now = new Date();
  const patch: Partial<typeof schema.incidents.$inferInsert> = { status };
  if (!incident.acknowledgedAt && status !== "detected") patch.acknowledgedAt = now;
  if (status === "resolved" || status === "closed") patch.resolvedAt = incident.resolvedAt ?? now;
  if (status !== "resolved" && status !== "closed") patch.resolvedAt = null;
  await db.update(schema.incidents).set(patch).where(eq(schema.incidents.id, incidentId));
  await addAudit([
    { id: auditId(), at: now, action: "incident_status_changed", actor: OPERATOR, summary: `Status ${incident.status} → ${status}`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: { from: incident.status, to: status } },
    ...(status === "resolved" ? [{ id: auditId(), at: new Date(now.getTime() + 500), action: "incident_resolved", actor: OPERATOR, summary: `Incident ${incidentId} resolved`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: {} }] : []),
  ]);
  revalidateAll(incidentId);
  return { ok: true, message: `Status set to ${status}.` };
}

/** Move the incident one stage forward through the workflow. */
export async function advanceStage(incidentId: string) {
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Incident not found." };
  const order = ["detected", "triaged", "assigned", "investigating", "remediating", "monitoring", "resolved", "closed"];
  const idx = order.indexOf(incident.status);
  if (idx < 0 || idx >= order.length - 1) return { ok: false, message: "Incident is already closed." };
  return setStatus(incidentId, order[idx + 1]);
}

/** Escalate: raise priority to at least high, mark escalated on the timeline. */
export async function escalate(incidentId: string, reason: string) {
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, incidentId)).limit(1);
  if (!incident) return { ok: false, message: "Incident not found." };
  const rank: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  const raised = rank[incident.severity] >= rank.high ? incident.severity : "high";
  await db.update(schema.incidents).set({ severity: raised, urgency: raised === "critical" ? "critical" : "high" }).where(eq(schema.incidents.id, incidentId));
  await addAudit([{ id: auditId(), at: new Date(), action: "escalated", actor: OPERATOR, summary: `Escalated — ${reason.trim() || "operator escalation"}`, incidentId, serviceId: incident.serviceId, eventId: null, runbookId: null, detail: { reason } }]);
  revalidateAll(incidentId);
  return { ok: true, message: "Incident escalated." };
}
