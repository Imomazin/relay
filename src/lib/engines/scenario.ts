/**
 * Scenario builder — runs the full deterministic pipeline (normalise → correlate
 * → triage → recommend) over a freshly-generated set of raw events for one
 * service. Shared by the live event-replay injection (src/lib/actions.ts) and
 * unit tests, so the "live" demo exercises exactly the same engines as the seed.
 */
import {
  normaliseBatch,
  type RawEvent,
  type NormalisedEvent,
} from "./normalisation";
import { scoreCluster, type CorrelationInput, type CorrelationFactor } from "./correlation";
import { triage, type TriageResult, type TriageServiceContext } from "./triage";
import { recommendRunbook, type RunbookCandidate, type RunbookRecommendation } from "./runbook";
import { type EventSource, type NormalisedCategory, type Severity, SEVERITY_RANK } from "@/lib/domain";

export interface ScenarioServiceContext extends TriageServiceContext {
  slug: string;
  /** Direct dependency service ids (used for shared-dependency correlation). */
  dependencyIds: string[];
  /** Downstream dependent service ids (blast radius). */
  dependentIds: string[];
}

export interface ScenarioInput {
  service: ScenarioServiceContext;
  category: NormalisedCategory;
  sources: EventSource[];
  /** Severity hint per source, same order as `sources`. */
  severities?: string[];
  now?: Date;
  /** Minutes the signals are spread across (<= correlation window). */
  spreadMinutes?: number;
}

export interface ScenarioResult {
  rawEvents: RawEvent[];
  normalised: NormalisedEvent[];
  confidence: number;
  factors: CorrelationFactor[];
  reason: string;
  windowStart: Date;
  windowEnd: Date;
  isMultiSystem: boolean;
  peakSeverity: Severity;
  category: NormalisedCategory;
  affectedServiceIds: string[];
  triage: TriageResult;
  recommendation: RunbookRecommendation;
}

/** Message/metric templates per source + category (mirror of the seed's shapes). */
function rawEventFor(
  source: EventSource,
  service: ScenarioServiceContext,
  category: NormalisedCategory,
  occurredAt: Date,
  severity: string,
  n: number,
): RawEvent {
  const base = {
    source,
    externalRef: `${source}-live-${occurredAt.getTime()}-${n}`,
    serviceId: service.id,
    occurredAt,
    rawSeverity: severity,
    entity: `${service.slug}-prod`,
  };
  const name = service.name;
  if (source === "cloudwatch") {
    const m: Partial<Record<NormalisedCategory, [string, string, string, number, string]>> = {
      latency: ["ALARM: HighLatency", `p99 latency ${1200 + n * 40}ms exceeded 500ms threshold on ${name}`, "latency_p99", 1200 + n * 40, "ms"],
      saturation: ["ALARM: QueueDepthHigh", `Queue depth ${8000 + n * 200} exceeded threshold; worker pool saturated on ${name}`, "queue_depth", 8000 + n * 200, "msgs"],
      error_rate: ["ALARM: 5xxErrorRate", `HTTP 5xx error rate ${(4 + n).toFixed(1)}% exceeded 2% threshold on ${name}`, "error_rate", 4 + n, "%"],
      availability: ["ALARM: HealthCheckFailing", `Health check failing (503) on ${name}; target group unhealthy`, "healthy_hosts", 1, "hosts"],
      capacity: ["ALARM: DiskThroughput", `Throughput limit reached on ${name} storage volume`, "throughput", 95 + n, "%"],
    };
    const c = m[category] ?? m.error_rate!;
    return { ...base, eventType: c[0], message: c[1], metric: c[2], metricValue: c[3], metricUnit: c[4], metadata: { region: "eu-west-2", namespace: "AWS/ApplicationELB" } };
  }
  if (source === "app_telemetry") {
    const m: Partial<Record<NormalisedCategory, [string, string, string, number, string]>> = {
      error_rate: ["SLO breach: errors", `Increased HTTP 500 responses (${(5 + n).toFixed(1)}% of requests) on ${name}`, "error_rate", 5 + n, "%"],
      latency: ["SLO breach: latency", `Request duration p95 ${900 + n * 30}ms above SLO on ${name}`, "latency_p95", 900 + n * 30, "ms"],
      saturation: ["Resource saturation", `Thread pool saturation and connection pool exhaustion on ${name}`, "pool_util", 96 + n, "%"],
      availability: ["Health check failure", `Readiness probe failing on ${name} instances`, "ready_replicas", 2, "replicas"],
      dependency: ["Upstream timeout", `Timeouts calling upstream dependency from ${name}`, "dep_timeout_rate", 12 + n, "%"],
    };
    const c = m[category] ?? m.error_rate!;
    return { ...base, eventType: c[0], message: c[1], metric: c[2], metricValue: c[3], metricUnit: c[4], metadata: { collector: "otel" } };
  }
  if (source === "jira_service_desk") {
    const msg: Partial<Record<NormalisedCategory, string>> = {
      error_rate: `Multiple citizens reporting failed transactions on ${name}`,
      latency: `Citizens reporting very slow responses using ${name}`,
      availability: `Citizens reporting ${name} is unavailable / error page`,
      authentication: `Users unable to sign in — reported against ${name}`,
      dependency: `Staff reporting ${name} features failing intermittently`,
    };
    return { ...base, eventType: "Service desk ticket", message: msg[category] ?? `Citizens reporting issues with ${name}`, metric: "linked_tickets", metricValue: 3 + n, metricUnit: "tickets", metadata: { project: "SD", reporters: 3 + n } };
  }
  if (source === "exabeam") {
    return { ...base, eventType: "UEBA risk score increase", message: `Anomalous session behaviour and elevated risk score affecting ${name}`, metric: "risk_score", metricValue: 78 + n, metricUnit: "score", metadata: { rule: "anomalous-session" } };
  }
  return { ...base, eventType: "EDR detection", message: `Endpoint detection: suspicious credential access pattern near ${name} hosts`, metric: "detections", metricValue: 1 + n, metricUnit: "count", metadata: { tactic: "Credential Access", technique: "T1552" } };
}

