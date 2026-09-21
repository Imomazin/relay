import Link from "next/link";
import { getAuditEvents } from "@/lib/queries";
import { Card, PageHeader, Chip, DemoDisclaimer } from "@/components/ui";
import { formatDateTime, titleCase } from "@/lib/format";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABEL, type AuditAction } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Audit" };

type SP = Promise<{ action?: string }>;

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const rows = await getAuditEvents({ action: sp.action, limit: 300 });

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="An immutable-style record of every orchestration action: events received, correlation, triage, approvals, automation and resolution. This is the evidence base for safe automation."
      />

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Action</span>
            <select name="action" defaultValue={sp.action ?? ""} className="rounded-lg border border-white/15 bg-navy-950 px-3 py-1.5 text-sm text-slate-200">
              <option value="">All actions</option>
              {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{AUDIT_ACTION_LABEL[a]}</option>)}
            </select>
          </label>
          <button type="submit" className="btn-primary">Filter</button>
          <Link href="/audit" className="btn-ghost">Clear</Link>
        </form>
      </Card>

      <p className="mb-2 text-xs text-slate-500">{rows.length} audit entries (most recent first).</p>

      <Card>
        <div className="table-wrap border-0">
          <table className="rtable">
            <thead>
              <tr><th>When</th><th>Action</th><th>Actor</th><th>Summary</th><th className="hidden lg:table-cell">Incident</th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(a.at)}</td>
                  <td><Chip>{AUDIT_ACTION_LABEL[a.action as AuditAction] ?? titleCase(a.action)}</Chip></td>
                  <td className="whitespace-nowrap text-xs text-slate-400">{a.actor}</td>
                  <td className="max-w-[30rem] text-slate-200"><div className="truncate" title={a.summary}>{a.summary}</div></td>
                  <td className="hidden lg:table-cell">{a.incidentId ? <Link href={`/incidents/${a.incidentId}`} className="link-teal text-xs">{a.incidentId}</Link> : <span className="text-xs text-slate-600">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <DemoDisclaimer />
    </div>
  );
}
