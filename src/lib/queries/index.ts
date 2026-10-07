export * from "@/lib/query-core";
export { getQueue, getOwners } from "@/lib/operational-queries";

import * as core from "@/lib/query-core";

export async function getIncidentById(id: string) {
  const data = await core.getIncidentById(id);
  if (!data) return null;
  return {
    ...data,
    incident: {
      ...data.incident,
      ownerTeam: data.incident.ownerTeam ?? "Unassigned",
      ownerName: data.incident.ownerName ?? "Unassigned",
      title: data.incident.title ?? "Untitled incident",
      category: data.incident.category ?? "other",
      severity: data.incident.severity ?? "info",
      status: data.incident.status ?? "detected",
      serviceId: data.incident.serviceId ?? "",
      correlationConfidence: data.incident.correlationConfidence ?? 0,
      affectedUsersEstimate: data.incident.affectedUsersEstimate ?? 0,
    },
  };
}

export async function getIncidents(filter?: Parameters<typeof core.getIncidents>[0]) {
  const data = await core.getIncidents(filter);
  return {
    ...data,
    incidents: data.incidents.map((incident) => ({
      ...incident,
      ownerTeam: incident.ownerTeam ?? "Unassigned",
      ownerName: incident.ownerName ?? "Unassigned",
      title: incident.title ?? "Untitled incident",
      category: incident.category ?? "other",
      severity: incident.severity ?? "info",
      status: incident.status ?? "detected",
      serviceId: incident.serviceId ?? "",
      correlationConfidence: incident.correlationConfidence ?? 0,
      affectedUsersEstimate: incident.affectedUsersEstimate ?? 0,
    })),
  };
}