export function buildScenario(input: ScenarioInput, runbookCandidates: RunbookCandidate[]): ScenarioResult {
  const now = input.now ?? new Date();
  const spread = input.spreadMinutes ?? 12;
  const service = input.service;

  const rawEvents: RawEvent[] = input.sources.map((source, i) => {
    const offset = Math.round((spread / Math.max(1, input.sources.length)) * i);
    return rawEventFor(source, service, input.category, new Date(now.getTime() - (spread - offset) * 60000), input.severities?.[i] ?? "alarm", i + 1);
  });

  const normalised = normaliseBatch(rawEvents);
  const corrInputs: CorrelationInput[] = normalised.map((n, i) => ({ ...n, id: `tmp-${i}`, dependencyIds: service.dependencyIds }));
  const scored = scoreCluster(corrInputs);

  const times = normalised.map((n) => n.occurredAt.getTime());
  const peakSeverity = normalised.reduce<Severity>((acc, e) => (SEVERITY_RANK[e.severity] > SEVERITY_RANK[acc] ? e.severity : acc), "info");

  // Dominant category across the normalised signals.
  const counts = new Map<NormalisedCategory, number>();
  normalised.forEach((n) => counts.set(n.normalisedCategory, (counts.get(n.normalisedCategory) ?? 0) + 1));
  const category = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const affectedServiceIds = [service.id, ...service.dependentIds];

  const triageResult = triage({
    peakSeverity,
    category,
    eventCount: normalised.length,
    distinctSources: new Set(input.sources).size,
    correlationConfidence: scored.confidence,
    service,
    affectedServiceIds,
  });

  const recommendation = recommendRunbook(
    { category, severity: triageResult.severity, serviceCriticality: service.criticality, approvalRequiredByTriage: triageResult.approvalRequired },
    runbookCandidates,
  );

  return {
    rawEvents,
    normalised,
    confidence: scored.confidence,
    factors: scored.factors,
    reason: scored.reason,
    windowStart: new Date(Math.min(...times)),
    windowEnd: new Date(Math.max(...times)),
    isMultiSystem: new Set(input.sources).size > 1,
    peakSeverity,
    category,
    affectedServiceIds,
    triage: triageResult,
    recommendation,
  };
}
