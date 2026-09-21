/**
 * Static catalogue data for the Relay demonstrator: services, dependencies,
 * integrations and runbooks. All content is synthetic and illustrative.
 */
import type { Criticality, EventSource, IntegrationStatus, NormalisedCategory, RiskLevel } from "@/lib/domain";

export interface ServiceDef {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerTeam: string;
  ownerName: string;
  criticality: Criticality;
  slaTarget: string;
  slaResponseMins: number;
  slaResolveMins: number;
  userImpactScale: "low" | "moderate" | "high" | "severe";
  monthlyActiveUsers: number;
  tags: string[];
}

export const SERVICE_DEFS: ServiceDef[] = [
  {
    id: "svc-identity",
    name: "Identity Service",
    slug: "identity",
    description: "Central authentication, single sign-on and citizen identity verification.",
    ownerTeam: "Identity Platform",
    ownerName: "A. Fraser",
    criticality: "tier1",
    slaTarget: "99.95% availability · 10 min response",
    slaResponseMins: 10,
    slaResolveMins: 120,
    userImpactScale: "severe",
    monthlyActiveUsers: 480000,
    tags: ["authentication", "sso", "foundational"],
  },
  {
    id: "svc-payments",
    name: "Payments Service",
    slug: "payments",
    description: "Processes citizen payments, fees and refunds across public services.",
    ownerTeam: "Payments Engineering",
    ownerName: "R. Iqbal",
    criticality: "tier1",
    slaTarget: "99.9% availability · 10 min response",
    slaResponseMins: 10,
    slaResolveMins: 90,
    userImpactScale: "severe",
    monthlyActiveUsers: 210000,
    tags: ["payments", "financial", "pci"],
  },
  {
    id: "svc-api-gateway",
    name: "API Gateway",
    slug: "api-gateway",
    description: "Edge routing, rate limiting and request authentication for all public APIs.",
    ownerTeam: "Platform Engineering",
    ownerName: "M. Stewart",
    criticality: "tier1",
    slaTarget: "99.95% availability · 5 min response",
    slaResponseMins: 5,
    slaResolveMins: 60,
    userImpactScale: "severe",
    monthlyActiveUsers: 520000,
    tags: ["edge", "routing", "foundational"],
  },
  {
    id: "svc-citizen-portal",
    name: "Citizen Portal",
    slug: "citizen-portal",
    description: "Primary web portal citizens use to access public digital services.",
    ownerTeam: "Digital Front Door",
    ownerName: "L. Campbell",
    criticality: "tier1",
    slaTarget: "99.9% availability · 15 min response",
    slaResponseMins: 15,
    slaResolveMins: 120,
    userImpactScale: "severe",
    monthlyActiveUsers: 460000,
    tags: ["frontend", "citizen-facing"],
  },
  {
    id: "svc-messaging",
    name: "Messaging Service",
    slug: "messaging",
    description: "Asynchronous message bus and queue backbone for inter-service events.",
    ownerTeam: "Platform Engineering",
    ownerName: "S. Nolan",
    criticality: "tier2",
    slaTarget: "99.5% availability · 15 min response",
    slaResponseMins: 15,
    slaResolveMins: 180,
    userImpactScale: "high",
    monthlyActiveUsers: 0,
    tags: ["queue", "eventing", "backbone"],
  },
  {
    id: "svc-document",
    name: "Document Service",
    slug: "document",
    description: "Storage, retrieval and generation of citizen documents and certificates.",
    ownerTeam: "Content Services",
    ownerName: "H. Bianchi",
    criticality: "tier2",
    slaTarget: "99.5% availability · 20 min response",
    slaResponseMins: 20,
    slaResolveMins: 240,
    userImpactScale: "high",
    monthlyActiveUsers: 190000,
    tags: ["storage", "documents"],
  },
  {
    id: "svc-licensing",
    name: "Licensing Service",
    slug: "licensing",
    description: "Applications, renewals and issuance of public licences and permits.",
    ownerTeam: "Regulatory Services",
    ownerName: "D. Okafor",
    criticality: "tier2",
    slaTarget: "99.5% availability · 30 min response",
    slaResponseMins: 30,
    slaResolveMins: 240,
    userImpactScale: "moderate",
    monthlyActiveUsers: 85000,
    tags: ["licensing", "regulatory"],
  },
  {
    id: "svc-notification",
    name: "Notification Service",
    slug: "notification",
    description: "Outbound email, SMS and push notifications to citizens and staff.",
    ownerTeam: "Engagement Platform",
    ownerName: "K. Reid",
    criticality: "tier2",
    slaTarget: "99.0% availability · 30 min response",
    slaResponseMins: 30,
    slaResolveMins: 240,
    userImpactScale: "moderate",
    monthlyActiveUsers: 300000,
    tags: ["notifications", "comms"],
  },
  {
    id: "svc-workflow",
    name: "Workflow Service",
    slug: "workflow",
    description: "Orchestrates multi-step case management and approval workflows.",
    ownerTeam: "Case Management",
    ownerName: "P. Sharma",
    criticality: "tier2",
    slaTarget: "99.5% availability · 20 min response",
    slaResponseMins: 20,
    slaResolveMins: 240,
    userImpactScale: "high",
    monthlyActiveUsers: 120000,
    tags: ["workflow", "case-management"],
  },
  {
    id: "svc-reporting",
    name: "Reporting Service",
    slug: "reporting",
    description: "Operational and management reporting, dashboards and data exports.",
    ownerTeam: "Data & Insight",
    ownerName: "T. Murray",
    criticality: "tier3",
    slaTarget: "99.0% availability · 60 min response",
    slaResponseMins: 60,
    slaResolveMins: 480,
    userImpactScale: "low",
    monthlyActiveUsers: 24000,
    tags: ["reporting", "analytics"],
  },
  {
    id: "svc-search",
    name: "Search Service",
    slug: "search",
    description: "Full-text search and indexing across public content and case records.",
    ownerTeam: "Content Services",
    ownerName: "J. Watt",
    criticality: "tier3",
    slaTarget: "99.0% availability · 60 min response",
    slaResponseMins: 60,
    slaResolveMins: 480,
    userImpactScale: "low",
    monthlyActiveUsers: 140000,
    tags: ["search", "indexing"],
  },
  {
    id: "svc-audit-log",
    name: "Audit Log Service",
    slug: "audit-log",
    description: "Immutable audit trail store for regulatory and security evidence.",
    ownerTeam: "Security Engineering",
    ownerName: "F. Grant",
    criticality: "tier3",
    slaTarget: "99.5% availability · 45 min response",
    slaResponseMins: 45,
    slaResolveMins: 360,
    userImpactScale: "low",
    monthlyActiveUsers: 0,
    tags: ["audit", "security", "compliance"],
  },
];

