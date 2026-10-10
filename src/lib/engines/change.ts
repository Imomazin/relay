/**
 * Change-intelligence engine (pure, deterministic, no I/O).
 *
 * Correlates deployments / releases (from SCM and CI/CD connectors) to
 * incidents, so Relay can answer "what changed just before this broke?".
 * Powers the Change Intelligence view: change failure rate, incidents within
 * a window of a deployment, and rollback candidates.
 */

export interface ChangeDeployment {
  id: string;
  serviceId: string;
  serviceName: string;
  system: string; // e.g. "GitHub Actions"
  repo: string;
  commitSha: string;
  author: string;
  environment: string; // e.g. "production"
  deployedAt: Date;
  status: "succeeded" | "failed" | "rolled_back";
  pullRequest?: number;
}

export interface ChangeIncidentRef {
  id: string;
  serviceId: string;
  detectedAt: Date;
  severity: string;
  title: string;
}

export interface ChangeCorrelation {
  incident: ChangeIncidentRef;
  deployment: ChangeDeployment;
  minutesBefore: number;
}

/**
 * For each incident, find the most recent deployment to the same service that
 * landed within `windowMins` before the incident was detected.
 */
export function correlateChanges(
  deployments: ChangeDeployment[],
  incidents: ChangeIncidentRef[],
  windowMins = 30,
): ChangeCorrelation[] {
  const byService = new Map<string, ChangeDeployment[]>();
  for (const d of deployments) {
    const list = byService.get(d.serviceId) ?? [];
    list.push(d);
    byService.set(d.serviceId, list);
  }
  for (const list of byService.values()) list.sort((a, b) => a.deployedAt.getTime() - b.deployedAt.getTime());

  const correlations: ChangeCorrelation[] = [];
  for (const inc of incidents) {
    const candidates = byService.get(inc.serviceId) ?? [];
    let best: ChangeDeployment | null = null;
    let bestMins = Infinity;
    for (const d of candidates) {
      const mins = (inc.detectedAt.getTime() - d.deployedAt.getTime()) / 60000;
      if (mins >= 0 && mins <= windowMins && mins < bestMins) {
        best = d;
        bestMins = mins;
      }
    }
    if (best) correlations.push({ incident: inc, deployment: best, minutesBefore: Math.round(bestMins) });
  }
  return correlations.sort((a, b) => b.incident.detectedAt.getTime() - a.incident.detectedAt.getTime());
}

const HIGH_SEV = new Set(["critical", "high"]);

export interface ChangeMetrics {
  totalDeployments: number;
  failedDeployments: number;
  /** Deployments implicated in an incident within the window, as a % of total. */
  changeFailureRatePct: number;
  incidentsWithinWindow: number;
  rollbackCandidates: ChangeCorrelation[];
  deploymentsByEnvironment: { label: string; value: number }[];
  deploymentsBySystem: { label: string; value: number }[];
}

export function computeChangeMetrics(
  deployments: ChangeDeployment[],
  correlations: ChangeCorrelation[],
): ChangeMetrics {
  const total = deployments.length;
  const failed = deployments.filter((d) => d.status === "failed" || d.status === "rolled_back").length;

  // A change is "failure-inducing" when a deployment correlates to an incident.
  const implicated = new Set(correlations.map((c) => c.deployment.id));
  const changeFailureRatePct = total ? Math.round((implicated.size / total) * 100) : 0;

  // Rollback candidates: a high-severity incident correlated to a still-succeeded
  // deployment (i.e. not already rolled back).
  const rollbackCandidates = correlations
    .filter((c) => HIGH_SEV.has(c.incident.severity) && c.deployment.status === "succeeded")
    .sort((a, b) => a.minutesBefore - b.minutesBefore);

  const byEnv = new Map<string, number>();
  const bySys = new Map<string, number>();
  for (const d of deployments) {
    byEnv.set(d.environment, (byEnv.get(d.environment) ?? 0) + 1);
    bySys.set(d.system, (bySys.get(d.system) ?? 0) + 1);
  }

  return {
    totalDeployments: total,
    failedDeployments: failed,
    changeFailureRatePct,
    incidentsWithinWindow: correlations.length,
    rollbackCandidates,
    deploymentsByEnvironment: toSorted(byEnv),
    deploymentsBySystem: toSorted(bySys),
  };
}

function toSorted(m: Map<string, number>): { label: string; value: number }[] {
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}
