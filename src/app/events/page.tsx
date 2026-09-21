import Link from "next/link";
import { getEvents, getServices } from "@/lib/queries";
import { Card, PageHeader, SeverityBadge, Chip, DemoDisclaimer } from "@/components/ui";
import { LiveToggle } from "@/components/live-toggle";
import { formatRelative, titleCase } from "@/lib/format";
import { EVENT_SOURCES, EVENT_SOURCE_LABEL, SEVERITIES } from "@/lib/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Events" };

type SP = Promise<{ source?: string; severity?: string; service?: string; q?: string }>;

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const services = await getServices();
  const { rows, nameById } = await getEvents({
    source: sp.source,
    severity: sp.severity,
    serviceId: sp.service,
    search: sp.q,
    limit: 200,
  });

  return (
    <div>
      <PageHeader
        title="Event Stream"
        description="Normalised events from every simulated source adapter. Filter, search and pause the feed to inspect signals before correlation."
        actions={<LiveToggle />}
      />

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3 p-4">
          <Field label="Search">
            <input name="q" defaultValue={sp.q ?? ""} placeholder="message, type, ref…" className="w-48 rounded-lg border border-white/15 bg-navy-950 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600" />
          </Field>
          <Field label="Source">
            <Select name="source" defaultValue={sp.source ?? ""}>
              <option value="">All sources</option>
              {EVENT_SOURCES.map((s) => <option key={s} value={s}>{EVENT_SOURCE_LABEL[s]}</option>)}
            </Select>
          </Field>
          <Field label="Severity">
            <Select name="severity" defaultValue={sp.severity ?? ""}>
              <option value="">All severities</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </Select>
          </Field>
          <Field label="Service">
            <Select name="service" defaultValue={sp.service ?? ""}>
              <option value="">All services</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <button type="submit" className="btn-primary">Apply</button>
          <Link href="/events" className="btn-ghost">Clear</Link>
        </form>
      </Card>

      <p className="mb-2 text-xs text-slate-500">{rows.length} events shown (most recent first).</p>

      <Card>
        <div className="table-wrap border-0">
          <table className="rtable">
            <thead>
              <tr>
                <th>When</th>
                <th>Source</th>
                <th>Severity</th>
                <th>Service</th>
                <th className="hidden md:table-cell">Category</th>
                <th>Message</th>
                <th className="hidden lg:table-cell">Incident</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-xs text-slate-400" title={e.occurredAt.toISOString()}>{formatRelative(e.occurredAt)}</td>
                  <td><Chip>{EVENT_SOURCE_LABEL[e.source as keyof typeof EVENT_SOURCE_LABEL] ?? e.source}</Chip></td>
                  <td><SeverityBadge severity={e.severity} /></td>
                  <td className="whitespace-nowrap text-slate-300">{nameById.get(e.serviceId)}</td>
                  <td className="hidden md:table-cell text-xs text-slate-400">{titleCase(e.normalisedCategory)}</td>
                  <td className="max-w-[28rem] text-slate-200">
                    <div className="truncate" title={e.message}>{e.message}</div>
                    <div className="text-xs text-slate-500">{e.eventType} · {e.externalRef}</div>
                  </td>
                  <td className="hidden lg:table-cell">
                    {e.incidentId ? <Link href={`/incidents/${e.incidentId}`} className="link-teal text-xs">{e.incidentId}</Link> : <span className="text-xs text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-500">No events match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
      <DemoDisclaimer />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Select({ name, defaultValue, children }: { name: string; defaultValue: string; children: React.ReactNode }) {
  return (
    <select name={name} defaultValue={defaultValue} className="rounded-lg border border-white/15 bg-navy-950 px-3 py-1.5 text-sm text-slate-200">
      {children}
    </select>
  );
}
