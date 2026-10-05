"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignOwner, setPriority, setStatus, advanceStage, escalate, addNote } from "@/lib/actions";
import { INCIDENT_STATUSES, INCIDENT_STATUS_LABEL, PRIORITIES, type IncidentStatus, type Priority } from "@/lib/domain";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/cn";

type Result = { ok: boolean; message: string } | null;

export function IncidentControls({
  incidentId,
  status,
  severity,
  ownerTeam,
  owners,
}: {
  incidentId: string;
  status: string;
  severity: string;
  ownerTeam: string;
  owners: { ownerTeam: string; ownerName: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      router.refresh();
    });

  const terminal = status === "resolved" || status === "closed";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Control label="Priority">
          <select aria-label="Priority" className="field w-full" value={severity} disabled={pending} onChange={(e) => run(() => setPriority(incidentId, e.target.value))}>
            {PRIORITIES.map((p: Priority) => <option key={p} value={p}>{titleCase(p)}</option>)}
            {!PRIORITIES.includes(severity as Priority) ? <option value={severity}>{titleCase(severity)}</option> : null}
          </select>
        </Control>

        <Control label="Status">
          <select aria-label="Status" className="field w-full" value={status} disabled={pending} onChange={(e) => run(() => setStatus(incidentId, e.target.value))}>
            {INCIDENT_STATUSES.map((s: IncidentStatus) => <option key={s} value={s}>{INCIDENT_STATUS_LABEL[s]}</option>)}
          </select>
        </Control>

        <Control label="Owner">
          <select aria-label="Owner" className="field w-full" value={ownerTeam} disabled={pending} onChange={(e) => {
            const o = owners.find((x) => x.ownerTeam === e.target.value);
            if (o) run(() => assignOwner(incidentId, o.ownerTeam, o.ownerName));
          }}>
            {owners.map((o) => <option key={o.ownerTeam} value={o.ownerTeam}>{o.ownerTeam}</option>)}
            {!owners.some((o) => o.ownerTeam === ownerTeam) ? <option value={ownerTeam}>{ownerTeam}</option> : null}
          </select>
        </Control>

        <Control label="Workflow">
          <button type="button" disabled={pending || terminal} onClick={() => run(() => advanceStage(incidentId))} className="btn-ghost w-full">
            {terminal ? "Closed" : "Advance stage →"}
          </button>
        </Control>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); run(() => escalate(incidentId, reason)); setReason(""); }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Escalation reason (optional)" className="field flex-1" />
        <button type="submit" disabled={pending} className="btn-ghost border-severity-high/40 text-severity-high">Escalate</button>
      </form>

      <form
        onSubmit={(e) => { e.preventDefault(); if (note.trim()) { run(() => addNote(incidentId, note)); setNote(""); } }}
        className="space-y-2"
      >
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an investigation note to the timeline…" rows={2} className="field w-full resize-y" aria-label="Investigation note" />
        <div className="flex justify-end">
          <button type="submit" disabled={pending || !note.trim()} className="btn-primary btn-sm">Add note</button>
        </div>
      </form>

      {result ? (
        <p className={cn("rounded-md px-3 py-2 text-[13px]", result.ok ? "bg-status-healthy/10 text-status-healthy" : "bg-severity-critical/10 text-severity-critical")} role="status">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}
