import { describe, it, expect } from "vitest";
import { buildScenario, type ScenarioServiceContext } from "./scenario";
import type { RunbookCandidate } from "./runbook";
import { SEVERITY_RANK } from "@/lib/domain";

const candidates: RunbookCandidate[] = [
  { id: "rb-scale-worker", name: "Scale Worker", category: "saturation", risk: "medium", approvalRequired: true, applicableCriticalities: ["tier1", "tier2"], syntheticSuccessRate: 92 },
  { id: "rb-restart", name: "Restart", category: "error_rate", risk: "medium", approvalRequired: true, applicableCriticalities: ["tier1", "tier2", "tier3"], syntheticSuccessRate: 88 },
  { id: "rb-escalate-identity", name: "Escalate Identity", category: "authentication", risk: "medium", approvalRequired: true, applicableCriticalities: ["tier1", "tier2"], syntheticSuccessRate: 90 },
];

function svc(partial: Partial<ScenarioServiceContext> = {}): ScenarioServiceContext {
  return {
    id: "svc-payments", name: "Payments Service", slug: "payments", criticality: "tier1",
    ownerTeam: "Payments Engineering", ownerName: "R. Iqbal", monthlyActiveUsers: 210000,
    downstreamCount: 1, dependencyIds: ["svc-identity", "svc-api-gateway"], dependentIds: ["svc-citizen-portal"],
    ...partial,
  };
}

describe("buildScenario", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("runs the full pipeline over multi-source signals", () => {
    const r = buildScenario({ service: svc(), category: "saturation", sources: ["cloudwatch", "app_telemetry", "jira_service_desk"], severities: ["alarm", "error", "high"], now }, candidates);
    expect(r.rawEvents).toHaveLength(3);
    expect(r.normalised).toHaveLength(3);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.isMultiSystem).toBe(true);
    expect(r.affectedServiceIds).toContain("svc-payments");
    expect(r.affectedServiceIds).toContain("svc-citizen-portal");
    expect(SEVERITY_RANK[r.triage.severity]).toBeGreaterThanOrEqual(SEVERITY_RANK.high);
  });

  it("recommends a category-appropriate runbook and requires approval for a tier-1 incident", () => {
    const r = buildScenario({ service: svc(), category: "saturation", sources: ["cloudwatch", "app_telemetry"], now }, candidates);
    expect(r.recommendation.runbookId).toBe("rb-scale-worker");
    expect(r.recommendation.approvalRequired).toBe(true);
  });

  it("classifies CloudWatch + telemetry + tickets consistently and places events in the window", () => {
    const r = buildScenario({ service: svc(), category: "error_rate", sources: ["cloudwatch", "app_telemetry", "jira_service_desk"], now }, candidates);
    expect(r.windowStart.getTime()).toBeLessThanOrEqual(r.windowEnd.getTime());
    expect(r.windowEnd.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(r.category).toBe("error_rate");
  });

  it("is deterministic for identical inputs", () => {
    const a = buildScenario({ service: svc(), category: "saturation", sources: ["cloudwatch", "app_telemetry"], now }, candidates);
    const b = buildScenario({ service: svc(), category: "saturation", sources: ["cloudwatch", "app_telemetry"], now }, candidates);
    expect(a.triage.severity).toBe(b.triage.severity);
    expect(a.confidence).toBe(b.confidence);
    expect(a.normalised.map((n) => n.message)).toEqual(b.normalised.map((n) => n.message));
  });
});
