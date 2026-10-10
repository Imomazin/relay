import { PageHeader, DemoDisclaimer } from "@/components/ui";
import { getConnectorFabric } from "@/integrations/fabric";
import {
  CONNECTOR_CATEGORY_LABEL,
  CONNECTOR_STATUS_LABEL,
  CAPABILITY_SHORT,
  AUTH_LABEL,
  SYNC_LABEL,
  DIRECTION_LABEL,
  type ConnectorStatus,
  type ConnectorView,
} from "@/integrations/types";
import { formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Connector Control Plane" };

const STATUS_TONE: Record<ConnectorStatus, string> = {
  live: "bg-status-healthy/15 text-status-healthy ring-status-healthy/30",
  connected_sandbox: "bg-teal-500/15 text-teal-400 ring-teal-500/30",
  demo_adapter: "bg-brand-500/15 text-brand-400 ring-brand-500/30",
  ready_to_configure: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
  degraded: "bg-severity-high/15 text-severity-high ring-severity-high/30",
  error: "bg-severity-critical/15 text-severity-critical ring-severity-critical/30",
};

const STATUS_DOT: Record<ConnectorStatus, string> = {
  live: "bg-status-healthy",
  connected_sandbox: "bg-teal-400",
  demo_adapter: "bg-brand-400",
  ready_to_configure: "bg-slate-600",
  degraded: "bg-severity-high",
  error: "bg-severity-critical",
};

export default async function ConnectorControlPlane() {
  const fabric = getConnectorFabric();
  const s = fabric.summary;

  const metrics = [
    { label: "Connectors", value: String(s.total), sub: `${s.categories} families` },
    { label: "Connected (sandbox)", value: String(s.byStatus.connected_sandbox), sub: "credential present" },
    { label: "Demo adapters", value: String(s.byStatus.demo_adapter), sub: "schema mirrored" },
    { label: "Ready to configure", value: String(s.byStatus.ready_to_configure), sub: "catalogued" },
    { label: "Events today", value: formatNumber(s.eventsToday), sub: `${s.wiredStreams} wired streams` },
    { label: "Avg API latency", value: `${s.avgLatencyMs}ms`, sub: `${s.activeWebhooks} active webhooks` },
  ];

  return (
    <div>
      <PageHeader
        title="Connector Control Plane"
        description="Every system Relay is architected to orchestrate across — ITSM, observability, cloud, DevOps, identity, collaboration and automation. Statuses are honest: a connector reads 'Connected (sandbox)' only when a server-side credential is present, otherwise it is a labelled demo adapter or catalogued as ready to configure. No live production connection is claimed."
      />

      {/* Summary rail */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-3 lg:grid-cols-6" style={{ borderColor: "var(--line)", background: "var(--line)" }}>
        {metrics.map((m) => (
          <div key={m.label} className="bg-[var(--surface)] p-3.5">
            <div className="stat-label">{m.label}</div>
            <div className="stat-value mt-1 text-white">{m.value}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
        <span className="uppercase tracking-wide text-slate-500">Status</span>
        {(["connected_sandbox", "demo_adapter", "ready_to_configure", "degraded", "error", "live"] as ConnectorStatus[]).map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[st])} aria-hidden />
            {CONNECTOR_STATUS_LABEL[st]}
          </span>
        ))}
      </div>

      {/* Grouped matrix */}
      <div className="space-y-7">
        {fabric.groups.map((group) => {
          const active = group.connectors.filter((c) => c.runtime.heartbeatAt).length;
          return (
            <section key={group.category}>
              <div className="mb-2.5 flex items-baseline justify-between">
                <h2 className="eyebrow">{CONNECTOR_CATEGORY_LABEL[group.category]}</h2>
                <span className="metric text-[11px] text-slate-500">{active}/{group.connectors.length} active</span>
              </div>
              <div className="table-wrap">
                <table className="rtable">
                  <thead>
                    <tr>
                      <th>Connector</th>
                      <th>Status</th>
                      <th className="hidden md:table-cell">Dir</th>
                      <th className="hidden lg:table-cell">Auth</th>
                      <th className="hidden xl:table-cell">Sync</th>
                      <th className="hidden md:table-cell">Capabilities</th>
                      <th className="text-right">Health</th>
                      <th className="hidden sm:table-cell text-right">Events today</th>
                      <th className="hidden lg:table-cell text-right">Latency</th>
                      <th className="hidden xl:table-cell text-right">Failed</th>
                      <th className="hidden xl:table-cell">Heartbeat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.connectors.map((c) => (
                      <ConnectorRow key={c.id} c={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border px-4 py-3 text-xs leading-relaxed text-slate-500" style={{ borderColor: "var(--line)" }}>
        <strong className="text-slate-400">Fabric architecture:</strong> each connector declares typed capabilities
        (event ingestion, incident read/write, service &amp; change discovery, metric/log retrieval, health check,
        runbook execution, notification, approval, status publication) over a common adapter contract with retry,
        idempotency, rate-limit handling and a dead-letter queue. Credentials are read from server-side environment
        variables only and are never exposed to the client.
      </div>
      <DemoDisclaimer />
    </div>
  );
}

function ConnectorRow({ c }: { c: ConnectorView }) {
  const r = c.runtime;
  return (
    <tr>
      <td>
        <div className="font-medium text-white">{c.name}</div>
        <div className="text-[11px] text-slate-500">{c.vendor} · v{c.version} · {c.owner}</div>
      </td>
      <td>
        <span className={cn("badge whitespace-nowrap ring-1 ring-inset", STATUS_TONE[r.status])}>
          {CONNECTOR_STATUS_LABEL[r.status]}
        </span>
      </td>
      <td className="hidden md:table-cell text-slate-400">{DIRECTION_LABEL[c.direction]}</td>
      <td className="hidden lg:table-cell text-slate-400">{AUTH_LABEL[c.auth]}</td>
      <td className="hidden xl:table-cell text-slate-400">{SYNC_LABEL[c.sync]}</td>
      <td className="hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {c.capabilities.slice(0, 5).map((cap) => (
            <span key={cap} className="chip text-[10px]">{CAPABILITY_SHORT[cap]}</span>
          ))}
          {c.capabilities.length > 5 ? <span className="text-[10px] text-slate-500">+{c.capabilities.length - 5}</span> : null}
        </div>
      </td>
      <td className="text-right">
        {r.health == null ? <span className="text-slate-600">—</span> : (
          <span className={cn("metric", r.health >= 97 ? "text-status-healthy" : "text-severity-medium")}>{r.health}%</span>
        )}
      </td>
      <td className="hidden sm:table-cell text-right metric text-slate-300">{r.eventsToday ? formatNumber(r.eventsToday) : <span className="text-slate-600">—</span>}</td>
      <td className="hidden lg:table-cell text-right metric text-slate-300">{r.apiLatencyMs == null ? <span className="text-slate-600">—</span> : `${r.apiLatencyMs}ms`}</td>
      <td className="hidden xl:table-cell text-right metric text-slate-400">{r.webhookState === "not_configured" ? <span className="text-slate-600">—</span> : r.failedRequests}</td>
      <td className="hidden xl:table-cell text-[11px] text-slate-500">{r.heartbeatAt ? formatRelative(r.heartbeatAt) : <span className="text-slate-600">not configured</span>}</td>
    </tr>
  );
}
