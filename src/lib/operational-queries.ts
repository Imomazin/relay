import "server-only";

import { generateSeed } from "@/db/seed-data";
import {
  OPEN_INCIDENT_STATUSES,
  SEVERITY_RANK,
  WORKFLOW_STAGES,
  statusToStage,
  type IncidentStatus,
  type Severity,
  type WorkflowStage,
} from "@/lib/domain";

export type SlaState = "ok" | "at_risk" | "breached";

export interface QueueRow {
  id: string;
  title: string;
  serviceId: string;
  serviceName: string;
  severity: string;
  status: string;
  category: string;
  ownerTeam: string;
  ownerName: string;
  ageMinutes: number;
  slaTargetMinutes: number;
  slaState: SlaState;
  affectedUsers: number;
  nextAction: string;
}

export interface BoardCard {
  id: string;
  title: string;
  severity: string;
  serviceName: string;
  ownerTeam: string;
  ageMinutes: number;
  status: string;
}

export function slaState(openMinutes: number, targetMinutes: number): SlaState {
  if (openMinutes >= targetMinutes) return "breached";
  if (openMinutes >= targetMinutes * 0.8) return "at_risk";
  return "ok";
}

function nextActionFor(status: string): string {
  switch (status) {
    case "detected": return "Triage & assess impact";
    case "triaged": return "Assign owner";
    case "assigned": return "Begin investigation";
    case "investigating": return "Propose remediation";
    case "action_proposed": return "Request approval";
    case "awaiting_approval": return "Approve remediation";
    case "remediating": return "Monitor recovery";
    case "monitoring": return "Confirm & resolve";
    default: return "Review";
  }
}

function buildQueueRows(onlyEscalated = false): QueueRow[] {
  const d = generateSeed() as any;
  const services: any[] = d.services ?? [];
  const incidents: any[] = d.incidents ?? [];
  const serviceById = new Map<string, any>(services.map((s: any) => [s.id, s]));
  const now = Date.now();

  let rows: QueueRow[] = incidents
    .filter((i: any) => OPEN_INCIDENT_STATUSES.includes(i.status as IncidentStatus))
    .map((i: any) => {
      const service = serviceById.get(i.serviceId);
      const detected = i.detectedAt instanceof Date ? i.detectedAt : new Date(i.detectedAt);
      const ageMinutes = Math.max(0, Math.round((now - detected.getTime()) / 60000));
      const target = Number(service?.slaResolveMins ?? 240);
      return {
        id: String(i.id),
        title: String(i.title ?? "Untitled incident"),
        serviceId: String(i.serviceId ?? ""),
        serviceName: String(service?.name ?? i.serviceId ?? "Unknown service"),
        severity: String(i.severity ?? "info"),
        status: String(i.status ?? "detected"),
        category: String(i.category ?? "other"),
        ownerTeam: String(i.ownerTeam ?? ""),
        ownerName: String(i.ownerName ?? ""),
        ageMinutes,
        slaTargetMinutes: target,
        slaState: slaState(ageMinutes, target),
        affectedUsers: Number(i.affectedUsersEstimate ?? 0),
        nextAction: nextActionFor(String(i.status ?? "detected")),
      };
    });

  if (onlyEscalated) {
    rows = rows.filter((r) =>
      SEVERITY_RANK[r.severity as Severity] >= SEVERITY_RANK.high ||
      r.status === "awaiting_approval" ||
      r.slaState !== "ok",
    );
  }

  rows.sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity as Severity] - SEVERITY_RANK[a.severity as Severity];
    if (sev !== 0) return sev;
    const slaRank: Record<SlaState, number> = { breached: 2, at_risk: 1, ok: 0 };
    const sla = slaRank[b.slaState] - slaRank[a.slaState];
    if (sla !== 0) return sla;
    return b.ageMinutes - a.ageMinutes;
  });

  return rows;
}

