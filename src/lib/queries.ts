/**
 * Server-side data access for Relay. When DATABASE_URL is absent the app reads
 * from the same deterministic synthetic dataset that is normally seeded into Postgres.
 */
import "server-only";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ensureSeeded } from "@/db/ready";
import { generateSeed } from "@/db/seed-data";
import * as schema from "@/db/schema";
import {
  OPEN_INCIDENT_STATUSES,
  SEVERITY_RANK,
  type Severity,
  type IncidentStatus,
  type NormalisedCategory,
} from "@/lib/domain";
import { computeMtt, automationRate } from "@/lib/engines/capacity";
import { DEMO_INCIDENT_ID } from "@/lib/app-config";
import { getDemoCommandCentre } from "@/lib/demo-data";

const demoMode = () => !process.env.DATABASE_URL;
const demo = () => generateSeed();

async function ready() {
  if (!demoMode()) await ensureSeeded();
}

// --- Services ----------------------------------------------------------------
export async function getServices() {
  if (demoMode()) return [...demo().services].sort((a, b) => a.name.localeCompare(b.name));
  await ready();
  return db.select().from(schema.services).orderBy(asc(schema.services.name));
}

export async function getServiceBySlug(slug: string) {
  if (demoMode()) {
    const d = demo();
    const service = d.services.find((s) => s.slug === slug);
    if (!service) return null;
    const deps = d.serviceDependencies.filter((x) => x.serviceId === service.id);
    const dependents = d.serviceDependencies.filter((x) => x.dependsOnId === service.id);
    const incidents = d.incidents
      .filter((x) => x.serviceId === service.id)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
    const metrics = d.serviceMetrics
      .filter((x) => x.serviceId === service.id)
      .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    const nameById = new Map(d.services.map((s) => [s.id, s]));
    const runbooks = d.runbooks.filter((r) => (r.applicableCriticalities as string[]).includes(service.criticality));
    return { service, deps, dependents, incidents, metrics, nameById, runbooks };
  }
  await ready();
  const [service] = await db.select().from(schema.services).where(eq(schema.services.slug, slug)).limit(1);
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
  if (demoMode()) {
    const d = demo();
    return { services: d.services, deps: d.serviceDependencies };
  }
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
  if (demoMode()) {
    const d = demo();
    let rows = [...d.events];
    if (filters.source) rows = rows.filter((e) => e.source === filters.source);
    if (filters.severity) rows = rows.filter((e) => e.severity === filters.severity);
    if (filters.serviceId) rows = rows.filter((e) => e.serviceId === filters.serviceId);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter((e) =>
        e.message.toLowerCase().includes(q) || e.eventType.toLowerCase().includes(q) || e.externalRef.toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    rows = rows.slice(0, filters.limit ?? 200);
    const nameById = new Map(d.services.map((s) => [s.id, s.name]));
    return { rows, nameById };
  }
  await ready();
  const conditions = [];
  if (filters.source) conditions.push(eq(schema.events.source, filters.source));
  if (filters.severity) conditions.push(eq(schema.events.severity, filters.severity));
  if (filters.serviceId) conditions.push(eq(schema.events.serviceId, filters.serviceId));
  if (filters.search) {
    conditions.push(sql`(${schema.events.message} ILIKE ${"%" + filters.search + "%"} OR ${schema.events.eventType} ILIKE ${"%" + filters.search + "%"} OR ${schema.events.externalRef} ILIKE ${"%" + filters.search + "%"})`);
  }
  const rows = await db.select().from(schema.events)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.events.occurredAt)).limit(filters.limit ?? 200);
  const services = await db.select().from(schema.services);
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  return { rows, nameById };
}

export async function getEventById(id: string) {
  if (demoMode()) return demo().events.find((e) => e.id === id) ?? null;
  await ready();
  const [event] = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1);
  return event ?? null;
}

