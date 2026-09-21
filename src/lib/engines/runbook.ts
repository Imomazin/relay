/**
 * Runbook recommendation engine.
 *
 * Maps a triaged incident's normalised category (and severity) onto the most
 * appropriate simulated runbook. Every recommendation is explainable: it
 * reports why the runbook was chosen and whether approval is required.
 *
 * No runbook performs destructive actions against real infrastructure — all
 * actions in the demonstrator are simulated against synthetic services. See
 * docs/automation-safety.md.
 */
import { type NormalisedCategory, type RiskLevel, type Severity, SEVERITY_RANK } from "@/lib/domain";

export interface RunbookCandidate {
  id: string;
  name: string;
  category: NormalisedCategory;
  risk: RiskLevel;
  approvalRequired: boolean;
  applicableCriticalities: string[];
  syntheticSuccessRate: number;
}

export interface RunbookRecommendationInput {
  category: NormalisedCategory;
  severity: Severity;
  serviceCriticality: string;
  approvalRequiredByTriage: boolean;
}

export interface RunbookRecommendation {
  runbookId: string | null;
  runbookName: string | null;
  confidence: number;
  approvalRequired: boolean;
  reason: string;
  action: string;
}

/**
 * Preferred remediation intent per category. Used to phrase the recommended
 * action and to prefer a runbook whose category matches.
 */
const CATEGORY_ACTION: Record<NormalisedCategory, string> = {
  saturation: "Scale the affected worker pool to relieve queue saturation",
  capacity: "Scale capacity / clear the backlog for the affected resource",
  latency: "Scale the affected service tier and clear slow request backlog",
  error_rate: "Restart the affected service instances and collect diagnostics",
  availability: "Trigger a health check and restart unhealthy instances",
  dependency: "Fail over to a healthy dependency and open a coordination incident",
  authentication: "Escalate to identity on-call and collect authentication diagnostics",
  security: "Escalate to the security team and preserve diagnostics for review",
};

export function recommendRunbook(
  input: RunbookRecommendationInput,
  candidates: RunbookCandidate[],
): RunbookRecommendation {
  const action = CATEGORY_ACTION[input.category];

  // Rank candidates: exact category match first, then applicability, then
  // synthetic success rate.
  const scored = candidates
    .map((rb) => {
      let score = 0;
      if (rb.category === input.category) score += 50;
      if (rb.applicableCriticalities.includes(input.serviceCriticality)) score += 20;
      score += rb.syntheticSuccessRate * 0.2;
      // Prefer lower-risk runbooks when severities are comparable.
      score += rb.risk === "low" ? 6 : rb.risk === "medium" ? 3 : 0;
      return { rb, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.rb.category !== input.category) {
    // No category-appropriate runbook — recommend collecting diagnostics and
    // escalating to a human. This is a safe default.
    const fallback = candidates.find((c) => c.category === "availability") ?? candidates[0];
    return {
      runbookId: fallback?.id ?? null,
      runbookName: fallback?.name ?? null,
      confidence: 45,
      approvalRequired: true,
      reason: `No runbook precisely matches "${input.category}"; recommending diagnostics + human escalation.`,
      action: `${action} (manual — no exact runbook match).`,
    };
  }

  const rb = best.rb;
  // Approval required if triage demands it, the runbook demands it, the runbook
  // is high risk, or the incident is high/critical severity.
  const approvalRequired =
    input.approvalRequiredByTriage ||
    rb.approvalRequired ||
    rb.risk === "high" ||
    SEVERITY_RANK[input.severity] >= SEVERITY_RANK.high;

  const confidence = Math.min(97, Math.round(best.score));

  return {
    runbookId: rb.id,
    runbookName: rb.name,
    confidence,
    approvalRequired,
    reason: `Category "${input.category}" maps to ${rb.name} (synthetic success ${rb.syntheticSuccessRate}%). ${
      approvalRequired ? "Human approval required." : "Eligible for supervised automation."
    }`,
    action,
  };
}
