import Link from "next/link";
import { notFound } from "next/navigation";
import { getIncidentById, getOwners, getIncidentChangeContext } from "@/lib/queries";
import {
  Card,
  CardBody,
  PageHeader,
  SectionTitle,
  StatTile,
  SeverityBadge,
  IncidentStatusBadge,
  RiskBadge,
  ConfidenceBar,
  Chip,
  DemoDisclaimer,
} from "@/components/ui";
import { AutomationActions } from "@/components/automation-actions";
import { IncidentControls } from "@/components/incident-controls";
import { formatRelative, formatDateTime, formatNumber, formatAge, titleCase } from "@/lib/format";
import {
  EVENT_SOURCE_LABEL,
  AUDIT_ACTION_LABEL,
  AUTOMATION_STATUS_LABEL,
  type AuditAction,
  type AutomationStatus,
} from "@/lib/domain";
import { DEMO_INCIDENT_ID } from "@/lib/app-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IncidentWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getIncidentById(id);
  if (!data) notFound();
  const { incident, correlatedEvents, triage, automations, approvals, audit, nameById, recommendedRunbook, runbookSteps, dependents } = data;

  const activeAutomation = automations.find((a) => a.status === "proposed" || a.status === "awaiting_approval");
  const isDemo = incident.id === DEMO_INCIDENT_ID;
  const [owners, changeContext] = await Promise.all([getOwners(), getIncidentChangeContext(id)]);

  // SLA / elapsed computation for the dossier strip.
  const svc = nameById.get(incident.serviceId);
  const target = svc?.slaResolveMins ?? 240;
  const endMs = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : Date.now();
  const elapsedMins = Math.max(0, Math.round((endMs - new Date(incident.detectedAt).getTime()) / 60000));
  const slaPct = Math.round((elapsedMins / target) * 100);
  const slaState = incident.resolvedAt
    ? (elapsedMins > target ? "breached" : "met")
    : (elapsedMins > target ? "breached" : slaPct >= 75 ? "at_risk" : "on_track");
  const slaTone = slaState === "breached" ? "text-severity-critical" : slaState === "at_risk" ? "text-severity-high" : slaState === "met" ? "text-status-healthy" : "text-white";
  const slaLabel = { breached: "SLA breached", at_risk: "Approaching SLA", on_track: "Within SLA", met: "Resolved within SLA" }[slaState];

  return (
    <div>
      <PageHeader
        title={`${incident.id}`}
        description={incident.title}
        actions={<Link href="/incidents" className="btn-ghost">← Incidents</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={incident.severity} />
        <IncidentStatusBadge status={incident.status} />
        <Chip>{titleCase(incident.category)}</Chip>
        <Chip>urgency: {incident.urgency}</Chip>
        {incident.isMultiSystem ? <Chip className="text-teal-400">multi-signal correlation</Chip> : null}
      </div>

      <p className="mb-6 max-w-3xl text-sm text-slate-300">{incident.summary}</p>

      {/* Dossier strip */}
      <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-3 lg:grid-cols-6" style={{ borderColor: "var(--line)", background: "var(--line)" }}>
        <Dossier label="Service" value={svc?.name ?? incident.serviceId} />
        <Dossier label="Elapsed" value={formatAge(elapsedMins)} />
        <Dossier label="SLA resolve target" value={`${target}m`} />
        <Dossier label={slaLabel} value={`${slaPct}%`} tone={slaTone} />
        <Dossier label="On-call" value={incident.ownerName} />
        <Dossier label="Owner team" value={incident.ownerTeam} />
      </div>

      {/* SLA progress bar */}
      <div className="mb-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }} role="meter" aria-valuenow={Math.min(100, slaPct)} aria-valuemin={0} aria-valuemax={100} aria-label={`SLA consumption ${slaPct}%`}>
          <div className={`h-full rounded-full ${slaState === "breached" ? "bg-severity-critical" : slaState === "at_risk" ? "bg-severity-high" : "bg-teal-500"}`} style={{ width: `${Math.min(100, slaPct)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Affected users (est.)" value={formatNumber(incident.affectedUsersEstimate)} />
        <StatTile label="Affected services" value={(incident.affectedServiceIds as string[]).length} />
        <StatTile label="Triage confidence" value={`${incident.confidence}%`} />
        <StatTile label="Correlation" value={`${incident.correlationConfidence}%`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Operator actions */}
          <div>
            <SectionTitle hint="changes persist to the timeline">Operator actions</SectionTitle>
            <Card>
              <CardBody>
                <IncidentControls
                  incidentId={incident.id}
                  status={incident.status}
                  severity={incident.severity}
                  ownerTeam={incident.ownerTeam}
                  owners={owners}
                />
              </CardBody>
            </Card>
          </div>

          {/* Recommended action + automation */}
          <div>
            <SectionTitle>Recommended action & automation</SectionTitle>
            <Card>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Recommended runbook</p>
                    <p className="text-lg font-semibold text-white">{recommendedRunbook?.name ?? "—"}</p>
                    <p className="mt-1 max-w-xl text-sm text-slate-400">{incident.recommendedAction}</p>
                  </div>
                  {recommendedRunbook ? <RiskBadge risk={recommendedRunbook.risk} /> : null}
                </div>

                {recommendedRunbook ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Info label="Expected outcome" value={recommendedRunbook.expectedOutcome} />
                    <Info label="Rollback concept" value={recommendedRunbook.rollbackConcept} />
                    <Info label="Synthetic success rate" value={`${recommendedRunbook.syntheticSuccessRate}%`} />
                    <Info label="Approval required" value={activeAutomation?.approvalRequired ?? recommendedRunbook.approvalRequired ? "Yes — human in the loop" : "No"} />
                  </div>
                ) : null}

                {runbookSteps.length ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Runbook steps (simulated)</p>
                    <ol className="space-y-1.5">
                      {runbookSteps.map((s) => (
                        <li key={s.id} className="flex gap-3 text-sm">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-xs text-teal-400">{s.ordinal}</span>
                          <span><span className="text-slate-200">{s.title}</span> <span className="text-slate-500">— {s.description}</span> <code className="ml-1 rounded bg-navy-950 px-1.5 py-0.5 text-[11px] text-teal-400">{s.simulatedAction}</code></span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {/* Automation state */}
                {automations.length ? (
                  <div className="rounded-lg border border-white/10 bg-navy-950/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-slate-300">Automation status</span>
                      <AutomationStatusBadge status={automations[automations.length - 1].status} />
                    </div>
                    {automations[automations.length - 1].outcome ? (
                      <p className="mt-2 text-sm text-status-healthy">{automations[automations.length - 1].outcome}</p>
                    ) : null}
                    {automations[automations.length - 1].healthBefore != null ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Service health {automations[automations.length - 1].healthBefore}
                        {automations[automations.length - 1].healthAfter != null ? ` → ${automations[automations.length - 1].healthAfter}` : " → (pending)"}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <AutomationActions
                  incidentId={incident.id}
                  canApprove={Boolean(activeAutomation)}
                  canResolve={incident.status === "monitoring"}
                  isDemo={isDemo}
                />
              </CardBody>
            </Card>
          </div>

          {/* Human approval */}
          {approvals.length ? (
            <div>
              <SectionTitle>Human-in-the-loop approval</SectionTitle>
              <Card><CardBody className="space-y-3">
                {approvals.map((a) => (
                  <div key={a.id} className="rounded-lg border border-white/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <ApprovalBadge status={a.status} />
                      <RiskBadge risk={a.riskLevel} />
                    </div>
                    <p className="mt-2 text-sm text-slate-300"><span className="text-slate-500">Evidence: </span>{a.evidence}</p>
                    <p className="mt-1 text-sm text-slate-300"><span className="text-slate-500">Expected result: </span>{a.expectedResult}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Requested {formatRelative(a.requestedAt)} by {a.requestedBy}
                      {a.approver ? ` · approved by ${a.approver} ${formatRelative(a.decidedAt)}` : ""}
                    </p>
                  </div>
                ))}
              </CardBody></Card>
            </div>
          ) : null}

          {/* Correlated events */}
          <div>
            <SectionTitle hint={`${correlatedEvents.length} events`}>Correlated events</SectionTitle>
            <Card>
              <div className="table-wrap border-0">
                <table className="rtable">
                  <thead><tr><th>When</th><th>Source</th><th>Severity</th><th>Message</th></tr></thead>
                  <tbody>
                    {correlatedEvents.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(e.occurredAt)}</td>
                        <td><Chip>{EVENT_SOURCE_LABEL[e.source as keyof typeof EVENT_SOURCE_LABEL]}</Chip></td>
                        <td><SeverityBadge severity={e.severity} /></td>
                        <td className="max-w-[26rem] text-slate-200"><div className="truncate" title={e.message}>{e.message}</div><div className="text-xs text-slate-500">{e.externalRef}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Audit trail */}
          <div>
            <SectionTitle hint={`${audit.length} entries`}>Audit trail</SectionTitle>
            <Card><CardBody>
              <ol className="relative space-y-4 border-l border-white/10 pl-5">
                {audit.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full bg-teal-500 ring-4 ring-navy-900" aria-hidden />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-slate-200">{AUDIT_ACTION_LABEL[a.action as AuditAction] ?? a.action}</span>
                      <span className="text-xs text-slate-500" title={a.at.toISOString()}>{formatDateTime(a.at)}</span>
                    </div>
                    <p className="text-sm text-slate-400">{a.summary}</p>
                    <p className="text-xs text-slate-600">{a.actor}</p>
                  </li>
                ))}
              </ol>
            </CardBody></Card>
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <div>
            <SectionTitle>Likely cause & triage</SectionTitle>
            <Card><CardBody className="space-y-3">
              <Info label="Likely cause" value={incident.likelyCause} />
              <Info label="Service impact" value={incident.serviceImpact} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correlation reason</p>
                <p className="mt-1 text-sm text-slate-300">{incident.correlationReason}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Triage confidence</p>
                <ConfidenceBar value={incident.confidence} />
              </div>
              {triage?.rationale ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Triage rationale</p>
                  <ul className="space-y-1 text-sm text-slate-400">
                    {(triage.rationale as string[]).map((r, i) => <li key={i} className="flex gap-2"><span className="text-teal-500">›</span>{r}</li>)}
                  </ul>
                </div>
              ) : null}
            </CardBody></Card>
          </div>

          <div>
            <SectionTitle hint="2h before detection">Change correlation</SectionTitle>
            <Card><CardBody className="space-y-2.5">
              {changeContext.deployments.length === 0 ? (
                <p className="text-sm text-slate-500">No deployment to {svc?.name ?? "this service"} in the 2 hours before detection.</p>
              ) : (
                changeContext.deployments.slice(0, 4).map((d) => {
                  const minsBefore = changeContext.detectedAt ? Math.round((new Date(changeContext.detectedAt).getTime() - d.deployedAt.getTime()) / 60000) : null;
                  return (
                    <div key={d.id} className="rounded-md border p-2.5" style={{ borderColor: "var(--line)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="metric text-sm text-white">{d.commitSha}</span>
                        <span className={`metric text-xs ${d.status === "rolled_back" ? "text-severity-critical" : d.status === "failed" ? "text-severity-high" : "text-status-healthy"}`}>{d.status.replace("_", " ")}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {minsBefore != null ? <span className="text-white">{minsBefore} min before · </span> : null}
                        {d.system} → {d.environment}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{d.repo} · PR #{d.pullRequest} · {d.author}</p>
                    </div>
                  );
                })
              )}
            </CardBody></Card>
          </div>

          <div>
            <SectionTitle>Affected services (blast radius)</SectionTitle>
            <Card><CardBody className="space-y-2">
              {(incident.affectedServiceIds as string[]).map((sid, idx) => (
                <div key={sid} className="flex items-center justify-between text-sm">
                  <Link href={`/services/${nameById.get(sid)?.slug ?? ""}`} className="text-slate-200 hover:text-teal-400">{nameById.get(sid)?.name ?? sid}</Link>
                  <Chip className={idx === 0 ? "text-severity-high" : ""}>{idx === 0 ? "primary" : "downstream"}</Chip>
                </div>
              ))}
              {dependents.length ? (
                <p className="pt-1 text-xs text-slate-500">{dependents.length} downstream service(s) depend on {nameById.get(incident.serviceId)?.name}.</p>
              ) : null}
            </CardBody></Card>
          </div>

          <div>
            <SectionTitle>Ownership & timeline</SectionTitle>
            <Card><CardBody className="space-y-2 text-sm">
              <KV label="Owner" value={`${incident.ownerTeam}`} />
              <KV label="On-call" value={incident.ownerName} />
              <KV label="Detected" value={formatDateTime(incident.detectedAt)} />
              <KV label="Acknowledged" value={incident.acknowledgedAt ? formatDateTime(incident.acknowledgedAt) : "—"} />
              <KV label="Resolved" value={incident.resolvedAt ? formatDateTime(incident.resolvedAt) : "—"} />
              <KV label="Window" value={`${formatDateTime(incident.windowStart)} – ${formatDateTime(incident.windowEnd)}`} />
            </CardBody></Card>
          </div>
        </div>
      </div>
      <DemoDisclaimer />
    </div>
  );
}

function Dossier({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-[var(--surface)] p-3">
      <div className="stat-label">{label}</div>
      <div className={`mt-1 truncate text-sm font-semibold ${tone ?? "text-white"}`} title={value}>{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

function AutomationStatusBadge({ status }: { status: string }) {
  const tone = status === "succeeded" ? "text-status-healthy" : status === "failed" ? "text-severity-critical" : status === "running" ? "text-teal-400" : "text-severity-high";
  return <span className={`badge ring-1 ring-inset ring-white/10 ${tone}`}>{AUTOMATION_STATUS_LABEL[status as AutomationStatus] ?? status}</span>;
}

function ApprovalBadge({ status }: { status: string }) {
  const tone = status === "granted" ? "text-status-healthy" : status === "rejected" ? "text-severity-critical" : status === "pending" ? "text-severity-high" : "text-slate-400";
  return <span className={`badge ring-1 ring-inset ring-white/10 ${tone}`}>Approval: {titleCase(status)}</span>;
}
