import Link from "next/link";
import { getChatOpsWorkflow } from "@/lib/queries";
import { PageHeader, Card, CardBody, SeverityBadge, EmptyState, DemoDisclaimer } from "@/components/ui";
import { AUDIT_ACTION_LABEL, type AuditAction } from "@/lib/domain";
import { formatDateTime, titleCase } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "ChatOps" };

const ACTION_TONE: Record<string, string> = {
  incident_created: "border-l-severity-critical",
  escalated: "border-l-severity-critical",
  triage_performed: "border-l-severity-high",
  owner_assigned: "border-l-brand-400",
  approval_requested: "border-l-severity-medium",
  approval_granted: "border-l-teal-400",
  approval_rejected: "border-l-severity-critical",
  automation_executed: "border-l-teal-400",
  automation_outcome: "border-l-teal-400",
  incident_status_changed: "border-l-brand-400",
  incident_resolved: "border-l-status-healthy",
};

export default async function ChatOpsPage() {
  const wf = await getChatOpsWorkflow();

  return (
    <div>
      <PageHeader
        title="ChatOps Workflow"
        description="How Relay coordinates an incident in Slack or Microsoft Teams — opening an incident channel, posting the summary and owner, requesting remediation approval, and confirming recovery. This is a simulated workflow rendered from the incident's own audit trail; no message is sent to a real workspace."
      />

      {!wf ? (
        <Card><CardBody><EmptyState>No incident available to render a ChatOps workflow.</EmptyState></CardBody></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Channel thread */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2">
                  <span className="metric text-sm text-white">{wf.channel}</span>
                  <span className="chip text-[10px]">Microsoft Teams · simulated</span>
                </div>
                <SeverityBadge severity={wf.severity} />
              </div>
              <CardBody className="p-0">
                <ol className="divide-y" style={{ borderColor: "var(--line)" }}>
                  <li className="px-4 py-3 text-[12px] text-slate-500">
                    Relay created incident channel <span className="metric text-slate-300">{wf.channel}</span> for{" "}
                    <Link href={`/incidents/${wf.incidentId}`} className="text-teal-400 hover:underline">{wf.incidentId}</Link> · {wf.service}
                  </li>
                  {wf.messages.map((m) => (
                    <li key={m.id} className={cn("border-l-2 px-4 py-2.5", ACTION_TONE[m.action] ?? "border-l-slate-700")}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-medium text-slate-200">{AUDIT_ACTION_LABEL[m.action as AuditAction] ?? titleCase(m.action)}</span>
                        <span className="metric shrink-0 text-[11px] text-slate-500">{formatDateTime(m.at)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-slate-400">{m.text}</p>
                      <p className="mt-0.5 text-[11px] text-slate-600">{m.actor}</p>
                    </li>
                  ))}
                  <li className="px-4 py-3 text-[12px] text-slate-500">
                    On resolution Relay posts the recovery confirmation and links the post-incident review to the channel.
                  </li>
                </ol>
              </CardBody>
            </Card>
          </div>

          {/* Side: workflow explainer */}
          <div className="space-y-6">
            <div>
              <h2 className="eyebrow mb-3">Channel</h2>
              <Card><CardBody className="space-y-2 text-[13px]">
                <Row label="Incident" value={<Link href={`/incidents/${wf.incidentId}`} className="text-teal-400 hover:underline">{wf.incidentId}</Link>} />
                <Row label="Service" value={wf.service} />
                <Row label="Messages" value={String(wf.messages.length)} />
                <Row label="Platforms" value="Slack · Teams" />
              </CardBody></Card>
            </div>
            <div>
              <h2 className="eyebrow mb-3">Workflow stages</h2>
              <Card><CardBody className="space-y-1.5 text-[13px] text-slate-400">
                {[
                  "Incident room created",
                  "Summary + owner posted",
                  "Service owner added",
                  "Periodic status updates",
                  "Remediation approval requested",
                  "Recovery confirmation",
                  "Post-incident review linked",
                ].map((s, i) => (
                  <div key={s} className="flex gap-2"><span className="metric text-slate-600">{i + 1}</span>{s}</div>
                ))}
              </CardBody></Card>
            </div>
          </div>
        </div>
      )}
      <DemoDisclaimer />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}