// --- Incidents ---------------------------------------------------------------
export async function getIncidents(filter?: { open?: boolean; status?: string; severity?: string }) {
  if (demoMode()) {
    const d = demo();
    let incidents = [...d.incidents];
    if (filter?.open) incidents = incidents.filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status as IncidentStatus));
    if (filter?.status) incidents = incidents.filter((i) => i.status === filter.status);
    if (filter?.severity) incidents = incidents.filter((i) => i.severity === filter.severity);
    incidents.sort((a, b) => {
      const aOpen = OPEN_INCIDENT_STATUSES.includes(a.status as IncidentStatus) ? 1 : 0;
      const bOpen = OPEN_INCIDENT_STATUSES.includes(b.status as IncidentStatus) ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      const sev = SEVERITY_RANK[b.severity as Severity] - SEVERITY_RANK[a.severity as Severity];
      return sev || b.detectedAt.getTime() - a.detectedAt.getTime();
    });
    return { incidents, nameById: new Map(d.services.map((s) => [s.id, s.name])) };
  }
  await ready();
  const conditions = [];
  if (filter?.open) conditions.push(inArray(schema.incidents.status, OPEN_INCIDENT_STATUSES));
  if (filter?.status) conditions.push(eq(schema.incidents.status, filter.status));
  if (filter?.severity) conditions.push(eq(schema.incidents.severity, filter.severity));
  const incidents = await db.select().from(schema.incidents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.incidents.detectedAt));
  const services = await db.select().from(schema.services);
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  incidents.sort((a, b) => {
    const aOpen = OPEN_INCIDENT_STATUSES.includes(a.status as IncidentStatus) ? 1 : 0;
    const bOpen = OPEN_INCIDENT_STATUSES.includes(b.status as IncidentStatus) ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    const sev = SEVERITY_RANK[b.severity as Severity] - SEVERITY_RANK[a.severity as Severity];
    return sev || b.detectedAt.getTime() - a.detectedAt.getTime();
  });
  return { incidents, nameById };
}

export async function getIncidentById(id: string) {
  if (demoMode()) {
    const d = demo();
    const incident = d.incidents.find((i) => i.id === id);
    if (!incident) return null;
    const correlatedEvents = d.events.filter((e) => e.incidentId === id).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    const triage = d.triageDecisions.find((t) => t.incidentId === id) ?? null;
    const automations = d.automationExecutions.filter((a) => a.incidentId === id).sort((a, b) => a.proposedAt.getTime() - b.proposedAt.getTime());
    const approvals = d.approvals.filter((a) => a.incidentId === id).sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
    const audit = d.auditEvents.filter((a) => a.incidentId === id).sort((a, b) => a.at.getTime() - b.at.getTime());
    const nameById = new Map(d.services.map((s) => [s.id, s]));
    const recommendedRunbook = incident.recommendedRunbookId
      ? d.runbooks.find((r) => r.id === incident.recommendedRunbookId) ?? null
      : null;
    const runbookSteps = recommendedRunbook
      ? d.runbookSteps.filter((s) => s.runbookId === recommendedRunbook.id).sort((a, b) => a.ordinal - b.ordinal)
      : [];
    const dependents = d.serviceDependencies.filter((x) => x.dependsOnId === incident.serviceId);
    return { incident, correlatedEvents, triage, automations, approvals, audit, nameById, recommendedRunbook, runbookSteps, dependents };
  }
  await ready();
  const [incident] = await db.select().from(schema.incidents).where(eq(schema.incidents.id, id)).limit(1);
  if (!incident) return null;
  const [correlatedEvents, triage, automations, approvals, audit, allServices, allRunbooks] = await Promise.all([
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
  const recommendedRunbook = incident.recommendedRunbookId ? runbookById.get(incident.recommendedRunbookId) ?? null : null;
  const runbookSteps = recommendedRunbook
    ? await db.select().from(schema.runbookSteps).where(eq(schema.runbookSteps.runbookId, recommendedRunbook.id)).orderBy(asc(schema.runbookSteps.ordinal))
    : [];
  const deps = await db.select().from(schema.serviceDependencies).where(eq(schema.serviceDependencies.dependsOnId, incident.serviceId));
  return { incident, correlatedEvents, triage: triage[0] ?? null, automations, approvals, audit, nameById, recommendedRunbook, runbookSteps, dependents: deps };
}

export async function getDemoIncident() {
  return getIncidentById(DEMO_INCIDENT_ID);
}

// --- Runbooks ----------------------------------------------------------------
export async function getRunbooks() {
  if (demoMode()) {
    const d = demo();
    const runbooks = [...d.runbooks].sort((a, b) => a.name.localeCompare(b.name));
    const steps = [...d.runbookSteps].sort((a, b) => a.ordinal - b.ordinal);
    const stepsByRunbook = new Map<string, typeof steps>();
    for (const s of steps) {
      const list = stepsByRunbook.get(s.runbookId) ?? [];
      list.push(s);
      stepsByRunbook.set(s.runbookId, list);
    }
    return { runbooks, stepsByRunbook };
  }
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
  if (demoMode()) return demo().runbooks.filter((r) => (r.applicableCriticalities as string[]).includes(criticality));
  return (await db.select().from(schema.runbooks)).filter((r) => (r.applicableCriticalities as string[]).includes(criticality));
}

// --- Automations -------------------------------------------------------------
export async function getAutomations() {
  if (demoMode()) {
    const d = demo();
    const automations = [...d.automationExecutions].sort((a, b) => b.proposedAt.getTime() - a.proposedAt.getTime());
    return {
      automations,
      incidentById: new Map(d.incidents.map((i) => [i.id, i])),
      runbookById: new Map(d.runbooks.map((r) => [r.id, r])),
      approvalByAutomation: new Map(d.approvals.map((a) => [a.automationId, a])),
    };
  }
  await ready();
  const [automations, incidents, runbooks, approvals] = await Promise.all([
    db.select().from(schema.automationExecutions).orderBy(desc(schema.automationExecutions.proposedAt)),
    db.select().from(schema.incidents),
    db.select().from(schema.runbooks),
    db.select().from(schema.approvals),
  ]);
  return {
    automations,
    incidentById: new Map(incidents.map((i) => [i.id, i])),
    runbookById: new Map(runbooks.map((r) => [r.id, r])),
    approvalByAutomation: new Map(approvals.map((a) => [a.automationId, a])),
  };
}

// --- Integrations ------------------------------------------------------------
export async function getIntegrations() {
  if (demoMode()) {
    const d = demo();
    const countBySource = new Map<string, number>();
    for (const e of d.events) countBySource.set(e.source, (countBySource.get(e.source) ?? 0) + 1);
    return { integrations: [...d.integrations].sort((a, b) => a.name.localeCompare(b.name)), countBySource };
  }
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
  if (demoMode()) {
    let rows = [...demo().auditEvents];
    if (filter?.action) rows = rows.filter((a) => a.action === filter.action);
    if (filter?.incidentId) rows = rows.filter((a) => a.incidentId === filter.incidentId);
    return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, filter?.limit ?? 250);
  }
  await ready();
  const conditions = [];
  if (filter?.action) conditions.push(eq(schema.auditEvents.action, filter.action));
  if (filter?.incidentId) conditions.push(eq(schema.auditEvents.incidentId, filter.incidentId));
  return db.select().from(schema.auditEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditEvents.at)).limit(filter?.limit ?? 250);
}

