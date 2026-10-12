import Link from "next/link";
import { getChangeIntelligence } from "@/lib/queries";
import { PageHeader, Card, CardBody, SeverityBadge, DemoDisclaimer } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Change Intelligence" };

const DEP_TONE: Record<string, string> = {
  succeeded: "text-status-healthy",
  failed: "text-severity-high",
  rolled_back: "text-severity-critical",
};

export default async function ChangeIntelligencePage() {
  const { deployments, correlations, metrics } = await getChangeIntelligence();

  const tiles = [
    { label: "Change failure rate", value: `${metrics.changeFailureRatePct}%`, sub: "deploys implicated in an incident", tone: metrics.changeFailureRatePct >= 25 ? "text-severity-high" : "text-white" },
    { label: "Incidents within 30m of a deploy", value: String(metrics.incidentsWithinWindow), sub: "change-correlated", tone: "text-white" },
    { label: "Rollback candidates", value: String(metrics.rollbackCandidates.length), sub: "high-sev, not yet rolled back", tone: metrics.rollbackCandidates.length ? "text-severity-critical" : "text-white" },
    { label: "Deployments tracked", value: String(metrics.totalDeployments), sub: `${metrics.failedDeployments} failed / rolled back`, tone: "text-white" },
  ];

  return (
    <div>
      <PageHeader
        title="Change Intelligence"
        description="What changed just before it broke. Relay correlates deployments and releases from SCM and CI/CD connectors to incidents on the same service, surfacing change failure rate, incidents within 30 minutes of a deployment, and rollback candidates."
      />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border lg:grid-cols-4" style={{ borderColor: "var(--line)", background: "var(--line)" }}>
        {tiles.map((t) => (
          <div key={t.label} className="bg-[var(--surface)] p-4">
            <div className="stat-label">{t.label}</div>
            <div className={cn("stat-value mt-1", t.tone)}>{t.value}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Change → incident correlation */}
        <div className="lg:col-span-2">
          <h2 className="eyebrow mb-3">Change → incident correlation</h2>
          <Card>
            <CardBody className="p-0">
              {correlations.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No deployment correlated to an incident in the window.</p>
              ) : (
                <ol className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {correlations.slice(0, 12).map((c) => (
                    <li key={c.incident.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={c.incident.severity} />
                            <Link href={`/incidents/${c.incident.id}`} className="font-medium text-white hover:text-teal-400">{c.incident.id}</Link>
                          </div>
                          <p className="mt-1 text-sm text-slate-300">
                            Error signal <span className="text-white">{c.minutesBefore} min</span> after{" "}
                            <span className="text-teal-400">{c.deployment.system}</span> deployed{" "}
                            <span className="metric text-slate-300">{c.deployment.commitSha}</span> to{" "}
                            <span className="text-slate-300">{c.deployment.environment}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{c.deployment.serviceName} · {c.deployment.repo} · PR #{c.deployment.pullRequest} · {c.deployment.author}</p>
                        </div>
                        <span className={cn("metric shrink-0 text-xs", DEP_TONE[c.deployment.status])}>{c.deployment.status.replace("_", " ")}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          <h2 className="eyebrow mb-3 mt-6">Recent releases</h2>
          <Card>
            <div className="table-wrap border-0">
              <table className="rtable">
                <thead>
                  <tr><th>Service</th><th className="hidden sm:table-cell">System</th><th className="hidden md:table-cell">Commit</th><th>Env</th><th>Status</th><th className="text-right">When</th></tr>
                </thead>
                <tbody>
                  {deployments.slice(0, 14).map((d) => (
                    <tr key={d.id}>
                      <td className="font-medium text-white">{d.serviceName}</td>
                      <td className="hidden sm:table-cell text-slate-400">{d.system}</td>
                      <td className="hidden md:table-cell metric text-slate-400">{d.commitSha}</td>
                      <td className="text-slate-300">{d.environment}</td>
                      <td><span className={cn("metric text-xs", DEP_TONE[d.status])}>{d.status.replace("_", " ")}</span></td>
                      <td className="text-right text-xs text-slate-500">{formatRelative(d.deployedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Rollback candidates + breakdowns */}
        <div className="space-y-6">
          <div>
            <h2 className="eyebrow mb-3">Rollback candidates</h2>
            <Card><CardBody className="space-y-2.5">
              {metrics.rollbackCandidates.length === 0 ? (
                <p className="text-sm text-slate-500">None — no high-severity incident is tied to a still-live deployment.</p>
              ) : (
                metrics.rollbackCandidates.slice(0, 6).map((c) => (
                  <Link key={c.incident.id} href={`/incidents/${c.incident.id}`} className="block rounded-md border p-2.5 transition-colors hover:bg-white/[0.03]" style={{ borderColor: "var(--line)" }}>
                    <div className="flex items-center justify-between">
                      <span className="metric text-sm text-white">{c.deployment.commitSha}</span>
                      <SeverityBadge severity={c.incident.severity} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{c.deployment.serviceName} · {c.minutesBefore} min before {c.incident.id}</p>
                  </Link>
                ))
              )}
            </CardBody></Card>
          </div>

          <div>
            <h2 className="eyebrow mb-3">Deploys by system</h2>
            <Card><CardBody className="space-y-2">
              {metrics.deploymentsBySystem.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-300">{s.label}</span>
                  <span className="metric text-slate-400">{s.value}</span>
                </div>
              ))}
            </CardBody></Card>
          </div>

          <div>
            <h2 className="eyebrow mb-3">Deploys by environment</h2>
            <Card><CardBody className="space-y-2">
              {metrics.deploymentsByEnvironment.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-300">{s.label}</span>
                  <span className="metric text-slate-400">{s.value}</span>
                </div>
              ))}
            </CardBody></Card>
          </div>
        </div>
      </div>

      <DemoDisclaimer />
    </div>
  );
}
