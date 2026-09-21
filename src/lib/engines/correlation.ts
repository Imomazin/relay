/**
 * Event correlation engine.
 *
 * Groups related normalised events into candidate incidents so that a single
 * underlying problem does not surface as several independent tickets. The
 * scoring is deliberately transparent: every correlation reports the factors
 * that contributed and a confidence percentage derived from them.
 */
import type { NormalisedEvent } from "./normalisation";
import { SEVERITY_RANK, type Severity } from "@/lib/domain";

export interface CorrelationInput extends NormalisedEvent {
  /** Stable id so clusters can reference the underlying events. */
  id: string;
  /** Direct + transitive service dependencies (service ids). */
  dependencyIds?: string[];
}

export interface CorrelationFactor {
  factor: string;
  weight: number;
  detail: string;
}

export interface CorrelationCluster {
  key: string;
  events: CorrelationInput[];
  serviceIds: string[];
  sources: string[];
  categories: string[];
  windowStart: Date;
  windowEnd: Date;
  peakSeverity: Severity;
  confidence: number;
  factors: CorrelationFactor[];
  reason: string;
  isMultiSystem: boolean;
}

/** Default correlation time window in minutes. */
export const DEFAULT_WINDOW_MINUTES = 30;

const FACTOR_WEIGHTS = {
  sameService: 30,
  sharedCorrelationKey: 25,
  timeProximity: 15,
  similarCategory: 12,
  sharedDependency: 10,
  multiSource: 8,
} as const;

function peak(events: { severity: Severity }[]): Severity {
  return events.reduce<Severity>((acc, e) => {
    return SEVERITY_RANK[e.severity] > SEVERITY_RANK[acc] ? e.severity : acc;
  }, "info");
}

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}

/**
 * Score a candidate cluster of events that already share a correlation key.
 * Returns the confidence (0-100) and the human-readable factors.
 */
export function scoreCluster(
  events: CorrelationInput[],
  windowMinutes = DEFAULT_WINDOW_MINUTES,
): { confidence: number; factors: CorrelationFactor[]; reason: string } {
  const factors: CorrelationFactor[] = [];
  const serviceIds = unique(events.map((e) => e.serviceId));
  const sources = unique(events.map((e) => e.source));
  const categories = unique(events.map((e) => e.normalisedCategory));

  // Same service.
  if (serviceIds.length === 1) {
    factors.push({
      factor: "Same service",
      weight: FACTOR_WEIGHTS.sameService,
      detail: `All ${events.length} events target ${serviceIds[0]}.`,
    });
  }

  // Repeating signal fingerprint (same service:category seen more than once).
  const keys = events.map((e) => e.correlationKey);
  const repeated = keys.some((k, i) => keys.indexOf(k) !== i);
  if (repeated || unique(keys).length === 1) {
    factors.push({
      factor: "Shared correlation key",
      weight: FACTOR_WEIGHTS.sharedCorrelationKey,
      detail: `Repeating signal fingerprint (${unique(keys).join(", ")}).`,
    });
  }

  // Time proximity.
  const times = events.map((e) => e.occurredAt.getTime());
  const spanMinutes = (Math.max(...times) - Math.min(...times)) / 60000;
  if (spanMinutes <= windowMinutes) {
    const proximityScore = Math.round(
      FACTOR_WEIGHTS.timeProximity * (1 - spanMinutes / windowMinutes),
    );
    factors.push({
      factor: "Time proximity",
      weight: Math.max(4, proximityScore),
      detail: `Events occurred within ${spanMinutes.toFixed(0)} min (window ${windowMinutes} min).`,
    });
  }

  // Similar / same category.
  if (categories.length === 1) {
    factors.push({
      factor: "Similar error category",
      weight: FACTOR_WEIGHTS.similarCategory,
      detail: `All events normalised to "${categories[0]}".`,
    });
  }

  // Shared dependency across differing services.
  if (serviceIds.length > 1) {
    const depSets = events.map((e) => new Set(e.dependencyIds ?? []));
    const shared = intersectAll(depSets);
    if (shared.length > 0) {
      factors.push({
        factor: "Shared infrastructure dependency",
        weight: FACTOR_WEIGHTS.sharedDependency,
        detail: `Services share dependency ${shared.join(", ")}.`,
      });
    }
  }

  // Multiple independent sources reinforce confidence.
  if (sources.length > 1) {
    factors.push({
      factor: "Corroborating sources",
      weight: FACTOR_WEIGHTS.multiSource,
      detail: `Signal seen across ${sources.length} systems: ${sources.join(", ")}.`,
    });
  }

  const rawConfidence = factors.reduce((sum, f) => sum + f.weight, 0);
  const confidence = Math.min(99, rawConfidence);
  const reason =
    factors.length === 0
      ? "Single isolated signal."
      : factors.map((f) => f.factor).join(" + ") + ".";

  return { confidence, factors, reason };
}

/**
 * Correlate a batch of events into clusters. Events are grouped by affected
 * service, then split so that any gap longer than `windowMinutes` starts a new
 * cluster (a fresh occurrence of a failure later on is a new incident, not the
 * same one). Grouping by service — rather than by exact signal fingerprint —
 * lets different signal types on the same service (e.g. a latency alarm and a
 * spike in HTTP 500s) collapse into a single incident.
 */
export function correlateEvents(
  events: CorrelationInput[],
  windowMinutes = DEFAULT_WINDOW_MINUTES,
): CorrelationCluster[] {
  const byKey = new Map<string, CorrelationInput[]>();
  for (const event of events) {
    const list = byKey.get(event.serviceId) ?? [];
    list.push(event);
    byKey.set(event.serviceId, list);
  }

  const clusters: CorrelationCluster[] = [];
  for (const [key, group] of byKey) {
    const sorted = [...group].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
    );

    let bucket: CorrelationInput[] = [];
    const flush = () => {
      if (bucket.length === 0) return;
      clusters.push(buildCluster(key, bucket, windowMinutes));
      bucket = [];
    };

    for (const event of sorted) {
      if (bucket.length === 0) {
        bucket.push(event);
        continue;
      }
      const last = bucket[bucket.length - 1];
      if (minutesBetween(event.occurredAt, last.occurredAt) <= windowMinutes) {
        bucket.push(event);
      } else {
        flush();
        bucket.push(event);
      }
    }
    flush();
  }

  return clusters.sort((a, b) => b.windowStart.getTime() - a.windowStart.getTime());
}

function buildCluster(
  key: string,
  events: CorrelationInput[],
  windowMinutes: number,
): CorrelationCluster {
  const { confidence, factors, reason } = scoreCluster(events, windowMinutes);
  const times = events.map((e) => e.occurredAt.getTime());
  const serviceIds = unique(events.map((e) => e.serviceId));
  const sources = unique(events.map((e) => e.source));
  return {
    key,
    events,
    serviceIds,
    sources,
    categories: unique(events.map((e) => e.normalisedCategory)),
    windowStart: new Date(Math.min(...times)),
    windowEnd: new Date(Math.max(...times)),
    peakSeverity: peak(events),
    confidence,
    factors,
    reason,
    isMultiSystem: sources.length > 1,
  };
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function intersectAll(sets: Set<string>[]): string[] {
  if (sets.length === 0) return [];
  return [...sets[0]].filter((v) => sets.every((s) => s.has(v)));
}