// --- Capacity ----------------------------------------------------------------
export async function getCapacity() {
  if (demoMode()) {
    const d = demo();
    const forecasts = [...d.capacityForecasts].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
    const scenarios = d.resourceScenarios;
    const nameById = new Map(d.services.map((s) => [s.id, s.name]));
    const effortByService = new Map<string, number>();
    for (const inc of d.incidents) effortByService.set(inc.serviceId, (effortByService.get(inc.serviceId) ?? 0) + 1);
    const topEffort = [...effortByService.entries()]
      .map(([id, count]) => ({ service: nameById.get(id) ?? id, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);
    return { forecasts, scenarios, topEffort };
  }
  await ready();
  const [forecasts, scenarios, incidents] = await Promise.all([
    db.select().from(schema.capacityForecasts).orderBy(asc(schema.capacityForecasts.periodStart)),
    db.select().from(schema.resourceScenarios),
    db.select().from(schema.incidents),
  ]);
  const services = await db.select().from(schema.services);
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  const effortByService = new Map<string, number>();
  for (const inc of incidents) effortByService.set(inc.serviceId, (effortByService.get(inc.serviceId) ?? 0) + 1);
  const topEffort = [...effortByService.entries()]
    .map(([id, count]) => ({ service: nameById.get(id) ?? id, count }))
    .sort((a, b) => b.count - a.count).slice(0, 8);
  return { forecasts, scenarios, topEffort };
}

// --- Command Centre ----------------------------------------------------------
export async function getCommandCentre() {
  if (demoMode()) return getDemoCommandCentre();
  await ready();
  const [services, incidents, runbooks, capacity] = await Promise.all([
    db.select().from(schema.services), db.select().from(schema.incidents), db.select().from(schema.runbooks),
    db.select().from(schema.capacityForecasts).orderBy(asc(schema.capacityForecasts.periodStart)),
  ]);
  const now = Date.now();
  const oneHourAgo = new Date(now - 3600_000);
  const [recentEventCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.events).where(gte(schema.events.occurredAt, oneHourAgo));
  const [automationAgg] = await db.select({
    total: sql<number>`count(*)::int`,
    succeeded: sql<number>`sum(case when ${schema.automationExecutions.status} = 'succeeded' then 1 else 0 end)::int`,
  }).from(schema.automationExecutions);
  const open = incidents.filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status as IncidentStatus));
  const critical = open.filter((i) => i.severity === "critical");
  const high = open.filter((i) => i.severity === "high");
  const statusCounts = { healthy: 0, degraded: 0, impaired: 0, down: 0 } as Record<string, number>;
  for (const s of services) statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
  const avgHealth = Math.round(services.reduce((a, s) => a + s.healthScore, 0) / Math.max(1, services.length));
  const mtt = computeMtt(incidents.map((i) => ({ detectedAt: i.detectedAt, acknowledgedAt: i.acknowledgedAt, resolvedAt: i.resolvedAt })));
  const slaByService = new Map(services.map((s) => [s.id, s.slaResolveMins]));
  const slaRisk = open.filter((i) => (now - i.detectedAt.getTime()) / 60000 > (slaByService.get(i.serviceId) ?? 240));
  const byCategory = new Map<string, number>();
  for (const i of incidents) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
  const recurringCauses = [...byCategory.entries()].map(([category, count]) => ({ category: category as NormalisedCategory, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  const latestActual = [...capacity].reverse().find((c) => !c.isForecast);
  const nextForecast = capacity.find((c) => c.isForecast);
  return {
    services,
    nameById: new Map(services.map((s) => [s.id, s.name])),
    avgHealth,
    statusCounts,
    openCount: open.length,
    criticalCount: critical.length,
    highCount: high.length,
    eventsLastHour: recentEventCount?.count ?? 0,
    correlatedClusters: incidents.filter((i) => i.isMultiSystem).length,
    automationRate: automationRate(automationAgg?.succeeded ?? 0, automationAgg?.total ?? 0),
    automatedResolutions: automationAgg?.succeeded ?? 0,
    humanEscalations: incidents.filter((i) => i.status === "assigned" || i.status === "investigating").length,
    mtta: mtt.mttaMinutes,
    mttr: mtt.mttrMinutes,
    slaRisk: slaRisk.length,
    supportWorkload: latestActual?.supportWorkloadHours ?? 0,
    forecastWorkload: nextForecast?.supportWorkloadHours ?? 0,
    affectedServices: new Set(open.map((i) => i.serviceId)).size,
    recurringCauses,
    topOpenIncidents: open.sort((a, b) => SEVERITY_RANK[b.severity as Severity] - SEVERITY_RANK[a.severity as Severity]).slice(0, 6),
    runbookCount: runbooks.length,
  };
}

// --- Analytics ---------------------------------------------------------------
export async function getAnalytics() {
  if (demoMode()) {
    const d = demo();
    const nameById = new Map(d.services.map((s) => [s.id, s.name]));
    return {
      incidentsByService: toChart(countBy(d.incidents, (i) => nameById.get(i.serviceId) ?? i.serviceId)),
      eventsBySource: toChart(countBy(d.events, (e) => e.source)),
      incidentsByCategory: toChart(countBy(d.incidents, (i) => i.category)),
      incidentsBySeverity: toChart(countBy(d.incidents, (i) => i.severity)),
      capacity: [...d.capacityForecasts].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime()),
    };
  }
  await ready();
  const [incidents, events, capacity] = await Promise.all([
    db.select().from(schema.incidents), db.select().from(schema.events),
    db.select().from(schema.capacityForecasts).orderBy(asc(schema.capacityForecasts.periodStart)),
  ]);
  const services = await db.select().from(schema.services);
  const nameById = new Map(services.map((s) => [s.id, s.name]));
  return {
    incidentsByService: toChart(countBy(incidents, (i) => nameById.get(i.serviceId) ?? i.serviceId)),
    eventsBySource: toChart(countBy(events, (e) => e.source)),
    incidentsByCategory: toChart(countBy(incidents, (i) => i.category)),
    incidentsBySeverity: toChart(countBy(incidents, (i) => i.severity)),
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
  if (demoMode()) return [...demo().notifications].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);
  await ready();
  return db.select().from(schema.notifications).orderBy(desc(schema.notifications.at)).limit(10);
}
