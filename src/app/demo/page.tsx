import Link from "next/link";
import { getDemoIncident } from "@/lib/queries";
import { Card, CardBody, PageHeader, SectionTitle, SeverityBadge, IncidentStatusBadge, Chip, DemoDisclaimer, EmptyState } from "@/components/ui";
import { AutomationActions } from "@/components/automation-actions";
import { DEMO_INCIDENT_ID } from "@/lib/app-config";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Demo" };

const STEPS = [
  "Open the Command Centre — review service health, open incidents and the KPI grid.",
  "Open the featured Payments incident from the banner below.",
  "Show the correlated events: a CloudWatch latency alarm, application HTTP 500s and citizen tickets — three signals, one incident.",
  "Explain the correlation reason and confidence, and the blast radius across downstream services.",
  "Review the triage: severity, estimated user impact and why human approval is required.",
  "Review the recommended runbook (Scale Simulated Worker Pool) and its simulated steps.",
  "Approve & execute the automation — watch service health recover and the incident move to Monitoring.",
  "Show the audit trail capturing approval, execution and outcome.",
  "Open Capacity to show manual work avoided under the illustrative model.",
  "Reset the demo to replay for the next audience.",
];

export default async function DemoPage() {
  const data = await getDemoIncident();

  return (
    <div>
      <PageHeader
        title="Demo Walkthrough"
        description="A repeatable 6–8 minute journey through Relay's core value: correlation, triage, human-approved safe automation, and capacity impact."
        actions={<Link href={`/incidents/${DEMO_INCIDENT_ID}`} className="btn-primary">Open featured incident →</Link>}
      />

      {data ? (
        <Card className="mb-6">
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{data.incident.id}</span>
                <SeverityBadge severity={data.incident.severity} />
                <IncidentStatusBadge status={data.incident.status} />
                {data.incident.isMultiSystem ? <Chip className="text-teal-300">multi-signal</Chip> : null}
              </div>
              <p className="mt-1 text-sm text-slate-300">{data.incident.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {data.correlatedEvents.length} correlated events · est. {formatNumber(data.incident.affectedUsersEstimate)} users · {(data.incident.affectedServiceIds as string[]).length} services affected
              </p>
            </div>
            <div className="shrink-0">
              <AutomationActions
                incidentId={data.incident.id}
                canApprove={data.automations.some((a) => a.status === "proposed" || a.status === "awaiting_approval")}
                canResolve={data.incident.status === "monitoring"}
                isDemo
              />
            </div>
          </CardBody>
        </Card>
      ) : (
        <EmptyState>The featured demo incident is not present yet. Seed the database (see README) or load a page to trigger auto-provisioning.</EmptyState>
      )}

      <SectionTitle>Presenter click-path</SectionTitle>
      <Card><CardBody>
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-300">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-xs font-semibold text-teal-300">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-500">Full speaking notes and exact click path: <span className="text-teal-400">docs/demo-script.md</span>.</p>
      </CardBody></Card>

      <DemoDisclaimer />
    </div>
  );
}
