import Link from "next/link";
import { getWorkflowBoard } from "@/lib/operational-queries";
import { PageHeader, SeverityBadge } from "@/components/ui";
import { WORKFLOW_STAGES, WORKFLOW_STAGE_LABEL, type WorkflowStage } from "@/lib/domain";
import { formatAge } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Workflow" };

const STAGE_ACCENT: Record<WorkflowStage, string> = {
  detected: "border-t-severity-info",
  triaged: "border-t-severity-low",
  assigned: "border-t-brand-500",
  investigating: "border-t-brand-400",
  remediating: "border-t-teal-500",
  monitoring: "border-t-status-degraded",
  resolved: "border-t-status-healthy",
};

export default async function WorkflowPage() {
  const { lanes } = await getWorkflowBoard();

  return (
    <div>
      <PageHeader
        title="Orchestration Workflow"
        description="Work moving through the service-management lifecycle. Open any incident to advance it to the next stage."
      />

      <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-4">
        {WORKFLOW_STAGES.map((stage) => {
          const cards = lanes[stage] ?? [];
          return (
            <section key={stage} className={`flex min-w-0 flex-col rounded-lg border border-t-2 bg-[var(--surface)] ${STAGE_ACCENT[stage]}`} style={{ borderColor: "var(--line)" }}>
              <header className="flex items-center justify-between px-3 py-2.5">
                <h2 className="text-[13px] font-semibold text-slate-200">{WORKFLOW_STAGE_LABEL[stage]}</h2>
                <span className="metric rounded bg-white/5 px-1.5 text-[11px] text-slate-400">{cards.length}</span>
              </header>
              <div className="flex flex-col gap-2 px-2 pb-3">
                {cards.map((c) => (
                  <Link key={c.id} href={`/incidents/${c.id}`} className="block rounded-md border bg-[var(--app-bg)] p-2.5 transition-colors hover:border-teal-500/40" style={{ borderColor: "var(--line)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[12px] text-slate-300">{c.id}</span>
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] text-slate-200">{c.title}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">{c.serviceName}</span>
                      <span className="metric">{formatAge(c.ageMinutes)}</span>
                    </div>
                  </Link>
                ))}
                {cards.length === 0 ? <p className="px-1 py-3 text-center text-[12px] text-slate-600">—</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
