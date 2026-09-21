/**
 * Triage engine.
 *
 * Turns a correlated cluster of events into a triage decision: severity,
 * urgency, service impact, estimated user impact, category, recommended owner,
 * confidence, and whether human approval is required before any automated
 * remediation.
 *
 * The logic is deterministic and rule-based. See docs/orchestration-methodology.md
 * for the full rationale and limitations. Relay presents this as decision
 * support — never as an autonomous authority.
 */
import {
  type Criticality,
  type NormalisedCategory,
  type Severity,
  SEVERITY_RANK,
} from "@/lib/domain";

export type Urgency = "low" | "medium" | "high" | "critical";

export interface TriageServiceContext {
  id: string;
  name: string;
  criticality: Criticality;
  ownerTeam: string;
  ownerName: string;
  monthlyActiveUsers: number;
  /** Count of downstream services that depend on this one. */
  downstreamCount: number;
}

export interface TriageInput {
  peakSeverity: Severity;
  category: NormalisedCategory;
  eventCount: number;
  distinctSources: number;
  correlationConfidence: number;
  service: TriageServiceContext;
  affectedServiceIds: string[];
}

export interface TriageResult {
  severity: Severity;
  urgency: Urgency;
  serviceImpact: string;
  estimatedUserImpact: number;
  category: NormalisedCategory;
  recommendedOwner: string;
  confidence: number;
  approvalRequired: boolean;
  rationale: string[];
}

const CRITICALITY_BOOST: Record<Criticality, number> = {
  tier1: 1,
  tier2: 0,
  tier3: 0,
};

const URGENCY_BY_SEVERITY: Record<Severity, Urgency> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  info: "low",
};

const CATEGORY_USER_IMPACT_FACTOR: Record<NormalisedCategory, number> = {
  availability: 0.6,
  error_rate: 0.4,
  latency: 0.25,
  saturation: 0.3,
  authentication: 0.5,
  security: 0.2,
  dependency: 0.35,
  capacity: 0.15,
};

function rankToSeverity(rank: number): Severity {
  const clamped = Math.max(1, Math.min(5, rank));
  return (["info", "low", "medium", "high", "critical"] as Severity[])[clamped - 1];
}

/** Escalate severity for critical services and multi-service blast radius. */
export function computeSeverity(input: TriageInput): { severity: Severity; notes: string[] } {
  const notes: string[] = [];
  let rank = SEVERITY_RANK[input.peakSeverity];

  const boost = CRITICALITY_BOOST[input.service.criticality];
  if (boost > 0) {
    rank += boost;
    notes.push(
      `+${boost} for ${input.service.criticality} service (${input.service.name}).`,
    );
  }

  if (input.affectedServiceIds.length >= 3) {
    rank += 1;
    notes.push(`+1 for blast radius across ${input.affectedServiceIds.length} services.`);
  }

  if (input.distinctSources >= 3) {
    rank += 1;
    notes.push(`+1 for corroboration across ${input.distinctSources} monitoring sources.`);
  }

  if (input.category === "security" || input.category === "authentication") {
    rank += 1;
    notes.push("+1 for security-sensitive category.");
  }

  const severity = rankToSeverity(rank);
  if (severity !== input.peakSeverity) {
    notes.push(`Raw peak ${input.peakSeverity} escalated to ${severity}.`);
  }
  return { severity, notes };
}

/** Estimate the number of users affected using a transparent, bounded model. */
export function estimateUserImpact(input: TriageInput, severity: Severity): number {
  const base = input.service.monthlyActiveUsers;
  const severityFactor: Record<Severity, number> = {
    critical: 0.35,
    high: 0.18,
    medium: 0.08,
    low: 0.02,
    info: 0.005,
  };
  const categoryFactor = CATEGORY_USER_IMPACT_FACTOR[input.category];
  const raw = base * severityFactor[severity] * categoryFactor;
  // Slight amplification for multi-service incidents.
  const amplify = 1 + Math.min(0.5, (input.affectedServiceIds.length - 1) * 0.15);
  return Math.round(raw * amplify);
}

export function triage(input: TriageInput): TriageResult {
  const rationale: string[] = [];
  const { severity, notes } = computeSeverity(input);
  rationale.push(...notes);

  const urgency = URGENCY_BY_SEVERITY[severity];
  const estimatedUserImpact = estimateUserImpact(input, severity);

  const serviceImpact =
    input.affectedServiceIds.length > 1
      ? `${input.service.name} plus ${input.affectedServiceIds.length - 1} downstream service(s) affected.`
      : `${input.service.name} degraded; no downstream services impacted yet.`;

  rationale.push(
    `Estimated ${estimatedUserImpact.toLocaleString()} users impacted from ${input.service.monthlyActiveUsers.toLocaleString()} MAU baseline.`,
  );

  // Confidence blends correlation confidence with signal volume.
  const volumeConfidence = Math.min(20, input.eventCount * 4);
  const confidence = Math.min(
    98,
    Math.round(input.correlationConfidence * 0.7 + volumeConfidence + 8),
  );

  // Approval requirement: high/critical, security categories, or tier1 always
  // require a human in the loop before remediation.
  const approvalRequired =
    SEVERITY_RANK[severity] >= SEVERITY_RANK.high ||
    input.service.criticality === "tier1" ||
    input.category === "security" ||
    input.category === "authentication";

  if (approvalRequired) {
    rationale.push("Human approval required before any automated remediation.");
  } else {
    rationale.push("Low-risk profile: eligible for supervised automation.");
  }

  return {
    severity,
    urgency,
    serviceImpact,
    estimatedUserImpact,
    category: input.category,
    recommendedOwner: `${input.service.ownerTeam} (${input.service.ownerName})`,
    confidence,
    approvalRequired,
    rationale,
  };
}
