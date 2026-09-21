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
import { DEMO_INCIDENT_ID, DEMO_METRIC_PREFIX } from "@/lib/app-config";

function revalidateAll(incidentId: string) {
  revalidatePath("/");
  revalidatePath("/incidents");
  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/automations");
  revalidatePath("/audit");
  revalidatePath("/capacity");
  revalidatePath("/services");
  revalidatePath("/demo");
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
