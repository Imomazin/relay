/**
 * Enterprise connector catalogue.
 *
 * The full set of systems Relay's operational fabric is architected to sit
 * across. Connectors flagged `demo: true` mirror a realistic vendor schema
 * with synthetic telemetry in this demonstrator; the rest are catalogued and
 * ready to configure. Five connectors are additionally wired to synthetic
 * demo event streams (`eventSource`) so they carry real demo event volume.
 */
import type { ConnectorDefinition } from "./types";

export const CONNECTORS: ConnectorDefinition[] = [
  // --- A. ITSM / Service Management ------------------------------------------
  {
    id: "servicenow", vendor: "ServiceNow", name: "ServiceNow ITSM", category: "itsm",
    blurb: "Incident, problem, change and CMDB sync with the system of record.",
    capabilities: ["incident_read", "incident_write", "service_discovery", "change_discovery", "approval"],
    auth: "oauth2", direction: "bidirectional", sync: "bidirectional", envVar: "SERVICENOW_INSTANCE",
    owner: "Service Management", version: "2.4.0", demo: true,
  },
  {
    id: "jira_sm", vendor: "Atlassian", name: "Jira Service Management", category: "itsm",
    blurb: "Service desk requests, incidents and change requests, bidirectional.",
    capabilities: ["incident_read", "incident_write", "change_discovery", "notification"],
    auth: "oauth2", direction: "bidirectional", sync: "bidirectional", envVar: "JIRA_BASE_URL",
    owner: "Service Management", version: "3.1.0", demo: true, eventSource: "jira_service_desk",
  },
  {
    id: "freshservice", vendor: "Freshworks", name: "Freshservice", category: "itsm",
    blurb: "Ticketing, asset and service-request management.",
    capabilities: ["incident_read", "incident_write", "service_discovery"],
    auth: "api_key", direction: "bidirectional", sync: "pull_poll", envVar: "FRESHSERVICE_API_KEY",
    owner: "Service Management", version: "1.6.0", demo: false,
  },
  {
    id: "zendesk", vendor: "Zendesk", name: "Zendesk Support", category: "itsm",
    blurb: "Customer-facing ticket ingestion and comment sync.",
    capabilities: ["incident_read", "incident_write", "notification"],
    auth: "oauth2", direction: "bidirectional", sync: "pull_poll", envVar: "ZENDESK_SUBDOMAIN",
    owner: "Customer Operations", version: "1.2.0", demo: false,
  },
  {
    id: "salesforce_service", vendor: "Salesforce", name: "Service Cloud", category: "itsm",
    blurb: "Case management and customer service record correlation.",
    capabilities: ["incident_read", "incident_write"],
    auth: "oauth2", direction: "bidirectional", sync: "pull_poll", envVar: "SALESFORCE_INSTANCE_URL",
    owner: "Customer Operations", version: "1.0.0", demo: false,
  },

  // --- B. Incident / On-call -------------------------------------------------
  {
    id: "pagerduty", vendor: "PagerDuty", name: "PagerDuty", category: "oncall",
    blurb: "Alerting, incident lifecycle, on-call schedules and escalation policies.",
    capabilities: ["event_ingestion", "incident_read", "incident_write", "notification", "health_check"],
    auth: "api_key", direction: "bidirectional", sync: "push_webhook", envVar: "PAGERDUTY_TOKEN",
    owner: "SRE", version: "2.2.0", demo: true,
  },
  {
    id: "jsm_ops", vendor: "Atlassian", name: "JSM Operations (Opsgenie)", category: "oncall",
    blurb: "Alert routing, on-call rotations and escalation.",
    capabilities: ["event_ingestion", "incident_write", "notification"],
    auth: "api_key", direction: "bidirectional", sync: "push_webhook", envVar: "OPSGENIE_API_KEY",
    owner: "SRE", version: "1.4.0", demo: false,
  },

  // --- C. Observability / APM ------------------------------------------------
  {
    id: "datadog", vendor: "Datadog", name: "Datadog", category: "observability",
    blurb: "Metrics, APM traces, logs and monitor alerts across the estate.",
    capabilities: ["event_ingestion", "metric_retrieval", "log_retrieval", "health_check"],
    auth: "api_key", direction: "inbound", sync: "push_webhook", envVar: "DATADOG_API_KEY",
    owner: "Observability", version: "3.0.0", demo: true,
  },
  {
    id: "newrelic", vendor: "New Relic", name: "New Relic", category: "observability",
    blurb: "APM, infrastructure and alert-condition ingestion.",
    capabilities: ["event_ingestion", "metric_retrieval", "health_check"],
    auth: "api_key", direction: "inbound", sync: "pull_poll", envVar: "NEWRELIC_API_KEY",
    owner: "Observability", version: "1.8.0", demo: true,
  },
  {
    id: "dynatrace", vendor: "Dynatrace", name: "Dynatrace", category: "observability",
    blurb: "Full-stack monitoring, problem detection and service health.",
    capabilities: ["event_ingestion", "metric_retrieval", "health_check"],
    auth: "api_key", direction: "inbound", sync: "push_webhook", envVar: "DYNATRACE_ENV_URL",
    owner: "Observability", version: "1.5.0", demo: false,
  },
  {
    id: "splunk", vendor: "Splunk", name: "Splunk", category: "observability",
    blurb: "Log search, saved-search alerts and operational analytics.",
    capabilities: ["event_ingestion", "log_retrieval"],
    auth: "api_key", direction: "inbound", sync: "pull_poll", envVar: "SPLUNK_HEC_TOKEN",
    owner: "Observability", version: "2.0.0", demo: true,
  },
  {
    id: "elastic", vendor: "Elastic", name: "Elastic Observability", category: "observability",
    blurb: "Elasticsearch-backed logs, metrics and APM.",
    capabilities: ["event_ingestion", "log_retrieval", "metric_retrieval"],
    auth: "api_key", direction: "inbound", sync: "pull_poll", envVar: "ELASTIC_CLOUD_ID",
    owner: "Observability", version: "1.3.0", demo: false,
  },
  {
    id: "grafana", vendor: "Grafana Labs", name: "Grafana", category: "observability",
    blurb: "Dashboards and Grafana alerting webhooks.",
    capabilities: ["event_ingestion", "metric_retrieval"],
    auth: "api_key", direction: "inbound", sync: "push_webhook", envVar: "GRAFANA_URL",
    owner: "Observability", version: "1.1.0", demo: false,
  },
  {
    id: "prometheus", vendor: "Prometheus", name: "Prometheus / Alertmanager", category: "observability",
    blurb: "Alertmanager webhook ingestion and PromQL metric pulls.",
    capabilities: ["event_ingestion", "metric_retrieval"],
    auth: "none", direction: "inbound", sync: "push_webhook", envVar: "PROMETHEUS_URL",
    owner: "Platform", version: "1.0.0", demo: true,
  },
  {
    id: "sentry", vendor: "Sentry", name: "Sentry", category: "observability",
    blurb: "Error and performance issue ingestion with release health.",
    capabilities: ["event_ingestion", "change_discovery"],
    auth: "api_key", direction: "inbound", sync: "push_webhook", envVar: "SENTRY_DSN",
    owner: "Observability", version: "2.1.0", demo: true,
  },

  // --- D. Cloud --------------------------------------------------------------
  {
    id: "aws_cloudwatch", vendor: "AWS", name: "CloudWatch", category: "cloud",
    blurb: "Alarms, metrics and Logs Insights across AWS accounts.",
    capabilities: ["event_ingestion", "metric_retrieval", "log_retrieval"],
    auth: "aws_iam", direction: "inbound", sync: "push_webhook", envVar: "AWS_REGION",
    owner: "Cloud Platform", version: "3.2.0", demo: true, eventSource: "cloudwatch",
  },
  {
    id: "aws_eventbridge", vendor: "AWS", name: "EventBridge", category: "cloud",
    blurb: "Event-bus delivery of AWS service and custom events.",
    capabilities: ["event_ingestion"],
    auth: "aws_iam", direction: "inbound", sync: "streaming", envVar: "AWS_REGION",
    owner: "Cloud Platform", version: "1.4.0", demo: true,
  },
  {
    id: "aws_cloudtrail", vendor: "AWS", name: "CloudTrail", category: "cloud",
    blurb: "API-level change and configuration audit for change correlation.",
    capabilities: ["change_discovery", "log_retrieval"],
    auth: "aws_iam", direction: "inbound", sync: "pull_poll", envVar: "AWS_REGION",
    owner: "Cloud Platform", version: "1.2.0", demo: true,
  },
  {
    id: "aws_health", vendor: "AWS", name: "AWS Health", category: "cloud",
    blurb: "Personal Health Dashboard events affecting your resources.",
    capabilities: ["event_ingestion", "health_check"],
    auth: "aws_iam", direction: "inbound", sync: "push_webhook", envVar: "AWS_REGION",
    owner: "Cloud Platform", version: "1.0.0", demo: true,
  },
  {
    id: "azure_monitor", vendor: "Microsoft Azure", name: "Azure Monitor", category: "cloud",
    blurb: "Metric and activity-log alerts across Azure subscriptions.",
    capabilities: ["event_ingestion", "metric_retrieval"],
    auth: "service_account", direction: "inbound", sync: "push_webhook", envVar: "AZURE_SUBSCRIPTION_ID",
    owner: "Cloud Platform", version: "1.6.0", demo: true,
  },
  {
    id: "azure_app_insights", vendor: "Microsoft Azure", name: "Application Insights", category: "cloud",
    blurb: "Application performance, failures and availability tests.",
    capabilities: ["event_ingestion", "metric_retrieval", "health_check"],
    auth: "service_account", direction: "inbound", sync: "pull_poll", envVar: "AZURE_SUBSCRIPTION_ID",
    owner: "Observability", version: "1.1.0", demo: false,
  },
  {
    id: "azure_service_health", vendor: "Microsoft Azure", name: "Azure Service Health", category: "cloud",
    blurb: "Platform health advisories affecting subscribed resources.",
    capabilities: ["event_ingestion", "health_check"],
    auth: "service_account", direction: "inbound", sync: "push_webhook", envVar: "AZURE_SUBSCRIPTION_ID",
    owner: "Cloud Platform", version: "1.0.0", demo: false,
  },
  {
    id: "gcp_monitoring", vendor: "Google Cloud", name: "Cloud Monitoring", category: "cloud",
    blurb: "Metric alert policies and uptime checks.",
    capabilities: ["event_ingestion", "metric_retrieval", "health_check"],
    auth: "service_account", direction: "inbound", sync: "push_webhook", envVar: "GCP_PROJECT_ID",
    owner: "Cloud Platform", version: "1.2.0", demo: false,
  },
  {
    id: "gcp_logging", vendor: "Google Cloud", name: "Cloud Logging", category: "cloud",
    blurb: "Log-based metrics and sink delivery.",
    capabilities: ["event_ingestion", "log_retrieval"],
    auth: "service_account", direction: "inbound", sync: "streaming", envVar: "GCP_PROJECT_ID",
    owner: "Cloud Platform", version: "1.0.0", demo: false,
  },

  // --- E. Containers / Platform ----------------------------------------------
  {
    id: "kubernetes", vendor: "CNCF", name: "Kubernetes", category: "platform",
    blurb: "Cluster, workload, pod and deployment events and health.",
    capabilities: ["event_ingestion", "service_discovery", "change_discovery", "health_check", "runbook_execution"],
    auth: "service_account", direction: "inbound", sync: "streaming", envVar: "KUBECONFIG",
    owner: "Platform", version: "2.5.0", demo: true,
  },
  {
    id: "docker", vendor: "Docker", name: "Docker / Registry", category: "platform",
    blurb: "Image build and registry push events.",
    capabilities: ["change_discovery", "event_ingestion"],
    auth: "api_key", direction: "inbound", sync: "push_webhook", envVar: "DOCKER_REGISTRY_URL",
    owner: "Platform", version: "1.0.0", demo: false,
  },
  {
    id: "opentelemetry", vendor: "OpenTelemetry", name: "OpenTelemetry Collector", category: "platform",
    blurb: "OTLP traces, metrics and logs from instrumented services.",
    capabilities: ["event_ingestion", "metric_retrieval", "log_retrieval"],
    auth: "none", direction: "inbound", sync: "streaming", envVar: "OTEL_EXPORTER_OTLP_ENDPOINT",
    owner: "Observability", version: "1.3.0", demo: true, eventSource: "app_telemetry",
  },

  // --- F. Source control / Change --------------------------------------------
  {
    id: "github", vendor: "GitHub", name: "GitHub", category: "scm",
    blurb: "Commits, pull requests, merges and deployments for change correlation.",
    capabilities: ["change_discovery", "event_ingestion"],
    auth: "oauth2", direction: "inbound", sync: "push_webhook", envVar: "GITHUB_APP_ID",
    owner: "Engineering", version: "2.0.0", demo: true,
  },
  {
    id: "gitlab", vendor: "GitLab", name: "GitLab", category: "scm",
    blurb: "Repository and merge-request events.",
    capabilities: ["change_discovery", "event_ingestion"],
    auth: "oauth2", direction: "inbound", sync: "push_webhook", envVar: "GITLAB_TOKEN",
    owner: "Engineering", version: "1.4.0", demo: false,
  },
  {
    id: "azure_devops", vendor: "Microsoft", name: "Azure DevOps", category: "scm",
    blurb: "Repos, pull requests and work-item change events.",
    capabilities: ["change_discovery", "event_ingestion"],
    auth: "oauth2", direction: "inbound", sync: "push_webhook", envVar: "AZURE_DEVOPS_ORG",
    owner: "Engineering", version: "1.1.0", demo: false,
  },
  {
    id: "bitbucket", vendor: "Atlassian", name: "Bitbucket", category: "scm",
    blurb: "Repository push and pull-request events.",
    capabilities: ["change_discovery"],
    auth: "oauth2", direction: "inbound", sync: "push_webhook", envVar: "BITBUCKET_WORKSPACE",
    owner: "Engineering", version: "1.0.0", demo: false,
  },

  // --- G. CI/CD --------------------------------------------------------------
  {
    id: "github_actions", vendor: "GitHub", name: "GitHub Actions", category: "cicd",
    blurb: "Workflow runs, deployments and environment promotions.",
    capabilities: ["change_discovery", "event_ingestion", "runbook_execution"],
    auth: "oauth2", direction: "inbound", sync: "push_webhook", envVar: "GITHUB_APP_ID",
    owner: "Engineering", version: "2.0.0", demo: true,
  },
  {
    id: "gitlab_ci", vendor: "GitLab", name: "GitLab CI", category: "cicd",
    blurb: "Pipeline and deployment job events.",
    capabilities: ["change_discovery", "event_ingestion"],
    auth: "oauth2", direction: "inbound", sync: "push_webhook", envVar: "GITLAB_TOKEN",
    owner: "Engineering", version: "1.2.0", demo: false,
  },
  {
    id: "azure_pipelines", vendor: "Microsoft", name: "Azure Pipelines", category: "cicd",
    blurb: "Build and release pipeline events.",
    capabilities: ["change_discovery", "event_ingestion"],
    auth: "oauth2", direction: "inbound", sync: "push_webhook", envVar: "AZURE_DEVOPS_ORG",
    owner: "Engineering", version: "1.0.0", demo: false,
  },
  {
    id: "jenkins", vendor: "Jenkins", name: "Jenkins", category: "cicd",
    blurb: "Job and deployment notifications via webhook.",
    capabilities: ["change_discovery", "runbook_execution"],
    auth: "api_key", direction: "inbound", sync: "push_webhook", envVar: "JENKINS_URL",
    owner: "Engineering", version: "1.1.0", demo: false,
  },
  {
    id: "circleci", vendor: "CircleCI", name: "CircleCI", category: "cicd",
    blurb: "Workflow and deployment status events.",
    capabilities: ["change_discovery"],
    auth: "api_key", direction: "inbound", sync: "push_webhook", envVar: "CIRCLECI_TOKEN",
    owner: "Engineering", version: "1.0.0", demo: false,
  },

  // --- H. Collaboration / ChatOps --------------------------------------------
  {
    id: "slack", vendor: "Slack", name: "Slack", category: "collaboration",
    blurb: "Incident channels, notifications, approvals and status updates.",
    capabilities: ["notification", "approval", "status_publication"],
    auth: "oauth2", direction: "outbound", sync: "bidirectional", envVar: "SLACK_BOT_TOKEN",
    owner: "SRE", version: "2.3.0", demo: true,
  },
  {
    id: "msteams", vendor: "Microsoft", name: "Microsoft Teams", category: "collaboration",
    blurb: "Incident rooms, adaptive cards, approvals and executive updates.",
    capabilities: ["notification", "approval", "status_publication"],
    auth: "oauth2", direction: "outbound", sync: "bidirectional", envVar: "TEAMS_WEBHOOK_URL",
    owner: "SRE", version: "2.0.0", demo: true,
  },

  // --- I. Identity -----------------------------------------------------------
  {
    id: "entra_id", vendor: "Microsoft", name: "Entra ID", category: "identity",
    blurb: "User, team, role and on-call authority mapping for approvals.",
    capabilities: ["service_discovery", "approval"],
    auth: "oauth2", direction: "inbound", sync: "pull_poll", envVar: "ENTRA_TENANT_ID",
    owner: "Identity & Access", version: "1.5.0", demo: true,
  },
  {
    id: "okta", vendor: "Okta", name: "Okta", category: "identity",
    blurb: "Identity, group and ownership mapping for approval routing.",
    capabilities: ["service_discovery", "approval"],
    auth: "oauth2", direction: "inbound", sync: "pull_poll", envVar: "OKTA_DOMAIN",
    owner: "Identity & Access", version: "1.2.0", demo: false,
  },

  // --- J. Automation / Remediation -------------------------------------------
  {
    id: "terraform", vendor: "HashiCorp", name: "Terraform", category: "automation",
    blurb: "Infrastructure runs and rollback plans behind human approval.",
    capabilities: ["runbook_execution", "change_discovery"],
    auth: "api_key", direction: "outbound", sync: "pull_poll", envVar: "TFC_TOKEN",
    owner: "Platform", version: "1.3.0", demo: true,
  },
  {
    id: "ansible", vendor: "Red Hat", name: "Ansible Automation", category: "automation",
    blurb: "Playbook execution for remediation workflows.",
    capabilities: ["runbook_execution"],
    auth: "api_key", direction: "outbound", sync: "pull_poll", envVar: "ANSIBLE_TOWER_URL",
    owner: "Platform", version: "1.1.0", demo: false,
  },
  {
    id: "rundeck", vendor: "PagerDuty", name: "Rundeck", category: "automation",
    blurb: "Operational job automation and controlled command execution.",
    capabilities: ["runbook_execution"],
    auth: "api_key", direction: "outbound", sync: "pull_poll", envVar: "RUNDECK_URL",
    owner: "SRE", version: "1.0.0", demo: false,
  },
  {
    id: "aws_ssm", vendor: "AWS", name: "Systems Manager", category: "automation",
    blurb: "Run Command and Automation documents for controlled remediation.",
    capabilities: ["runbook_execution", "health_check"],
    auth: "aws_iam", direction: "outbound", sync: "pull_poll", envVar: "AWS_REGION",
    owner: "Cloud Platform", version: "1.2.0", demo: true,
  },
  {
    id: "azure_automation", vendor: "Microsoft Azure", name: "Azure Automation", category: "automation",
    blurb: "Runbook execution across Azure resources.",
    capabilities: ["runbook_execution"],
    auth: "service_account", direction: "outbound", sync: "pull_poll", envVar: "AZURE_SUBSCRIPTION_ID",
    owner: "Cloud Platform", version: "1.0.0", demo: false,
  },

  // --- K. Status / Service catalogue -----------------------------------------
  {
    id: "statuspage", vendor: "Atlassian", name: "Statuspage", category: "status_catalogue",
    blurb: "Public component state and incident status publication.",
    capabilities: ["status_publication"],
    auth: "api_key", direction: "outbound", sync: "push_webhook", envVar: "STATUSPAGE_PAGE_ID",
    owner: "SRE", version: "1.4.0", demo: true,
  },
  {
    id: "backstage", vendor: "Spotify / CNCF", name: "Backstage", category: "status_catalogue",
    blurb: "Service catalogue, ownership, docs and dependency graph.",
    capabilities: ["service_discovery"],
    auth: "service_account", direction: "inbound", sync: "pull_poll", envVar: "BACKSTAGE_BASE_URL",
    owner: "Engineering", version: "1.6.0", demo: true,
  },

  // --- L. Security signals ---------------------------------------------------
  {
    id: "defender", vendor: "Microsoft", name: "Microsoft Defender", category: "security",
    blurb: "Security alerts with operational service impact.",
    capabilities: ["event_ingestion"],
    auth: "service_account", direction: "inbound", sync: "push_webhook", envVar: "DEFENDER_TENANT_ID",
    owner: "Security Operations", version: "1.1.0", demo: false,
  },
  {
    id: "crowdstrike", vendor: "CrowdStrike", name: "CrowdStrike Falcon", category: "security",
    blurb: "Endpoint detections correlated to service impact.",
    capabilities: ["event_ingestion"],
    auth: "api_key", direction: "inbound", sync: "push_webhook", envVar: "CROWDSTRIKE_CLIENT_ID",
    owner: "Security Operations", version: "1.3.0", demo: true, eventSource: "crowdstrike",
  },
  {
    id: "exabeam", vendor: "Exabeam", name: "Exabeam", category: "security",
    blurb: "UEBA and SIEM signals where operationally relevant.",
    capabilities: ["event_ingestion"],
    auth: "api_key", direction: "inbound", sync: "pull_poll", envVar: "EXABEAM_URL",
    owner: "Security Operations", version: "1.0.0", demo: true, eventSource: "exabeam",
  },
  {
    id: "wiz", vendor: "Wiz", name: "Wiz", category: "security",
    blurb: "Cloud security posture issues with service linkage.",
    capabilities: ["event_ingestion"],
    auth: "api_key", direction: "inbound", sync: "pull_poll", envVar: "WIZ_CLIENT_ID",
    owner: "Security Operations", version: "1.0.0", demo: false,
  },

  // --- M. Generic connectivity -----------------------------------------------
  {
    id: "generic_rest", vendor: "Relay", name: "Generic REST connector", category: "generic",
    blurb: "Poll any REST endpoint and map the response to the event schema.",
    capabilities: ["event_ingestion", "metric_retrieval"],
    auth: "api_key", direction: "inbound", sync: "pull_poll", envVar: "RELAY_GENERIC_REST_URL",
    owner: "Platform", version: "1.0.0", demo: true,
  },
  {
    id: "generic_webhook", vendor: "Relay", name: "Generic webhook receiver", category: "generic",
    blurb: "Signed inbound webhook with schema mapping and a dead-letter queue.",
    capabilities: ["event_ingestion"],
    auth: "webhook_signature", direction: "inbound", sync: "push_webhook", envVar: "RELAY_WEBHOOK_SECRET",
    owner: "Platform", version: "1.0.0", demo: true,
  },
  {
    id: "email_ingestion", vendor: "Relay", name: "Email ingestion", category: "generic",
    blurb: "Parse operational alert emails into normalised events.",
    capabilities: ["event_ingestion"],
    auth: "basic", direction: "inbound", sync: "pull_poll", envVar: "RELAY_INBOUND_EMAIL",
    owner: "Platform", version: "1.0.0", demo: false,
  },
  {
    id: "otel_ingestion", vendor: "Relay", name: "OTLP ingestion endpoint", category: "generic",
    blurb: "Native OTLP receiver for traces, metrics and logs.",
    capabilities: ["event_ingestion", "metric_retrieval", "log_retrieval"],
    auth: "none", direction: "inbound", sync: "streaming", envVar: "RELAY_OTLP_ENDPOINT",
    owner: "Platform", version: "1.0.0", demo: false,
  },
  {
    id: "csv_json_import", vendor: "Relay", name: "CSV / JSON import", category: "generic",
    blurb: "One-off or scheduled file import with column mapping.",
    capabilities: ["event_ingestion", "service_discovery"],
    auth: "none", direction: "inbound", sync: "pull_poll", envVar: "RELAY_IMPORT_BUCKET",
    owner: "Platform", version: "1.0.0", demo: true,
  },
];