export interface DependencyDef {
  serviceId: string;
  dependsOnId: string;
  kind: "hard" | "soft";
  description: string;
}

export const DEPENDENCY_DEFS: DependencyDef[] = [
  { serviceId: "svc-citizen-portal", dependsOnId: "svc-api-gateway", kind: "hard", description: "All portal traffic routes via the gateway." },
  { serviceId: "svc-citizen-portal", dependsOnId: "svc-identity", kind: "hard", description: "Portal sign-in depends on identity." },
  { serviceId: "svc-citizen-portal", dependsOnId: "svc-payments", kind: "soft", description: "Payment journeys embedded in the portal." },
  { serviceId: "svc-citizen-portal", dependsOnId: "svc-document", kind: "soft", description: "Document downloads surfaced in the portal." },
  { serviceId: "svc-api-gateway", dependsOnId: "svc-identity", kind: "hard", description: "Gateway validates tokens with identity." },
  { serviceId: "svc-api-gateway", dependsOnId: "svc-messaging", kind: "soft", description: "Gateway publishes access events to the bus." },
  { serviceId: "svc-payments", dependsOnId: "svc-identity", kind: "hard", description: "Payments authorises callers via identity." },
  { serviceId: "svc-payments", dependsOnId: "svc-api-gateway", kind: "hard", description: "Payment APIs exposed through the gateway." },
  { serviceId: "svc-payments", dependsOnId: "svc-notification", kind: "soft", description: "Payment receipts sent via notifications." },
  { serviceId: "svc-payments", dependsOnId: "svc-messaging", kind: "hard", description: "Payment jobs processed off the message queue." },
  { serviceId: "svc-licensing", dependsOnId: "svc-identity", kind: "hard", description: "Licensing authenticates applicants." },
  { serviceId: "svc-licensing", dependsOnId: "svc-document", kind: "hard", description: "Licences generated as documents." },
  { serviceId: "svc-licensing", dependsOnId: "svc-workflow", kind: "soft", description: "Licence approvals run as workflows." },
  { serviceId: "svc-workflow", dependsOnId: "svc-messaging", kind: "hard", description: "Workflow steps triggered via the bus." },
  { serviceId: "svc-workflow", dependsOnId: "svc-document", kind: "soft", description: "Workflows attach generated documents." },
  { serviceId: "svc-messaging", dependsOnId: "svc-notification", kind: "soft", description: "Bus fans out to notifications." },
  { serviceId: "svc-notification", dependsOnId: "svc-messaging", kind: "soft", description: "Notifications consume from the bus." },
  { serviceId: "svc-reporting", dependsOnId: "svc-audit-log", kind: "soft", description: "Reports read from the audit store." },
  { serviceId: "svc-reporting", dependsOnId: "svc-search", kind: "soft", description: "Reporting uses search for lookups." },
  { serviceId: "svc-document", dependsOnId: "svc-search", kind: "soft", description: "Documents indexed for search." },
  { serviceId: "svc-search", dependsOnId: "svc-audit-log", kind: "soft", description: "Search access logged to audit." },
];

