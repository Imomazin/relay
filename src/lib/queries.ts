/**
 * Server-side data access for Relay. Every exported function runs on the
 * server (Server Components / Route Handlers), reads from Neon via Drizzle, and
 * calls `ensureSeeded()` so the demonstrator is self-provisioning.
 */
import "server-only";
import { and, asc, desc, eq, gte, inArray, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ensureSeeded } from "@/db/ready";
import * as schema from "@/db/schema";
import {
  OPEN_INCIDENT_STATUSES,
  SEVERITY_RANK,
  WORKFLOW_STAGES,
  statusToStage,
  type Severity,
  type IncidentStatus,
  type NormalisedCategory,
  type WorkflowStage,
} from "@/lib/domain";
import { computeMtt, automationRate } from "@/lib/engines/capacity";
import { DEMO_INCIDENT_ID } from "@/lib/app-config";

async function ready() {
  await ensureSeeded();
}

// --- Services ----------------------------------------------------------------
export async function getServices() {
  await ready();
  return db.select().from(schema.services).orderBy(asc(schema.services.name));
}

export async function getServiceBySlug(slug: string) {
  await ready();
  const [service] = await db
    .select()
    .from(schema.services)
    .where(eq(schema.services.slug, slug))
    .limit(1);
  if (!service) return null;

  const [deps, dependents, incidents, metrics, allServices] = await Promise.all([
    db.select().from(schema.serviceDependencies).where(eq(schema.serviceDependencies.serviceId, service.id)),
    db.select().from(schema.serviceDependencies).where(eq(schema.serviceDependencies.dependsOnId, service.id)),
    db.select().from(schema.incidents).where(eq(schema.incidents.serviceId, service.id)).orderBy(desc(schema.incidents.detectedAt)),
    db.select().from(schema.serviceMetrics).where(eq(schema.serviceMetrics.serviceId, service.id)).orderBy(asc(schema.serviceMetrics.capturedAt)),
    db.select().from(schema.services),
  ]);

  const nameById = new Map(allServices.map((s) => [s.id, s]));
  const runbooks = await getApplicableRunbooks(service.criticality);

  return { service, deps, dependents, incidents, metrics, nameById, runbooks };
}

export async function getServiceDependencyGraph() {
  await ready();
  const [services, deps] = await Promise.all([
    db.select().from(schema.services),
    db.select().from(schema.serviceDependencies),
  ]);
  return { services, deps };
}

// --- Events ------------------------------------------------------------------
export interface EventFilters {
  source?: string;
  severity?: string;
  serviceId?: string;
  search?: string;
  limit?: number;
}

export async function getEvents(filters: EventFilters = {}) {
  await ready();
  const conditions = [];
  if (filters.source) conditions.push(eq(schema.events.source, filters.source));
  if (filters.severity) conditions.push(eq(schema.events.severity, filters.severity));
  if (filters.serviceId) conditions.push(eq(schema.events.serviceId, filters.serviceId));
  if (filters.search) {
    conditions.push(sql`(${schema.events.message} ILIKE ${"%" + filters.search + "%"} OR ${schema.events.eventType} ILIKE ${"%" + filters.search + "%"} OR ${schema.events.externalRef} ILIKE ${"%" + filters.search + "%"})`);
  }

  const rows = await db
    .select()
    .from(schema.events)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.events.occurredAt))
    .limit(filters.limit ?? 200);

  const services = await db.select().from(schema.services);
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  return { rows, nameById };
}

export async function getEventById(id: string) {
  await ready();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  return event ?? null;
}

// --- Incidents ---------------------------------------------------------------
export async function getIncidents(filter?: { open?: boolean; status?: string; severity?: string }) {
  await ready();
  const conditions = [];
  if (filter?.open) conditions.push(inArray(schema.incidents.status, OPEN_INCIDENT_STATUSES));
  if (filter?.status) conditions.push(eq(schema.incidents.status, filter.status));
  if (filter?.severity) conditions.push(eq(schema.incidents.severity, filter.severity));

  const incidents = await db
    .select()
    .from(schema.incidents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.incidents.detectedAt));

  const services = await db.select().from(schema.services);
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  // Sort open first, then by severity, then recency.
  incidents.sort((a, b) => {
    const aOpen = OPEN_INCIDENT_STATUSES.includes(a.status as IncidentStatus) ? 1 : 0;
    const bOpen = OPEN_INCIDENT_STATUSES.includes(b.status as IncidentStatus) ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    const sev = SEVERITY_RANK[b.severity as Severity] - SEVERITY_RANK[a.severity as Severity];
    if (sev !== 0) return sev;
    return b.detectedAt.getTime() - a.detectedAt.getTime();
  });
  return { incidents, nameById };
}

