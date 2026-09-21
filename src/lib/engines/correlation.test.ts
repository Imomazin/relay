import { describe, it, expect } from "vitest";
import { correlateEvents, scoreCluster, type CorrelationInput } from "./correlation";
import type { NormalisedEvent } from "./normalisation";

let seq = 0;
function ev(partial: Partial<CorrelationInput>): CorrelationInput {
  seq += 1;
  const base: NormalisedEvent = {
    source: "cloudwatch",
    externalRef: `ref-${seq}`,
    serviceId: "svc-payments",
    eventType: "ALARM",
    severity: "high",
    occurredAt: new Date("2026-01-01T00:00:00Z"),
    message: "m",
    entity: "e",
    normalisedCategory: "saturation",
    correlationKey: "svc-payments:saturation",
    rawMetadata: {},
  };
  return { ...base, id: `EVT-${seq}`, dependencyIds: [], ...partial };
}

describe("scoreCluster", () => {
  it("scores a multi-source same-service cluster with high confidence", () => {
    const events = [
      ev({ source: "cloudwatch", normalisedCategory: "latency", correlationKey: "svc-payments:latency", occurredAt: new Date("2026-01-01T00:00:00Z") }),
      ev({ source: "app_telemetry", normalisedCategory: "error_rate", correlationKey: "svc-payments:error_rate", occurredAt: new Date("2026-01-01T00:05:00Z") }),
      ev({ source: "jira_service_desk", normalisedCategory: "error_rate", correlationKey: "svc-payments:error_rate", occurredAt: new Date("2026-01-01T00:08:00Z") }),
    ];
    const { confidence, factors, reason } = scoreCluster(events);
    expect(confidence).toBeGreaterThanOrEqual(60);
    expect(factors.some((f) => f.factor === "Same service")).toBe(true);
    expect(factors.some((f) => f.factor === "Corroborating sources")).toBe(true);
    expect(reason).toContain("Same service");
  });

  it("credits a shared dependency across services", () => {
    const events = [
      ev({ serviceId: "svc-a", dependencyIds: ["svc-identity"], correlationKey: "svc-a:auth" }),
      ev({ serviceId: "svc-b", dependencyIds: ["svc-identity"], correlationKey: "svc-b:auth" }),
    ];
    const { factors } = scoreCluster(events);
    expect(factors.some((f) => f.factor === "Shared infrastructure dependency")).toBe(true);
  });
});

describe("correlateEvents", () => {
  it("groups same-service events within the window into one cluster", () => {
    const events = [
      ev({ occurredAt: new Date("2026-01-01T00:00:00Z"), normalisedCategory: "latency", correlationKey: "svc-payments:latency" }),
      ev({ occurredAt: new Date("2026-01-01T00:05:00Z"), normalisedCategory: "error_rate", correlationKey: "svc-payments:error_rate" }),
    ];
    const clusters = correlateEvents(events, 30);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].events).toHaveLength(2);
    expect(clusters[0].isMultiSystem).toBe(false);
  });

  it("splits events separated by more than the window", () => {
    const events = [
      ev({ occurredAt: new Date("2026-01-01T00:00:00Z") }),
      ev({ occurredAt: new Date("2026-01-01T02:00:00Z") }),
    ];
    const clusters = correlateEvents(events, 30);
    expect(clusters).toHaveLength(2);
  });

  it("separates clusters by service", () => {
    const events = [
      ev({ serviceId: "svc-a", correlationKey: "svc-a:latency" }),
      ev({ serviceId: "svc-b", correlationKey: "svc-b:latency" }),
    ];
    const clusters = correlateEvents(events, 30);
    expect(clusters).toHaveLength(2);
  });
});
