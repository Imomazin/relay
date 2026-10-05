import Link from "next/link";
import { getCommandCentre, getQueue } from "@/lib/queries";
import {
  Card,
  CardBody,
  PageHeader,
  StatTile,
  SectionTitle,
  SeverityBadge,
  IncidentStatusBadge,
  ServiceStatusBadge,
  SlaBadge,
  HealthBar,
  DemoDisclaimer,
} from "@/components/ui";
import { formatDuration, formatNumber, formatAge, titleCase } from "@/lib/format";
import { type ServiceStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommandCentre() {
  const [m, queue] = await Promise.all([getCommandCentre(), getQueue()]);
  const awaitingApproval = m.topOpenIncidents.filter((i) => i.status === "awaiting_approval").length;

  const attention = [
    { label: "Critical incidents", value: m.criticalCount, tone: "critical", href: "/queue?severity=critical" },
    { label: "SLA breached", value: queue.summary.breached, tone: "critical", href: "/queue?sla=breached" },
    { label: "Approaching SLA", value: queue.summary.atRisk, tone: "warn", href: "/queue?sla=at_risk" },
    { label: "Awaiting approval", value: awaitingApproval, tone: "accent", href: "/incidents?status=awaiting_approval" },
    { label: "Unassigned", value: queue.summary.unassigned, tone: "warn", href: "/queue" },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Command Centre"
        description="Live operational posture across every service — what needs attention, what is at risk, and who owns it."
        actions={
          <Link href="/queue" className="btn-ghost btn-sm">Open work queue →</Link>
        }
      />

      {/* Attention strip */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-5" style={{ borderColor: "var(--line)" }}>
        {attention.map((a) => (
          <Link key={a.label} href={a.href} className="group bg-[var(--surface)] p-4 transition-colors hover:bg-white/[0.03]">
            <div className="flex items-baseline justify-between">
              <span className={`stat-value ${a.value > 0 ? ATTENTION_TONE[a.tone] : "text-slate-500"}`}>{a.value}</span>
              <span className={`h-2 w-2 rounded-full ${a.value > 0 ? ATTENTION_DOT[a.tone] : "bg-slate-700"}`} aria-hidden />
            </div>
            <p className="mt-1 text-[12px] text-slate-400 group-hover:text-slate-300">{a.label}</p>
          </Link>
        ))}
      </div>

      {/* KPI band */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Service health" value={m.avgHealth} tone={m.avgHealth >= 85 ? "good" : m.avgHealth >= 65 ? "warn" : "high"} sub="mean index" />
        <StatTile label="Open incidents" value={m.openCount} sub={`${m.affectedServices} services`} />
        <StatTile label="Events / hr" value={formatNumber(m.eventsLastHour)} sub="normalised" />
        <StatTile label="Automation" value={`${m.automationRate}%`} tone="good" sub={`${m.automatedResolutions} resolved`} />
        <StatTile label="MTTA" value={formatDuration(m.mtta)} sub="acknowledge" />
        <StatTile label="MTTR" value={formatDuration(m.mttr)} sub="resolve" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priority incidents */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="eyebrow">Priority incidents</h2>
              <Link href="/incidents" className="text-[12px] text-teal-400 hover:underline">All incidents →</Link>
            </div>
            <Card>
              <div className="table-wrap border-0">
                <table className="rtable">
                  <thead>
                    <tr><th>Priority</th><th>Incident</th><th className="hidden sm:table-cell">Service</th><th>Age</th><th>SLA</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {queue.rows.slice(0, 7).map((r) => (
                      <tr key={r.id}>
                        <td><SeverityBadge severity={r.severity} /></td>
                        <td>
                          <Link href={`/incidents/${r.id}`} className="font-medium text-white hover:text-teal-400">{r.id}</Link>
                          <div className="max-w-[20rem] truncate text-xs text-slate-400">{r.title}</div>
                        </td>
                        <td className="hidden sm:table-cell text-slate-300">{r.serviceName}</td>
                        <td className="metric whitespace-nowrap text-slate-300">{formatAge(r.ageMinutes)}</td>
                        <td><SlaBadge state={r.slaState} /></td>
                        <td><IncidentStatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                    {queue.rows.length === 0 ? <tr><td colSpan={6} className="py-6 text-center text-slate-500">No open incidents.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="eyebrow">Service landscape</h2>
              <Link href="/services" className="text-[12px] text-teal-400 hover:underline">All services →</Link>
            </div>
            <Card>
              <div className="table-wrap border-0">
                <table className="rtable">
                  <thead><tr><th>Service</th><th>State</th><th>Health</th><th className="hidden sm:table-cell">Tier</th></tr></thead>
                  <tbody>
                    {m.services.map((s) => (
                      <tr key={s.id}>
                        <td><Link href={`/services/${s.slug}`} className="font-medium text-white hover:text-teal-400">{s.name}</Link></td>
                        <td><ServiceStatusBadge status={s.status} /></td>
                        <td><HealthBar value={s.healthScore} /></td>
                        <td className="hidden sm:table-cell text-slate-400">{s.criticality.replace("tier", "Tier ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <div>
            <h2 className="eyebrow mb-3">Service posture</h2>
            <Card><CardBody className="space-y-2.5">
              {(["down", "impaired", "degraded", "healthy"] as ServiceStatus[]).map((st) => (
                <div key={st} className="flex items-center justify-between text-[13px]">
                  <ServiceStatusBadge status={st} />
                  <span className="metric text-slate-300">{m.statusCounts[st] ?? 0}</span>
                </div>
              ))}
            </CardBody></Card>
          </div>

          <div>
            <h2 className="eyebrow mb-3">Recurring causes</h2>
            <Card><CardBody className="space-y-2">
              {m.recurringCauses.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-300">{titleCase(c.category)}</span>
                  <span className="metric text-slate-400">{c.count}</span>
                </div>
              ))}
            </CardBody></Card>
          </div>

          <div>
            <h2 className="eyebrow mb-3">Operational load</h2>
            <Card><CardBody className="space-y-2.5 text-[13px]">
              <Row label="Correlated clusters" value={String(m.correlatedClusters)} />
              <Row label="SLA at risk (open)" value={String(m.slaRisk)} />
              <Row label="Support workload" value={`${m.supportWorkload}h`} />
              <Row label="Forecast next period" value={`${m.forecastWorkload}h`} />
              <Link href="/capacity" className="mt-1 block text-[12px] text-teal-400 hover:underline">Capacity &amp; SLA →</Link>
            </CardBody></Card>
          </div>
        </div>
      </div>

      <DemoDisclaimer />
    </div>
  );
}

const ATTENTION_TONE: Record<string, string> = {
  critical: "text-severity-critical",
  warn: "text-severity-high",
  accent: "text-teal-400",
};
const ATTENTION_DOT: Record<string, string> = {
  critical: "bg-severity-critical",
  warn: "bg-severity-high",
  accent: "bg-teal-400",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="metric text-slate-200">{value}</span>
    </div>
  );
}
