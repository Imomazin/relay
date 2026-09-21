import { describe, it, expect } from "vitest";
import { recommendRunbook, type RunbookCandidate } from "./runbook";

const candidates: RunbookCandidate[] = [
  { id: "rb-scale-worker", name: "Scale Worker", category: "saturation", risk: "medium", approvalRequired: true, applicableCriticalities: ["tier1", "tier2"], syntheticSuccessRate: 92 },
  { id: "rb-restart", name: "Restart", category: "error_rate", risk: "medium", approvalRequired: true, applicableCriticalities: ["tier1", "tier2", "tier3"], syntheticSuccessRate: 88 },
  { id: "rb-health", name: "Health Check", category: "availability", risk: "low", approvalRequired: false, applicableCriticalities: ["tier1", "tier2", "tier3"], syntheticSuccessRate: 98 },
];

describe("recommendRunbook", () => {
  it("selects the category-matching runbook", () => {
    const r = recommendRunbook({ category: "saturation", severity: "high", serviceCriticality: "tier1", approvalRequiredByTriage: true }, candidates);
    expect(r.runbookId).toBe("rb-scale-worker");
    expect(r.approvalRequired).toBe(true);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("requires approval for high severity even if the runbook is auto-eligible", () => {
    const r = recommendRunbook({ category: "availability", severity: "high", serviceCriticality: "tier1", approvalRequiredByTriage: false }, candidates);
    expect(r.runbookId).toBe("rb-health");
    expect(r.approvalRequired).toBe(true);
  });

  it("allows auto-eligibility for a low-severity availability incident", () => {
    const r = recommendRunbook({ category: "availability", severity: "low", serviceCriticality: "tier3", approvalRequiredByTriage: false }, candidates);
    expect(r.approvalRequired).toBe(false);
  });

  it("falls back safely when no runbook matches the category", () => {
    const r = recommendRunbook({ category: "dependency", severity: "medium", serviceCriticality: "tier2", approvalRequiredByTriage: false }, candidates);
    expect(r.approvalRequired).toBe(true);
    expect(r.reason).toMatch(/no runbook/i);
  });
});
