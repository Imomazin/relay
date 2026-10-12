import { getTopology } from "@/lib/queries";
import { PageHeader, DemoDisclaimer } from "@/components/ui";
import { TopologyGraph } from "@/components/topology-graph";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Service Topology" };

export default async function TopologyPage() {
  const { nodes, edges } = await getTopology();

  const down = nodes.filter((n) => n.status === "down").length;
  const impaired = nodes.filter((n) => n.status === "impaired").length;
  const degraded = nodes.filter((n) => n.status === "degraded").length;
  const withIncidents = nodes.filter((n) => n.openIncidents > 0).length;
  const hardEdges = edges.filter((e) => e.kind === "hard").length;

  const tiles = [
    { label: "Services mapped", value: String(nodes.length), tone: "text-white" },
    { label: "Dependencies", value: String(edges.length), tone: "text-white", sub: `${hardEdges} hard` },
    { label: "Services with open incidents", value: String(withIncidents), tone: withIncidents ? "text-severity-high" : "text-white" },
    { label: "Down / impaired / degraded", value: `${down} / ${impaired} / ${degraded}`, tone: down ? "text-severity-critical" : "text-white" },
  ];

  return (
    <div>
      <PageHeader
        title="Service Topology"
        description="The connected estate — business services and their dependencies down to platform and cloud resources. Nodes carry live health and open-incident overlays; select any service to trace its blast radius, SLA exposure, ownership and last deployment."
      />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border lg:grid-cols-4" style={{ borderColor: "var(--line)", background: "var(--line)" }}>
        {tiles.map((t) => (
          <div key={t.label} className="bg-[var(--surface)] p-4">
            <div className="stat-label">{t.label}</div>
            <div className={`stat-value mt-1 ${t.tone}`}>{t.value}</div>
            {t.sub ? <div className="mt-0.5 text-[11px] text-slate-500">{t.sub}</div> : null}
          </div>
        ))}
      </div>

      <TopologyGraph nodes={nodes} edges={edges} />

      <DemoDisclaimer />
    </div>
  );
}
