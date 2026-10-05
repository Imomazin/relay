"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface NotifItem {
  id: string;
  title: string;
  severity: string;
  incidentId: string | null;
  at: string;
}

const DOT: Record<string, string> = {
  critical: "bg-severity-critical",
  high: "bg-severity-high",
  medium: "bg-severity-medium",
  low: "bg-severity-low",
  info: "bg-severity-info",
};

/** Header bell: polls recent notifications + open-incident count. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ openIncidents: number; unread: number; items: NotifItem[] }>({ openIncidents: 0, unread: 0, items: [] });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const json = await res.json();
        if (alive && json?.ok !== false) setData({ openIncidents: json.openIncidents ?? 0, unread: json.unread ?? 0, items: json.items ?? [] });
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost relative"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications — ${data.openIncidents} open incidents`}
      >
        <span aria-hidden>🔔</span>
        <span className="hidden sm:inline">{data.openIncidents} open</span>
        {data.items.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-severity-critical px-1 text-[10px] font-bold text-white">
            {data.items.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 bg-navy-900 p-2 shadow-xl">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent notifications</p>
          <ul className="max-h-80 overflow-y-auto">
            {data.items.length === 0 ? (
              <li className="px-2 py-3 text-sm text-slate-500">No notifications.</li>
            ) : (
              data.items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.incidentId ? `/incidents/${n.incidentId}` : "/incidents"}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/5"
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[n.severity] ?? "bg-slate-500")} aria-hidden />
                    <span className="text-slate-200">{n.title}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
          <Link href="/audit" onClick={() => setOpen(false)} className="block border-t border-white/10 px-2 pt-2 text-xs text-teal-400">
            View full audit trail →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