export async function getQueue(filter?: { severity?: string; service?: string; sla?: SlaState; status?: string }) {
  const all = buildQueueRows(false);
  let rows = all;
  if (filter?.severity) rows = rows.filter((r) => r.severity === filter.severity);
  if (filter?.service) rows = rows.filter((r) => r.serviceId === filter.service);
  if (filter?.sla) rows = rows.filter((r) => r.slaState === filter.sla);
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);

  const d = generateSeed() as any;
  const services = ((d.services ?? []) as any[])
    .map((s: any) => ({ id: String(s.id), name: String(s.name) }))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

  return {
    rows,
    services,
    summary: {
      total: all.length,
      breached: all.filter((r) => r.slaState === "breached").length,
      atRisk: all.filter((r) => r.slaState === "at_risk").length,
      unassigned: all.filter((r) => !r.ownerName).length,
      critical: all.filter((r) => r.severity === "critical").length,
    },
  };
}

export async function getEscalations() {
  const d = generateSeed() as any;
  const audit: any[] = d.auditEvents ?? [];
  const escalatedIds = new Set<string>(
    audit.filter((a: any) => a.action === "escalated" && a.incidentId).map((a: any) => String(a.incidentId)),
  );
  return buildQueueRows(true).map((r) => ({ ...r, explicitlyEscalated: escalatedIds.has(r.id) }));
}

export async function getWorkflowBoard() {
  const d = generateSeed() as any;
  const incidents: any[] = d.incidents ?? [];
  const services: any[] = d.services ?? [];
  const serviceName = new Map<string, string>(services.map((s: any) => [String(s.id), String(s.name)]));
  const now = Date.now();
  const lanes: Record<WorkflowStage, BoardCard[]> = {} as Record<WorkflowStage, BoardCard[]>;
  for (const stage of WORKFLOW_STAGES) lanes[stage] = [];

  for (const incident of incidents) {
    const stage = statusToStage(String(incident.status ?? "detected") as IncidentStatus);
    const detected = incident.detectedAt instanceof Date ? incident.detectedAt : new Date(incident.detectedAt);
    lanes[stage].push({
      id: String(incident.id),
      title: String(incident.title ?? "Untitled incident"),
      severity: String(incident.severity ?? "info"),
      serviceName: serviceName.get(String(incident.serviceId)) ?? String(incident.serviceId ?? "Unknown service"),
      ownerTeam: String(incident.ownerTeam ?? ""),
      ageMinutes: Math.max(0, Math.round((now - detected.getTime()) / 60000)),
      status: String(incident.status ?? "detected"),
    });
  }

  for (const stage of WORKFLOW_STAGES) {
    lanes[stage].sort((a, b) => {
      const sev = SEVERITY_RANK[b.severity as Severity] - SEVERITY_RANK[a.severity as Severity];
      return sev || b.ageMinutes - a.ageMinutes;
    });
  }
  lanes.resolved = lanes.resolved.slice(0, 12);
  return { lanes };
}

export async function searchAll(q: string) {
  const d = generateSeed() as any;
  const incidents: any[] = d.incidents ?? [];
  const services: any[] = d.services ?? [];
  const term = q.trim().toLowerCase();
  if (!term) return { incidents: [], services: [], teams: [] };

  const nameById = new Map<string, string>(services.map((s: any) => [String(s.id), String(s.name)]));
  const incidentMatches = incidents
    .filter((i: any) => [i.id, i.title, i.summary, i.category].some((v) => String(v ?? "").toLowerCase().includes(term)))
    .sort((a: any, b: any) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    .slice(0, 20)
    .map((i: any) => ({
      id: String(i.id),
      title: String(i.title ?? "Untitled incident"),
      severity: String(i.severity ?? "info"),
      status: String(i.status ?? "detected"),
      serviceName: nameById.get(String(i.serviceId)) ?? String(i.serviceId ?? "Unknown service"),
    }));

  const serviceMatches = services
    .filter((s: any) => [s.name, s.slug, s.ownerTeam, s.description].some((v) => String(v ?? "").toLowerCase().includes(term)))
    .slice(0, 12);

  const teamMap = new Map<string, string>();
  for (const s of services) {
    const team = String(s.ownerTeam ?? "");
    const owner = String(s.ownerName ?? "");
    if ((team + " " + owner).toLowerCase().includes(term) && team) teamMap.set(team, owner);
  }

  return {
    incidents: incidentMatches,
    services: serviceMatches,
    teams: [...teamMap.entries()].map(([ownerTeam, ownerName]) => ({ ownerTeam, ownerName })),
  };
}
