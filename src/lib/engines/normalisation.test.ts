import { describe, it, expect } from "vitest";
import { normaliseEvent, normaliseSeverity, classifyCategory, buildCorrelationKey, type RawEvent } from "./normalisation";

function raw(partial: Partial<RawEvent>): RawEvent {
  return {
    source: "cloudwatch",
    externalRef: "cw-1",
    serviceId: "svc-payments",
    eventType: "ALARM",
    occurredAt: new Date("2026-01-01T00:00:00Z"),
    message: "",
    entity: "payments-prod",
    ...partial,
  };
}

describe("normaliseSeverity", () => {
  it("maps source vocabularies onto the five-level scale", () => {
    expect(normaliseSeverity("P1", "")).toBe("critical");
    expect(normaliseSeverity("ALARM", "")).toBe("high");
    expect(normaliseSeverity("warning", "")).toBe("medium");
    expect(normaliseSeverity("notice", "")).toBe("low");
    expect(normaliseSeverity("ok", "")).toBe("info");
  });

  it("falls back to keyword inspection of the message", () => {
    expect(normaliseSeverity(undefined, "service outage detected")).toBe("critical");
    expect(normaliseSeverity(undefined, "HTTP 500 error rate rising")).toBe("high");
    expect(normaliseSeverity(undefined, "latency slightly elevated")).toBe("medium");
  });
});

describe("classifyCategory", () => {
  it("classifies by keywords and source", () => {
    expect(classifyCategory(raw({ message: "p99 latency exceeded threshold", eventType: "HighLatency" }))).toBe("latency");
    expect(classifyCategory(raw({ message: "HTTP 500 error rate 6%", eventType: "5xx" }))).toBe("error_rate");
    expect(classifyCategory(raw({ message: "queue depth saturated worker pool", eventType: "QueueDepth" }))).toBe("saturation");
    expect(classifyCategory(raw({ source: "crowdstrike", message: "credential access", eventType: "detection" }))).toBe("authentication");
    expect(classifyCategory(raw({ source: "crowdstrike", message: "malware prevented", eventType: "detection" }))).toBe("security");
  });
});

describe("buildCorrelationKey", () => {
  it("is stable for service + category", () => {
    expect(buildCorrelationKey("svc-payments", "saturation")).toBe("svc-payments:saturation");
  });
});

describe("normaliseEvent", () => {
  it("produces a fully normalised event", () => {
    const n = normaliseEvent(raw({ rawSeverity: "ALARM", message: "queue depth saturated", eventType: "QueueDepthHigh" }));
    expect(n.severity).toBe("high");
    expect(n.normalisedCategory).toBe("saturation");
    expect(n.correlationKey).toBe("svc-payments:saturation");
    expect(n.rawMetadata.sourceSeverity).toBe("ALARM");
  });
});
