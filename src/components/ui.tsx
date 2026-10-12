import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  INCIDENT_STATUS_LABEL,
  CRITICALITY_LABEL,
  SERVICE_STATUS_LABEL,
  type IncidentStatus,
  type Severity,
  type ServiceStatus,
} from "@/lib/domain";

// --- Cards -------------------------------------------------------------------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card-pad", className)}>{children}</div>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{children}</h2>
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </div>
  );
}

// --- Stat tile ---------------------------------------------------------------
export function StatTile({
  label,
  value,
  sub,
  tone = "default",
  title,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "critical" | "high" | "good" | "warn";
  title?: string;
}) {
  const toneClass = {
    default: "text-white",
    critical: "text-severity-critical",
    high: "text-severity-high",
    good: "text-status-healthy",
    warn: "text-severity-medium",
  }[tone];
  return (
    <div className="card card-pad" title={title}>
      <div className="stat-label">{label}</div>
      <div className={cn("stat-value mt-1", toneClass)}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

// --- Severity / status badges ------------------------------------------------
const SEVERITY_STYLE: Record<Severity, string> = {
  critical: "bg-severity-critical/15 text-severity-critical ring-1 ring-inset ring-severity-critical/30",
  high: "bg-severity-high/15 text-severity-high ring-1 ring-inset ring-severity-high/30",
  medium: "bg-severity-medium/15 text-severity-medium ring-1 ring-inset ring-severity-medium/30",
  low: "bg-severity-low/15 text-severity-low ring-1 ring-inset ring-severity-low/30",
  info: "bg-severity-info/15 text-severity-info ring-1 ring-inset ring-severity-info/30",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLE[severity as Severity] ?? SEVERITY_STYLE.info;
  return (
    <span className={cn("badge", style)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {severity}
    </span>
  );
}

const STATUS_STYLE: Record<ServiceStatus, string> = {
  healthy: "bg-status-healthy/15 text-status-healthy ring-1 ring-inset ring-status-healthy/30",
  degraded: "bg-status-degraded/15 text-status-degraded ring-1 ring-inset ring-status-degraded/30",
  impaired: "bg-status-impaired/15 text-status-impaired ring-1 ring-inset ring-status-impaired/30",
  down: "bg-status-down/15 text-status-down ring-1 ring-inset ring-status-down/30",
};

export function ServiceStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status as ServiceStatus] ?? STATUS_STYLE.degraded;
  return (
    <span className={cn("badge", style)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {SERVICE_STATUS_LABEL[status as ServiceStatus] ?? status}
    </span>
  );
}

const SLA_STYLE: Record<string, string> = {
  ok: "bg-status-healthy/12 text-status-healthy ring-1 ring-inset ring-status-healthy/25",
  at_risk: "bg-severity-high/12 text-severity-high ring-1 ring-inset ring-severity-high/25",
  breached: "bg-severity-critical/12 text-severity-critical ring-1 ring-inset ring-severity-critical/25",
};
const SLA_LABEL: Record<string, string> = { ok: "On track", at_risk: "At risk", breached: "Breached" };

export function SlaBadge({ state }: { state: string }) {
  return (
    <span className={cn("badge", SLA_STYLE[state] ?? SLA_STYLE.ok)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {SLA_LABEL[state] ?? state}
    </span>
  );
}

const INCIDENT_STATUS_TONE: Record<string, string> = {
  detected: "bg-severity-medium/15 text-severity-medium",
  triaged: "bg-severity-medium/15 text-severity-medium",
  assigned: "bg-severity-low/15 text-severity-low",
  investigating: "bg-severity-low/15 text-severity-low",
  action_proposed: "bg-teal-500/15 text-teal-400",
  awaiting_approval: "bg-severity-high/15 text-severity-high",
  remediating: "bg-teal-500/15 text-teal-400",
  monitoring: "bg-severity-low/15 text-severity-low",
  resolved: "bg-status-healthy/15 text-status-healthy",
  closed: "bg-slate-500/15 text-slate-400",
};

export function IncidentStatusBadge({ status }: { status: string }) {
  const tone = INCIDENT_STATUS_TONE[status] ?? "bg-slate-500/15 text-slate-400";
  const label = INCIDENT_STATUS_LABEL[status as IncidentStatus] ?? status;
  return <span className={cn("badge ring-1 ring-inset ring-white/10", tone)}>{label}</span>;
}

export function CriticalityBadge({ criticality }: { criticality: string }) {
  const tone =
    criticality === "tier1"
      ? "bg-severity-critical/15 text-severity-critical"
      : criticality === "tier2"
        ? "bg-severity-high/15 text-severity-high"
        : "bg-slate-500/15 text-slate-300";
  return (
    <span className={cn("badge ring-1 ring-inset ring-white/10", tone)} title={CRITICALITY_LABEL[criticality as keyof typeof CRITICALITY_LABEL]}>
      {criticality.replace("tier", "Tier ")}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: string }) {
  const tone =
    risk === "high"
      ? "bg-severity-critical/15 text-severity-critical"
      : risk === "medium"
        ? "bg-severity-high/15 text-severity-high"
        : "bg-status-healthy/15 text-status-healthy";
  return <span className={cn("badge ring-1 ring-inset ring-white/10", tone)}>{risk} risk</span>;
}

// --- Bars --------------------------------------------------------------------
export function HealthBar({ value }: { value: number }) {
  const tone = value >= 85 ? "bg-status-healthy" : value >= 65 ? "bg-severity-medium" : value >= 45 ? "bg-severity-high" : "bg-severity-critical";
  return (
    <div className="flex items-center gap-2" title={`Health ${value}/100`}>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Service health">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} />
      </div>
      <span className="tabular-nums text-xs text-slate-300">{value}</span>
    </div>
  );
}

export function ConfidenceBar({ value, label = "Confidence" }: { value: number; label?: string }) {
  return (
    <div className="flex items-center gap-2" title={`${label} ${value}%`}>
      <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${value}%` }} />
      </div>
      <span className="tabular-nums text-xs text-slate-300">{value}%</span>
    </div>
  );
}

/** Dense, server-rendered throughput bar strip. `values` read left(old)→right(new). */
export function Sparkbars({
  values,
  ariaLabel,
  height = 40,
}: {
  values: number[];
  ariaLabel: string;
  height?: number;
}) {
  const max = Math.max(1, ...values);
  const n = Math.max(1, values.length);
  const gap = 2;
  const barW = (100 - gap * (n - 1)) / n;
  const last = values.length - 1;
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      {values.map((v, i) => {
        const h = Math.max(1.5, (v / max) * (height - 2));
        const x = i * (barW + gap);
        return (
          <rect
            key={i}
            x={x}
            y={height - h}
            width={barW}
            height={h}
            rx={0.6}
            className={i === last ? "fill-teal-400" : "fill-teal-500/35"}
          />
        );
      })}
    </svg>
  );
}

// --- Page header -------------------------------------------------------------
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card card-pad text-center text-sm text-slate-400">{children}</div>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("badge bg-white/5 text-slate-300 ring-1 ring-inset ring-white/10", className)}>{children}</span>;
}

export function TealLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="link-teal">
      {children}
    </Link>
  );
}

export function DemoDisclaimer() {
  return (
    <p className="mt-8 border-t pt-3 text-[11px] leading-relaxed text-slate-600" style={{ borderColor: "var(--line)" }}>
      Relay operates on a synthetic service environment for evaluation. Connectors shown are
      simulated and automation acts only on demonstration services. Not affiliated with, or endorsed
      by, the Scottish Government or CivTech.
    </p>
  );
}
