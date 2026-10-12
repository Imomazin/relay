/**
 * Deterministic deployment / release generator for change intelligence.
 *
 * In the demonstrator, deployment records are synthesised from the service and
 * incident set the same way the rest of the dataset is seeded: deterministic,
 * fixed-seed, and internally consistent. A subset of incidents is deliberately
 * preceded by a deployment to the same service so change-to-incident
 * correlation surfaces real operational narratives ("error rate rose 6 minutes
 * after the checkout-worker deploy").
 */
import { createRng, rngInt, rngPick, rngChance, DEFAULT_SEED, type Rng } from "@/lib/rng";
import type { ChangeDeployment } from "@/lib/engines/change";

interface ServiceLike { id: string; name: string; slug: string }
interface IncidentLike { id: string; serviceId: string; detectedAt: Date; severity: string; title: string }

const SYSTEMS = ["GitHub Actions", "GitLab CI", "Azure Pipelines", "Argo CD"];
const ENVIRONMENTS: [string, number][] = [["production", 6], ["staging", 3], ["canary", 1]];
const AUTHORS = ["a.khan", "s.ferguson", "m.oni", "j.doyle", "r.patel", "l.murray", "t.nakamura", "e.rossi"];

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function sha(rng: Rng): string {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 7; i++) s += hex[rngInt(rng, 0, 15)];
  return s;
}

/** Produce a deterministic set of deployments across the service estate. */
export function generateDeployments(
  services: ServiceLike[],
  incidents: IncidentLike[],
  nowMs: number = Date.now(),
): ChangeDeployment[] {
  const deployments: ChangeDeployment[] = [];
  const sortedServices = [...services].sort((a, b) => a.id.localeCompare(b.id));

  for (const svc of sortedServices) {
    const rng = createRng(DEFAULT_SEED + hashSeed(svc.id));
    const count = rngInt(rng, 2, 4);
    for (let i = 0; i < count; i++) {
      const minsAgo = rngInt(rng, 30, 14 * 24 * 60); // last ~14 days
      const status = rngChance(rng, 0.78) ? "succeeded" : rngChance(rng, 0.5) ? "failed" : "rolled_back";
      deployments.push({
        id: `dep-${svc.id}-${i + 1}`,
        serviceId: svc.id,
        serviceName: svc.name,
        system: rngPick(rng, SYSTEMS),
        repo: `relay-estate/${svc.slug}`,
        commitSha: sha(rng),
        author: rngPick(rng, AUTHORS),
        environment: weightedEnv(rng),
        deployedAt: new Date(nowMs - minsAgo * 60000),
        status,
        pullRequest: rngInt(rng, 480, 1620),
      });
    }
  }

  // Inject a change immediately preceding a subset of incidents so correlation
  // produces concrete stories.
  const sortedIncidents = [...incidents].sort((a, b) => a.id.localeCompare(b.id));
  for (const inc of sortedIncidents) {
    const rng = createRng(DEFAULT_SEED + hashSeed(inc.id) + 991);
    if (!rngChance(rng, 0.55)) continue;
    const svc = services.find((s) => s.id === inc.serviceId);
    if (!svc) continue;
    const minsBefore = rngInt(rng, 3, 18);
    deployments.push({
      id: `dep-${inc.id}-trigger`,
      serviceId: inc.serviceId,
      serviceName: svc.name,
      system: rngPick(rng, SYSTEMS),
      repo: `relay-estate/${svc.slug}`,
      commitSha: sha(rng),
      author: rngPick(rng, AUTHORS),
      environment: "production",
      deployedAt: new Date(inc.detectedAt.getTime() - minsBefore * 60000),
      status: "succeeded",
      pullRequest: rngInt(rng, 480, 1620),
    });
  }

  return deployments.sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());
}

function weightedEnv(rng: Rng): string {
  const total = ENVIRONMENTS.reduce((a, [, w]) => a + w, 0);
  let r = rngInt(rng, 1, total);
  for (const [env, w] of ENVIRONMENTS) {
    r -= w;
    if (r <= 0) return env;
  }
  return "production";
}
