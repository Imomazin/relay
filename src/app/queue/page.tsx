import Link from "next/link";
import { getQueue, type SlaState } from "@/lib/queries";
import { Card, PageHeader, StatTile, SeverityBadge, IncidentStatusBadge, SlaBadge } from "@/components/ui";
import { formatAge, titleCase } from "@/lib/format";
import { SEVERITIES } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Work Queue" };

type SP = Promise<{ severity?: string; service?: string; sla?: string; status?: string }>;

export default async function QueuePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { rows, services, summary } = await getQueue({
    severity: sp.severity,
    service: sp.service,
    sla: sp.sla as SlaState | undefined,
    status: sp.status,
  });

  return (
    <div>
      <PageHeader
        title="Work Queue"
        description="Every open item ordered by priority, then SLA exposure, then age — so the next action is always at the top."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatTile label="In queue" value={summary.total} />
        <StatTile label="SLA breached" value={summary.breached} tone={summary.breached ? "critical" : "default"} />
        <StatTile label="Approaching SLA" value={summary.atRisk} tone={summary.atRisk ? "warn" : "default"} />
        <StatTile label="Critical" value={summary.critical} tone={summary.critical ? "critical" : "default"} />
        <StatTile label="Unassigned" value={summary.unassigned} tone={summary.unassigned ? "warn" : "default"} />
      </div>

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3 p-4">
          <Filter label="Priority" name="severity" value={sp.severity} options={SEVERITIES.map((s) => [s, titleCase(s)])} />
          <Filter label="SLA" name="sla" value={sp.sla} options={[["ok", "On track"], ["at_risk", "At risk"], ["breached", "Breached"]]} />
          <Filter label="Service" name="service" value={sp.service} options={services.map((s) => [s.id, s.name])} />
          <button type="submit" className="btn-primary btn-sm">Apply</button>
          <Link href="/queue" className="btn-ghost btn-sm">Reset</Link>
        </form>
      </Card>

      <p className="eyebrow mb-2">{rows.length} items</p>
      <Card>
        <div className="table-wrap border-0">
          <table className="rtable">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Incident</th>
                <th className="hidden sm:table-cell">Service</th>
                <th className="hidden lg:table-cell">Owner</th>
                <th>Age</th>
                <th>SLA</th>
                <th className="hidden md:table-cell">Next action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><SeverityBadge severity={r.severity} /></td>
                  <td>
                    <Link href={`/incidents/${r.id}`} className="font-medium text-white hover:text-teal-400">{r.id}</Link>
                    <div className="max-w-[22rem] truncate text-xs text-slate-400">{r.title}</div>
                  </td>
                  <td className="hidden sm:table-cell text-slate-300">{r.serviceName}</td>
                  <td className="hidden lg:table-cell text-slate-400">{r.ownerTeam || <span className="text-severity-high">Unassigned</span>}</td>
                  <td className="metric whitespace-nowrap text-slate-300">{formatAge(r.ageMinutes)}</td>
                  <td><SlaBadge state={r.slaState} /></td>
                  <td className="hidden md:table-cell text-slate-400">{r.nextAction}</td>
                  <td><IncidentStatusBadge status={r.status} /></td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={8} className="py-6 text-center text-slate-500">Queue is clear for these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Filter({ label, name, value, options }: { label: string; name: string; value?: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="field">
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
