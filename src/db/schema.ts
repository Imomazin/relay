/**
 * Relay database schema (Drizzle ORM / PostgreSQL).
 *
 * Text primary keys are used deliberately: identifiers such as `INC-1042`,
 * `svc-identity` or `rb-scale-worker` are human-meaningful in a service
 * management context and produce clean, shareable URLs in the demonstrator.
 */
import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const services = pgTable(
  "services",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    ownerTeam: text("owner_team").notNull(),
    ownerName: text("owner_name").notNull(),
    criticality: text("criticality").notNull(),
    status: text("status").notNull(),
    slaTarget: text("sla_target").notNull(),
    slaResponseMins: integer("sla_response_mins").notNull(),
    slaResolveMins: integer("sla_resolve_mins").notNull(),
    healthScore: integer("health_score").notNull(),
    eventVolume30d: integer("event_volume_30d").notNull().default(0),
    userImpactScale: text("user_impact_scale").notNull(),
    monthlyActiveUsers: integer("monthly_active_users").notNull().default(0),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("services_status_idx").on(t.status)],
);

export const serviceDependencies = pgTable(
  "service_dependencies",
  {
    id: text("id").primaryKey(),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    dependsOnId: text("depends_on_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "hard" | "soft"
    description: text("description").notNull(),
  },
  (t) => [
    index("service_deps_service_idx").on(t.serviceId),
    index("service_deps_depends_idx").on(t.dependsOnId),
  ],
);

export const integrations = pgTable("integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // EventSource
  status: text("status").notNull(), // IntegrationStatus
  purpose: text("purpose").notNull(),
  dataExpected: text("data_expected").notNull(),
  authConcept: text("auth_concept").notNull(),
  dataFlow: text("data_flow").notNull(),
  futureWork: text("future_work").notNull(),
  eventTypes: jsonb("event_types").$type<string[]>().notNull().default([]),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
});

export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull(),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    affectedServiceIds: jsonb("affected_service_ids").$type<string[]>().notNull().default([]),
    affectedUsersEstimate: integer("affected_users_estimate").notNull().default(0),
    category: text("category").notNull(), // NormalisedCategory
    urgency: text("urgency").notNull(), // low|medium|high|critical
    serviceImpact: text("service_impact").notNull(),
    likelyCause: text("likely_cause").notNull(),
    confidence: integer("confidence").notNull(),
    correlationConfidence: integer("correlation_confidence").notNull().default(0),
    correlationReason: text("correlation_reason").notNull().default(""),
    recommendedRunbookId: text("recommended_runbook_id"),
    recommendedAction: text("recommended_action").notNull().default(""),
    ownerTeam: text("owner_team").notNull().default(""),
    ownerName: text("owner_name").notNull().default(""),
    isMultiSystem: boolean("is_multi_system").notNull().default(false),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("incidents_status_idx").on(t.status),
    index("incidents_service_idx").on(t.serviceId),
    index("incidents_severity_idx").on(t.severity),
  ],
);

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(), // EventSource
    externalRef: text("external_ref").notNull(),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    message: text("message").notNull(),
    entity: text("entity").notNull(),
    metric: text("metric"),
    metricValue: real("metric_value"),
    metricUnit: text("metric_unit"),
    correlationKey: text("correlation_key").notNull(),
    normalisedCategory: text("normalised_category").notNull(),
    rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>().notNull().default({}),
    incidentId: text("incident_id").references(() => incidents.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_service_idx").on(t.serviceId),
    index("events_source_idx").on(t.source),
    index("events_severity_idx").on(t.severity),
    index("events_occurred_idx").on(t.occurredAt),
    index("events_incident_idx").on(t.incidentId),
    index("events_corrkey_idx").on(t.correlationKey),
  ],
);

