/**
 * Pure seed data generation for Relay.
 *
 * `generateSeed()` returns fully-formed row arrays for every table, with all
 * derived values (service health/status, runbook execution counts) baked in.
 * It performs no database I/O, so it can drive either the Drizzle driver
 * (src/db/seed.ts) or a SQL emitter (src/db/seed-emit.ts).
 */
import type * as schema from "./schema";
import {
  SERVICE_DEFS,
  DEPENDENCY_DEFS,
  INTEGRATION_DEFS,
  RUNBOOK_DEFS,
} from "./seed-static";
import { createRng, rngInt, rngPick, rngChance, DEFAULT_SEED } from "@/lib/rng";
import { normaliseBatch, type RawEvent } from "@/lib/engines/normalisation";
import { scoreCluster, type CorrelationInput } from "@/lib/engines/correlation";
import { triage, type TriageServiceContext } from "@/lib/engines/triage";
import { recommendRunbook, type RunbookCandidate } from "@/lib/engines/runbook";
import { computeResourceModel } from "@/lib/engines/capacity";
import {
  type EventSource,
  type NormalisedCategory,
  type Severity,
  type IncidentStatus,
  SEVERITY_RANK,
  EVENT_SOURCE_LABEL,
} from "@/lib/domain";
import { DEMO_INCIDENT_ID } from "@/lib/app-config";

export interface SeedResult {
  services: (typeof schema.services.$inferInsert)[];
  serviceDependencies: (typeof schema.serviceDependencies.$inferInsert)[];
  integrations: (typeof schema.integrations.$inferInsert)[];
  runbooks: (typeof schema.runbooks.$inferInsert)[];
  runbookSteps: (typeof schema.runbookSteps.$inferInsert)[];
  incidents: (typeof schema.incidents.$inferInsert)[];
  events: (typeof schema.events.$inferInsert)[];
  incidentEvents: (typeof schema.incidentEvents.$inferInsert)[];
  triageDecisions: (typeof schema.triageDecisions.$inferInsert)[];
  automationExecutions: (typeof schema.automationExecutions.$inferInsert)[];
  approvals: (typeof schema.approvals.$inferInsert)[];
  auditEvents: (typeof schema.auditEvents.$inferInsert)[];
  serviceMetrics: (typeof schema.serviceMetrics.$inferInsert)[];
  capacityForecasts: (typeof schema.capacityForecasts.$inferInsert)[];
  resourceScenarios: (typeof schema.resourceScenarios.$inferInsert)[];
  notifications: (typeof schema.notifications.$inferInsert)[];
}

export const SEED_TABLE_ORDER: { key: keyof SeedResult }[] = [
  { key: "services" },
  { key: "serviceDependencies" },
  { key: "integrations" },
  { key: "runbooks" },
  { key: "runbookSteps" },
  { key: "incidents" },
  { key: "events" },
  { key: "incidentEvents" },
  { key: "triageDecisions" },
  { key: "automationExecutions" },
  { key: "approvals" },
  { key: "auditEvents" },
  { key: "serviceMetrics" },
  { key: "capacityForecasts" },
  { key: "resourceScenarios" },
  { key: "notifications" },
];

const OPEN_LIKE: IncidentStatus[] = [
  "detected", "triaged", "assigned", "investigating",
  "action_proposed", "awaiting_approval", "remediating", "monitoring",
];

type Scenario = {
  serviceId: string;
  category: NormalisedCategory;
  sources: EventSource[];
  eventSeverities: string[];
  startMinutesAgo: number;
  spreadMinutes: number;
  status: IncidentStatus;
  title: string;
  summary: string;
  likelyCause: string;
  featured?: boolean;
  withAutomation?: "proposed" | "succeeded";
};

