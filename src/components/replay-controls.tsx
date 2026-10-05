"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { injectScenario, clearSimulated } from "@/lib/actions";
import { cn } from "@/lib/cn";

/**
 * Live event-replay controls. "Inject live signals" runs fresh synthetic events
 * through the real pipeline and generates a new incident; "Clear injected"
 * removes everything the replay created. Lets a presenter start / repeat / reset
 * the ingestion → correlation → incident journey on demand.
 */
export function ReplayControls() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [last, setLast] = useState<{ ok: boolean; message: string; incidentId?: string } | null>(null);

  function inject() {
    startTransition(async () => {
      const r = await injectScenario();
      setLast(r);
      router.refresh();
    });
  }
  function clear() {
    startTransition(async () => {
      const r = await clearSimulated();
      setLast({ ...r, incidentId: undefined });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={inject} className="btn-primary">
          {pending ? "Injecting…" : "Inject live signals"}
        </button>
        <button type="button" disabled={pending} onClick={clear} className="btn-ghost">
          Clear injected
        </button>
      </div>
      {last ? (
        <div className={cn("rounded-lg px-3 py-2 text-sm", last.ok ? "bg-status-healthy/10 text-status-healthy" : "bg-severity-high/10 text-severity-high")} role="status">
          {last.message}
          {last.incidentId ? (
            <>
              {" "}
              <Link href={`/incidents/${last.incidentId}`} className="font-semibold underline underline-offset-2">
                Open {last.incidentId} →
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-slate-500">
        Each injection emits fresh signals from multiple simulated sources, correlates them through
        the real engines, and creates a new incident awaiting approval — a repeatable, safe demo.
      </p>
    </div>
  );
}
