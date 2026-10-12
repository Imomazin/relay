import Link from "next/link";
import type { TapeItem } from "@/lib/queries";
import { cn } from "@/lib/cn";

const KIND_LABEL: Record<TapeItem["kind"], string> = {
  event: "EVT",
  audit: "OPS",
  change: "CHG",
};

const KIND_TONE: Record<TapeItem["kind"], string> = {
  event: "text-teal-400",
  audit: "text-brand-400",
  change: "text-severity-medium",
};

const SEV_DOT: Record<string, string> = {
  critical: "bg-severity-critical",
  high: "bg-severity-high",
  medium: "bg-severity-medium",
  low: "bg-severity-low",
  info: "bg-severity-info",
};

function hhmmss(d: Date): string {
  return d.toISOString().slice(11, 19);
}

/** Dense operations tape — a live telemetry stream of events, ops actions and changes. */
export function OperationsTape({ items }: { items: TapeItem[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-teal-400" aria-hidden />
          <h2 className="eyebrow">Operations tape</h2>
        </div>
        <span className="text-[11px] text-slate-500">events · ops · changes</span>
      </div>
      <ol className="max-h-[22rem] divide-y overflow-y-auto font-mono text-[12px]" style={{ borderColor: "var(--line)" }}>
        {items.map((it) => {
          const row = (
            <div className="flex items-start gap-2.5 px-4 py-1.5 leading-tight">
              <span className="shrink-0 tabular-nums text-slate-500">{hhmmss(it.at)}</span>
              <span className={cn("shrink-0 font-semibold", KIND_TONE[it.kind])}>{KIND_LABEL[it.kind]}</span>
              {it.severity ? <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", SEV_DOT[it.severity] ?? "bg-slate-600")} aria-hidden /> : <span className="w-1.5 shrink-0" aria-hidden />}
              <span className="min-w-0 flex-1 truncate text-slate-300">
                <span className="text-slate-500">{it.source}</span>{" "}
                {it.text}
              </span>
            </div>
          );
          return (
            <li key={it.id}>
              {it.incidentId ? (
                <Link href={`/incidents/${it.incidentId}`} className="block transition-colors hover:bg-white/[0.03]">{row}</Link>
              ) : row}
            </li>
          );
        })}
        {items.length === 0 ? <li className="px-4 py-6 text-center text-slate-500">No recent telemetry.</li> : null}
      </ol>
    </div>
  );
}
