import { getRunbookCentre } from "@/lib/queries";
import { PageHeader, Card, RiskBadge, DemoDisclaimer } from "@/components/ui";
import { formatRelative, titleCase } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Runbook Centre" };

export default async function RunbookCentrePage() {
  const { runbooks, summary } = await getRunbookCentre();

  const tiles = [
    { label: "Runbooks", value: String(summary.total) },
    { label: "Require approval", value: String(summary.requireApproval), sub: "human in the loop" },
    { label: "High risk", value: String(summary.highRisk), tone: summary.highRisk ? "text-severity-high" : "text-white" },
    { label: "Executions (demo)", value: String(summary.totalExecutions) },
    { label: "Avg success rate", value: `${summary.avgSuccess}%`, tone: "text-status-healthy" },
  ];

  return (
    <div>
      <PageHeader
        title="Runbook Centre"
        description="The automation library Relay can propose and — with human approval for anything risky — execute. Every runbook declares its trigger category, approval policy, expected outcome, rollback concept and synthetic success rate. In this demonstrator execution is always simulated against Relay's own rows."
      />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border lg:grid-cols-5" style={{ borderColor: "var(--line)", background: "var(--line)" }}>
        {tiles.map((t) => (
          <div key={t.label} className="bg-[var(--surface)] p-4">
            <div className="stat-label">{t.label}</div>
            <div className={cn("stat-value mt-1", t.tone ?? "text-white")}>{t.value}</div>
            {t.sub ? <div className="mt-0.5 text-[11px] text-slate-500">{t.sub}</div> : null}
          </div>
        ))}
      </div>

      <Card>
        <div className="table-wrap border-0">
          <table className="rtable">
            <thead>
              <tr>
                <th>Runbook</th>
                <th>Risk</th>
                <th className="hidden md:table-cell">Trigger</th>
                <th>Approval</th>
                <th className="text-right">Success</th>
                <th className="hidden sm:table-cell text-right">Runs</th>
                <th className="hidden lg:table-cell text-right">Steps</th>
                <th className="hidden xl:table-cell text-right">Last run</th>
              </tr>
            </thead>
            <tbody>
              {runbooks.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium text-white">{r.name}</div>
                    <div className="max-w-[28rem] truncate text-[11px] text-slate-500" title={r.purpose}>{r.purpose}</div>
                  </td>
                  <td><RiskBadge risk={r.risk} /></td>
                  <td className="hidden md:table-cell text-slate-400">{titleCase(r.category)}</td>
                  <td>
                    {r.approvalRequired
                      ? <span className="metric text-xs text-severity-high">Required</span>
                      : <span className="metric text-xs text-status-healthy">Auto</span>}
                  </td>
                  <td className="text-right metric text-slate-300">{r.syntheticSuccessRate}%</td>
                  <td className="hidden sm:table-cell text-right metric text-slate-300">{r.liveExecutions}</td>
                  <td className="hidden lg:table-cell text-right metric text-slate-400">{r.stepCount}</td>
                  <td className="hidden xl:table-cell text-right text-[11px] text-slate-500">{r.lastExecutedAt ? formatRelative(r.lastExecutedAt) : "never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 rounded-lg border px-4 py-3 text-xs leading-relaxed text-slate-500" style={{ borderColor: "var(--line)" }}>
        <strong className="text-slate-400">Controlled execution:</strong> runbooks map to automation adapters
        (Terraform, Ansible, AWS Systems Manager, Kubernetes actions). Anything that mutates infrastructure is gated
        behind visible human approval; this demonstrator only ever runs a simulated action against its own
        demonstration rows.
      </div>
      <DemoDisclaimer />
    </div>
  );
}
