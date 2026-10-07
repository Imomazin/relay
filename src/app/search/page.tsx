import Link from "next/link";
import { searchAll } from "@/lib/operational-queries";
import { Card, CardBody, PageHeader, SectionTitle, SeverityBadge, IncidentStatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Search" };

type SP = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchAll(query) : null;
  const total = results ? results.incidents.length + results.services.length + results.teams.length : 0;

  return (
    <div>
      <PageHeader title="Search" description={query ? `${total} result${total === 1 ? "" : "s"} for “${query}”` : "Find incidents, services and teams across the platform."} />

      {!query ? (
        <EmptyState>Type a query in the command bar — incidents, services or teams.</EmptyState>
      ) : total === 0 ? (
        <EmptyState>No matches for “{query}”.</EmptyState>
      ) : (
        <div className="space-y-6">
          {results!.incidents.length > 0 ? (
            <div>
              <SectionTitle hint={`${results!.incidents.length}`}>Incidents</SectionTitle>
              <Card>
                <div className="table-wrap border-0">
                  <table className="rtable">
                    <thead><tr><th>Incident</th><th>Priority</th><th>Status</th><th className="hidden sm:table-cell">Service</th></tr></thead>
                    <tbody>
                      {results!.incidents.map((i) => (
                        <tr key={i.id}>
                          <td><Link href={`/incidents/${i.id}`} className="font-medium text-white hover:text-teal-400">{i.id}</Link><div className="max-w-[26rem] truncate text-xs text-slate-400">{i.title}</div></td>
                          <td><SeverityBadge severity={i.severity} /></td>
                          <td><IncidentStatusBadge status={i.status} /></td>
                          <td className="hidden sm:table-cell text-slate-300">{i.serviceName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}

          {results!.services.length > 0 ? (
            <div>
              <SectionTitle hint={`${results!.services.length}`}>Services</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results!.services.map((s) => (
                  <Link key={s.id} href={`/services/${s.slug}`}>
                    <Card className="transition-colors hover:border-teal-500/40">
                      <CardBody>
                        <p className="font-medium text-white">{s.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{s.description}</p>
                        <p className="mt-2 text-[11px] text-slate-500">{s.ownerTeam}</p>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {results!.teams.length > 0 ? (
            <div>
              <SectionTitle hint={`${results!.teams.length}`}>Teams</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {results!.teams.map((t) => (
                  <span key={t.ownerTeam} className="chip">{t.ownerTeam} · {t.ownerName}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
