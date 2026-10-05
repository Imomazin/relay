import Link from "next/link";
import { getServiceDependencyGraph } from "@/lib/queries";
import { Card, CardBody, PageHeader, SectionTitle, ServiceStatusBadge, CriticalityBadge, HealthBar, DemoDisclaimer } from "@/components/ui";
import { DependencyGraph } from "@/components/dependency-graph";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const { services, deps } = await getServiceDependencyGraph();

  return (
    <div>
      <PageHeader
        title="Service Catalogue"
        description="Every synthetic public-service component Relay orchestrates, with ownership, criticality, SLA and live health."
      />

      <SectionTitle hint="hover a node to trace its dependencies">Dependency map</SectionTitle>
      <Card className="mb-6">
        <CardBody>
          <DependencyGraph
            services={services.map((s) => ({ id: s.id, name: s.name, slug: s.slug, status: s.status, criticality: s.criticality }))}
            edges={deps.map((d) => ({ serviceId: d.serviceId, dependsOnId: d.dependsOnId, kind: d.kind }))}
          />
        </CardBody>
      </Card>

      <SectionTitle>Catalogue</SectionTitle>
      <Card>
        <div className="table-wrap border-0">
          <table className="rtable">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Health</th>
                <th className="hidden sm:table-cell">Criticality</th>
                <th className="hidden md:table-cell">Owner</th>
                <th className="hidden lg:table-cell">SLA</th>
                <th className="hidden lg:table-cell">MAU</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/services/${s.slug}`} className="font-medium text-white hover:text-teal-400">{s.name}</Link>
                    <div className="max-w-[26rem] text-xs text-slate-400">{s.description}</div>
                  </td>
                  <td><ServiceStatusBadge status={s.status} /></td>
                  <td><HealthBar value={s.healthScore} /></td>
                  <td className="hidden sm:table-cell"><CriticalityBadge criticality={s.criticality} /></td>
                  <td className="hidden md:table-cell text-slate-300">
                    {s.ownerTeam}
                    <div className="text-xs text-slate-500">{s.ownerName}</div>
                  </td>
                  <td className="hidden lg:table-cell text-xs text-slate-400">{s.slaTarget}</td>
                  <td className="hidden lg:table-cell tabular-nums text-slate-300">{s.monthlyActiveUsers ? formatNumber(s.monthlyActiveUsers) : "—"}</td>
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
