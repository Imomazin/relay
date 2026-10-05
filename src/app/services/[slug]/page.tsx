import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/lib/queries";
import {
  Card,
  CardBody,
  PageHeader,
  SectionTitle,
  StatTile,
  ServiceStatusBadge,
  CriticalityBadge,
  SeverityBadge,
  IncidentStatusBadge,
  HealthBar,
  Chip,
  DemoDisclaimer,
} from "@/components/ui";
import { MetricLine } from "@/components/charts";
import { formatNumber, formatRelative, formatDateTime } from "@/lib/format";
import { OPEN_INCIDENT_STATUSES, type IncidentStatus } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getServiceBySlug(slug);
  if (!data) notFound();
  const { service, deps, dependents, incidents, metrics, nameById, runbooks } = data;

  const openIncidents = incidents.filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status as IncidentStatus));
  const chartData = metrics.slice(-24).map((m) => ({ label: formatDateTime(m.capturedAt).split(",")[0], health: m.healthScore, latency: Math.round(m.latencyMs) }));

  return (
    <div>
      <PageHeader
        title={service.name}
        description={service.description}
        actions={<Link href="/services" className="btn-ghost">← All services</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ServiceStatusBadge status={service.status} />
        <CriticalityBadge criticality={service.criticality} />
        {(service.tags as string[]).map((t) => <Chip key={t}>{t}</Chip>)}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Health" value={service.healthScore} tone={service.healthScore >= 85 ? "good" : "warn"} />
        <StatTile label="Open incidents" value={openIncidents.length} tone={openIncidents.length ? "high" : "default"} />
        <StatTile label="Events / 30d" value={formatNumber(service.eventVolume30d)} />
        <StatTile label="Monthly users" value={service.monthlyActiveUsers ? formatNumber(service.monthlyActiveUsers) : "internal"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <SectionTitle hint="last 24 samples">Health trend</SectionTitle>
            <Card><CardBody><MetricLine data={chartData} dataKey="health" color="#2dd4bf" ariaLabel={`Health trend for ${service.name}`} /></CardBody></Card>
          </div>

          <div>
            <SectionTitle hint={`${incidents.length} total`}>Incident history</SectionTitle>
            <Card>
              <div className="table-wrap border-0">
                <table className="rtable">
                  <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th className="hidden sm:table-cell">Detected</th></tr></thead>
                  <tbody>
                    {incidents.map((i) => (
                      <tr key={i.id}>
                        <td><Link href={`/incidents/${i.id}`} className="font-medium text-white hover:text-teal-400">{i.id}</Link><div className="max-w-[22rem] truncate text-xs text-slate-400">{i.title}</div></td>
                        <td><SeverityBadge severity={i.severity} /></td>
                        <td><IncidentStatusBadge status={i.status} /></td>
                        <td className="hidden sm:table-cell text-xs text-slate-400">{formatRelative(i.detectedAt)}</td>
                      </tr>
                    ))}
                    {incidents.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-500">No incidents recorded.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <SectionTitle>Dependencies</SectionTitle>
            <Card><CardBody className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Depends on</p>
                <div className="mt-2 space-y-1.5">
                  {deps.length ? deps.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <Link href={`/services/${nameById.get(d.dependsOnId)?.slug ?? ""}`} className="text-slate-200 hover:text-teal-400">{nameById.get(d.dependsOnId)?.name ?? d.dependsOnId}</Link>
                      <Chip className={d.kind === "hard" ? "text-severity-high" : ""}>{d.kind}</Chip>
                    </div>
                  )) : <p className="text-sm text-slate-500">None.</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Depended on by (downstream)</p>
                <div className="mt-2 space-y-1.5">
                  {dependents.length ? dependents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <Link href={`/services/${nameById.get(d.serviceId)?.slug ?? ""}`} className="text-slate-200 hover:text-teal-400">{nameById.get(d.serviceId)?.name ?? d.serviceId}</Link>
                      <Chip className={d.kind === "hard" ? "text-severity-high" : ""}>{d.kind}</Chip>
                    </div>
                  )) : <p className="text-sm text-slate-500">None.</p>}
                </div>
              </div>
            </CardBody></Card>
          </div>

          <div>
            <SectionTitle>Ownership & SLA</SectionTitle>
            <Card><CardBody className="space-y-2 text-sm">
              <Row label="Owner team" value={service.ownerTeam} />
              <Row label="Owner" value={service.ownerName} />
              <Row label="SLA target" value={service.slaTarget} />
              <Row label="Response" value={`${service.slaResponseMins} min`} />
              <Row label="Resolve" value={`${service.slaResolveMins} min`} />
            </CardBody></Card>
          </div>

          <div>
            <SectionTitle hint={`${runbooks.length}`}>Available runbooks</SectionTitle>
            <Card><CardBody className="space-y-1.5">
              {runbooks.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <Link href="/automations" className="text-slate-200 hover:text-teal-400">{r.name}</Link>
                  <span className="text-xs text-slate-500">{r.risk}</span>
                </div>
              ))}
            </CardBody></Card>
          </div>
        </div>
      </div>
      <DemoDisclaimer />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}