const SCENARIOS: Scenario[] = [
  { serviceId: "svc-payments", category: "saturation", sources: ["cloudwatch", "app_telemetry", "jira_service_desk"], eventSeverities: ["alarm", "error", "high"], startMinutesAgo: 34, spreadMinutes: 12, status: "awaiting_approval", title: "Payment API latency and failed transactions", summary: "CloudWatch latency alarm, application HTTP 500 spike and citizen-reported failed transactions correlate to worker queue saturation on the Payments Service.", likelyCause: "Payment worker queue saturation — backlog growing faster than workers can drain it.", featured: true, withAutomation: "proposed" },
  { serviceId: "svc-identity", category: "authentication", sources: ["app_telemetry", "jira_service_desk", "cloudwatch"], eventSeverities: ["error", "high", "alarm"], startMinutesAgo: 95, spreadMinutes: 15, status: "remediating", title: "Sign-in failures across citizen services", summary: "Token validation errors and citizen sign-in tickets correlate to an Identity Service degradation.", likelyCause: "Token validation latency causing session establishment failures.", withAutomation: "proposed" },
  { serviceId: "svc-api-gateway", category: "latency", sources: ["cloudwatch", "app_telemetry"], eventSeverities: ["alarm", "error"], startMinutesAgo: 220, spreadMinutes: 10, status: "monitoring", title: "Elevated edge latency at the API Gateway", summary: "Gateway p99 latency breached SLO with corroborating telemetry; scaled the gateway tier.", likelyCause: "Insufficient gateway replicas during a traffic surge.", withAutomation: "succeeded" },
  { serviceId: "svc-citizen-portal", category: "availability", sources: ["cloudwatch", "app_telemetry", "jira_service_desk"], eventSeverities: ["alarm", "error", "high"], startMinutesAgo: 1500, spreadMinutes: 18, status: "resolved", title: "Citizen Portal returning error pages", summary: "Portal health checks failed with citizen reports; downstream of a gateway incident. Resolved after gateway recovery.", likelyCause: "Cascading failure from API Gateway latency incident.", withAutomation: "succeeded" },
  { serviceId: "svc-messaging", category: "saturation", sources: ["cloudwatch", "app_telemetry"], eventSeverities: ["alarm", "warn"], startMinutesAgo: 2600, spreadMinutes: 9, status: "resolved", title: "Message bus backlog building", summary: "Queue depth alarm with saturation telemetry; cleared the queue and quarantined poison messages.", likelyCause: "Poison messages stalling consumers and building backlog.", withAutomation: "succeeded" },
  { serviceId: "svc-document", category: "error_rate", sources: ["app_telemetry", "jira_service_desk"], eventSeverities: ["error", "medium"], startMinutesAgo: 175, spreadMinutes: 14, status: "investigating", title: "Document generation errors", summary: "Elevated 500s generating documents with staff tickets; investigating a storage dependency.", likelyCause: "Intermittent storage backend errors during document rendering." },
  { serviceId: "svc-licensing", category: "dependency", sources: ["app_telemetry", "cloudwatch"], eventSeverities: ["error", "warn"], startMinutesAgo: 3100, spreadMinutes: 11, status: "resolved", title: "Licensing failing on document dependency", summary: "Licensing errors traced to Document Service timeouts; failed over to standby.", likelyCause: "Document Service dependency timeouts.", withAutomation: "succeeded" },
  { serviceId: "svc-notification", category: "capacity", sources: ["cloudwatch"], eventSeverities: ["warn"], startMinutesAgo: 400, spreadMinutes: 6, status: "monitoring", title: "Notification throughput approaching limit", summary: "Notification send throughput nearing capacity; owner notified, monitoring.", likelyCause: "Batch notification job overlapping with peak citizen activity." },
  { serviceId: "svc-workflow", category: "dependency", sources: ["app_telemetry", "jira_service_desk"], eventSeverities: ["error", "medium"], startMinutesAgo: 5000, spreadMinutes: 16, status: "resolved", title: "Workflow steps stalling", summary: "Workflow progression stalled on messaging dependency; resolved after bus recovery.", likelyCause: "Messaging Service backlog delaying workflow steps.", withAutomation: "succeeded" },
  { serviceId: "svc-identity", category: "security", sources: ["crowdstrike", "exabeam"], eventSeverities: ["high", "high"], startMinutesAgo: 60, spreadMinutes: 8, status: "assigned", title: "Suspicious credential-access activity near Identity hosts", summary: "EDR detection and UEBA risk increase correlate near Identity Service; escalated to security.", likelyCause: "Under investigation — possible credential-access attempt." },
  { serviceId: "svc-payments", category: "error_rate", sources: ["app_telemetry"], eventSeverities: ["error"], startMinutesAgo: 8000, spreadMinutes: 7, status: "closed", title: "Payments 500 spike (historic)", summary: "Short-lived error spike on Payments; rolling restart resolved it.", likelyCause: "Bad deploy rolled back automatically.", withAutomation: "succeeded" },
  { serviceId: "svc-reporting", category: "latency", sources: ["cloudwatch"], eventSeverities: ["warn"], startMinutesAgo: 620, spreadMinutes: 5, status: "triaged", title: "Reporting queries slow", summary: "Reporting latency elevated during export window; low citizen impact.", likelyCause: "Heavy export queries contending for resources." },
  { serviceId: "svc-search", category: "availability", sources: ["app_telemetry", "cloudwatch"], eventSeverities: ["error", "alarm"], startMinutesAgo: 9000, spreadMinutes: 10, status: "resolved", title: "Search index unavailable", summary: "Search readiness probes failed; health check and restart restored service.", likelyCause: "Index node crash-loop after memory pressure.", withAutomation: "succeeded" },
  { serviceId: "svc-api-gateway", category: "error_rate", sources: ["cloudwatch", "app_telemetry", "jira_service_desk"], eventSeverities: ["alarm", "error", "high"], startMinutesAgo: 11000, spreadMinutes: 20, status: "resolved", title: "Gateway 5xx surge affecting multiple services", summary: "Gateway error surge cascaded to portal and payments; restarted instances and recovered.", likelyCause: "Configuration reload error on gateway instances.", withAutomation: "succeeded" },
  { serviceId: "svc-messaging", category: "availability", sources: ["cloudwatch"], eventSeverities: ["alarm"], startMinutesAgo: 300, spreadMinutes: 5, status: "detected", title: "Messaging broker node unhealthy", summary: "A broker node failed its health check; awaiting triage confirmation.", likelyCause: "Broker node resource exhaustion." },
  { serviceId: "svc-document", category: "capacity", sources: ["cloudwatch"], eventSeverities: ["warn"], startMinutesAgo: 13000, spreadMinutes: 6, status: "closed", title: "Document storage near quota (historic)", summary: "Storage volume neared quota; capacity expanded.", likelyCause: "Retention job lag." },
  { serviceId: "svc-licensing", category: "error_rate", sources: ["app_telemetry", "jira_service_desk"], eventSeverities: ["error", "medium"], startMinutesAgo: 15000, spreadMinutes: 12, status: "resolved", title: "Licence issuance failures", summary: "Licence issuance errors with applicant tickets; restart resolved.", likelyCause: "Template service defect after upgrade.", withAutomation: "succeeded" },
  { serviceId: "svc-notification", category: "error_rate", sources: ["app_telemetry"], eventSeverities: ["warn"], startMinutesAgo: 17000, spreadMinutes: 8, status: "closed", title: "SMS provider errors (historic)", summary: "Transient SMS provider errors; failed over to secondary provider.", likelyCause: "Upstream SMS provider outage.", withAutomation: "succeeded" },
  { serviceId: "svc-workflow", category: "latency", sources: ["cloudwatch", "app_telemetry"], eventSeverities: ["warn", "error"], startMinutesAgo: 500, spreadMinutes: 9, status: "action_proposed", title: "Workflow latency rising", summary: "Workflow processing latency rising; scale-out proposed pending approval.", likelyCause: "Increased case volume outpacing workers.", withAutomation: "proposed" },
  { serviceId: "svc-citizen-portal", category: "latency", sources: ["app_telemetry", "jira_service_desk"], eventSeverities: ["error", "medium"], startMinutesAgo: 19000, spreadMinutes: 15, status: "resolved", title: "Portal slow during peak (historic)", summary: "Portal latency during a peak period; scaled front-end tier.", likelyCause: "Under-provisioned front end at peak.", withAutomation: "succeeded" },
  { serviceId: "svc-reporting", category: "error_rate", sources: ["app_telemetry"], eventSeverities: ["warn"], startMinutesAgo: 21000, spreadMinutes: 6, status: "closed", title: "Report export failures (historic)", summary: "Export job failures; diagnostics collected and job re-run.", likelyCause: "Transient memory pressure during export.", withAutomation: "succeeded" },
  { serviceId: "svc-audit-log", category: "capacity", sources: ["cloudwatch"], eventSeverities: ["warn"], startMinutesAgo: 800, spreadMinutes: 5, status: "monitoring", title: "Audit log ingestion lag", summary: "Audit ingestion lag observed; owner notified, monitoring for recovery.", likelyCause: "Elevated write volume from security events." },
];