export async function getIncidentById(id: string) {
  await ready();
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, id)).limit(1);
  if (!incident) return null;

  const [correlatedEvents, triage, automations, approvals, audit, allServices, allRunbooks] =
    await Promise.all([
      db.select().from(schema.events).where(eq(schema.events.incidentId, id)).orderBy(asc(schema.events.occurredAt)),
      db.select().from(schema.triageDecisions).where(eq(schema.triageDecisions.incidentId, id)).limit(1),
      db.select().from(schema.automationExecutions).where(eq(schema.automationExecutions.incidentId, id)).orderBy(asc(schema.automationExecutions.proposedAt)),
      db.select().from(schema.approvals).where(eq(schema.approvals.incidentId, id)).orderBy(asc(schema.approvals.requestedAt)),
      db.select().from(schema.auditEvents).where(eq(schema.auditEvents.incidentId, id)).orderBy(asc(schema.auditEvents.at)),
      db.select().from(schema.services),
      db.select().from(schema.runbooks),
    ]);

  const nameById = new Map(allServices.map((s) => [s.id, s]));
  const runbookById = new Map(allRunbooks.map((r) => [r.id, r]));
  const recommendedRunbook = incident.recommendedRunbookId
    ? runbookById.get(incident.recommendedRunbookId) ?? null
    : null;
  const runbookSteps = recommendedRunbook
    ? await db.select().from(schema.runbookSteps).where(eq(schema.runbookSteps.runbookId, recommendedRunbook.id)).orderBy(asc(schema.runbookSteps.ordinal))
    : [];

  // Dependencies of the primary service (for the blast-radius view).
  const deps = await db.select().from(schema.serviceDependencies).where(eq(schema.serviceDependencies.dependsOnId, incident.serviceId));

  return {
    incident,
    correlatedEvents,
    triage: triage[0] ?? null,
    automations,
    approvals,
    audit,
    nameById,
    recommendedRunbook,
    runbookSteps,
    dependents: deps,
  };
}

export async function getDemoIncident() {
  return getIncidentById(DEMO_INCIDENT_ID);
}

// --- Runbooks ----------------------------------------------------------------
export async function getRunbooks() {
  await ready();
  const runbooks = await db.select().from(schema.runbooks).orderBy(asc(schema.runbooks.name));
  const steps = await db.select().from(schema.runbookSteps).orderBy(asc(schema.runbookSteps.ordinal));
  const stepsByRunbook = new Map<string, typeof steps>();
  for (const s of steps) {
    const list = stepsByRunbook.get(s.runbookId) ?? [];
    list.push(s);
    stepsByRunbook.set(s.runbookId, list);
  }
  return { runbooks, stepsByRunbook };
}

async function getApplicableRunbooks(criticality: string) {
  const runbooks = await db.select().from(schema.runbooks);
  return runbooks.filter((r) => (r.applicableCriticalities as string[]).includes(criticality));
}

// --- Automations -------------------------------------------------------------
export async function getAutomations() {
  await ready();
  const [automations, incidents, runbooks, approvals] = await Promise.all([
    db.select().from(schema.automationExecutions).orderBy(desc(schema.automationExecutions.proposedAt)),
    db.select().from(schema.incidents),
    db.select().from(schema.runbooks),
    db.select().from(schema.approvals),
  ]);
  const incidentById = new Map(incidents.map((i) => [i.id, i]));
  const runbookById = new Map(runbooks.map((r) => [r.id, r]));
  const approvalByAutomation = new Map(approvals.map((a) => [a.automationId, a]));
  return { automations, incidentById, runbookById, approvalByAutomation };
}

// --- Integrations ------------------------------------------------------------
export async function getIntegrations() {
  await ready();
  const [integrations, events] = await Promise.all([
    db.select().from(schema.integrations).orderBy(asc(schema.integrations.name)),
    db.select({ source: schema.events.source }).from(schema.events),
  ]);
  const countBySource = new Map<string, number>();
  for (const e of events) countBySource.set(e.source, (countBySource.get(e.source) ?? 0) + 1);
  return { integrations, countBySource };
}

