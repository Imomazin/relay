"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { executeAutomation, resolveIncident, resetDemo } from "@/lib/actions";
import { cn } from "@/lib/cn";

type Result = { ok: boolean; message: string } | null;

export function AutomationActions({
  incidentId,
  canApprove,
  canResolve,
  isDemo,
}: {
  incidentId: string;
  canApprove: boolean;
  canResolve: boolean;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result>(null);

  function run(fn: () => Promise<Result>) {
    startTransition(async () => {
      const r = await fn();
      setResult(r);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canApprove ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => executeAutomation(incidentId))}
            className="btn-primary"
          >
            {pending ? "Working…" : "Approve & execute (simulated)"}
          </button>
        ) : null}
        {canResolve ? (
          <button type="button" disabled={pending} onClick={() => run(() => resolveIncident(incidentId))} className="btn-ghost">
            Mark resolved
          </button>
        ) : null}
        {isDemo ? (
          <button type="button" disabled={pending} onClick={() => run(() => resetDemo())} className="btn-ghost">
            Reset demo
          </button>
        ) : null}
      </div>
      {result ? (
        <p className={cn("rounded-lg px-3 py-2 text-sm", result.ok ? "bg-status-healthy/10 text-status-healthy" : "bg-severity-high/10 text-severity-high")} role="status">
          {result.message}
        </p>
      ) : null}
      <p className="text-xs text-slate-500">
        Approving runs a fully simulated remediation against demonstration data only — no real infrastructure is touched.
      </p>
    </div>
  );
}
