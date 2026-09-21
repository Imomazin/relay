import { describe, it, expect } from "vitest";
import { triage, computeSeverity, estimateUserImpact, type TriageInput, type TriageServiceContext } from "./triage";

function svc(partial: Partial<TriageServiceContext> = {}): TriageServiceContext {
  return {
    id: "svc-payments",
    name: "Payments Service",
    criticality: "tier1",
    ownerTeam: "Payments Engineering",
    ownerName: "R. Iqbal",
    monthlyActiveUsers: 200000,
    downstreamCount: 2,
    ...partial,
  };
}

function input(partial: Partial<TriageInput> = {}): TriageInput {
  return {
    peakSeverity: "high",
    category: "saturation",
    eventCount: 3,
    distinctSources: 3,
    correlationConfidence: 80,
    service: svc(),
    affectedServiceIds: ["svc-payments", "svc-citizen-portal", "svc-api-gateway"],
    ...partial,
  };
}

describe("computeSeverity", () => {
  it("escalates for tier-1 services and wide blast radius", () => {
    const { severity } = computeSeverity(input({ peakSeverity: "medium" }));
    expect(["high", "critical"]).toContain(severity);
  });

  it("escalates security categories", () => {
    const a = computeSeverity(input({ peakSeverity: "medium", category: "error_rate", service: svc({ criticality: "tier3", downstreamCount: 0 }), affectedServiceIds: ["svc-x"], distinctSources: 1 }));
    const b = computeSeverity(input({ peakSeverity: "medium", category: "security", service: svc({ criticality: "tier3", downstreamCount: 0 }), affectedServiceIds: ["svc-x"], distinctSources: 1 }));
    expect(b.severity).not.toBe("info");
    // security gets a bump relative to the same non-security case
    const rank = { info: 1, low: 2, medium: 3, high: 4, critical: 5 } as const;
    expect(rank[b.severity]).toBeGreaterThanOrEqual(rank[a.severity]);
  });
});

describe("estimateUserImpact", () => {
  it("scales with severity and MAU and stays bounded", () => {
    const low = estimateUserImpact(input(), "low");
    const crit = estimateUserImpact(input(), "critical");
    expect(crit).toBeGreaterThan(low);
    expect(crit).toBeLessThan(svc().monthlyActiveUsers);
  });
});

describe("triage", () => {
  it("requires approval for tier-1 / high severity", () => {
    const r = triage(input());
    expect(r.approvalRequired).toBe(true);
    expect(r.recommendedOwner).toContain("Payments Engineering");
    expect(r.rationale.length).toBeGreaterThan(0);
  });

  it("allows supervised automation for a low-risk tier-3 incident", () => {
    const r = triage(input({
      peakSeverity: "low",
      category: "capacity",
      service: svc({ criticality: "tier3", downstreamCount: 0, monthlyActiveUsers: 20000 }),
      affectedServiceIds: ["svc-reporting"],
      distinctSources: 1,
      correlationConfidence: 40,
    }));
    expect(r.approvalRequired).toBe(false);
  });

  it("is deterministic for the same input", () => {
    expect(triage(input())).toEqual(triage(input()));
  });
});
