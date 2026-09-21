/** Formatting helpers shared across the UI. */

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const suffix = diffMs >= 0 ? "ago" : "from now";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ${suffix}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ${suffix}`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ${suffix}`;
  const months = Math.round(days / 30);
  return `${months}mo ${suffix}`;
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-GB");
}

export function formatPercent(n: number | null | undefined, digits = 0): string {
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

export function titleCase(s: string): string {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
