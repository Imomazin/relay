import Link from "next/link";
import { getCommandCentre } from "@/lib/queries";
import {
  Card,
  CardBody,
  PageHeader,
  StatTile,
  SectionTitle,
  SeverityBadge,
  IncidentStatusBadge,
  ServiceStatusBadge,
  HealthBar,
  DemoDisclaimer,
  Chip,
} from "@/components/ui";
import { formatDuration, formatNumber, titleCase } from "@/lib/format";
import { DEMO_INCIDENT_ID } from "@/lib/app-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommandCentre() {
  const m = await getCommandCentre();

  return (
    <div>
      <PageHeader
        title="Command Centre"
        description="A live operational picture across every service — synthesised from correlated events, triage decisions and simulated automation."
        actions={
          <Link href={`/incidents/${DEMO_INCIDENT_ID}`} className="btn-primary">
            Open featured incident →
          </Link>
        }
      />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Service health" value={`${m.avgHealth}`} sub="mean across services" tone={m.avgHealth >= 85 ? "good" : m.avgHealth >= 65 ? "warn" : "high"} />
        <StatTile label="Open incidents" value={m.openCount} sub={`${m.affectedServices} services affected`} />
        <StatTile label="Critical" value={m.criticalCount} tone={m.criticalCount ? "critical" : "default"} />
        <StatTile label="High" value={m.highCount} tone={m.highCount ? "high" : "default"} />
        <StatTile label="Events / last hour" value={formatNumber(m.eventsLastHour)} sub="ingested & normalised" />
        <StatTile label="Correlated clusters" value={m.correlatedClusters} sub="multi-signal incidents" />
        <StatTile label="Automation rate" value={`${m.automationRate}%`} sub={`${m.automatedResolutions} auto-resolved`} tone="good" />
        <StatTile label="SLA risk" value={m.slaRisk} tone={m.slaRisk ? "warn" : "default"} sub="open past resolve target" />
      </div>

      {/* Secondary KPIs */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="MTTA" value={formatDuration(m.mtta)} sub="mean ack" />
        <StatTile label="MTTR" value={formatDuration(m.mttr)} sub="mean resolve" />
        <StatTile label="Human escalations" value={m.humanEscalations} sub="in investigation" />
        <StatTile label="Support workload" value={`${m.supportWorkload}h`} sub="latest week (model)" />
        <StatTile label="Forecast workload" value={`${m.forecastWorkload}h`} sub="next period (model)" />
        <StatTile label="Runbooks" value={m.runbookCount} sub="available" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Open incidents */}
        <div className="lg:col-span-2">
          <SectionTitle hint="highest severity first">Priority incidents</SectionTitle>
          <Card>
            <div className="table-wrap border-0">
              <table className="rtable">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Service</th>
                    <th className="hidden md:table-cell">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {m.topOpenIncidents.map((inc) => (
                    <tr key={inc.id}>
                      <td>
                        <Link href={`/incidents/${inc.id}`} className="font-medium text-white hover:text-teal-300">
                          {inc.id}
                        </Link>
                        <div className="max-w-[24rem] truncate text-xs text-slate-400">{inc.title}</div>
                      </td>
                      <td><SeverityBadge severity={inc.severity} /></td>
                      <td><IncidentStatusBadge status={inc.status} /></td>
                      <td className="hidden sm:table-cell text-slate-300">{m.nameById.get(inc.serviceId)}</td>
                      <td className="hidden md:table-cell tabular-nums text-slate-300">{formatNumber(inc.affectedUsersEstimate)}</td>
                    </tr>
                  ))}
                  {m.topOpenIncidents.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-slate-500">No open incidents.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-6">
            <SectionTitle>Service health</SectionTitle>
            <Card>
              <div className="table-wrap border-0">
                <table className="rtable">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Health</th>
                      <th className="hidden sm:table-cell">Criticality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.services.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <Link href={`/services/${s.slug}`} className="font-medium text-white hover:text-teal-300">{s.name}</Link>
                        </td>
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

        {/* Right column */}
        <div className="space-y-6">
          <div>
            <SectionTitle>Service status mix</SectionTitle>
            <Card>
              <CardBody className="space-y-2">
                {(["healthy", "degraded", "impaired", "down"] as const).map((st) => (
                  <div key={st} className="flex items-center justify-between text-sm">
                    <ServiceStatusBadge status={st} />
                    <span className="tabular-nums text-slate-300">{m.statusCounts[st] ?? 0}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          <div>
            <SectionTitle hint="incident count">Recurring causes</SectionTitle>
            <Card>
              <CardBody className="space-y-2">
                {m.recurringCauses.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <Chip>{titleCase(c.category)}</Chip>
                    <span className="tabular-nums text-slate-300">{c.count}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-white">Run the demo</h3>
              <p className="mt-1 text-xs text-slate-400">
                Walk the flagship journey: a multi-signal Payments incident, correlation, triage, a recommended
                runbook, human approval and simulated remediation.
              </p>
              <Link href="/demo" className="btn-primary mt-3 w-full">Open demo walkthrough</Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <DemoDisclaimer />
    </div>
  );
}
