import { describe, it, expect } from "vitest";
import {
  correlateChanges,
  computeChangeMetrics,
  type ChangeDeployment,
  type ChangeIncidentRef,
} from "./change";

const base = new Date("2026-10-08T12:00:00Z");
const mins = (m: number) => new Date(base.getTime() + m * 60000);

function deployment(over: Partial<ChangeDeployment>): ChangeDeployment {
  return {
    id: "dep-1", serviceId: "svc-a", serviceName: "Service A", system: "GitHub Actions",
    repo: "org/a", commitSha: "abc1234", author: "dev", environment: "production",
    deployedAt: base, status: "succeeded", ...over,
  };
}

function incident(over: Partial<ChangeIncidentRef>): ChangeIncidentRef {
  return { id: "inc-1", serviceId: "svc-a", detectedAt: mins(6), severity: "high", title: "Latency", ...over };
}

describe("correlateChanges", () => {
  it("links an incident to a deployment to the same service within the window", () => {
    const deps = [deployment({ id: "d1", deployedAt: base })];
    const incs = [incident({ detectedAt: mins(6) })];
    const out = correlateChanges(deps, incs, 30);
    expect(out).toHaveLength(1);
    expect(out[0].deployment.id).toBe("d1");
    expect(out[0].minutesBefore).toBe(6);
  });

  it("ignores deployments outside the window or after the incident", () => {
    const deps = [
      deployment({ id: "old", deployedAt: mins(-120) }),
      deployment({ id: "after", deployedAt: mins(20) }),
    ];
    const incs = [incident({ detectedAt: mins(6) })];
    expect(correlateChanges(deps, incs, 30)).toHaveLength(0);
  });

  it("ignores deployments to a different service", () => {
    const deps = [deployment({ id: "d1", serviceId: "svc-b", deployedAt: base })];
    const incs = [incident({ serviceId: "svc-a", detectedAt: mins(6) })];
    expect(correlateChanges(deps, incs, 30)).toHaveLength(0);
  });

  it("chooses the closest preceding deployment", () => {
    const deps = [
      deployment({ id: "earlier", deployedAt: mins(0) }),
      deployment({ id: "closer", deployedAt: mins(4) }),
    ];
    const incs = [incident({ detectedAt: mins(6) })];
    const out = correlateChanges(deps, incs, 30);
    expect(out[0].deployment.id).toBe("closer");
    expect(out[0].minutesBefore).toBe(2);
  });
});

describe("computeChangeMetrics", () => {
  it("computes change failure rate from implicated deployments", () => {
    const deps = [
      deployment({ id: "d1", deployedAt: base }),
      deployment({ id: "d2", serviceId: "svc-b", deployedAt: base }),
    ];
    const incs = [incident({ detectedAt: mins(5) })];
    const corr = correlateChanges(deps, incs, 30);
    const m = computeChangeMetrics(deps, corr);
    expect(m.totalDeployments).toBe(2);
    expect(m.changeFailureRatePct).toBe(50); // 1 of 2 implicated
    expect(m.incidentsWithinWindow).toBe(1);
  });

  it("flags a succeeded deployment correlated to a high-severity incident as a rollback candidate", () => {
    const deps = [deployment({ id: "d1", status: "succeeded", deployedAt: base })];
    const incs = [incident({ severity: "critical", detectedAt: mins(5) })];
    const corr = correlateChanges(deps, incs, 30);
    const m = computeChangeMetrics(deps, corr);
    expect(m.rollbackCandidates).toHaveLength(1);
    expect(m.rollbackCandidates[0].deployment.id).toBe("d1");
  });

  it("does not flag an already rolled-back deployment", () => {
    const deps = [deployment({ id: "d1", status: "rolled_back", deployedAt: base })];
    const incs = [incident({ severity: "critical", detectedAt: mins(5) })];
    const corr = correlateChanges(deps, incs, 30);
    expect(computeChangeMetrics(deps, corr).rollbackCandidates).toHaveLength(0);
  });

  it("counts failed and rolled-back deployments", () => {
    const deps = [
      deployment({ id: "d1", status: "succeeded" }),
      deployment({ id: "d2", status: "failed" }),
      deployment({ id: "d3", status: "rolled_back" }),
    ];
    expect(computeChangeMetrics(deps, []).failedDeployments).toBe(2);
  });
});