export interface IntegrationDef {
  id: string;
  name: string;
  kind: EventSource;
  status: IntegrationStatus;
  purpose: string;
  dataExpected: string;
  authConcept: string;
  dataFlow: string;
  futureWork: string;
  eventTypes: string[];
}

export const INTEGRATION_DEFS: IntegrationDef[] = [
  {
    id: "int-cloudwatch",
    name: "AWS CloudWatch",
    kind: "cloudwatch",
    status: "demo_adapter",
    purpose: "Ingest infrastructure and application metrics, alarms and threshold breaches.",
    dataExpected: "Alarm state changes, metric datapoints (latency, error rate, CPU, queue depth).",
    authConcept: "IAM role assumption + scoped read-only CloudWatch policy; no keys stored in Relay.",
    dataFlow: "CloudWatch → EventBridge → Relay ingestion webhook → normalisation → correlation.",
    futureWork: "Live EventBridge subscription, metric backfill, per-account alarm mapping.",
    eventTypes: ["ALARM", "Metric threshold breach", "Anomaly detection"],
  },
  {
    id: "int-jira",
    name: "Jira Service Desk",
    kind: "jira_service_desk",
    status: "demo_adapter",
    purpose: "Correlate citizen- and staff-raised tickets with technical signals.",
    dataExpected: "Ticket created/updated webhooks, priority, summary, affected service field.",
    authConcept: "OAuth 2.0 (3LO) app with read scope on service desk projects.",
    dataFlow: "Jira automation webhook → Relay adapter → normalisation → incident correlation.",
    futureWork: "Bi-directional sync: raise/att­ach Jira work items from Relay incidents.",
    eventTypes: ["Ticket created", "Ticket escalated", "Priority changed"],
  },
  {
    id: "int-exabeam",
    name: "Exabeam",
    kind: "exabeam",
    status: "ready_for_configuration",
    purpose: "Surface user and entity behaviour analytics (UEBA) security signals.",
    dataExpected: "Risk score changes, anomalous session alerts, correlation rule hits.",
    authConcept: "API token via secrets manager; least-privilege read of alert stream.",
    dataFlow: "Exabeam alert API → Relay poller → normalisation → security incident routing.",
    futureWork: "Streaming alert ingestion; enrichment of incidents with UEBA risk context.",
    eventTypes: ["Risk score increase", "Anomalous login", "Rule triggered"],
  },
  {
    id: "int-crowdstrike",
    name: "CrowdStrike",
    kind: "crowdstrike",
    status: "ready_for_configuration",
    purpose: "Ingest endpoint detection and response (EDR) detections affecting services.",
    dataExpected: "Detection summaries, severity, host, tactic/technique metadata.",
    authConcept: "OAuth2 client credentials to the Falcon API; scoped detections:read.",
    dataFlow: "Falcon Streaming API → Relay adapter → normalisation → security routing.",
    futureWork: "Map detections to affected services; automated containment approval flow.",
    eventTypes: ["Detection", "Prevented action", "Policy alert"],
  },
  {
    id: "int-app-telemetry",
    name: "Application Telemetry",
    kind: "app_telemetry",
    status: "demo_adapter",
    purpose: "Ingest OpenTelemetry traces/metrics emitted directly by services.",
    dataExpected: "RED metrics (rate, errors, duration), health checks, custom SLO signals.",
    authConcept: "mTLS between service collectors and the Relay OTLP endpoint.",
    dataFlow: "Service OTLP exporter → Relay collector → normalisation → correlation.",
    futureWork: "Trace-linked root-cause hints; SLO burn-rate driven incident creation.",
    eventTypes: ["Error rate spike", "Latency SLO breach", "Health check failure"],
  },
];

