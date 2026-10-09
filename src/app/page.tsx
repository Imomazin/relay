import Link from "next/link";
import { getCommandCentre, getQueue, getOperationsTape } from "@/lib/queries";
import { OperationsTape } from "@/components/operations-tape";
import {
  Card,
  CardBody,
  PageHeader,
  StatTile,
  SeverityBadge,
  IncidentStatusBadge,
  ServiceStatusBadge,
  SlaBadge,
  HealthBar,
  Sparkbars,
  DemoDisclaimer,
} from "@/components/ui";
import { formatDuration, formatNumber, formatAge, formatRelative, titleCase } from "@/lib/format";
import { AUDIT_ACTION_LABEL, type AuditAction, type ServiceStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommandCentre() {
  const [m, queue, tape] = await Promise.all([getCommandCentre(), getQueue(), getOperationsTape(22)]);
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
          <OperationsTape items={tape} />

          <div>
            <h2 className="eyebrow mb-3">Event throughput</h2>
            <Card><CardBody>
              <div className="flex items-baseline justify-between">
                <span className="stat-value text-white">{formatNumber(m.eventsLastHour)}</span>
                <span className="text-[12px] text-slate-500">events this hour</span>
              </div>
              <div className="mt-3">
                <Sparkbars values={m.eventThroughput} ariaLabel={`Normalised events per hour over the last 12 hours: ${m.eventThroughput.join(", ")}`} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                <span>−12h</span>
                <span>now</span>
              </div>
            </CardBody></Card>
          </div>

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

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="eyebrow">Operational activity</h2>
              <Link href="/audit" className="text-[12px] text-teal-400 hover:underline">Audit trail →</Link>
            </div>
            <Card><CardBody className="space-y-0 p-0">
              <ol className="divide-y" style={{ borderColor: "var(--line)" }}>
                {m.recentActivity.map((a) => {
                  const label = AUDIT_ACTION_LABEL[a.action as AuditAction] ?? titleCase(a.action);
                  const body = (
                    <div className="flex items-start gap-2.5 px-4 py-2.5">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${ACTIVITY_DOT[a.action] ?? "bg-slate-600"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] text-slate-200">{label}</span>
                          <span className="metric shrink-0 text-[11px] text-slate-500">{formatRelative(a.at)}</span>
                        </div>
                        <p className="truncate text-[12px] text-slate-500">{a.summary}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={a.id}>
                      {a.incidentId ? (
                        <Link href={`/incidents/${a.incidentId}`} className="block transition-colors hover:bg-white/[0.03]">{body}</Link>
                      ) : body}
                    </li>
                  );
                })}
                {m.recentActivity.length === 0 ? <li className="px-4 py-6 text-center text-sm text-slate-500">No recent activity.</li> : null}
              </ol>
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

const ACTIVITY_DOT: Record<string, string> = {
  incident_created: "bg-severity-critical",
  escalated: "bg-severity-critical",
  triage_performed: "bg-severity-high",
  approval_requested: "bg-severity-medium",
  approval_granted: "bg-teal-400",
  automation_executed: "bg-teal-400",
  automation_outcome: "bg-teal-400",
  incident_resolved: "bg-status-healthy",
  event_correlated: "bg-brand-400",
  owner_assigned: "bg-brand-400",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="metric text-slate-200">{value}</span>
    </div>
  );
}
