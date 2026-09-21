import Link from "next/link";
import { getServices } from "@/lib/queries";
import { Card, PageHeader, ServiceStatusBadge, CriticalityBadge, HealthBar, DemoDisclaimer } from "@/components/ui";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <div>
      <PageHeader
        title="Service Catalogue"
        description="Every synthetic public-service component Relay orchestrates, with ownership, criticality, SLA and live health."
      />
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
                    <Link href={`/services/${s.slug}`} className="font-medium text-white hover:text-teal-300">{s.name}</Link>
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
