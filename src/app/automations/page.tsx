import Link from "next/link";
import { getRunbooks, getAutomations } from "@/lib/queries";
import { Card, CardBody, PageHeader, SectionTitle, RiskBadge, Chip, DemoDisclaimer } from "@/components/ui";
import { formatRelative, titleCase } from "@/lib/format";
import { AUTOMATION_STATUS_LABEL, type AutomationStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const [{ runbooks, stepsByRunbook }, { automations, incidentById, runbookById }] = await Promise.all([
    getRunbooks(),
    getAutomations(),
  ]);

  return (
    <div>
      <PageHeader
        title="Automations & Runbooks"
        description="Every remediation Relay can propose is a transparent, simulated runbook. High-risk actions always require human approval before execution."
      />

      <SectionTitle hint={`${automations.length} recorded`}>Automation execution history</SectionTitle>
      <Card className="mb-8">
        <div className="table-wrap border-0">
          <table className="rtable">
            <thead>
              <tr><th>Runbook</th><th>Incident</th><th>Status</th><th className="hidden sm:table-cell">Risk</th><th className="hidden md:table-cell">Health Δ</th><th className="hidden sm:table-cell">When</th></tr>
            </thead>
            <tbody>
              {automations.map((a) => (
                <tr key={a.id}>
                  <td className="text-slate-200">{runbookById.get(a.runbookId)?.name ?? a.runbookId}</td>
                  <td><Link href={`/incidents/${a.incidentId}`} className="link-teal">{a.incidentId}</Link><div className="max-w-[18rem] truncate text-xs text-slate-500">{incidentById.get(a.incidentId)?.title}</div></td>
                  <td><AutoBadge status={a.status} /></td>
                  <td className="hidden sm:table-cell"><RiskBadge risk={a.risk} /></td>
                  <td className="hidden md:table-cell tabular-nums text-slate-300">{a.healthBefore != null && a.healthAfter != null ? `${a.healthBefore} → ${a.healthAfter}` : "—"}</td>
                  <td className="hidden sm:table-cell whitespace-nowrap text-xs text-slate-400">{formatRelative(a.proposedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SectionTitle hint={`${runbooks.length} runbooks`}>Runbook library</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {runbooks.map((r) => (
          <Card key={r.id}>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white">{r.name}</h3>
                  <p className="mt-0.5 text-sm text-slate-400">{r.purpose}</p>
                </div>
                <RiskBadge risk={r.risk} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip>{titleCase(r.category)}</Chip>
                <Chip>{r.approvalRequired ? "approval required" : "auto-eligible"}</Chip>
                <Chip>synthetic success {r.syntheticSuccessRate}%</Chip>
                <Chip>runs: {r.executionCount}</Chip>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Expected outcome</p><p className="text-slate-300">{r.expectedOutcome}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-slate-500">Rollback concept</p><p className="text-slate-300">{r.rollbackConcept}</p></div>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Steps (simulated)</p>
                <ol className="space-y-1">
                  {(stepsByRunbook.get(r.id) ?? []).map((s) => (
                    <li key={s.id} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-teal-500">{s.ordinal}.</span>
                      <span>{s.title} <code className="ml-1 rounded bg-navy-950 px-1.5 py-0.5 text-[11px] text-teal-400">{s.simulatedAction}</code></span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-xs text-slate-500">
                Applies to: {(r.applicableCriticalities as string[]).map((c) => c.replace("tier", "Tier ")).join(", ")}
                {r.lastExecutedAt ? ` · last run ${formatRelative(r.lastExecutedAt)}` : " · not yet run"}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
      <DemoDisclaimer />
    </div>
  );
}

function AutoBadge({ status }: { status: string }) {
  const tone = status === "succeeded" ? "text-status-healthy" : status === "failed" ? "text-severity-critical" : status === "running" ? "text-teal-400" : "text-severity-high";
  return <span className={`badge ring-1 ring-inset ring-white/10 ${tone}`}>{AUTOMATION_STATUS_LABEL[status as AutomationStatus] ?? status}</span>;
}
