"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface TopologyNode {
  id: string;
  name: string;
  slug: string;
  status: string;
  healthScore: number;
  criticality: string;
  ownerTeam: string;
  slaResolveMins: number;
  openIncidents: number;
  topSeverity: string | null;
  lastDeployAt: Date | string | null;
  lastDeploySystem: string | null;
}
export interface TopologyEdge { serviceId: string; dependsOnId: string; kind: string }

const STATUS_FILL: Record<string, string> = {
  healthy: "#2fe0bd",
  degraded: "#f7c948",
  impaired: "#ff9f45",
  down: "#ff4d6d",
};
const TIERS = ["tier1", "tier2", "tier3"] as const;
const TIER_LABEL: Record<string, string> = { tier1: "Tier 1 · business-critical", tier2: "Tier 2 · supporting", tier3: "Tier 3 · platform" };
const COL_X = { tier1: 150, tier2: 470, tier3: 790 } as Record<string, number>;
const NODE_W = 180;
const NODE_H = 48;
const ROW_H = 72;
const TOP = 60;

export function TopologyGraph({ nodes, edges }: { nodes: TopologyNode[]; edges: TopologyEdge[] }) {
  const [sel, setSel] = useState<string | null>(null);

  const byTier = useMemo(() => {
    const m = new Map<string, TopologyNode[]>();
    for (const t of TIERS) m.set(t, []);
    for (const s of [...nodes].sort((a, b) => a.name.localeCompare(b.name))) {
      (m.get(s.criticality) ?? m.get("tier3")!).push(s);
    }
    return m;
  }, [nodes]);

  const maxRows = Math.max(1, ...TIERS.map((t) => byTier.get(t)!.length));
  const height = TOP + maxRows * ROW_H + 10;

  const pos = useMemo(() => {
    const p = new Map<string, { x: number; y: number }>();
    for (const t of TIERS) byTier.get(t)!.forEach((s, i) => p.set(s.id, { x: COL_X[t], y: TOP + i * ROW_H }));
    return p;
  }, [byTier]);

  // Downstream dependents = services that depend on `id` (blast radius if id breaks).
  const downstream = (id: string) => edges.filter((e) => e.dependsOnId === id).map((e) => e.serviceId);
  const upstream = (id: string) => edges.filter((e) => e.serviceId === id).map((e) => e.dependsOnId);

  const active = useMemo(() => {
    if (!sel) return null;
    const set = new Set<string>([sel, ...downstream(sel), ...upstream(sel)]);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, edges]);

  const selected = sel ? nodes.find((n) => n.id === sel) ?? null : null;
  const blast = selected ? downstream(selected.id) : [];
  const nameById = new Map(nodes.map((n) => [n.id, n.name]));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card overflow-hidden lg:col-span-2">
        <div className="overflow-x-auto" role="img" aria-label="Service topology grouped by criticality tier with live status and incident overlays">
          <svg viewBox={`0 0 960 ${height}`} className="w-full min-w-[760px]" style={{ height }}>
            {TIERS.map((t) => (
              <text key={t} x={COL_X[t]} y={30} textAnchor="middle" fontSize={11} fill="#8b93b5" fontWeight={600}>{TIER_LABEL[t]}</text>
            ))}

            {edges.map((e, i) => {
              const a = pos.get(e.serviceId);
              const b = pos.get(e.dependsOnId);
              if (!a || !b) return null;
              const faded = active && !(active.has(e.serviceId) && active.has(e.dependsOnId));
              const x1 = a.x + (b.x >= a.x ? NODE_W / 2 : -NODE_W / 2);
              const x2 = b.x + (b.x >= a.x ? -NODE_W / 2 : NODE_W / 2);
              const mx = (x1 + x2) / 2;
              return (
                <path key={i} d={`M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`} fill="none"
                  stroke={e.kind === "hard" ? "#2fd9f2" : "#5b6484"} strokeWidth={e.kind === "hard" ? 1.8 : 1.2}
                  strokeDasharray={e.kind === "hard" ? undefined : "4 3"} opacity={faded ? 0.07 : 0.45} />
              );
            })}

            {nodes.map((s) => {
              const p = pos.get(s.id);
              if (!p) return null;
              const faded = active && !active.has(s.id);
              const isSel = sel === s.id;
              return (
                <g key={s.id} transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`} opacity={faded ? 0.2 : 1}
                  onMouseEnter={() => setSel(s.id)} onClick={() => setSel(s.id)} style={{ cursor: "pointer" }}>
                  <rect width={NODE_W} height={NODE_H} rx={6} fill="#14132a" stroke={isSel ? "#2fd9f2" : "rgba(139,147,181,0.25)"} strokeWidth={isSel ? 1.8 : 1} />
                  <circle cx={16} cy={NODE_H / 2} r={5} fill={STATUS_FILL[s.status] ?? "#8b93b5"} />
                  <text x={30} y={NODE_H / 2 - 2} fontSize={12} fill="#e7ecff" fontWeight={500}>
                    {s.name.length > 20 ? s.name.slice(0, 19) + "…" : s.name}
                  </text>
                  <text x={30} y={NODE_H / 2 + 12} fontSize={9} fill="#8b93b5">health {s.healthScore}</text>
                  {s.openIncidents > 0 ? (
                    <>
                      <rect x={NODE_W - 26} y={9} width={18} height={14} rx={3} fill={STATUS_FILL[s.status] === "#2fe0bd" ? "#ff9f45" : "#ff4d6d"} />
                      <text x={NODE_W - 17} y={19} textAnchor="middle" fontSize={9} fill="#0b0b13" fontWeight={700}>{s.openIncidents}</text>
                    </>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Detail panel */}
      <div className="card card-pad">
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/services/${selected.slug}`} className="text-base font-semibold text-white hover:text-teal-400">{selected.name}</Link>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{TIER_LABEL[selected.criticality] ?? selected.criticality}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_FILL[selected.status] }} aria-hidden />
                {selected.status}
              </span>
            </div>
            <dl className="space-y-1.5 text-[13px]">
              <Row label="Health index" value={`${selected.healthScore}`} />
              <Row label="Owner" value={selected.ownerTeam} />
              <Row label="SLA resolve target" value={`${selected.slaResolveMins}m`} />
              <Row label="Open incidents" value={<span className={selected.openIncidents ? "text-severity-high" : "text-slate-300"}>{selected.openIncidents}{selected.topSeverity ? ` · ${selected.topSeverity}` : ""}</span>} />
              <Row label="Last deploy" value={selected.lastDeployAt ? `${formatRelative(selected.lastDeployAt)} · ${selected.lastDeploySystem}` : "—"} />
              <Row label="Downstream (blast radius)" value={<span className={blast.length ? "text-severity-high" : "text-slate-300"}>{blast.length} service{blast.length === 1 ? "" : "s"}</span>} />
            </dl>
            {blast.length ? (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Impacted if this fails</p>
                <ul className="space-y-1 text-[13px]">
                  {blast.slice(0, 8).map((id) => (
                    <li key={id} className="flex items-center gap-2 text-slate-300"><span className="text-severity-high">↳</span>{nameById.get(id) ?? id}</li>
                  ))}
                </ul>
              </div>
            ) : <p className="text-[12px] text-slate-500">No downstream dependents — a failure here is contained.</p>}
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center text-sm text-slate-500">
            <p className="font-medium text-slate-300">Service topology</p>
            <p className="mt-1">Hover or select a service to trace its blast radius, health, SLA exposure, ownership and last deployment.</p>
          </div>
        )}
      </div>

      {/* Accessible fallback */}
      <ul className="sr-only lg:col-span-3">
        {nodes.map((s) => {
          const deps = edges.filter((e) => e.serviceId === s.id).map((e) => nameById.get(e.dependsOnId) ?? e.dependsOnId);
          return <li key={s.id}>{s.name} ({s.status}, health {s.healthScore}, {s.openIncidents} open incidents) depends on: {deps.length ? deps.join(", ") : "nothing"}.</li>;
        })}
      </ul>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-200">{value}</dd>
    </div>
  );
}
