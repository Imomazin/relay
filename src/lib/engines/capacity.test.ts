import { describe, it, expect } from "vitest";
import { computeResourceModel, computeMtt, automationRate } from "./capacity";

describe("computeResourceModel", () => {
  const base = { incidentCount: 100, manualHandlingMins: 45, automatedHandlingPct: 50, humanReviewMins: 8, escalationPct: 20, supportStaffCapacityHours: 300 };

  it("computes a consistent, bounded model", () => {
    const m = computeResourceModel(base);
    expect(m.automatedIncidentCount + m.manualIncidentCount).toBe(base.incidentCount);
    expect(m.totalWorkloadHours).toBeLessThan(m.baselineFullyManualHours);
    expect(m.potentialHoursAvoided).toBeGreaterThan(0);
    expect(m.assumptions.length).toBeGreaterThan(0);
  });

  it("avoids more hours with higher automation", () => {
    const low = computeResourceModel({ ...base, automatedHandlingPct: 20 });
    const high = computeResourceModel({ ...base, automatedHandlingPct: 80 });
    expect(high.potentialHoursAvoided).toBeGreaterThan(low.potentialHoursAvoided);
  });

  it("respects escalation always costing full manual handling", () => {
    const m = computeResourceModel({ ...base, escalationPct: 100, automatedHandlingPct: 100 });
    expect(m.automatedIncidentCount).toBe(0);
  });
});

describe("computeMtt", () => {
  it("computes mean time to acknowledge and resolve", () => {
    const detectedAt = new Date("2026-01-01T00:00:00Z");
    const mtt = computeMtt([
      { detectedAt, acknowledgedAt: new Date("2026-01-01T00:10:00Z"), resolvedAt: new Date("2026-01-01T01:00:00Z") },
      { detectedAt, acknowledgedAt: new Date("2026-01-01T00:20:00Z"), resolvedAt: null },
    ]);
    expect(mtt.mttaMinutes).toBe(15);
    expect(mtt.mttrMinutes).toBe(60);
  });

  it("returns null when there is nothing to measure", () => {
    const mtt = computeMtt([{ detectedAt: new Date(), acknowledgedAt: null, resolvedAt: null }]);
    expect(mtt.mttaMinutes).toBeNull();
    expect(mtt.mttrMinutes).toBeNull();
  });
});

describe("automationRate", () => {
  it("computes a percentage", () => {
    expect(automationRate(3, 4)).toBe(75);
    expect(automationRate(0, 0)).toBe(0);
  });
});