export interface RunbookDef {
  id: string;
  name: string;
  slug: string;
  purpose: string;
  risk: RiskLevel;
  category: NormalisedCategory;
  applicableCriticalities: Criticality[];
  approvalRequired: boolean;
  expectedOutcome: string;
  rollbackConcept: string;
  syntheticSuccessRate: number;
  steps: { title: string; description: string; simulatedAction: string }[];
}

export const RUNBOOK_DEFS: RunbookDef[] = [
  {
    id: "rb-scale-worker",
    name: "Scale Simulated Worker Pool",
    slug: "scale-worker",
    purpose: "Relieve queue saturation by increasing simulated worker capacity.",
    risk: "medium",
    category: "saturation",
    applicableCriticalities: ["tier1", "tier2"],
    approvalRequired: true,
    expectedOutcome: "Queue depth falls, processing latency returns within SLO.",
    rollbackConcept: "Scale the simulated worker pool back to its prior replica count.",
    syntheticSuccessRate: 92,
    steps: [
      { title: "Verify saturation", description: "Confirm queue depth and worker utilisation from telemetry.", simulatedAction: "read:metrics(queue_depth,worker_util)" },
      { title: "Increase replicas", description: "Add simulated worker replicas to absorb backlog.", simulatedAction: "simulate:scale(worker_pool,+3)" },
      { title: "Monitor drain", description: "Watch backlog drain and latency recover.", simulatedAction: "simulate:observe(5m)" },
      { title: "Confirm recovery", description: "Verify SLO restored before closing.", simulatedAction: "read:metrics(latency_p95)" },
    ],
  },
  {
    id: "rb-restart-service",
    name: "Restart Simulated Service Instances",
    slug: "restart-service",
    purpose: "Clear transient error states by rolling simulated service instances.",
    risk: "medium",
    category: "error_rate",
    applicableCriticalities: ["tier1", "tier2", "tier3"],
    approvalRequired: true,
    expectedOutcome: "Error rate returns to baseline after a rolling restart.",
    rollbackConcept: "Restarts are rolling; halt and hold current replicas if errors worsen.",
    syntheticSuccessRate: 88,
    steps: [
      { title: "Snapshot diagnostics", description: "Capture logs and stack traces before restart.", simulatedAction: "simulate:collect(diagnostics)" },
      { title: "Rolling restart", description: "Restart instances one at a time to preserve availability.", simulatedAction: "simulate:restart(rolling)" },
      { title: "Verify error rate", description: "Confirm 5xx rate returns to baseline.", simulatedAction: "read:metrics(error_rate)" },
    ],
  },
  {
    id: "rb-clear-queue",
    name: "Clear Simulated Message Queue",
    slug: "clear-queue",
    purpose: "Drain or reroute a saturated simulated queue with poison-message handling.",
    risk: "high",
    category: "capacity",
    applicableCriticalities: ["tier1", "tier2"],
    approvalRequired: true,
    expectedOutcome: "Backlog cleared; poison messages quarantined for review.",
    rollbackConcept: "Quarantined messages retained; can be replayed from the dead-letter store.",
    syntheticSuccessRate: 80,
    steps: [
      { title: "Identify backlog", description: "Measure queue depth and oldest message age.", simulatedAction: "read:metrics(queue_depth,msg_age)" },
      { title: "Quarantine poison", description: "Move repeatedly-failing messages to a dead-letter store.", simulatedAction: "simulate:dlq(move)" },
      { title: "Drain queue", description: "Process remaining backlog at elevated throughput.", simulatedAction: "simulate:drain(queue)" },
    ],
  },
  {
    id: "rb-collect-diagnostics",
    name: "Collect Diagnostics Bundle",
    slug: "collect-diagnostics",
    purpose: "Gather logs, traces and metrics for human investigation.",
    risk: "low",
    category: "dependency",
    applicableCriticalities: ["tier1", "tier2", "tier3"],
    approvalRequired: false,
    expectedOutcome: "A diagnostics bundle is attached to the incident for the owner.",
    rollbackConcept: "Read-only; nothing to roll back.",
    syntheticSuccessRate: 99,
    steps: [
      { title: "Collect logs", description: "Pull recent logs across affected instances.", simulatedAction: "simulate:collect(logs,30m)" },
      { title: "Collect traces", description: "Pull representative distributed traces.", simulatedAction: "simulate:collect(traces)" },
      { title: "Attach bundle", description: "Attach the bundle to the incident record.", simulatedAction: "simulate:attach(incident)" },
    ],
  },
  {
    id: "rb-health-check",
    name: "Trigger Health Check",
    slug: "health-check",
    purpose: "Actively probe a simulated service's health endpoints.",
    risk: "low",
    category: "availability",
    applicableCriticalities: ["tier1", "tier2", "tier3"],
    approvalRequired: false,
    expectedOutcome: "Confirms whether instances are healthy and routing is correct.",
    rollbackConcept: "Read-only probe; nothing to roll back.",
    syntheticSuccessRate: 98,
    steps: [
      { title: "Probe endpoints", description: "Call health endpoints across all instances.", simulatedAction: "simulate:probe(/healthz)" },
      { title: "Check routing", description: "Verify load balancer target health.", simulatedAction: "simulate:check(lb_targets)" },
    ],
  },
  {
    id: "rb-failover-dependency",
    name: "Fail Over Simulated Dependency",
    slug: "failover-dependency",
    purpose: "Route around an unhealthy simulated dependency to a standby.",
    risk: "high",
    category: "dependency",
    applicableCriticalities: ["tier1", "tier2"],
    approvalRequired: true,
    expectedOutcome: "Traffic shifts to a healthy dependency; error rate recovers.",
    rollbackConcept: "Shift traffic back to the primary once it is healthy.",
    syntheticSuccessRate: 84,
    steps: [
      { title: "Confirm unhealthy", description: "Verify the dependency is failing health checks.", simulatedAction: "simulate:probe(dependency)" },
      { title: "Shift traffic", description: "Route to the standby dependency.", simulatedAction: "simulate:route(standby)" },
      { title: "Verify recovery", description: "Confirm error rate recovers post-failover.", simulatedAction: "read:metrics(error_rate)" },
    ],
  },
  {
    id: "rb-escalate-security",
    name: "Escalate to Security On-Call",
    slug: "escalate-security",
    purpose: "Route a security-sensitive incident to the security team with evidence.",
    risk: "low",
    category: "security",
    applicableCriticalities: ["tier1", "tier2", "tier3"],
    approvalRequired: true,
    expectedOutcome: "Security on-call engaged; evidence preserved; containment considered.",
    rollbackConcept: "Escalation only; no infrastructure change to roll back.",
    syntheticSuccessRate: 96,
    steps: [
      { title: "Preserve evidence", description: "Snapshot relevant logs and detections.", simulatedAction: "simulate:collect(security_evidence)" },
      { title: "Page security", description: "Engage the security on-call rota.", simulatedAction: "simulate:page(security_oncall)" },
      { title: "Open review", description: "Open a security review record.", simulatedAction: "simulate:open(security_review)" },
    ],
  },
  {
    id: "rb-escalate-identity",
    name: "Escalate to Identity On-Call",
    slug: "escalate-identity",
    purpose: "Engage identity on-call for authentication failures with diagnostics.",
    risk: "medium",
    category: "authentication",
    applicableCriticalities: ["tier1", "tier2"],
    approvalRequired: true,
    expectedOutcome: "Identity on-call engaged with token/session diagnostics attached.",
    rollbackConcept: "Escalation + diagnostics; no change to roll back.",
    syntheticSuccessRate: 90,
    steps: [
      { title: "Collect auth diagnostics", description: "Capture token validation and session error rates.", simulatedAction: "simulate:collect(auth_diagnostics)" },
      { title: "Page identity", description: "Engage the identity on-call rota.", simulatedAction: "simulate:page(identity_oncall)" },
    ],
  },
  {
    id: "rb-scale-latency",
    name: "Scale Simulated Service Tier",
    slug: "scale-latency",
    purpose: "Add simulated capacity to a tier showing elevated latency.",
    risk: "medium",
    category: "latency",
    applicableCriticalities: ["tier1", "tier2"],
    approvalRequired: true,
    expectedOutcome: "Latency returns within SLO after horizontal scale-out.",
    rollbackConcept: "Scale the tier back to prior replica count once latency recovers.",
    syntheticSuccessRate: 91,
    steps: [
      { title: "Confirm latency breach", description: "Verify p95/p99 latency against SLO.", simulatedAction: "read:metrics(latency_p95,latency_p99)" },
      { title: "Scale out", description: "Add simulated replicas to the affected tier.", simulatedAction: "simulate:scale(service_tier,+2)" },
      { title: "Confirm recovery", description: "Verify latency within SLO.", simulatedAction: "read:metrics(latency_p95)" },
    ],
  },
  {
    id: "rb-notify-owner",
    name: "Notify Service Owner",
    slug: "notify-owner",
    purpose: "Send a structured notification to the service owner for awareness.",
    risk: "low",
    category: "capacity",
    applicableCriticalities: ["tier1", "tier2", "tier3"],
    approvalRequired: false,
    expectedOutcome: "Owner acknowledges; no automated remediation performed.",
    rollbackConcept: "Notification only; nothing to roll back.",
    syntheticSuccessRate: 99,
    steps: [
      { title: "Compose summary", description: "Summarise incident and evidence for the owner.", simulatedAction: "simulate:compose(owner_summary)" },
      { title: "Send notification", description: "Deliver via the notification service (simulated).", simulatedAction: "simulate:notify(owner)" },
    ],
  },
];