function externalRef(source: EventSource, n: number): string {
  const map: Record<EventSource, string> = {
    cloudwatch: `cw-alarm-${1000 + n}`,
    jira_service_desk: `SD-${4200 + n}`,
    exabeam: `xb-${7000 + n}`,
    crowdstrike: `cs-det-${9000 + n}`,
    app_telemetry: `otel-${3000 + n}`,
  };
  return map[source];
}

export function generateSeed(): SeedResult {
  const rng = createRng(DEFAULT_SEED);
  const NOW = new Date();
  const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60000);
  const daysAgo = (d: number) => minutesAgo(d * 24 * 60);

  const serviceById = new Map(SERVICE_DEFS.map((s) => [s.id, s]));
  const dependenciesOf = new Map<string, string[]>();
  const dependentsOf = new Map<string, string[]>();
  for (const s of SERVICE_DEFS) {
    dependenciesOf.set(s.id, []);
    dependentsOf.set(s.id, []);
  }
  for (const d of DEPENDENCY_DEFS) {
    dependenciesOf.get(d.serviceId)!.push(d.dependsOnId);
    dependentsOf.get(d.dependsOnId)!.push(d.serviceId);
  }

  const runbookCandidates: RunbookCandidate[] = RUNBOOK_DEFS.map((rb) => ({
    id: rb.id, name: rb.name, category: rb.category, risk: rb.risk,
    approvalRequired: rb.approvalRequired, applicableCriticalities: rb.applicableCriticalities,
    syntheticSuccessRate: rb.syntheticSuccessRate,
  }));

  function rawEventFor(source: EventSource, serviceId: string, category: NormalisedCategory, occurredAt: Date, rawSeverity: string, n: number): RawEvent {
    const svc = serviceById.get(serviceId)!;
    const base = { source, externalRef: externalRef(source, n), serviceId, occurredAt, rawSeverity, entity: `${svc.slug}-prod` };
    if (source === "cloudwatch") {
      const m: Partial<Record<NormalisedCategory, { type: string; msg: string; metric: string; value: number; unit: string }>> = {
        latency: { type: "ALARM: HighLatency", msg: `p99 latency ${1200 + n * 40}ms exceeded 500ms threshold on ${svc.name}`, metric: "latency_p99", value: 1200 + n * 40, unit: "ms" },
        saturation: { type: "ALARM: QueueDepthHigh", msg: `Queue depth ${8000 + n * 200} exceeded threshold; worker pool saturated on ${svc.name}`, metric: "queue_depth", value: 8000 + n * 200, unit: "msgs" },
        error_rate: { type: "ALARM: 5xxErrorRate", msg: `HTTP 5xx error rate ${(4 + n).toFixed(1)}% exceeded 2% threshold on ${svc.name}`, metric: "error_rate", value: 4 + n, unit: "%" },
        availability: { type: "ALARM: HealthCheckFailing", msg: `Health check failing (503) on ${svc.name}; target group unhealthy`, metric: "healthy_hosts", value: 1, unit: "hosts" },
        capacity: { type: "ALARM: DiskThroughput", msg: `Throughput limit reached on ${svc.name} storage volume`, metric: "throughput", value: 95 + n, unit: "%" },
      };
      const c = m[category] ?? m.error_rate!;
      return { ...base, eventType: c.type, message: c.msg, metric: c.metric, metricValue: c.value, metricUnit: c.unit, metadata: { region: "eu-west-2", namespace: "AWS/ApplicationELB" } };
    }
    if (source === "app_telemetry") {
      const m: Partial<Record<NormalisedCategory, { type: string; msg: string; metric: string; value: number; unit: string }>> = {
        error_rate: { type: "SLO breach: errors", msg: `Increased HTTP 500 responses (${(5 + n).toFixed(1)}% of requests) on ${svc.name}`, metric: "error_rate", value: 5 + n, unit: "%" },
        latency: { type: "SLO breach: latency", msg: `Request duration p95 ${900 + n * 30}ms above SLO on ${svc.name}`, metric: "latency_p95", value: 900 + n * 30, unit: "ms" },
        saturation: { type: "Resource saturation", msg: `Thread pool saturation and connection pool exhaustion on ${svc.name}`, metric: "pool_util", value: 96 + n, unit: "%" },
        availability: { type: "Health check failure", msg: `Readiness probe failing on ${svc.name} instances`, metric: "ready_replicas", value: 2, unit: "replicas" },
        dependency: { type: "Upstream timeout", msg: `Timeouts calling upstream dependency from ${svc.name}`, metric: "dep_timeout_rate", value: 12 + n, unit: "%" },
      };
      const c = m[category] ?? m.error_rate!;
      return { ...base, eventType: c.type, message: c.msg, metric: c.metric, metricValue: c.value, metricUnit: c.unit, metadata: { collector: "otel", slo: "availability" } };
    }
    if (source === "jira_service_desk") {
      const msgByCat: Partial<Record<NormalisedCategory, string>> = {
        error_rate: `Multiple citizens reporting failed transactions on ${svc.name}`,
        latency: `Citizens reporting very slow responses using ${svc.name}`,
        availability: `Citizens reporting ${svc.name} is unavailable / error page`,
        authentication: `Users unable to sign in — reported against ${svc.name}`,
        dependency: `Staff reporting ${svc.name} features failing intermittently`,
      };
      return { ...base, eventType: "Service desk ticket", message: msgByCat[category] ?? `Citizens reporting issues with ${svc.name}`, metric: "linked_tickets", metricValue: 3 + n, metricUnit: "tickets", metadata: { project: "SD", priority: rawSeverity, reporters: 3 + n } };
    }
    if (source === "exabeam") {
      return { ...base, eventType: "UEBA risk score increase", message: `Anomalous session behaviour and elevated risk score affecting ${svc.name}`, metric: "risk_score", metricValue: 78 + n, metricUnit: "score", metadata: { rule: "anomalous-session", entity: `${svc.slug}-svc-account` } };
    }
    return { ...base, eventType: "EDR detection", message: `Endpoint detection: suspicious credential access pattern near ${svc.name} hosts`, metric: "detections", metricValue: 1 + n, metricUnit: "count", metadata: { tactic: "Credential Access", technique: "T1552" } };
  }

  function dominantCategory(cats: NormalisedCategory[]): NormalisedCategory {
    const counts = new Map<NormalisedCategory, number>();
    cats.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
    let best = cats[0];
    let bestCount = 0;
    for (const [c, n] of counts) if (n > bestCount) { best = c; bestCount = n; }
    return best;
  }

  let eventSeq = 0;
  const nextEventId = () => `EVT-${String(++eventSeq).padStart(5, "0")}`;
  let auditSeq = 0;
  const nextAuditId = () => `AUD-${String(++auditSeq).padStart(5, "0")}`;

  const events: SeedResult["events"] = [];
  const incidents: SeedResult["incidents"] = [];
  const incidentEvents: SeedResult["incidentEvents"] = [];
  const triageDecisions: SeedResult["triageDecisions"] = [];
  const auditEvents: SeedResult["auditEvents"] = [];
  const automationExecutions: SeedResult["automationExecutions"] = [];
  const approvals: SeedResult["approvals"] = [];
  const notifications: SeedResult["notifications"] = [];
  const runbookExecCounts = new Map<string, { count: number; last: Date }>();
  const worstBySvc = new Map<string, Severity>();

  SCENARIOS.forEach((sc, idx) => {
    const incidentId = sc.featured ? DEMO_INCIDENT_ID : `INC-${1001 + idx}`;
    const svc = serviceById.get(sc.serviceId)!;
    const start = minutesAgo(sc.startMinutesAgo);

    const raws: RawEvent[] = [];
    sc.sources.forEach((source, i) => {
      const offset = Math.round((sc.spreadMinutes / Math.max(1, sc.sources.length)) * i);
      raws.push(rawEventFor(source, sc.serviceId, sc.category, new Date(start.getTime() + offset * 60000), sc.eventSeverities[i] ?? "warn", i + 1));
    });
    if (sc.sources.length >= 2 && rngChance(rng, 0.6)) {
      raws.push(rawEventFor(sc.sources[0], sc.serviceId, sc.category, new Date(start.getTime() + sc.spreadMinutes * 60000), sc.eventSeverities[0] ?? "warn", 9));
    }

    const normalised = normaliseBatch(raws);
    const eventIds = normalised.map(() => nextEventId());
    const depIds = dependenciesOf.get(sc.serviceId) ?? [];
    const corrInputs: CorrelationInput[] = normalised.map((n, i) => ({ ...n, id: eventIds[i], dependencyIds: depIds }));
    const scored = scoreCluster(corrInputs);
    const times = normalised.map((n) => n.occurredAt.getTime());
    const cluster = {
      confidence: scored.confidence,
      reason: scored.reason,
      factors: scored.factors,
      windowStart: new Date(Math.min(...times)),
      windowEnd: new Date(Math.max(...times)),
      isMultiSystem: new Set(normalised.map((n) => n.source)).size > 1,
    };
    const peakSeverity = normalised.reduce<Severity>((acc, e) => (SEVERITY_RANK[e.severity] > SEVERITY_RANK[acc] ? e.severity : acc), "info");
    const category = dominantCategory(normalised.map((n) => n.normalisedCategory));
    const dependents = dependentsOf.get(sc.serviceId) ?? [];
    const affectedServiceIds = [sc.serviceId, ...dependents];

    const triageCtx: TriageServiceContext = {
      id: svc.id, name: svc.name, criticality: svc.criticality, ownerTeam: svc.ownerTeam,
      ownerName: svc.ownerName, monthlyActiveUsers: svc.monthlyActiveUsers || 50000, downstreamCount: dependents.length,
    };
    const t = triage({ peakSeverity, category, eventCount: normalised.length, distinctSources: new Set(sc.sources).size, correlationConfidence: cluster.confidence, service: triageCtx, affectedServiceIds });
    const rec = recommendRunbook({ category, severity: t.severity, serviceCriticality: svc.criticality, approvalRequiredByTriage: t.approvalRequired }, runbookCandidates);

    const isClosedOrResolved = sc.status === "resolved" || sc.status === "closed";
    const detectedAt = cluster.windowStart;
    const acknowledgedAt = OPEN_LIKE.includes(sc.status)
      ? (sc.status === "detected" ? null : new Date(detectedAt.getTime() + rngInt(rng, 2, 12) * 60000))
      : new Date(detectedAt.getTime() + rngInt(rng, 2, 10) * 60000);
    const resolvedAt = isClosedOrResolved ? new Date(detectedAt.getTime() + rngInt(rng, 25, 90) * 60000) : null;

    normalised.forEach((n, i) => {
      events.push({
        id: eventIds[i], source: n.source, externalRef: n.externalRef, serviceId: n.serviceId, eventType: n.eventType,
        severity: n.severity, occurredAt: n.occurredAt, message: n.message, entity: n.entity, metric: n.metric,
        metricValue: n.metricValue, metricUnit: n.metricUnit, correlationKey: n.correlationKey,
        normalisedCategory: n.normalisedCategory, rawMetadata: n.rawMetadata, incidentId, createdAt: n.occurredAt,
      });
      incidentEvents.push({ id: `${incidentId}-ie-${i + 1}`, incidentId, eventId: eventIds[i], correlationReason: i === 0 ? "Originating signal" : cluster.reason, isSeed: i === 0, addedAt: n.occurredAt });
    });

    incidents.push({
      id: incidentId, title: sc.title, summary: sc.summary, severity: t.severity, status: sc.status,
      serviceId: sc.serviceId, affectedServiceIds, affectedUsersEstimate: t.estimatedUserImpact, category,
      urgency: t.urgency, serviceImpact: t.serviceImpact, likelyCause: sc.likelyCause, confidence: t.confidence,
      correlationConfidence: cluster.confidence, correlationReason: cluster.reason, recommendedRunbookId: rec.runbookId,
      recommendedAction: rec.action, ownerTeam: svc.ownerTeam, ownerName: svc.ownerName, isMultiSystem: cluster.isMultiSystem,
      detectedAt, acknowledgedAt, resolvedAt, windowStart: cluster.windowStart, windowEnd: cluster.windowEnd, createdAt: detectedAt,
    });

    triageDecisions.push({
      id: `${incidentId}-triage`, incidentId, severity: t.severity, urgency: t.urgency, serviceImpact: t.serviceImpact,
      estimatedUserImpact: t.estimatedUserImpact, category, recommendedOwner: t.recommendedOwner,
      recommendedRunbookId: rec.runbookId, confidence: t.confidence, approvalRequired: t.approvalRequired,
      rationale: t.rationale, createdAt: acknowledgedAt ?? detectedAt,
    });

    if (OPEN_LIKE.includes(sc.status)) {
      // Recovering incidents (monitoring/remediating) shouldn't render their
      // service as fully down — demote their effective severity one level.
      const recovering = sc.status === "monitoring" || sc.status === "remediating";
      const demote: Record<Severity, Severity> = { critical: "high", high: "medium", medium: "low", low: "low", info: "info" };
      const effective = recovering ? demote[t.severity] : t.severity;
      const cur = worstBySvc.get(sc.serviceId);
      if (!cur || SEVERITY_RANK[effective] > SEVERITY_RANK[cur]) worstBySvc.set(sc.serviceId, effective);
    }

    const auditAt = (offsetMin: number) => new Date(detectedAt.getTime() + offsetMin * 60000);
    auditEvents.push(
      { id: nextAuditId(), at: normalised[0].occurredAt, action: "event_received", actor: `adapter:${EVENT_SOURCE_LABEL[normalised[0].source]}`, summary: `Event received from ${EVENT_SOURCE_LABEL[normalised[0].source]} for ${svc.name}`, incidentId, serviceId: sc.serviceId, eventId: eventIds[0], runbookId: null, detail: { externalRef: normalised[0].externalRef } },
      { id: nextAuditId(), at: auditAt(1), action: "event_correlated", actor: "engine:correlation", summary: `${normalised.length} events correlated (${cluster.confidence}% confidence)`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: null, detail: { reason: cluster.reason } },
      { id: nextAuditId(), at: auditAt(1), action: "incident_created", actor: "engine:correlation", summary: `Incident ${incidentId} created for ${svc.name}`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: null, detail: { severity: t.severity } },
      { id: nextAuditId(), at: auditAt(2), action: "triage_performed", actor: "engine:triage", summary: `Triaged as ${t.severity} / ${t.urgency}; est. ${t.estimatedUserImpact.toLocaleString()} users impacted`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: null, detail: { confidence: t.confidence } },
      { id: nextAuditId(), at: auditAt(2), action: "owner_assigned", actor: "engine:routing", summary: `Routed to ${t.recommendedOwner}`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: null, detail: {} },
    );
    if (rec.runbookId) {
      auditEvents.push({ id: nextAuditId(), at: auditAt(3), action: "runbook_proposed", actor: "engine:runbook", summary: `Recommended runbook: ${rec.runbookName} (${rec.confidence}% match)`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: rec.runbookId, detail: { approvalRequired: rec.approvalRequired } });
    }

    if (sc.withAutomation && rec.runbookId) {
      const rbDef = RUNBOOK_DEFS.find((r) => r.id === rec.runbookId)!;
      const automationId = `${incidentId}-auto-1`;
      const healthBefore = rngInt(rng, 55, 72);
      const succeeded = sc.withAutomation === "succeeded";
      const proposedAt = auditAt(3);
      const startedAt = succeeded ? auditAt(6) : null;
      const completedAt = succeeded ? auditAt(12) : null;
      const healthAfter = succeeded ? rngInt(rng, 90, 98) : null;

      automationExecutions.push({
        id: automationId, incidentId, runbookId: rec.runbookId, status: succeeded ? "succeeded" : "awaiting_approval",
        risk: rbDef.risk, reason: rec.reason, expectedResult: rbDef.expectedOutcome, approvalRequired: rec.approvalRequired,
        requestedBy: "engine:runbook", outcome: succeeded ? "Simulated remediation succeeded; service health recovered." : null,
        healthBefore, healthAfter, proposedAt, startedAt, completedAt,
      });
      approvals.push({
        id: `${incidentId}-appr-1`, incidentId, automationId, status: rec.approvalRequired ? (succeeded ? "granted" : "pending") : "not_required",
        riskLevel: rbDef.risk, evidence: `${normalised.length} correlated signals across ${new Set(sc.sources).size} source(s); ${cluster.reason}`,
        expectedResult: rbDef.expectedOutcome, requestedBy: "engine:runbook", approver: succeeded ? "Incident Manager (on-call)" : null,
        requestedAt: proposedAt, decidedAt: succeeded ? startedAt : null,
      });
      auditEvents.push({ id: nextAuditId(), at: proposedAt, action: "approval_requested", actor: "engine:runbook", summary: `Approval requested for ${rec.runbookName} (${rbDef.risk} risk)`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: rec.runbookId, detail: {} });
      if (succeeded) {
        auditEvents.push(
          { id: nextAuditId(), at: startedAt!, action: "approval_granted", actor: "Incident Manager (on-call)", summary: `Approval granted for ${rec.runbookName}`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: rec.runbookId, detail: {} },
          { id: nextAuditId(), at: startedAt!, action: "automation_executed", actor: "engine:automation", summary: `Executing ${rec.runbookName} (simulated)`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: rec.runbookId, detail: { healthBefore } },
          { id: nextAuditId(), at: completedAt!, action: "automation_outcome", actor: "engine:automation", summary: `Simulated remediation succeeded; health ${healthBefore} → ${healthAfter}`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: rec.runbookId, detail: { healthAfter } },
        );
        const prev = runbookExecCounts.get(rec.runbookId);
        runbookExecCounts.set(rec.runbookId, { count: (prev?.count ?? 0) + 1, last: completedAt! });
      }
    }

    if (isClosedOrResolved && resolvedAt) {
      auditEvents.push({ id: nextAuditId(), at: resolvedAt, action: "incident_resolved", actor: "Incident Manager (on-call)", summary: `Incident ${incidentId} resolved`, incidentId, serviceId: sc.serviceId, eventId: null, runbookId: null, detail: {} });
    }

    if (OPEN_LIKE.includes(sc.status) && SEVERITY_RANK[t.severity] >= SEVERITY_RANK.high) {
      notifications.push({ id: `notif-${incidentId}`, at: detectedAt, kind: "incident", title: `${t.severity.toUpperCase()}: ${sc.title}`, body: `${svc.name} — ${cluster.reason}`, severity: t.severity, incidentId, read: false });
    }
  });

  // Background noise events (uncorrelated) to exceed 150 events.
  const noiseCategories: NormalisedCategory[] = ["latency", "error_rate", "saturation", "availability", "capacity"];
  const noiseSources: EventSource[] = ["cloudwatch", "app_telemetry", "jira_service_desk"];
  for (let i = 0; i < 120; i++) {
    const svc = rngPick(rng, SERVICE_DEFS);
    const source = rngPick(rng, noiseSources);
    const category = rngPick(rng, noiseCategories);
    const minsAgo = i < 18 ? rngInt(rng, 1, 58) : rngInt(rng, 60, 60 * 24);
    const raw = rawEventFor(source, svc.id, category, minutesAgo(minsAgo), rngPick(rng, ["info", "low", "warn", "medium"]), i + 20);
    const [n] = normaliseBatch([raw]);
    const id = nextEventId();
    events.push({
      id, source: n.source, externalRef: n.externalRef, serviceId: n.serviceId, eventType: n.eventType, severity: n.severity,
      occurredAt: n.occurredAt, message: n.message, entity: n.entity, metric: n.metric, metricValue: n.metricValue,
      metricUnit: n.metricUnit, correlationKey: n.correlationKey, normalisedCategory: n.normalisedCategory,
      rawMetadata: n.rawMetadata, incidentId: null, createdAt: n.occurredAt,
    });
    auditEvents.push({ id: nextAuditId(), at: n.occurredAt, action: "event_received", actor: `adapter:${EVENT_SOURCE_LABEL[n.source]}`, summary: `Event received from ${EVENT_SOURCE_LABEL[n.source]} for ${svc.name}`, incidentId: null, serviceId: svc.id, eventId: id, runbookId: null, detail: { externalRef: n.externalRef } });
  }

  // Services (final health/status baked in from open incidents).
  const services: SeedResult["services"] = SERVICE_DEFS.map((s) => {
    const worst = worstBySvc.get(s.id);
    let status = "healthy";
    let healthScore = rngInt(rng, 95, 99);
    if (worst) {
      status = worst === "critical" ? "down" : worst === "high" ? "impaired" : worst === "medium" ? "degraded" : "degraded";
      healthScore = worst === "critical" ? rngInt(rng, 30, 45) : worst === "high" ? rngInt(rng, 55, 68) : rngInt(rng, 70, 82);
    }
    return {
      id: s.id, name: s.name, slug: s.slug, description: s.description, ownerTeam: s.ownerTeam, ownerName: s.ownerName,
      criticality: s.criticality, status, slaTarget: s.slaTarget, slaResponseMins: s.slaResponseMins,
      slaResolveMins: s.slaResolveMins, healthScore, eventVolume30d: rngInt(rng, 40, 320),
      userImpactScale: s.userImpactScale, monthlyActiveUsers: s.monthlyActiveUsers, tags: s.tags, createdAt: daysAgo(120),
    };
  });

  const serviceDependencies: SeedResult["serviceDependencies"] = DEPENDENCY_DEFS.map((d, i) => ({
    id: `dep-${String(i + 1).padStart(3, "0")}`, serviceId: d.serviceId, dependsOnId: d.dependsOnId, kind: d.kind, description: d.description,
  }));

  const integrations: SeedResult["integrations"] = INTEGRATION_DEFS.map((it) => ({
    id: it.id, name: it.name, kind: it.kind, status: it.status, purpose: it.purpose, dataExpected: it.dataExpected,
    authConcept: it.authConcept, dataFlow: it.dataFlow, futureWork: it.futureWork, eventTypes: it.eventTypes,
    lastSyncAt: it.status === "demo_adapter" ? minutesAgo(rngInt(rng, 1, 6)) : null,
  }));

  const runbooks: SeedResult["runbooks"] = RUNBOOK_DEFS.map((rb) => {
    const exec = runbookExecCounts.get(rb.id);
    return {
      id: rb.id, name: rb.name, slug: rb.slug, purpose: rb.purpose, risk: rb.risk, category: rb.category,
      applicableCriticalities: rb.applicableCriticalities, approvalRequired: rb.approvalRequired,
      expectedOutcome: rb.expectedOutcome, rollbackConcept: rb.rollbackConcept, syntheticSuccessRate: rb.syntheticSuccessRate,
      executionCount: exec?.count ?? 0, lastExecutedAt: exec?.last ?? null,
    };
  });

  const runbookSteps: SeedResult["runbookSteps"] = RUNBOOK_DEFS.flatMap((rb) =>
    rb.steps.map((st, i) => ({ id: `${rb.id}-step-${i + 1}`, runbookId: rb.id, ordinal: i + 1, title: st.title, description: st.description, simulatedAction: st.simulatedAction })),
  );

  // Service metrics history (14 days, 2/day per service). RNG is drawn
  // unconditionally (before the NOW gate) so the deterministic stream — and
  // therefore everything generated after this — stays reproducible regardless
  // of the wall-clock time the seed runs.
  const serviceMetrics: SeedResult["serviceMetrics"] = [];
  for (const s of SERVICE_DEFS) {
    for (let d = 14; d >= 0; d--) {
      for (const hour of [9, 18]) {
        const at = new Date(daysAgo(d).getTime());
        at.setHours(hour, 0, 0, 0);
        const row = {
          id: `sm-${s.slug}-${d}-${hour}`, serviceId: s.id, capturedAt: at, healthScore: rngInt(rng, 92, 99),
          latencyMs: Math.round(60 + rng() * 180), errorRate: Math.round(rng() * 15) / 10,
          throughput: Math.round(200 + rng() * 2000), saturation: Math.round(30 + rng() * 50),
        };
        if (at.getTime() <= NOW.getTime()) serviceMetrics.push(row);
      }
    }
  }

  // Capacity forecasts (12 weeks history + 4 forecast).
  const capacityForecasts: SeedResult["capacityForecasts"] = [];
  for (let w = 11; w >= -4; w--) {
    const isForecast = w < 0;
    const periodStart = daysAgo(w * 7);
    const baseIncidents = 14 + Math.round(Math.sin(w) * 4) + rngInt(rng, 0, 6);
    const incidentCount = isForecast ? baseIncidents + 3 + Math.abs(w) : baseIncidents;
    const eventCount = incidentCount * rngInt(rng, 6, 12) + rngInt(rng, 40, 120);
    const automatedHandled = Math.round(incidentCount * (isForecast ? 0.55 : 0.4 + rng() * 0.15));
    const manualHandled = incidentCount - automatedHandled;
    capacityForecasts.push({
      id: `cap-w${w + 11}`, periodStart, periodLabel: isForecast ? `Forecast +${Math.abs(w)}w` : `Week -${w}`,
      isForecast, eventCount, incidentCount, manualHandled, automatedHandled,
      supportWorkloadHours: Math.round((manualHandled * 45 + automatedHandled * 8) / 6) / 10,
      automationRate: Math.round((automatedHandled / incidentCount) * 1000) / 10,
    });
  }

  // Resource scenarios (illustrative).
  const base = { incidentCount: 60, manualHandlingMins: 45, automatedHandlingPct: 55, humanReviewMins: 8, escalationPct: 20, supportStaffCapacityHours: 320 };
  const scenarioDefs = [
    { id: "res-baseline", name: "Current baseline", description: "Today's synthetic operating point.", ...base, isBaseline: true },
    { id: "res-conservative", name: "Conservative automation", description: "Cautious automation adoption.", ...base, automatedHandlingPct: 35, humanReviewMins: 10, isBaseline: false },
    { id: "res-target", name: "Target state", description: "Mature supervised automation.", ...base, automatedHandlingPct: 70, humanReviewMins: 6, escalationPct: 15, isBaseline: false },
  ];
  const resourceScenarios: SeedResult["resourceScenarios"] = scenarioDefs.map((s) => ({
    id: s.id, name: s.name, description: s.description, incidentCount: s.incidentCount, manualHandlingMins: s.manualHandlingMins,
    automatedHandlingPct: s.automatedHandlingPct, humanReviewMins: s.humanReviewMins, escalationPct: s.escalationPct,
    supportStaffCapacityHours: s.supportStaffCapacityHours, assumptions: computeResourceModel(s).assumptions, isBaseline: s.isBaseline,
  }));

  return {
    services, serviceDependencies, integrations, runbooks, runbookSteps, incidents, events, incidentEvents,
    triageDecisions, automationExecutions, approvals, auditEvents, serviceMetrics, capacityForecasts, resourceScenarios, notifications,
  };
}
