import { describe, it, expect } from "vitest";
import {
  SEVERITIES,
  SEVERITY_RANK,
  SERVICE_STATUSES,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABEL,
  OPEN_INCIDENT_STATUSES,
  EVENT_SOURCES,
  EVENT_SOURCE_LABEL,
  NORMALISED_CATEGORIES,
  NORMALISED_CATEGORY_LABEL,
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABEL,
  INTEGRATION_STATUSES,
  INTEGRATION_STATUS_LABEL,
  AUTOMATION_STATUSES,
  AUTOMATION_STATUS_LABEL,
} from "./domain";

describe("domain enums + label maps", () => {
  it("every enum member has a label", () => {
    INCIDENT_STATUSES.forEach((s) => expect(INCIDENT_STATUS_LABEL[s]).toBeTruthy());
    EVENT_SOURCES.forEach((s) => expect(EVENT_SOURCE_LABEL[s]).toBeTruthy());
    NORMALISED_CATEGORIES.forEach((c) => expect(NORMALISED_CATEGORY_LABEL[c]).toBeTruthy());
    AUDIT_ACTIONS.forEach((a) => expect(AUDIT_ACTION_LABEL[a]).toBeTruthy());
    INTEGRATION_STATUSES.forEach((s) => expect(INTEGRATION_STATUS_LABEL[s]).toBeTruthy());
    AUTOMATION_STATUSES.forEach((s) => expect(AUTOMATION_STATUS_LABEL[s]).toBeTruthy());
  });

  it("severity rank is strictly ordered", () => {
    expect(SEVERITY_RANK.critical).toBeGreaterThan(SEVERITY_RANK.high);
    expect(SEVERITY_RANK.high).toBeGreaterThan(SEVERITY_RANK.medium);
    expect(SEVERITY_RANK.medium).toBeGreaterThan(SEVERITY_RANK.low);
    expect(SEVERITY_RANK.low).toBeGreaterThan(SEVERITY_RANK.info);
    SEVERITIES.forEach((s) => expect(SEVERITY_RANK[s]).toBeGreaterThan(0));
  });

  it("open statuses exclude resolved and closed", () => {
    expect(OPEN_INCIDENT_STATUSES).not.toContain("resolved");
    expect(OPEN_INCIDENT_STATUSES).not.toContain("closed");
    expect(OPEN_INCIDENT_STATUSES.every((s) => (INCIDENT_STATUSES as readonly string[]).includes(s))).toBe(true);
  });

  it("has the expected core vocabularies", () => {
    expect(SERVICE_STATUSES).toEqual(["healthy", "degraded", "impaired", "down"]);
    expect(EVENT_SOURCES).toContain("cloudwatch");
    expect(EVENT_SOURCES).toContain("crowdstrike");
    expect(EVENT_SOURCES).toContain("exabeam");
  });
});
