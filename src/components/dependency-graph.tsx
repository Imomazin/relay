"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export interface GraphService {
  id: string;
  name: string;
  slug: string;
  status: string;
  criticality: string;
}
export interface GraphEdge {
  serviceId: string;
  dependsOnId: string;
  kind: string;
}

const STATUS_FILL: Record<string, string> = {
  healthy: "#34d399",
  degraded: "#facc15",
  impaired: "#fb923c",
  down: "#f43f5e",
};

const TIERS = ["tier1", "tier2", "tier3"] as const;
const TIER_LABEL: Record<string, string> = { tier1: "Tier 1", tier2: "Tier 2", tier3: "Tier 3" };

const COL_X = { tier1: 150, tier2: 470, tier3: 790 } as Record<string, number>;
const NODE_W = 170;
const NODE_H = 46;
const ROW_H = 68;
const TOP = 56;

/**
 * Interactive service dependency map. Nodes are laid out in columns by
 * criticality tier and coloured by live status; edges show hard/soft
 * dependencies. Hovering a service highlights everything it touches.
 */
export function DependencyGraph({ services, edges }: { services: GraphService[]; edges: GraphEdge[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const byTier = new Map<string, GraphService[]>();
  for (const t of TIERS) byTier.set(t, []);
  for (const s of [...services].sort((a, b) => a.name.localeCompare(b.name))) {
    (byTier.get(s.criticality) ?? byTier.get("tier3")!).push(s);
  }
  const maxRows = Math.max(1, ...TIERS.map((t) => byTier.get(t)!.length));
  const height = TOP + maxRows * ROW_H + 10;

  const pos = new Map<string, { x: number; y: number }>();
  for (const t of TIERS) {
    byTier.get(t)!.forEach((s, i) => pos.set(s.id, { x: COL_X[t], y: TOP + i * ROW_H }));
  }

  const connected = (id: string): Set<string> => {
    const set = new Set<string>([id]);
    for (const e of edges) {
      if (e.serviceId === id) set.add(e.dependsOnId);
      if (e.dependsOnId === id) set.add(e.serviceId);
    }
    return set;
  };
  const active = hover ? connected(hover) : null;

  return (
    <div>
      <div
        className="overflow-x-auto"
        role="img"
        aria-label="Service dependency map grouped by criticality tier"
      >
        <svg viewBox={`0 0 940 ${height}`} className="w-full min-w-[720px]" style={{ height }}>
          {/* Column headers */}
          {TIERS.map((t) => (
            <text key={t} x={COL_X[t]} y={28} textAnchor="middle" fontSize={12} fill="#64748b" fontWeight={600}>
              {TIER_LABEL[t]}
            </text>
          ))}

          {/* Edges */}
          {edges.map((e, i) => {
            const a = pos.get(e.serviceId);
            const b = pos.get(e.dependsOnId);
            if (!a || !b) return null;
            const faded = active && !(active.has(e.serviceId) && active.has(e.dependsOnId));
            const x1 = a.x + (b.x >= a.x ? NODE_W / 2 : -NODE_W / 2);
            const x2 = b.x + (b.x >= a.x ? -NODE_W / 2 : NODE_W / 2);
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={i}
                d={`M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`}
                fill="none"
                stroke={e.kind === "hard" ? "#2dd4bf" : "#64748b"}
                strokeWidth={e.kind === "hard" ? 1.8 : 1.2}
                strokeDasharray={e.kind === "hard" ? undefined : "4 3"}
                opacity={faded ? 0.08 : 0.5}
              />
            );
          })}

          {/* Nodes */}
          {services.map((s) => {
            const p = pos.get(s.id);
            if (!p) return null;
            const faded = active && !active.has(s.id);
            return (
              <g
                key={s.id}
                transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`}
                opacity={faded ? 0.2 : 1}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                <a href={`/services/${s.slug}`}>
                  <rect width={NODE_W} height={NODE_H} rx={8} fill="#0d1526" stroke="rgba(148,163,184,0.25)" />
                  <circle cx={16} cy={NODE_H / 2} r={5} fill={STATUS_FILL[s.status] ?? "#94a3b8"} />
                  <text x={30} y={NODE_H / 2 + 4} fontSize={12} fill="#e2e8f0" fontWeight={500}>
                    {s.name.length > 20 ? s.name.slice(0, 19) + "…" : s.name}
                  </text>
                </a>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend + accessible fallback */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_FILL.healthy }} /> healthy</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_FILL.degraded }} /> degraded</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_FILL.impaired }} /> impaired</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_FILL.down }} /> down</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: "#2dd4bf" }} /> hard dependency</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 border-t border-dashed border-slate-500" /> soft dependency</span>
      </div>
      <ul className="sr-only">
        {services.map((s) => {
          const deps = edges.filter((e) => e.serviceId === s.id).map((e) => services.find((x) => x.id === e.dependsOnId)?.name ?? e.dependsOnId);
          return <li key={s.id}>{s.name} ({s.status}) depends on: {deps.length ? deps.join(", ") : "nothing"}.</li>;
        })}
      </ul>
    </div>
  );
}
