import { describe, it, expect } from "vitest";
import { generateSeed } from "./seed-data";
import { DEMO_INCIDENT_ID } from "@/lib/app-config";
import { OPEN_INCIDENT_STATUSES, type IncidentStatus } from "@/lib/domain";

describe("generateSeed (seed verification)", () => {
  const data = generateSeed();

  it("meets the acceptance minimums", () => {
    expect(data.services.length).toBeGreaterThanOrEqual(10);
    expect(data.events.length).toBeGreaterThanOrEqual(150);
    expect(data.incidents.length).toBeGreaterThanOrEqual(20);
    expect(data.runbooks.length).toBeGreaterThanOrEqual(5);
    expect(data.integrations.length).toBe(5);
  });

  it("has at least 5 multi-system correlated incidents", () => {
    const multi = data.incidents.filter((i) => i.isMultiSystem);
    expect(multi.length).toBeGreaterThanOrEqual(5);
  });

  it("includes both open and resolved incidents", () => {
    const open = data.incidents.filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status as IncidentStatus));
    const resolved = data.incidents.filter((i) => i.status === "resolved" || i.status === "closed");
    expect(open.length).toBeGreaterThan(0);
    expect(resolved.length).toBeGreaterThan(0);
  });

  it("includes the featured demo incident awaiting approval", () => {
    const demo = data.incidents.find((i) => i.id === DEMO_INCIDENT_ID);
    expect(demo).toBeDefined();
    expect(demo!.status).toBe("awaiting_approval");
    expect(demo!.isMultiSystem).toBe(true);
    const auto = data.automationExecutions.find((a) => a.incidentId === DEMO_INCIDENT_ID);
    expect(auto).toBeDefined();
    const appr = data.approvals.find((a) => a.incidentId === DEMO_INCIDENT_ID);
    expect(appr?.status).toBe("pending");
  });

  it("links every incident to at least one correlated event", () => {
    for (const inc of data.incidents) {
      const linked = data.incidentEvents.filter((ie) => ie.incidentId === inc.id);
      expect(linked.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has automation executions, approvals and audit history", () => {
    expect(data.automationExecutions.length).toBeGreaterThan(0);
    expect(data.approvals.length).toBeGreaterThan(0);
    expect(data.auditEvents.length).toBeGreaterThan(50);
    expect(data.capacityForecasts.some((c) => c.isForecast)).toBe(true);
  });

  it("is deterministic across runs", () => {
    const again = generateSeed();
    expect(again.incidents.map((i) => `${i.id}:${i.severity}`)).toEqual(
      data.incidents.map((i) => `${i.id}:${i.severity}`),
    );
    expect(again.events.length).toBe(data.events.length);
  });
});
