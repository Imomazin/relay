import { generateSeed } from "@/db/seed-data";
import {
  OPEN_INCIDENT_STATUSES,
  SEVERITY_RANK,
  type Criticality,
  type IncidentStatus,
  type NormalisedCategory,
  type ServiceStatus,
  type Severity,
} from "@/lib/domain";

type DemoService = {
  id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
  healthScore: number;
  criticality: Criticality;
  slaResolveMins: number;
};

type DemoIncident = {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  serviceId: string;
  affectedUsersEstimate: number;
  category: NormalisedCategory;
  isMultiSystem: boolean;
  detectedAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
};

type DemoEvent = { occurredAt: Date };
type DemoAutomation = { status: string };
type DemoCapacity = { isForecast: boolean; supportWorkloadHours: number; periodStart: Date };
type DemoAudit = { id: string; at: Date; action: string; actor: string; summary: string; incidentId: string | null };

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function getDemoCommandCentre() {
  const seed = generateSeed() as unknown as {
    services: DemoService[];
    incidents: DemoIncident[];
    events: DemoEvent[];
    automationExecutions: DemoAutomation[];
    capacityForecasts: DemoCapacity[];
    auditEvents: DemoAudit[];
    runbooks: unknown[];
  };

  const now = Date.now();
  const services = seed.services;
  const incidents = seed.incidents;
  const open = incidents.filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status));
  const critical = open.filter((i) => i.severity === "critical");
  const high = open.filter((i) => i.severity === "high");

  const statusCounts: Record<string, number> = { healthy: 0, degraded: 0, impaired: 0, down: 0 };
  for (const service of services) statusCounts[service.status] = (statusCounts[service.status] ?? 0) + 1;

  const avgHealth = Math.round(services.reduce((sum, service) => sum + service.healthScore, 0) / Math.max(1, services.length));
  const nameById = new Map(services.map((service) => [service.id, service.name]));

  const ackMinutes = incidents
    .filter((i) => i.acknowledgedAt)
    .map((i) => (new Date(i.acknowledgedAt as Date).getTime() - new Date(i.detectedAt).getTime()) / 60000);
  const resolveMinutes = incidents
    .filter((i) => i.resolvedAt)
    .map((i) => (new Date(i.resolvedAt as Date).getTime() - new Date(i.detectedAt).getTime()) / 60000);

  const slaByService = new Map(services.map((service) => [service.id, service.slaResolveMins]));
  const slaRisk = open.filter((incident) => {
    const target = slaByService.get(incident.serviceId) ?? 240;
    return (now - new Date(incident.detectedAt).getTime()) / 60000 > target;
  });

  const byCategory = new Map<NormalisedCategory, number>();
  for (const incident of incidents) {
    byCategory.set(incident.category, (byCategory.get(incident.category) ?? 0) + 1);
  }
  const recurringCauses = [...byCategory.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const sortedCapacity = [...seed.capacityForecasts].sort(
    (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime(),
  );
  const latestActual = [...sortedCapacity].reverse().find((row) => !row.isForecast);
  const nextForecast = sortedCapacity.find((row) => row.isForecast);

  const succeeded = seed.automationExecutions.filter((a) => a.status === "succeeded").length;
  const automationTotal = seed.automationExecutions.length;

  const throughputByHour = new Map<number, number>();
  for (const event of seed.events) {
    const hoursAgo = Math.floor((now - new Date(event.occurredAt).getTime()) / 3600000);
    if (hoursAgo >= 0 && hoursAgo < 12) throughputByHour.set(hoursAgo, (throughputByHour.get(hoursAgo) ?? 0) + 1);
  }
  const eventThroughput = Array.from({ length: 12 }, (_, i) => throughputByHour.get(11 - i) ?? 0);

  const recentActivity = [...seed.auditEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8)
    .map((a) => ({ id: a.id, at: new Date(a.at), action: a.action, actor: a.actor, summary: a.summary, incidentId: a.incidentId ?? null }));

  return {
    services,
    nameById,
    avgHealth,
    statusCounts,
    openCount: open.length,
    criticalCount: critical.length,
    highCount: high.length,
    eventsLastHour: seed.events.filter((event) => now - new Date(event.occurredAt).getTime() <= 3600000).length,
    eventThroughput,
    recentActivity,
    correlatedClusters: incidents.filter((incident) => incident.isMultiSystem).length,
    automationRate: automationTotal ? Math.round((succeeded / automationTotal) * 100) : 0,
    automatedResolutions: succeeded,
    humanEscalations: incidents.filter((incident) => incident.status === "assigned" || incident.status === "investigating").length,
    mtta: average(ackMinutes),
    mttr: average(resolveMinutes),
    slaRisk: slaRisk.length,
    supportWorkload: latestActual?.supportWorkloadHours ?? 0,
    forecastWorkload: nextForecast?.supportWorkloadHours ?? 0,
    affectedServices: new Set(open.map((incident) => incident.serviceId)).size,
    recurringCauses,
    topOpenIncidents: [...open]
      .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
      .slice(0, 6),
    runbookCount: seed.runbooks.length,
  };
}