import { getIntegrations } from "@/lib/queries";
import { Card, CardBody, PageHeader, Chip, DemoDisclaimer } from "@/components/ui";
import { INTEGRATION_STATUS_LABEL, type IntegrationStatus } from "@/lib/domain";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Integrations" };

const STATUS_TONE: Record<IntegrationStatus, string> = {
  demo_adapter: "bg-teal-500/15 text-teal-400 ring-teal-500/30",
  ready_for_configuration: "bg-severity-medium/15 text-severity-medium ring-severity-medium/30",
  not_connected: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
};

export default async function IntegrationsPage() {
  const { integrations, countBySource } = await getIntegrations();

  return (
    <div>
      <PageHeader
        title="Integration Centre"
        description="Relay works alongside existing monitoring and service-management platforms through adapters. In this demonstrator every connector is simulated — no real credentials or live data."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((it) => (
          <Card key={it.id}>
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{it.name}</h3>
                  <p className="mt-0.5 text-sm text-slate-400">{it.purpose}</p>
                </div>
                <span className={cn("badge whitespace-nowrap ring-1 ring-inset", STATUS_TONE[it.status as IntegrationStatus])}>
                  {INTEGRATION_STATUS_LABEL[it.status as IntegrationStatus] ?? it.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(it.eventTypes as string[]).map((t) => <Chip key={t}>{t}</Chip>)}
              </div>

              <dl className="space-y-2 text-sm">
                <Def term="Data expected" desc={it.dataExpected} />
                <Def term="Authentication (concept)" desc={it.authConcept} />
                <Def term="Data flow" desc={it.dataFlow} />
                <Def term="Future work" desc={it.futureWork} />
              </dl>

              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-500">
                <span>{countBySource.get(it.kind) ?? 0} demo events ingested</span>
                <span>{it.lastSyncAt ? `last sync ${formatRelative(it.lastSyncAt)}` : "no sync (not connected)"}</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-navy-900/40 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <strong className="text-slate-400">Adapter architecture:</strong> each source implements a common adapter
        interface (ingest → normalise → correlate). See <span className="text-teal-400">docs/integration-architecture.md</span> for
        the normalisation contract, authentication concepts, rate/error handling and the path to real connectors.
      </div>
      <DemoDisclaimer />
    </div>
  );
}

function Def({ term, desc }: { term: string; desc: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{term}</dt>
      <dd className="mt-0.5 text-slate-300">{desc}</dd>
    </div>
  );
}
