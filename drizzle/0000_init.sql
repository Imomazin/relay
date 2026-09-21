CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"automation_id" text,
	"status" text NOT NULL,
	"risk_level" text NOT NULL,
	"evidence" text NOT NULL,
	"expected_result" text NOT NULL,
	"requested_by" text NOT NULL,
	"approver" text,
	"requested_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"summary" text NOT NULL,
	"incident_id" text,
	"service_id" text,
	"event_id" text,
	"runbook_id" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"runbook_id" text NOT NULL,
	"status" text NOT NULL,
	"risk" text NOT NULL,
	"reason" text NOT NULL,
	"expected_result" text NOT NULL,
	"approval_required" boolean NOT NULL,
	"requested_by" text NOT NULL,
	"outcome" text,
	"health_before" integer,
	"health_after" integer,
	"proposed_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "capacity_forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_label" text NOT NULL,
	"is_forecast" boolean DEFAULT false NOT NULL,
	"event_count" integer NOT NULL,
	"incident_count" integer NOT NULL,
	"manual_handled" integer NOT NULL,
	"automated_handled" integer NOT NULL,
	"support_workload_hours" real NOT NULL,
	"automation_rate" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"external_ref" text NOT NULL,
	"service_id" text NOT NULL,
	"event_type" text NOT NULL,
	"severity" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"message" text NOT NULL,
	"entity" text NOT NULL,
	"metric" text,
	"metric_value" real,
	"metric_unit" text,
	"correlation_key" text NOT NULL,
	"normalised_category" text NOT NULL,
	"raw_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"incident_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_events" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"event_id" text NOT NULL,
	"correlation_reason" text NOT NULL,
	"is_seed" boolean DEFAULT false NOT NULL,
	"added_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"service_id" text NOT NULL,
	"affected_service_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_users_estimate" integer DEFAULT 0 NOT NULL,
	"category" text NOT NULL,
	"urgency" text NOT NULL,
	"service_impact" text NOT NULL,
	"likely_cause" text NOT NULL,
	"confidence" integer NOT NULL,
	"correlation_confidence" integer DEFAULT 0 NOT NULL,
	"correlation_reason" text DEFAULT '' NOT NULL,
	"recommended_runbook_id" text,
	"recommended_action" text DEFAULT '' NOT NULL,
	"owner_team" text DEFAULT '' NOT NULL,
	"owner_name" text DEFAULT '' NOT NULL,
	"is_multi_system" boolean DEFAULT false NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"purpose" text NOT NULL,
	"data_expected" text NOT NULL,
	"auth_concept" text NOT NULL,
	"data_flow" text NOT NULL,
	"future_work" text NOT NULL,
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_sync_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" text NOT NULL,
	"incident_id" text,
	"read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"incident_count" integer NOT NULL,
	"manual_handling_mins" integer NOT NULL,
	"automated_handling_pct" integer NOT NULL,
	"human_review_mins" integer NOT NULL,
	"escalation_pct" integer NOT NULL,
	"support_staff_capacity_hours" integer NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_baseline" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runbook_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"runbook_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"simulated_action" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runbooks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"purpose" text NOT NULL,
	"risk" text NOT NULL,
	"category" text NOT NULL,
	"applicable_criticalities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_required" boolean NOT NULL,
	"expected_outcome" text NOT NULL,
	"rollback_concept" text NOT NULL,
	"synthetic_success_rate" integer NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"depends_on_id" text NOT NULL,
	"kind" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"health_score" integer NOT NULL,
	"latency_ms" real NOT NULL,
	"error_rate" real NOT NULL,
	"throughput" real NOT NULL,
	"saturation" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"owner_team" text NOT NULL,
	"owner_name" text NOT NULL,
	"criticality" text NOT NULL,
	"status" text NOT NULL,
	"sla_target" text NOT NULL,
	"sla_response_mins" integer NOT NULL,
	"sla_resolve_mins" integer NOT NULL,
	"health_score" integer NOT NULL,
	"event_volume_30d" integer DEFAULT 0 NOT NULL,
	"user_impact_scale" text NOT NULL,
	"monthly_active_users" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"severity" text NOT NULL,
	"urgency" text NOT NULL,
	"service_impact" text NOT NULL,
	"estimated_user_impact" integer NOT NULL,
	"category" text NOT NULL,
	"recommended_owner" text NOT NULL,
	"recommended_runbook_id" text,
	"confidence" integer NOT NULL,
	"approval_required" boolean NOT NULL,
	"rationale" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_runbook_id_runbooks_id_fk" FOREIGN KEY ("runbook_id") REFERENCES "public"."runbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_events" ADD CONSTRAINT "incident_events_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_events" ADD CONSTRAINT "incident_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runbook_steps" ADD CONSTRAINT "runbook_steps_runbook_id_runbooks_id_fk" FOREIGN KEY ("runbook_id") REFERENCES "public"."runbooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_dependencies" ADD CONSTRAINT "service_dependencies_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_dependencies" ADD CONSTRAINT "service_dependencies_depends_on_id_services_id_fk" FOREIGN KEY ("depends_on_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_metrics" ADD CONSTRAINT "service_metrics_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage_decisions" ADD CONSTRAINT "triage_decisions_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_at_idx" ON "audit_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_incident_idx" ON "audit_events" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "automation_incident_idx" ON "automation_executions" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "events_service_idx" ON "events" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "events_source_idx" ON "events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "events_severity_idx" ON "events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "events_occurred_idx" ON "events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "events_incident_idx" ON "events" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "events_corrkey_idx" ON "events" USING btree ("correlation_key");--> statement-breakpoint
CREATE INDEX "incident_events_incident_idx" ON "incident_events" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "incidents_status_idx" ON "incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "incidents_service_idx" ON "incidents" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "incidents_severity_idx" ON "incidents" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "runbook_steps_runbook_idx" ON "runbook_steps" USING btree ("runbook_id");--> statement-breakpoint
CREATE INDEX "service_deps_service_idx" ON "service_dependencies" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "service_deps_depends_idx" ON "service_dependencies" USING btree ("depends_on_id");--> statement-breakpoint
CREATE INDEX "service_metrics_service_idx" ON "service_metrics" USING btree ("service_id","captured_at");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");