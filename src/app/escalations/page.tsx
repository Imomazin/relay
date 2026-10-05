import Link from "next/link";
import { getEscalations } from "@/lib/queries";
import { Card, CardBody, PageHeader, StatTile, SeverityBadge, IncidentStatusBadge, SlaBadge, SectionTitle } from "@/components/ui";
import { formatAge } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Escalations" };

export default async function EscalationsPage() {
  const rows = await getEscalations();
  const breached = rows.filter((r) => r.slaState === "breached").length;
  const explicit = rows.filter((r) => r.explicitlyEscalated).length;

  return (
    <div>
      <PageHeader
        title="Escalations"
        description="Incidents raised for leadership attention — high-impact, SLA-exposed, or explicitly escalated by an operator."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active escalations" value={rows.length} tone={rows.length ? "high" : "default"} />
        <StatTile label="SLA breached" value={breached} tone={breached ? "critical" : "default"} />
        <StatTile label="Operator-raised" value={explicit} />
        <StatTile label="Critical" value={rows.filter((r) => r.severity === "critical").length} tone="critical" />
      </div>

      <SectionTitle hint="highest exposure first">Escalation board</SectionTitle>
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardBody className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/incidents/${r.id}`} className="font-semibold text-white hover:text-teal-400">{r.id}</Link>
                  <SeverityBadge severity={r.severity} />
                  <SlaBadge state={r.slaState} />
                  {r.explicitlyEscalated ? <span className="badge bg-brand-500/15 text-brand-400">Operator-raised</span> : null}
                </div>
                <p className="mt-1 max-w-2xl truncate text-sm text-slate-300">{r.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{r.serviceName} · owned by {r.ownerTeam || "Unassigned"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-6">
                <Metric label="Elapsed" value={formatAge(r.ageMinutes)} />
                <Metric label="SLA target" value={formatAge(r.slaTargetMinutes)} />
                <Metric label="Next action" value={r.nextAction} wide />
                <Link href={`/incidents/${r.id}`} className="btn-ghost btn-sm">Open →</Link>
              </div>
            </CardBody>
          </Card>
        ))}
        {rows.length === 0 ? (
          <Card><CardBody className="py-8 text-center text-sm text-slate-500">No active escalations. All high-impact work is within SLA.</CardBody></Card>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "hidden min-w-[9rem] md:block" : "hidden text-right sm:block"}>
      <p className="eyebrow">{label}</p>
      <p className="metric text-sm text-slate-200">{value}</p>
    </div>
  );
}
