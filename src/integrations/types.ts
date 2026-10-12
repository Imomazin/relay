/**
 * Integration fabric — type system.
 *
 * Relay's connector architecture models how an operational-intelligence layer
 * sits across an organisation's ITSM, observability, cloud, DevOps, identity,
 * collaboration and automation estate. Every connector declares a typed set of
 * capabilities, an authentication model, a data direction and a sync mode.
 *
 * In this demonstrator connectors are either *demo adapters* (mirroring a
 * realistic vendor schema with synthetic telemetry) or *ready to configure*
 * (catalogued, not yet wired). A connector only reports `connected_sandbox`
 * when a corresponding server-side credential is present — it NEVER claims a
 * live, authenticated connection it does not genuinely hold.
 */
import type { EventSource } from "@/lib/domain";

export const CONNECTOR_CATEGORIES = [
  "itsm",
  "oncall",
  "observability",
  "cloud",
  "platform",
  "scm",
  "cicd",
  "collaboration",
  "identity",
  "automation",
  "status_catalogue",
  "security",
  "generic",
] as const;
export type ConnectorCategory = (typeof CONNECTOR_CATEGORIES)[number];

export const CONNECTOR_CATEGORY_LABEL: Record<ConnectorCategory, string> = {
  itsm: "ITSM / Service Management",
  oncall: "Incident / On-call",
  observability: "Observability / APM",
  cloud: "Cloud Platforms",
  platform: "Containers / Platform",
  scm: "Source Control / Change",
  cicd: "CI / CD",
  collaboration: "Collaboration / ChatOps",
  identity: "Identity",
  automation: "Automation / Remediation",
  status_catalogue: "Status / Service Catalogue",
  security: "Security Signals",
  generic: "Generic Connectivity",
};

/** Ordered for display in the control plane. */
export const CATEGORY_ORDER: ConnectorCategory[] = [
  "itsm",
  "oncall",
  "observability",
  "cloud",
  "platform",
  "scm",
  "cicd",
  "collaboration",
  "identity",
  "automation",
  "status_catalogue",
  "security",
  "generic",
];

export const CONNECTOR_CAPABILITIES = [
  "event_ingestion",
  "incident_read",
  "incident_write",
  "service_discovery",
  "change_discovery",
  "metric_retrieval",
  "log_retrieval",
  "health_check",
  "runbook_execution",
  "notification",
  "approval",
  "status_publication",
] as const;
export type ConnectorCapability = (typeof CONNECTOR_CAPABILITIES)[number];

export const CAPABILITY_LABEL: Record<ConnectorCapability, string> = {
  event_ingestion: "Event ingestion",
  incident_read: "Incident read",
  incident_write: "Incident write",
  service_discovery: "Service discovery",
  change_discovery: "Change discovery",
  metric_retrieval: "Metric retrieval",
  log_retrieval: "Log retrieval",
  health_check: "Health check",
  runbook_execution: "Runbook execution",
  notification: "Notification",
  approval: "Approval",
  status_publication: "Status publication",
};

export const CAPABILITY_SHORT: Record<ConnectorCapability, string> = {
  event_ingestion: "events",
  incident_read: "inc·read",
  incident_write: "inc·write",
  service_discovery: "discovery",
  change_discovery: "change",
  metric_retrieval: "metrics",
  log_retrieval: "logs",
  health_check: "health",
  runbook_execution: "runbook",
  notification: "notify",
  approval: "approval",
  status_publication: "status",
};

/**
 * Honest connection states. `live` and `connected_sandbox` are only ever
 * reported when a genuine credential is present; the demonstrator's own
 * connectors reach at most `demo_adapter`. `error` / `degraded` are supported
 * by the control plane to reflect real adapter health once connected.
 */
export const CONNECTOR_STATUSES = [
  "live",
  "connected_sandbox",
  "demo_adapter",
  "ready_to_configure",
  "degraded",
  "error",
] as const;
export type ConnectorStatus = (typeof CONNECTOR_STATUSES)[number];

export const CONNECTOR_STATUS_LABEL: Record<ConnectorStatus, string> = {
  live: "Live",
  connected_sandbox: "Connected (sandbox)",
  demo_adapter: "Demo adapter",
  ready_to_configure: "Ready to configure",
  degraded: "Degraded",
  error: "Error",
};

export type AuthKind =
  | "oauth2"
  | "api_key"
  | "webhook_signature"
  | "aws_iam"
  | "service_account"
  | "basic"
  | "none";

export const AUTH_LABEL: Record<AuthKind, string> = {
  oauth2: "OAuth 2.0",
  api_key: "API key",
  webhook_signature: "Signed webhook",
  aws_iam: "AWS IAM role",
  service_account: "Service account",
  basic: "Basic auth",
  none: "None",
};

export type SyncMode = "push_webhook" | "pull_poll" | "streaming" | "bidirectional";
export const SYNC_LABEL: Record<SyncMode, string> = {
  push_webhook: "Webhook push",
  pull_poll: "Scheduled poll",
  streaming: "Event stream",
  bidirectional: "Bidirectional",
};

export type DataDirection = "inbound" | "outbound" | "bidirectional";
export const DIRECTION_LABEL: Record<DataDirection, string> = {
  inbound: "Inbound",
  outbound: "Outbound",
  bidirectional: "Bidirectional",
};

/** A catalogued connector — static definition, independent of runtime state. */
export interface ConnectorDefinition {
  id: string;
  vendor: string;
  name: string;
  category: ConnectorCategory;
  blurb: string;
  capabilities: ConnectorCapability[];
  auth: AuthKind;
  direction: DataDirection;
  sync: SyncMode;
  /** Server-side env var that, when present, promotes the connector to connected_sandbox. */
  envVar: string;
  /** Owning team (demo). */
  owner: string;
  /** Adapter schema version (demo). */
  version: string;
  /** True when this connector actively mirrors a realistic schema in the demonstrator. */
  demo: boolean;
  /** When set, this connector is wired to a synthetic demo event stream. */
  eventSource?: EventSource;
}

/** Live-ish runtime telemetry for a connector (synthetic in the demonstrator). */
export interface ConnectorRuntime {
  status: ConnectorStatus;
  /** 0–100 adapter health, or null when not configured. */
  health: number | null;
  heartbeatAt: Date | null;
  lastEventAt: Date | null;
  eventsToday: number;
  apiLatencyMs: number | null;
  failedRequests: number;
  rateLimitPct: number | null;
  webhookState: "active" | "inactive" | "not_configured" | "n/a";
}

export interface ConnectorView extends ConnectorDefinition {
  runtime: ConnectorRuntime;
}
