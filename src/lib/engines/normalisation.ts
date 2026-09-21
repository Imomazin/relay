/**
 * Event normalisation engine.
 *
 * Each monitoring / service-management source emits events in its own shape.
 * Relay's adapters map those raw payloads onto a single normalised event model
 * so that downstream correlation and triage can reason across systems without
 * caring where a signal originated.
 *
 * The logic here is intentionally transparent and deterministic — no ML, no
 * external calls — so that operators can always explain *why* an event was
 * categorised the way it was.
 */
import {
  type EventSource,
  type NormalisedCategory,
  type Severity,
  SEVERITIES,
} from "@/lib/domain";

/** Raw event as delivered by a source adapter (loosely typed on purpose). */
export interface RawEvent {
  source: EventSource;
  externalRef: string;
  serviceId: string;
  /** Source-native event type / alarm name / signature. */
  eventType: string;
  /** Source-native severity string, if any. */
  rawSeverity?: string;
  occurredAt: Date;
  message: string;
  entity: string;
  metric?: string;
  metricValue?: number;
  metricUnit?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalisedEvent {
  source: EventSource;
  externalRef: string;
  serviceId: string;
  eventType: string;
  severity: Severity;
  occurredAt: Date;
  message: string;
  entity: string;
  metric?: string;
  metricValue?: number;
  metricUnit?: string;
  normalisedCategory: NormalisedCategory;
  correlationKey: string;
  rawMetadata: Record<string, unknown>;
}

/**
 * Map source-native severity vocabularies onto Relay's five-level scale.
 * Falls back to keyword inspection, then to "info".
 */
export function normaliseSeverity(raw: string | undefined, message: string): Severity {
  const value = (raw ?? "").toLowerCase().trim();
  const direct: Record<string, Severity> = {
    critical: "critical",
    crit: "critical",
    fatal: "critical",
    p1: "critical",
    sev1: "critical",
    alarm: "high",
    high: "high",
    error: "high",
    p2: "high",
    sev2: "high",
    warn: "medium",
    warning: "medium",
    medium: "medium",
    p3: "medium",
    minor: "low",
    low: "low",
    notice: "low",
    info: "info",
    informational: "info",
    ok: "info",
  };
  if (value && direct[value]) return direct[value];
  if (SEVERITIES.includes(value as Severity)) return value as Severity;

  const text = message.toLowerCase();
  if (/(outage|down|unavailable|breach|compromis|fatal)/.test(text)) return "critical";
  if (/(error|fail|500|timeout|saturat|exceeded)/.test(text)) return "high";
  if (/(latency|slow|degrad|elevated|retry)/.test(text)) return "medium";
  return "low";
}

/** Keyword + metric heuristics mapping an event onto a normalised category. */
export function classifyCategory(raw: RawEvent): NormalisedCategory {
  const haystack = `${raw.eventType} ${raw.message} ${raw.metric ?? ""}`.toLowerCase();

  if (raw.source === "crowdstrike" || raw.source === "exabeam") {
    if (/(auth|login|credential|mfa|password|token)/.test(haystack)) return "authentication";
    return "security";
  }
  if (/(auth|login|credential|mfa|unauthori|token expire)/.test(haystack)) return "authentication";
  if (/(latency|response time|slow|p95|p99|duration)/.test(haystack)) return "latency";
  if (/(5\d\d|error rate|errors|exception|failed request|failure)/.test(haystack)) return "error_rate";
  if (/(queue|backlog|saturat|cpu|memory|thread pool|connection pool)/.test(haystack)) return "saturation";
  if (/(disk|storage|capacity|quota|throughput limit)/.test(haystack)) return "capacity";
  if (/(unavailable|unreachable|healthcheck|health check|down|outage|502|503|504)/.test(haystack))
    return "availability";
  if (/(dependency|upstream|downstream|timeout calling|circuit)/.test(haystack)) return "dependency";
  return "error_rate";
}

/**
 * Build a stable correlation key. Events that should be considered "the same
 * underlying problem signal" produce the same key. We anchor on service +
 * normalised category so that, for example, a CloudWatch latency alarm and an
 * application-telemetry latency spike on the Payments service collapse together.
 */
export function buildCorrelationKey(serviceId: string, category: NormalisedCategory): string {
  return `${serviceId}:${category}`;
}

/** Normalise a single raw event from any adapter. */
export function normaliseEvent(raw: RawEvent): NormalisedEvent {
  const severity = normaliseSeverity(raw.rawSeverity, raw.message);
  const normalisedCategory = classifyCategory(raw);
  const correlationKey = buildCorrelationKey(raw.serviceId, normalisedCategory);

  return {
    source: raw.source,
    externalRef: raw.externalRef,
    serviceId: raw.serviceId,
    eventType: raw.eventType,
    severity,
    occurredAt: raw.occurredAt,
    message: raw.message,
    entity: raw.entity,
    metric: raw.metric,
    metricValue: raw.metricValue,
    metricUnit: raw.metricUnit,
    normalisedCategory,
    correlationKey,
    rawMetadata: {
      ...(raw.metadata ?? {}),
      sourceSeverity: raw.rawSeverity ?? null,
    },
  };
}

export function normaliseBatch(raws: RawEvent[]): NormalisedEvent[] {
  return raws.map(normaliseEvent);
}