// --- Audit -------------------------------------------------------------------
export async function getAuditEvents(filter?: { action?: string; incidentId?: string; limit?: number }) {
  await ready();
  const conditions = [];
  if (filter?.action) conditions.push(eq(schema.auditEvents.action, filter.action));
  if (filter?.incidentId) conditions.push(eq(schema.auditEvents.incidentId, filter.incidentId));
  const rows = await db
    .select()
    .from(schema.auditEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditEvents.at))
    .limit(filter?.limit ?? 250);
  return rows;
}

// --- Capacity ----------------------------------------------------------------
export async function getCapacity() {
  await ready();
  const [forecasts, scenarios, incidents] = await Promise.all([
    db.select().from(schema.capacityForecasts).orderBy(asc(schema.capacityForecasts.periodStart)),
    db.select().from(schema.resourceScenarios),
    db.select().from(schema.incidents),
  ]);
  // Effort by service (open + recent).
  const services = await db.select().from(schema.services);
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  const effortByService = new Map<string, number>();
  for (const inc of incidents) {
    effortByService.set(inc.serviceId, (effortByService.get(inc.serviceId) ?? 0) + 1);
  }
  const topEffort = [...effortByService.entries()]
    .map(([id, count]) => ({ service: nameById.get(id) ?? id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return { forecasts, scenarios, topEffort };
}

// --- Command Centre ----------------------------------------------------------
export async function getCommandCentre() {
  await ready();
  const [services, incidents, runbooks, capacity] = await Promise.all([
    db.select().from(schema.services),
    db.select().from(schema.incidents),
    db.select().from(schema.runbooks),
    db.select().from(schema.capacityForecasts).orderBy(asc(schema.capacityForecasts.periodStart)),
  ]);

  const now = Date.now();
  const oneHourAgo = new Date(now - 3600_000);
  const [recentEventCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.events)
    .where(gte(schema.events.occurredAt, oneHourAgo));

  const [automationAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      succeeded: sql<number>`sum(case when ${schema.automationExecutions.status} = 'succeeded' then 1 else 0 end)::int`,
    })
    .from(schema.automationExecutions);

  const open = incidents.filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status as IncidentStatus));
  const critical = open.filter((i) => i.severity === "critical");
  const high = open.filter((i) => i.severity === "high");

  const statusCounts = { healthy: 0, degraded: 0, impaired: 0, down: 0 } as Record<string, number>;
  for (const s of services) statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
  const avgHealth = Math.round(services.reduce((a, s) => a + s.healthScore, 0) / Math.max(1, services.length));

  const mtt = computeMtt(
    incidents.map((i) => ({ detectedAt: i.detectedAt, acknowledgedAt: i.acknowledgedAt, resolvedAt: i.resolvedAt })),
  );

  // SLA risk: open incidents past their service's resolve target.
  const slaByService = new Map(services.map((s) => [s.id, s.slaResolveMins]));
  const slaRisk = open.filter((i) => {
    const target = slaByService.get(i.serviceId) ?? 240;
    return (now - i.detectedAt.getTime()) / 60000 > target;
  });

  // Recurring causes: incident count by category.
  const byCategory = new Map<string, number>();
  for (const i of incidents) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
  const recurringCauses = [...byCategory.entries()]
    .map(([category, count]) => ({ category: category as NormalisedCategory, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const affectedServices = new Set(open.map((i) => i.serviceId)).size;
  const correlatedClusters = incidents.filter((i) => i.isMultiSystem).length;

  const latestActual = [...capacity].reverse().find((c) => !c.isForecast);
  const nextForecast = capacity.find((c) => c.isForecast);

  const nameById = new Map(services.map((s) => [s.id, s.name]));

  return {
    services,
    nameById,
    avgHealth,
    statusCounts,
    openCount: open.length,
    criticalCount: critical.length,
    highCount: high.length,
    eventsLastHour: recentEventCount?.count ?? 0,
    correlatedClusters,
    automationRate: automationRate(automationAgg?.succeeded ?? 0, automationAgg?.total ?? 0),
    automatedResolutions: automationAgg?.succeeded ?? 0,
    humanEscalations: incidents.filter((i) => i.status === "assigned" || i.status === "investigating").length,
    mtta: mtt.mttaMinutes,
    mttr: mtt.mttrMinutes,
    slaRisk: slaRisk.length,
    supportWorkload: latestActual?.supportWorkloadHours ?? 0,
    forecastWorkload: nextForecast?.supportWorkloadHours ?? 0,
    affectedServices,
    recurringCauses,
    topOpenIncidents: open
      .sort((a, b) => SEVERITY_RANK[b.severity as Severity] - SEVERITY_RANK[a.severity as Severity])
      .slice(0, 6),
    runbookCount: runbooks.length,
  };
}

// --- Analytics ---------------------------------------------------------------
export async function getAnalytics() {
  await ready();
  const [incidents, events, capacity] = await Promise.all([
    db.select().from(schema.incidents),
    db.select().from(schema.events),
    db.select().from(schema.capacityForecasts).orderBy(asc(schema.capacityForecasts.periodStart)),
  ]);
  const services = await db.select().from(schema.services);
  const nameById = new Map(services.map((s) => [s.id, s.name]));

  const incidentsByService = countBy(incidents, (i) => nameById.get(i.serviceId) ?? i.serviceId);
  const eventsBySource = countBy(events, (e) => e.source);
  const incidentsByCategory = countBy(incidents, (i) => i.category);
  const incidentsBySeverity = countBy(incidents, (i) => i.severity);

  return {
    incidentsByService: toChart(incidentsByService),
    eventsBySource: toChart(eventsBySource),
    incidentsByCategory: toChart(incidentsByCategory),
    incidentsBySeverity: toChart(incidentsBySeverity),
    capacity,
  };
}

function countBy<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function toChart(m: Map<string, number>): { label: string; value: number }[] {
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

// --- Notifications -----------------------------------------------------------
export async function getNotifications() {
  await ready();
  return db.select().from(schema.notifications).orderBy(desc(schema.notifications.at)).limit(10);
}

// --- SLA helper --------------------------------------------------------------
export type SlaState = "ok" | "at_risk" | "breached";
export function slaState(openMinutes: number, targetMinutes: number): SlaState {
  if (openMinutes >= targetMinutes) return "breached";
  if (openMinutes >= targetMinutes * 0.8) return "at_risk";
  return "ok";
}

export interface QueueRow {
  id: string;
  title: string;
  serviceId: string;
  serviceName: string;
  severity: string;
  status: string;
  category: string;
  ownerTeam: string;
  ownerName: string;
  ageMinutes: number;
  slaTargetMinutes: number;
  slaState: SlaState;
  affectedUsers: number;
  nextAction: string;
}

function nextActionFor(status: string): string {
  switch (status) {
    case "detected": return "Triage & assess impact";
    case "triaged": return "Assign owner";
    case "assigned": return "Begin investigation";
    case "investigating": return "Propose remediation";
    case "action_proposed": return "Request approval";
    case "awaiting_approval": return "Approve remediation";
    case "remediating": return "Monitor recovery";
    case "monitoring": return "Confirm & resolve";
    default: return "Review";
  }
}

async function buildQueueRows(onlyEscalated = false): Promise<QueueRow[]> {
  const [incidents, services] = await Promise.all([
    db.select().from(schema.incidents).where(inArray(schema.incidents.status, OPEN_INCIDENT_STATUSES)),
    db.select().from(schema.services),
  ]);
  const svc = new Map(services.map((s) => [s.id, s]));
  const now = Date.now();
  let rows: QueueRow[] = incidents.map((i) => {
    const s = svc.get(i.serviceId);
    const ageMinutes = Math.max(0, Math.round((now - i.detectedAt.getTime()) / 60000));
    const target = s?.slaResolveMins ?? 240;
    return {
      id: i.id, title: i.title, serviceId: i.serviceId, serviceName: s?.name ?? i.serviceId,
      severity: i.severity, status: i.status, category: i.category, ownerTeam: i.ownerTeam, ownerName: i.ownerName,
      ageMinutes, slaTargetMinutes: target, slaState: slaState(ageMinutes, target),
      affectedUsers: i.affectedUsersEstimate, nextAction: nextActionFor(i.status),
    };
  });
  if (onlyEscalated) rows = rows.filter((r) => SEVERITY_RANK[r.severity as Severity] >= SEVERITY_RANK.high || r.status === "awaiting_approval" || r.slaState !== "ok");
  // Priority desc, then SLA urgency, then age desc.
  rows.sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity as Severity] - SEVERITY_RANK[a.severity as Severity];
    if (sev !== 0) return sev;
    const slaRank = { breached: 2, at_risk: 1, ok: 0 } as const;
    const sla = slaRank[b.slaState] - slaRank[a.slaState];
    if (sla !== 0) return sla;
    return b.ageMinutes - a.ageMinutes;
  });
  return rows;
}

export async function getQueue(filter?: { severity?: string; service?: string; sla?: SlaState; status?: string }) {
  await ready();
  const all = await buildQueueRows(false);
  let rows = all;
  if (filter?.severity) rows = rows.filter((r) => r.severity === filter.severity);
  if (filter?.service) rows = rows.filter((r) => r.serviceId === filter.service);
  if (filter?.sla) rows = rows.filter((r) => r.slaState === filter.sla);
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
  const services = await db.select({ id: schema.services.id, name: schema.services.name }).from(schema.services).orderBy(asc(schema.services.name));
  return {
    rows,
    services,
    summary: {
      total: all.length,
      breached: all.filter((r) => r.slaState === "breached").length,
      atRisk: all.filter((r) => r.slaState === "at_risk").length,
      unassigned: all.filter((r) => !r.ownerName).length,
      critical: all.filter((r) => r.severity === "critical").length,
    },
  };
}

export async function getEscalations() {
  await ready();
  const rows = await buildQueueRows(true);
  // Which incidents were explicitly escalated by an operator.
  const escalatedAudit = await db
    .select({ incidentId: schema.auditEvents.incidentId })
    .from(schema.auditEvents)
    .where(eq(schema.auditEvents.action, "escalated"));
  const escalatedIds = new Set(escalatedAudit.map((a) => a.incidentId));
  return rows.map((r) => ({ ...r, explicitlyEscalated: escalatedIds.has(r.id) }));
}

export interface BoardCard {
  id: string; title: string; severity: string; serviceName: string; ownerTeam: string; ageMinutes: number; status: string;
}
export async function getWorkflowBoard() {
  await ready();
  const [incidents, services] = await Promise.all([
    db.select().from(schema.incidents).orderBy(desc(schema.incidents.detectedAt)),
    db.select().from(schema.services),
  ]);
  const svc = new Map(services.map((s) => [s.id, s.name]));
  const now = Date.now();
  const lanes: Record<WorkflowStage, BoardCard[]> = {} as Record<WorkflowStage, BoardCard[]>;
  for (const st of WORKFLOW_STAGES) lanes[st] = [];
  for (const i of incidents) {
    const stage = statusToStage(i.status as IncidentStatus);
    lanes[stage].push({
      id: i.id, title: i.title, severity: i.severity, serviceName: svc.get(i.serviceId) ?? i.serviceId,
      ownerTeam: i.ownerTeam, ageMinutes: Math.max(0, Math.round((now - i.detectedAt.getTime()) / 60000)), status: i.status,
    });
  }
  // Cap resolved lane for readability.
  lanes.resolved = lanes.resolved.slice(0, 12);
  return { lanes };
}

export async function getOwners() {
  await ready();
  const services = await db.select({ ownerTeam: schema.services.ownerTeam, ownerName: schema.services.ownerName }).from(schema.services);
  const seen = new Set<string>();
  const owners: { ownerTeam: string; ownerName: string }[] = [];
  for (const s of services) {
    const key = `${s.ownerTeam}|${s.ownerName}`;
    if (!seen.has(key)) {
      seen.add(key);
      owners.push({ ownerTeam: s.ownerTeam, ownerName: s.ownerName });
    }
  }
  return owners.sort((a, b) => a.ownerTeam.localeCompare(b.ownerTeam));
}

export async function searchAll(q: string) {
  await ready();
  const term = `%${q}%`;
  const [incidents, services, teams] = await Promise.all([
    db.select().from(schema.incidents).where(or(ilike(schema.incidents.id, term), ilike(schema.incidents.title, term), ilike(schema.incidents.summary, term), ilike(schema.incidents.category, term))).orderBy(desc(schema.incidents.detectedAt)).limit(20),
    db.select().from(schema.services).where(or(ilike(schema.services.name, term), ilike(schema.services.slug, term), ilike(schema.services.ownerTeam, term), ilike(schema.services.description, term))).limit(12),
    db.select({ ownerTeam: schema.services.ownerTeam, ownerName: schema.services.ownerName }).from(schema.services).where(or(ilike(schema.services.ownerTeam, term), ilike(schema.services.ownerName, term))),
  ]);
  const svcAll = await db.select({ id: schema.services.id, name: schema.services.name }).from(schema.services);
  const nameById = new Map(svcAll.map((s) => [s.id, s.name]));
  const teamSet = new Map<string, string>();
  for (const t of teams) teamSet.set(t.ownerTeam, t.ownerName);
  return {
    incidents: incidents.map((i) => ({ id: i.id, title: i.title, severity: i.severity, status: i.status, serviceName: nameById.get(i.serviceId) ?? i.serviceId })),
    services,
    teams: [...teamSet.entries()].map(([ownerTeam, ownerName]) => ({ ownerTeam, ownerName })),
  };
}
