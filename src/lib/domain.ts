/**
 * Relay domain vocabulary.
 *
 * Single source of truth for the enumerations shared across the database
 * schema, the deterministic engines, the seed generator, and the UI. Keeping
 * them here means the correlation / triage / capacity logic and the rendered
 * dashboards can never drift out of sync.
 */

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export const SERVICE_STATUSES = ["healthy", "degraded", "impaired", "down"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const CRITICALITIES = ["tier1", "tier2", "tier3"] as const;
export type Criticality = (typeof CRITICALITIES)[number];

export const CRITICALITY_LABEL: Record<Criticality, string> = {
  tier1: "Tier 1 — mission critical",
  tier2: "Tier 2 — business critical",
  tier3: "Tier 3 — supporting",
};

/** Full lifecycle an incident moves through in Relay. */
export const INCIDENT_STATUSES = [
  "detected",
  "triaged",
  "assigned",
  "investigating",
  "action_proposed",
  "awaiting_approval",
  "remediating",
  "monitoring",
  "resolved",
  "closed",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  detected: "Detected",
  triaged: "Triaged",
  assigned: "Assigned",
  investigating: "Investigating",
  action_proposed: "Action Proposed",
  awaiting_approval: "Awaiting Approval",
  remediating: "Remediating",
  monitoring: "Monitoring",
  resolved: "Resolved",
  closed: "Closed",
};

export const OPEN_INCIDENT_STATUSES: IncidentStatus[] = [
  "detected",
  "triaged",
  "assigned",
  "investigating",
  "action_proposed",
  "awaiting_approval",
  "remediating",
  "monitoring",
];

/** Event source systems Relay ingests from (all simulated in the demonstrator). */
export const EVENT_SOURCES = [
  "cloudwatch",
  "jira_service_desk",
  "exabeam",
  "crowdstrike",
  "app_telemetry",
] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export const EVENT_SOURCE_LABEL: Record<EventSource, string> = {
  cloudwatch: "AWS CloudWatch",
  jira_service_desk: "Jira Service Desk",
  exabeam: "Exabeam",
  crowdstrike: "CrowdStrike",
  app_telemetry: "Application Telemetry",
};

/** Normalised categories every raw event is mapped onto during ingestion. */
export const NORMALISED_CATEGORIES = [
  "latency",
  "error_rate",
  "saturation",
  "availability",
  "security",
  "capacity",
  "dependency",
  "authentication",
] as const;
export type NormalisedCategory = (typeof NORMALISED_CATEGORIES)[number];

export const NORMALISED_CATEGORY_LABEL: Record<NormalisedCategory, string> = {
  latency: "Latency",
  error_rate: "Error rate",
  saturation: "Saturation",
  availability: "Availability",
  security: "Security",
  capacity: "Capacity",
  dependency: "Dependency",
  authentication: "Authentication",
};

export const INTEGRATION_STATUSES = [
  "demo_adapter",
  "ready_for_configuration",
  "not_connected",
] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export const INTEGRATION_STATUS_LABEL: Record<IntegrationStatus, string> = {
  demo_adapter: "Demo Adapter",
  ready_for_configuration: "Ready for Configuration",
  not_connected: "Not Connected",
};

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const APPROVAL_STATUSES = ["not_required", "pending", "granted", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const AUTOMATION_STATUSES = [
  "proposed",
  "awaiting_approval",
  "running",
  "succeeded",
  "failed",
  "rolled_back",
] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export const AUTOMATION_STATUS_LABEL: Record<AutomationStatus, string> = {
  proposed: "Proposed",
  awaiting_approval: "Awaiting Approval",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  rolled_back: "Rolled Back",
};

/** Audit trail action taxonomy. */
export const AUDIT_ACTIONS = [
  "event_received",
  "event_correlated",
  "incident_created",
  "triage_performed",
  "owner_assigned",
  "runbook_proposed",
  "approval_requested",
  "approval_granted",
  "approval_rejected",
  "automation_executed",
  "automation_outcome",
  "incident_status_changed",
  "incident_resolved",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  event_received: "Event received",
  event_correlated: "Event correlated",
  incident_created: "Incident created",
  triage_performed: "Triage performed",
  owner_assigned: "Owner assigned",
  runbook_proposed: "Runbook proposed",
  approval_requested: "Approval requested",
  approval_granted: "Approval granted",
  approval_rejected: "Approval rejected",
  automation_executed: "Automation executed",
  automation_outcome: "Automation outcome recorded",
  incident_status_changed: "Incident status changed",
  incident_resolved: "Incident resolved",
};

export const USER_IMPACT_SCALES = ["low", "moderate", "high", "severe"] as const;
export type UserImpactScale = (typeof USER_IMPACT_SCALES)[number];