/** Explicit join between an incident and the events correlated into it. */
export const incidentEvents = pgTable(
  "incident_events",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    correlationReason: text("correlation_reason").notNull(),
    isSeed: boolean("is_seed").notNull().default(false), // the originating signal
    addedAt: timestamp("added_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("incident_events_incident_idx").on(t.incidentId)],
);

export const triageDecisions = pgTable("triage_decisions", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id")
    .notNull()
    .references(() => incidents.id, { onDelete: "cascade" }),
  severity: text("severity").notNull(),
  urgency: text("urgency").notNull(),
  serviceImpact: text("service_impact").notNull(),
  estimatedUserImpact: integer("estimated_user_impact").notNull(),
  category: text("category").notNull(),
  recommendedOwner: text("recommended_owner").notNull(),
  recommendedRunbookId: text("recommended_runbook_id"),
  confidence: integer("confidence").notNull(),
  approvalRequired: boolean("approval_required").notNull(),
  rationale: jsonb("rationale").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const runbooks = pgTable("runbooks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  purpose: text("purpose").notNull(),
  risk: text("risk").notNull(), // RiskLevel
  category: text("category").notNull(), // NormalisedCategory it addresses
  applicableCriticalities: jsonb("applicable_criticalities").$type<string[]>().notNull().default([]),
  approvalRequired: boolean("approval_required").notNull(),
  expectedOutcome: text("expected_outcome").notNull(),
  rollbackConcept: text("rollback_concept").notNull(),
  syntheticSuccessRate: integer("synthetic_success_rate").notNull(),
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
});

export const runbookSteps = pgTable(
  "runbook_steps",
  {
    id: text("id").primaryKey(),
    runbookId: text("runbook_id")
      .notNull()
      .references(() => runbooks.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    simulatedAction: text("simulated_action").notNull(),
  },
  (t) => [index("runbook_steps_runbook_idx").on(t.runbookId)],
);

export const automationExecutions = pgTable(
  "automation_executions",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    runbookId: text("runbook_id")
      .notNull()
      .references(() => runbooks.id),
    status: text("status").notNull(), // AutomationStatus
    risk: text("risk").notNull(),
    reason: text("reason").notNull(),
    expectedResult: text("expected_result").notNull(),
    approvalRequired: boolean("approval_required").notNull(),
    requestedBy: text("requested_by").notNull(),
    outcome: text("outcome"),
    healthBefore: integer("health_before"),
    healthAfter: integer("health_after"),
    proposedAt: timestamp("proposed_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("automation_incident_idx").on(t.incidentId)],
);

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id")
    .notNull()
    .references(() => incidents.id, { onDelete: "cascade" }),
  automationId: text("automation_id"),
  status: text("status").notNull(), // ApprovalStatus
  riskLevel: text("risk_level").notNull(),
  evidence: text("evidence").notNull(),
  expectedResult: text("expected_result").notNull(),
  requestedBy: text("requested_by").notNull(),
  approver: text("approver"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    action: text("action").notNull(), // AuditAction
    actor: text("actor").notNull(),
    summary: text("summary").notNull(),
    incidentId: text("incident_id"),
    serviceId: text("service_id"),
    eventId: text("event_id"),
    runbookId: text("runbook_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index("audit_at_idx").on(t.at),
    index("audit_incident_idx").on(t.incidentId),
    index("audit_action_idx").on(t.action),
  ],
);

export const serviceMetrics = pgTable(
  "service_metrics",
  {
    id: text("id").primaryKey(),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    healthScore: integer("health_score").notNull(),
    latencyMs: real("latency_ms").notNull(),
    errorRate: real("error_rate").notNull(),
    throughput: real("throughput").notNull(),
    saturation: real("saturation").notNull(),
  },
  (t) => [index("service_metrics_service_idx").on(t.serviceId, t.capturedAt)],
);

export const capacityForecasts = pgTable("capacity_forecasts", {
  id: text("id").primaryKey(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodLabel: text("period_label").notNull(),
  isForecast: boolean("is_forecast").notNull().default(false),
  eventCount: integer("event_count").notNull(),
  incidentCount: integer("incident_count").notNull(),
  manualHandled: integer("manual_handled").notNull(),
  automatedHandled: integer("automated_handled").notNull(),
  supportWorkloadHours: real("support_workload_hours").notNull(),
  automationRate: real("automation_rate").notNull(),
});

export const resourceScenarios = pgTable("resource_scenarios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  incidentCount: integer("incident_count").notNull(),
  manualHandlingMins: integer("manual_handling_mins").notNull(),
  automatedHandlingPct: integer("automated_handling_pct").notNull(),
  humanReviewMins: integer("human_review_mins").notNull(),
  escalationPct: integer("escalation_pct").notNull(),
  supportStaffCapacityHours: integer("support_staff_capacity_hours").notNull(),
  assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
  isBaseline: boolean("is_baseline").notNull().default(false),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  at: timestamp("at", { withTimezone: true }).notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  severity: text("severity").notNull(),
  incidentId: text("incident_id"),
  read: boolean("read").notNull().default(false),
});

// Convenience inferred types --------------------------------------------------
export type Service = typeof services.$inferSelect;
export type ServiceDependency = typeof serviceDependencies.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type IncidentEvent = typeof incidentEvents.$inferSelect;
export type TriageDecision = typeof triageDecisions.$inferSelect;
export type Runbook = typeof runbooks.$inferSelect;
export type RunbookStep = typeof runbookSteps.$inferSelect;
export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type ServiceMetric = typeof serviceMetrics.$inferSelect;
export type CapacityForecast = typeof capacityForecasts.$inferSelect;
export type ResourceScenario = typeof resourceScenarios.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
