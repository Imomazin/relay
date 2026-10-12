/**
 * Integration fabric — runtime view.
 *
 * Resolves each catalogued connector to an honest connection status and a set
 * of (synthetic, deterministic) runtime telemetry so the connector control
 * plane reads like a real operations surface. Pure and dependency-free: it
 * needs no database and works identically with or without `DATABASE_URL`.
 *
 * Status honesty rule:
 *   - `connected_sandbox` only when the connector's server-side credential env
 *     var is actually present (we still never claim fully verified `live`).
 *   - `demo_adapter` for connectors that mirror a realistic schema in the demo.
 *   - `ready_to_configure` otherwise.
 * No connector is ever shown as `live` or fabricated into `error` in the demo.
 */
import { createRng, rngInt, DEFAULT_SEED, type Rng } from "@/lib/rng";
import { CONNECTORS } from "./catalogue";
import {
  CATEGORY_ORDER,
  type ConnectorCategory,
  type ConnectorDefinition,
  type ConnectorRuntime,
  type ConnectorStatus,
  type ConnectorView,
} from "./types";

function resolveStatus(def: ConnectorDefinition): ConnectorStatus {
  const configured = Boolean(process.env[def.envVar]);
  if (configured) return "connected_sandbox";
  if (def.demo) return "demo_adapter";
  return "ready_to_configure";
}

const ACTIVE: ConnectorStatus[] = ["live", "connected_sandbox", "demo_adapter"];

function buildRuntime(def: ConnectorDefinition, status: ConnectorStatus, now: number, rng: Rng): ConnectorRuntime {
  const active = ACTIVE.includes(status);
  if (!active) {
    return {
      status,
      health: null,
      heartbeatAt: null,
      lastEventAt: null,
      eventsToday: 0,
      apiLatencyMs: null,
      failedRequests: 0,
      rateLimitPct: null,
      webhookState: def.sync === "push_webhook" ? "not_configured" : "n/a",
    };
  }

  // Connectors wired to a demo event stream carry materially higher volume.
  const wired = Boolean(def.eventSource);
  const ingests = def.capabilities.includes("event_ingestion") || def.capabilities.includes("change_discovery");
  const eventsToday = wired
    ? rngInt(rng, 1800, 6400)
    : ingests
      ? rngInt(rng, 120, 1500)
      : rngInt(rng, 4, 90);

  const health = rngInt(rng, 92, 100);
  const heartbeatAt = new Date(now - rngInt(rng, 2, 55) * 1000);
  const lastEventAt = new Date(now - rngInt(rng, 3, 900) * 1000);
  const apiLatencyMs = rngInt(rng, 38, chooseLatencyCeiling(def.category));
  const failedRequests = rngInt(rng, 0, 5);
  const rateLimitPct = rngInt(rng, 6, 64);
  const webhookState: ConnectorRuntime["webhookState"] =
    def.sync === "push_webhook" || def.sync === "bidirectional" ? "active" : "n/a";

  return { status, health, heartbeatAt, lastEventAt, eventsToday, apiLatencyMs, failedRequests, rateLimitPct, webhookState };
}

function chooseLatencyCeiling(category: ConnectorCategory): number {
  switch (category) {
    case "observability":
    case "cloud":
      return 260;
    case "security":
      return 420;
    default:
      return 190;
  }
}

export interface FabricSummary {
  total: number;
  byStatus: Record<ConnectorStatus, number>;
  activeConnectors: number;
  wiredStreams: number;
  eventsToday: number;
  avgLatencyMs: number;
  activeWebhooks: number;
  categories: number;
}

export interface FabricGroup {
  category: ConnectorCategory;
  connectors: ConnectorView[];
}

export interface ConnectorFabric {
  groups: FabricGroup[];
  all: ConnectorView[];
  summary: FabricSummary;
}

/** Build the full connector fabric view (deterministic; no I/O). */
export function getConnectorFabric(nowMs: number = Date.now()): ConnectorFabric {
  const all: ConnectorView[] = CONNECTORS.map((def, i) => {
    const status = resolveStatus(def);
    const rng = createRng(DEFAULT_SEED + i * 7 + 3);
    return { ...def, runtime: buildRuntime(def, status, nowMs, rng) };
  });

  const byStatus = {
    live: 0, connected_sandbox: 0, demo_adapter: 0, ready_to_configure: 0, degraded: 0, error: 0,
  } as Record<ConnectorStatus, number>;
  let eventsToday = 0;
  let latencySum = 0;
  let latencyCount = 0;
  let activeWebhooks = 0;
  let activeConnectors = 0;
  let wiredStreams = 0;

  for (const c of all) {
    byStatus[c.runtime.status] += 1;
    eventsToday += c.runtime.eventsToday;
    if (c.runtime.apiLatencyMs != null) { latencySum += c.runtime.apiLatencyMs; latencyCount += 1; }
    if (c.runtime.webhookState === "active") activeWebhooks += 1;
    if (ACTIVE.includes(c.runtime.status)) activeConnectors += 1;
    if (c.eventSource) wiredStreams += 1;
  }

  const groups: FabricGroup[] = CATEGORY_ORDER.map((category) => ({
    category,
    connectors: all.filter((c) => c.category === category),
  })).filter((g) => g.connectors.length > 0);

  return {
    all,
    groups,
    summary: {
      total: all.length,
      byStatus,
      activeConnectors,
      wiredStreams,
      eventsToday,
      avgLatencyMs: latencyCount ? Math.round(latencySum / latencyCount) : 0,
      activeWebhooks,
      categories: groups.length,
    },
  };
}
