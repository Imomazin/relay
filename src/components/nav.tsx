"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: IconKey };
type NavGroup = { heading: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    heading: "Operations",
    items: [
      { href: "/", label: "Command Centre", icon: "grid" },
      { href: "/incidents", label: "Incidents", icon: "alert" },
      { href: "/queue", label: "Work Queue", icon: "queue" },
      { href: "/escalations", label: "Escalations", icon: "flag" },
      { href: "/workflow", label: "Workflow", icon: "flow" },
    ],
  },
  {
    heading: "Services",
    items: [
      { href: "/services", label: "Services", icon: "stack" },
      { href: "/capacity", label: "Capacity & SLA", icon: "chart" },
    ],
  },
  {
    heading: "Signals",
    items: [
      { href: "/events", label: "Event Stream", icon: "pulse" },
      { href: "/automations", label: "Automations", icon: "bolt" },
      { href: "/integrations", label: "Integrations", icon: "plug" },
      { href: "/audit", label: "Audit", icon: "shield" },
    ],
  },
  {
    heading: "Reference",
    items: [
      { href: "/methodology", label: "Methodology", icon: "book" },
      { href: "/demo", label: "Demo", icon: "play" },
      { href: "/about", label: "About", icon: "info" },
    ],
  },
];

const FLAT = GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Relay — Command Centre">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-teal-400 to-brand-500 font-bold text-navy-950">
        R
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-white">Relay</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">Service Control</span>
      </span>
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="eyebrow mb-1.5 px-2.5">{group.heading}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className="nav-item">
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex gap-1 overflow-x-auto pb-0.5">
      {FLAT.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
            isActive(pathname, item.href) ? "bg-white/[0.07] text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
          )}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Global search — routes to /search?q= on submit. */
export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="relative w-full max-w-md"
    >
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
        <Icon name="search" />
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search incidents, services, teams…"
        aria-label="Global search"
        className="field w-full pl-8"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px] text-slate-500 sm:block" style={{ borderColor: "var(--line-strong)" }}>
        ↵
      </kbd>
    </form>
  );
}

/** Live clock for the command-bar (client-only to avoid hydration drift). */
export function LiveClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden items-center gap-1.5 font-mono text-[12px] tabular-nums text-slate-400 lg:flex" aria-hidden>
      <span className="h-1.5 w-1.5 rounded-full bg-status-healthy animate-pulse-dot" />
      {now || "--:--:--"} UTC
    </span>
  );
}

// --- Icons (inline, stroke, currentColor) ----------------------------------
type IconKey =
  | "grid" | "alert" | "queue" | "flag" | "flow" | "stack" | "chart"
  | "pulse" | "bolt" | "plug" | "shield" | "book" | "play" | "info" | "search";

const PATHS: Record<IconKey, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  alert: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  queue: "M3 6h18M3 12h18M3 18h12",
  flag: "M4 22V4m0 0 5-1 6 2 5-1v10l-5 1-6-2-5 1",
  flow: "M4 5h6v4H4zM14 15h6v4h-6zM7 9v4a2 2 0 0 0 2 2h5",
  stack: "M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  chart: "M3 3v18h18M7 14v4M12 9v9M17 5v13",
  pulse: "M3 12h4l2-7 4 14 2-7h6",
  bolt: "M13 2 3 14h7l-1 8 10-12h-7z",
  plug: "M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0zM12 16v6",
  shield: "M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5z",
  book: "M4 4h11a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-1a2 2 0 0 0-2 2v14",
  play: "M8 5v14l11-7z",
  info: "M12 16v-5m0-4h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z",
  search: "M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z",
};

function Icon({ name }: { name: IconKey }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
